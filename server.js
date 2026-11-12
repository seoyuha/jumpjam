// 점프 대소동! — 교실 서버 (Express + Socket.IO)
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { Server } = require('socket.io');
const QRCode = require('qrcode');
const XLSX = require('xlsx');
const JC = require('./public/shared.js');
const Q = require('./lib/questions.js');
const { assign, mapCount } = require('./lib/assign.js');

const PORT = process.env.PORT || 3000;
const ROUNDS = 3;
const CLASSES = ['8반', '9반', '10반'];
// 교사 비밀번호: 기본 finel9932! (Render 환경변수 TEACHER_PASSWORD로 바꿀 수 있어요)
const sha = s => crypto.createHash('sha256').update(String(s || '')).digest('hex');
const PW_HASH = sha(process.env.TEACHER_PASSWORD || 'finel9932!');
function pwOk(pw) { return sha(pw) === PW_HASH; }
const tokens = new Set();
const DATA = path.join(__dirname, 'data'); fs.mkdirSync(DATA, { recursive: true });

const app = express();
const server = http.createServer(app);
const io = new Server(server, { pingInterval: 10000, pingTimeout: 20000 });
app.use(express.static(path.join(__dirname, 'public')));
app.get('/teacher', (req, res) => res.sendFile(path.join(__dirname, 'public', 'teacher.html')));
app.get('/qr.svg', async (req, res) => {
  res.type('image/svg+xml');
  res.send(await QRCode.toString(String(req.query.u || ''), { type: 'svg', margin: 1, color: { dark: '#15233f', light: '#ffffff' } }));
});
app.get('/api/template.xlsx', (req, res) => {
  const rows = [['유형', '문제', '정답', '오답1', '오답2'],
    [1, 'pizza', '🍕 피자', '🍔 햄버거', '🍜 국수'],
    [2, "I'd like to have the pizza.", '저는 피자를 먹고 싶어요.', '저는 피자를 만들고 싶어요.', '저는 피자를 사고 싶어요.'],
    [3, "How's the pizza?", "It's delicious.", 'Yes, I do.', 'No, thanks.']];
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), '문제');
  const guide = [['유형 1 = 낱말 보고 그림·뜻 고르기 (6초)'], ['유형 2 = 짧은 문장 뜻 고르기 (7초)'], ['유형 3 = 대화의 알맞은 응답 고르기 (9초)'], ['정답 칸이 정답이고, 오답1·오답2는 틀린 보기예요. 보기 순서는 게임에서 섞어요.']];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(guide), '안내');
  res.attachment('jump-chaos-questions.xlsx'); res.send(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
});
app.get('/api/bank.xlsx', (req, res) => {
  const rows = [['단원', '유형', '문제', '정답', '오답1', '오답2']];
  ['10', '11', '12'].forEach(u => { const b = Q.bankOf(u); [1, 2, 3].forEach(t => b[t].forEach(q => {
    const o = q.o || []; rows.push([u, t, q.q, q.a, o[0] || '(같은 단원 낱말에서 자동)', o[1] || '']); })); });
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), '기본 문제');
  res.attachment('jump-chaos-built-in.xlsx'); res.send(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
});
app.get('/api/results.xlsx', (req, res) => {
  if (!tokens.has(req.query.token)) return res.status(403).send('교사 로그인이 필요해요');
  const S = sessions[req.query.cls]; if (!S) return res.status(404).send('수업이 없어요');
  const rows = [['순위', '번호', '이름', '별명', '캐릭터', '점수', '완주', '첫 완주', '영어 정답', '함정 성공', '틀린 문제']];
  ranking(S).forEach((s, i) => rows.push([i + 1, s.num, s.name, s.nick, animalKo(s.animal), s.score, s.finishes, s.firsts, `${s.correct}/${s.asked}`, s.trapHits,
    s.wrongs.map(w => `${w.q} → ${w.aText}`).join(' / ')]));
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), `${S.cls} ${S.game}게임`);
  res.attachment(encodeURIComponent(`점프대소동_${S.cls}_${S.game}게임.xlsx`)); res.send(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
});
app.get('/api/info', (req, res) => res.json({ classes: CLASSES, units: Q.UNIT_LIST, open: Object.keys(sessions) }));

function animalKo(id) { const a = JC.ANIMALS.find(x => x.id === id); return a ? a.ko : id; }
function now() { return Date.now(); }
function rid() { return crypto.randomBytes(5).toString('hex'); }

// ── 수업(반별) ─────────────────────────────────────────
const sessions = {};
function genCode() { for (;;) { const c = 'JAM' + String(Math.floor(100 + Math.random() * 900)); if (!Object.values(sessions).some(x => x.code === c)) return c; } }
function cleanCode(c) { c = String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8); return c.length >= 4 ? c : ''; }
function sessionOf(d) { const code = cleanCode(d && d.code); if (code) return Object.values(sessions).find(x => x.code === code) || null; return d && CLASSES.includes(d.cls) ? sessions[d.cls] || null : null; }
function newSession(cls, unit, set) {
  return { cls, code: genCode(), setIds: [], used: {}, unit, set: set || 1, phase: 'lobby', round: 0, game: 1, phaseStart: now(), phaseEnd: 0, raceStart: 0, paused: false, pausedAt: 0,
    k: 0, mapIds: [], pieces: {}, students: new Map(), assign: {}, watch: 0, timer: null, custom: null, feed: [], firstFin: {} };
}
function studentObj(d) {
  return { sid: d.sid, num: d.num, name: d.name, nick: d.nick, animal: d.animal, sock: null, online: false,
    visited: new Set(), last: new Set(), active: false, seen: new Set(), quiz: [], ans: [], offer: [], placed: null, usedIdx: [], placedN: 0,
    fin: false, finOrder: 0, finTime: 0, trapRound: 0, deaths: 0, rp: 0,
    score: 0, finishes: 0, firsts: 0, correct: 0, asked: 0, trapHits: 0, wrongs: [] };
}
function resetGameStats(s) {
  Object.assign(s, { visited: new Set(), last: new Set(), score: 0, finishes: 0, firsts: 0, correct: 0, asked: 0, trapHits: 0, wrongs: [], active: false });
}
function students(S) { return [...S.students.values()]; }
function takenOf(S, except) { return new Set(students(S).filter(o => o !== except).map(o => o.animal)); }
function emitTaken(S) { io.to('P|' + S.cls).emit('taken', { cls: S.cls, code: S.code, open: true, list: students(S).map(o => ({ sid: o.sid, animal: o.animal })) }); }
function ranking(S) { return students(S).filter(s => s.asked || s.active || s.score).sort((a, b) => b.score - a.score || b.finishes - a.finishes || b.correct - a.correct || a.num - b.num); }
function mapOf(S, s) { const i = S.assign[s.sid]; return i == null ? null : JC.mapById(S.mapIds[i]); }
function matesOf(S, idx) { return students(S).filter(s => s.active && S.assign[s.sid] === idx); }
function room(S, mapId) { return S.cls + '|' + mapId; }
function label(s) { return s.nick || s.name; }

function setPhase(S, phase, secs) {
  clearTimeout(S.timer);
  S.phase = phase; S.phaseStart = now(); S.phaseEnd = secs ? S.phaseStart + secs * 1000 : 0;
  if (phase === 'race') { S.raceStart = S.phaseStart + JC.RACE_COUNTDOWN * 1000; }
  if (secs && !S.paused) S.timer = setTimeout(() => advance(S), secs * 1000);
  broadcast(S);
}
function advance(S) {
  if (S.paused) return;
  const p = S.phase;
  if (p === 'preview') startQuiz(S);
  else if (p === 'quiz') startPlace(S);
  else if (p === 'place') startRace(S);
  else if (p === 'race') endRace(S);
  else if (p === 'result') { if (S.round >= ROUNDS) finishGame(S); else nextRound(S); }
}

function startGame(S) {
  S.pieces = {}; S.round = 0; S.feed = [];
  students(S).forEach(resetGameStats);
  S.setIds = JC.mapsOfSet(S.set).map(m => m.id);
  S.setIds.forEach(id => S.pieces[id] = []);
  S.mapIds = []; S.used = {}; S.gameMaps = new Set();
  nextRound(S);
}
function nextRound(S) {
  const list = students(S).filter(s => s.online || s.active);
  students(S).forEach(s => { s.active = false; });
  list.forEach(s => s.active = true);
  if (!list.length) { setPhase(S, 'lobby'); return; }
  S.round++;
  S.event = S.round === ROUNDS && ROUNDS > 1 ? Object.keys(JC.EVENTS)[Math.floor(Math.random() * 3)] : null;   // 마지막 라운드 깜짝 이벤트
  S.coins = {};
  S.k = Math.max(S.k && S.round > 1 ? S.k : 0, mapCount(list.length));
  if (S.round === 1) S.k = mapCount(list.length);
  // 이번 라운드에 쓸 맵 k개: 이번 게임에서 덜 쓴 맵 → 지난 게임에 안 쓴 맵 → 무작위 순서
  const prev = S.prevMaps || new Set(), rnd = {}; S.setIds.forEach(id => rnd[id] = Math.random());
  S.mapIds = S.setIds.slice().sort((a, b) => ((S.used[a] || 0) - (S.used[b] || 0)) || ((S.round === 1 ? (prev.has(a) - prev.has(b)) : 0)) || (rnd[a] - rnd[b])).slice(0, S.k).sort((a, b) => rnd[a] - rnd[b]);
  S.mapIds.forEach(id => { S.used[id] = (S.used[id] || 0) + 1; S.gameMaps.add(id); });
  const res = assign(list.map(s => ({ sid: s.sid, visited: new Set(S.mapIds.map((id, i) => s.visited.has(id) ? i : -1).filter(i => i >= 0)), last: s.last })), S.k);
  S.assign = res;
  list.forEach(s => { s.visited.add(S.mapIds[res[s.sid]]); s.quiz = []; s.ans = []; s.offer = []; s.placed = null; s.fin = false; s.finOrder = 0; s.trapRound = 0; s.deaths = 0; s.rp = 0; });
  list.forEach(s => { s.last = new Set(list.filter(o => o !== s && res[o.sid] === res[s.sid]).map(o => o.sid)); });
  S.firstFin = {}; S.feed = [];
  list.forEach(s => { s.shield = !!s.shieldNext && S.round > 1; s.shieldNext = false; s.got = []; s.coinN = 0; });
  // 소켓 방 정리
  students(S).forEach(s => { const sock = s.sock && io.sockets.sockets.get(s.sock); if (!sock) return;
    S.setIds.forEach(id => sock.leave(room(S, id))); if (s.active) sock.join(room(S, S.mapIds[res[s.sid]])); });
  setPhase(S, 'preview', JC.PHASE.preview);
}
function bank(S) { return Q.bankOf(S.unit, S.custom); }
function startQuiz(S) {
  const b = bank(S);
  students(S).filter(s => s.active).forEach(s => { s.quiz = Q.pickQuiz(b, s.seen); s.ans = [null, null, null]; });
  setPhase(S, 'quiz', JC.PHASE.quiz);
}
function answer(S, s, qi, choice) {
  if (S.phase !== 'quiz' || !s.active || !s.quiz[qi] || s.ans[qi] != null) return null;
  const sch = JC.quizSchedule()[qi], el = (now() - S.phaseStart) / 1000;
  if (el > sch.end + 0.8) return null;
  const q = s.quiz[qi], ok = choice === q.answer;
  s.ans[qi] = { choice, ok };
  return { qi, ok, answer: q.answer };
}
// 조각은 한 사람이 두 개씩 놓아요. 정답 3개 → 후보 4개, 2개 → 후보 3개, 0~1개 → 2개 자동 지급
const PLACE_N = 2;
function need(s) { return Math.min(PLACE_N, s.offer.length); }
function offerFor(S, s) {
  const ok = s.ans.filter(a => a && a.ok).length;
  const m = mapOf(S, s); const hasStudentPieces = (S.pieces[m.id] || []).length > 0;
  const n = ok >= 3 ? 4 : ok === 2 ? 3 : 2;
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const out = [pick(JC.TRAP), pick(JC.HELP)];           // 함정 하나, 도움 하나는 꼭 들어가요
  while (out.length < n) {
    const rest = (Math.random() < 0.55 ? JC.TRAP : JC.HELP).filter(x => !out.includes(x)); if (rest.length) out.push(pick(rest));
  }
  const list = Q.shuffle(out); if (hasStudentPieces) list.push('eraser');   // 지우개는 언제나 마지막 후보로
  return { ok, list };
}
function startPlace(S) {
  students(S).filter(s => s.active).forEach(s => {
    // 퀴즈 기록
    s.quiz.forEach((q, i) => { s.asked++; const a = s.ans[i]; if (a && a.ok) { s.correct++; add(S, s, 1); } else s.wrongs.push({ q: q.q, aText: q.aText, mine: a ? q.choices[a.choice] : '(시간 초과)', round: S.round }); });
    const o = offerFor(S, s); s.offer = o.list; s.okCount = o.ok; s.placed = null; s.usedIdx = []; s.placedN = 0;
  });
  setPhase(S, 'place', JC.PHASE.place);
}
function markPlaced(s, choice, what) { s.usedIdx.push(choice); s.placedN++; if (s.placedN >= need(s)) s.placed = what; }
function place(S, s, d) {
  if (S.phase !== 'place' || !s.active || s.placed) return { ok: false, reason: '지금은 설치할 수 없어요' };
  const choice = d.choice | 0, type = s.offer[choice]; if (!type) return { ok: false, reason: '조각을 골라요' };
  if (s.usedIdx.includes(choice)) return { ok: false, reason: '이미 놓은 조각이에요' };
  const m = mapOf(S, s), list = S.pieces[m.id];
  if (type === 'eraser') {
    const i = list.findIndex(p => p.id === d.target);
    if (i < 0) return { ok: false, reason: '지울 조각을 눌러요' };
    const [gone] = list.splice(i, 1);
    markPlaced(s, choice, { type: 'eraser', erased: gone.type });
    pushFeed(S, m.id, `${label(s)}이(가) ${JC.PIECES[gone.type].ko}을(를) 지웠어요!`);
    emitPieces(S, m.id); return { ok: true, done: !!s.placed };
  }
  const p = { id: rid(), type, gx: d.gx | 0, gy: d.gy | 0, rot: JC.PIECES[type].rot ? ((d.rot | 0) % JC.PIECES[type].rot) : 0, owner: s.sid, ownerName: label(s), round: S.round };
  const chk = JC.canPlace(m, list, p); if (!chk.ok) return chk;
  list.push(p); markPlaced(s, choice, p); emitPieces(S, m.id);
  return { ok: true, piece: p, done: !!s.placed };
}
function autoPlace(S) {   // 시간 안에 못 놓은 조각은 무작위 자리에 놓아요
  students(S).filter(s => s.active && !s.placed && s.offer.length).forEach(s => {
    const m = mapOf(S, s), list = S.pieces[m.id];
    let guard = 0;
    while (!s.placed && guard++ < 6) {
      const free = s.offer.map((t, i) => i).filter(i => !s.usedIdx.includes(i)); if (!free.length) break;
      const i = free.find(k => s.offer[k] !== 'eraser'); const choice = i != null ? i : free[0], type = s.offer[choice];
      if (type === 'eraser') { if (list.length) place(S, s, { choice, target: list[Math.floor(Math.random() * list.length)].id }); else markPlaced(s, choice, { type: 'skip' }); continue; }
      const spot = JC.randomSpot(m, list, type);
      if (spot) { const p = Object.assign(spot, { id: rid(), owner: s.sid, ownerName: label(s), round: S.round, auto: true }); list.push(p); markPlaced(s, choice, p); }
      else markPlaced(s, choice, { type: 'skip' });
    }
    if (!s.placed) s.placed = { type: 'skip' };
  });
  S.mapIds.forEach(id => emitPieces(S, id));
}
function startRace(S) {
  autoPlace(S);
  S.pos = {};
  S.mapIds.forEach(id => { S.coins[id] = JC.coinSpots(JC.mapById(id), S.pieces[id] || [], S.event === 'coinrain' ? 8 : 4); });
  const b = bank(S);
  students(S).filter(s => s.active).forEach(s => { const qs = Q.pickQuiz(b, new Set(s.seen)); s.reviveQ = qs[Math.random() < 0.6 ? 0 : 1] || qs[0] || null; s.reviveUsed = false; });
  setPhase(S, 'race', JC.PHASE.race);
}
function finish(S, s) {
  if (S.phase !== 'race' || !s.active || s.fin) return;
  const t = now(); if (t < S.raceStart + 1500) return; // 너무 빠른 도착은 무시
  const m = mapOf(S, s); s.fin = true; s.finTime = (t - S.raceStart) / 1000;
  const order = matesOf(S, S.assign[s.sid]).filter(o => o.fin).length; s.finOrder = order;
  s.finishes++; add(S, s, 3);
  let first = false;
  if (order === 1) { s.firsts++; add(S, s, 2); first = true; S.firstFin[m.id] = s.sid; }
  pushFeed(S, m.id, first ? `🏁 ${label(s)} 첫 완주! (${s.finTime.toFixed(1)}초)` : `🚩 ${label(s)} 완주!`);
  io.to(room(S, m.id)).emit('fin', { sid: s.sid, order, time: s.finTime });
  if (s.sock) io.to(s.sock).emit('state', studentState(S, s));
  teacherState(S);
  // 모두 끝나면 일찍 마치기
  const act = students(S).filter(o => o.active && o.online);
  if (act.length && act.every(o => o.fin)) { clearTimeout(S.timer); S.timer = setTimeout(() => S.phase === 'race' && !S.paused && endRace(S), 1500); }
}
function ko(S, s, by) {
  if (S.phase !== 'race' || !s.active) return;
  s.deaths++;
  const m = mapOf(S, s); const p = (S.pieces[m.id] || []).find(x => x.id === by);
  if (p && p.owner !== s.sid) {
    const o = S.students.get(p.owner);
    if (o && o.trapRound < 3) { o.trapRound++; o.trapHits++; add(S, o, 1); }
    if (o) pushFeed(S, m.id, `💥 ${label(s)} ← ${o ? label(o) : ''}의 ${JC.PIECES[p.type].ko}`);
  }
}
function add(S, s, n) { n *= S.event === 'double' ? 2 : 1; s.score += n; s.rp += n; }
function endRace(S) {
  clearTimeout(S.timer);
  // 역전 방패: 맵마다 이번 라운드에 완주하지 못한 친구 중 점수가 가장 낮은 한 명이 다음 라운드에 방패를 받아요
  students(S).forEach(s => { s.shieldNext = false; });
  if (S.round < ROUNDS) S.mapIds.forEach((id, i) => { const ms = matesOf(S, i).filter(o => !o.fin); if (!ms.length || matesOf(S, i).length < 2) return;
    ms.sort((a, b) => a.rp - b.rp || a.score - b.score); ms[0].shieldNext = true; });
  setPhase(S, 'result', JC.PHASE.result);
}
function finishGame(S) {
  S.prevMaps = new Set(S.gameMaps || []);
  setPhase(S, 'final');
  try {
    fs.writeFileSync(path.join(DATA, `result_${S.cls}_${new Date().toISOString().slice(0, 10)}_${S.game}.json`),
      JSON.stringify(ranking(S).map(s => ({ num: s.num, name: s.name, score: s.score, finishes: s.finishes, firsts: s.firsts, correct: s.correct, asked: s.asked, wrongs: s.wrongs })), null, 1));
  } catch (e) { }
}
function pushFeed(S, mapId, text) {
  S.feed.push({ mapId, text, t: now() }); if (S.feed.length > 60) S.feed.shift();
  io.to(room(S, mapId)).to('T|' + S.cls).emit('feed', { mapId, text });
}
function emitPieces(S, mapId) {
  const msg = { mapId, pieces: S.pieces[mapId] || [] };
  io.to(room(S, mapId)).to('T|' + S.cls).emit('pieces', msg);
}

// ── 상태 보내기 ──────────────────────────────────────
function baseState(S) {
  return { cls: S.cls, code: S.code, unit: S.unit, unitTitle: (Q.UNIT_LIST.find(u => u.id === S.unit) || {}).ko, set: S.set, phase: S.phase, round: S.round, rounds: ROUNDS, game: S.game,
    event: S.event || null,
    phaseStart: S.phaseStart, phaseEnd: S.phaseEnd, raceStart: S.raceStart, paused: S.paused, pausedAt: S.pausedAt, serverNow: now() };
}
function mapResult(S, idx) {
  return matesOf(S, idx).map(o => ({ sid: o.sid, name: label(o), animal: o.animal, fin: o.fin, order: o.finOrder, time: o.finTime, rp: o.rp, trap: o.trapRound, coin: o.coinN || 0 }))
    .sort((a, b) => (b.fin - a.fin) || (a.order - b.order) || b.rp - a.rp);
}
function studentState(S, s) {
  const st = baseState(S);
  st.online = students(S).filter(o => o.online).length;
  st.me = { sid: s.sid, name: s.name, nick: s.nick, animal: s.animal, num: s.num, score: s.score, finishes: s.finishes, firsts: s.firsts, correct: s.correct, asked: s.asked, active: s.active };
  if (s.active && S.round && S.phase !== 'final') {
    const idx = S.assign[s.sid], m = JC.mapById(S.mapIds[idx]);
    st.map = { id: m.id, slot: JC.SLOT[idx], idx };
    st.mates = matesOf(S, idx).map(o => ({ sid: o.sid, name: label(o), animal: o.animal, online: o.online }));
    st.pieces = S.pieces[m.id];
    st.mySpawn = st.mates.findIndex(o => o.sid === s.sid);
    if (S.phase === 'quiz') st.quiz = s.quiz.map(q => ({ t: q.t, q: q.q, choices: q.choices })), st.ans = s.ans.map((a, i) => a ? { ok: a.ok, choice: a.choice, answer: s.quiz[i].answer } : null);
    if (S.phase === 'place' || S.phase === 'race') { st.offer = s.offer; st.okCount = s.okCount; st.placed = s.placed; st.usedIdx = s.usedIdx || []; st.placedN = s.placedN || 0; st.need = need(s); }
    st.shield = !!s.shield;
    if (S.phase === 'race') { st.fin = s.fin; st.coins = (S.coins || {})[m.id] || []; st.got = s.got || []; if (s.reviveQ && !s.reviveUsed) st.revive = { t: s.reviveQ.t, q: s.reviveQ.q, choices: s.reviveQ.choices }; }
    if (S.phase === 'result') { st.result = mapResult(S, idx); st.rp = s.rp; st.quizReview = s.quiz.map((q, i) => ({ q: q.q, a: q.aText, ok: !!(s.ans[i] && s.ans[i].ok) })); }
  }
  if (S.phase === 'final') {
    const r = ranking(S); st.rank = r.findIndex(o => o.sid === s.sid) + 1; st.total = r.length;
    st.top = r.slice(0, 5).map(o => ({ name: label(o), animal: o.animal, score: o.score, finishes: o.finishes }));
    st.wrongs = s.wrongs;
  }
  return st;
}
function teacherPayload(S) {
  const st = baseState(S);
  st.students = students(S).sort((a, b) => a.num - b.num).map(s => ({ sid: s.sid, num: s.num, name: s.name, nick: s.nick, animal: s.animal, online: s.online, active: s.active,
    slot: s.active && S.assign[s.sid] != null ? JC.SLOT[S.assign[s.sid]] : '', score: s.score, finishes: s.finishes, firsts: s.firsts, correct: s.correct, asked: s.asked,
    answered: s.ans.filter(a => a).length, placed: !!s.placed, placedN: s.placedN || 0, fin: s.fin }));
  st.maps = S.mapIds.slice(0, S.k || 6).map((id, i) => { const ms = matesOf(S, i); const m = JC.mapById(id);
    return { slot: JC.SLOT[i], id, ko: m.ko, n: ms.length, fin: ms.filter(o => o.fin).length,
      mates: ms.map(o => ({ sid: o.sid, name: label(o), animal: o.animal, online: o.online })), pieces: S.pieces[id] || [], coins: S.phase === 'race' ? (S.coins || {})[id] || [] : [], result: S.phase === 'result' ? mapResult(S, i) : null }; });
  st.allMaps = S.set ? JC.mapsOfSet(S.set).map(m => m.id) : [];
  st.setKo = JC.SET_KO[S.set] || '';
  st.watch = S.watch;
  st.ranking = ranking(S).map(s => ({ name: s.name, nick: s.nick, num: s.num, animal: s.animal, score: s.score, finishes: s.finishes, firsts: s.firsts, correct: s.correct, asked: s.asked, trapHits: s.trapHits }));
  st.feed = S.feed.slice(-12);
  return st;
}
function teacherState(S) { io.to('T|' + S.cls).emit('t:state', teacherPayload(S)); }
function broadcast(S) {
  students(S).forEach(s => { if (s.sock) io.to(s.sock).emit('state', studentState(S, s)); });
  teacherState(S);
}

// 경기 중 위치 중계 (초당 약 12번)
setInterval(() => {
  Object.values(sessions).forEach(S => {
    if (S.phase !== 'race' || !S.pos) return;
    S.mapIds.forEach((id, i) => {
      const o = {}; let any = false;
      matesOf(S, i).forEach(s => { if (S.pos[s.sid]) { o[s.sid] = S.pos[s.sid]; any = true; } });
      if (any) io.to(room(S, id)).volatile.emit('pos', o);
    });
  });
}, 80);

// ── 소켓 ────────────────────────────────────────────────
io.on('connection', sock => {
  let S = null, me = null, teacher = false;
  sock.on('time', (t0, cb) => typeof cb === 'function' && cb(now()));

  // 학생 입장
  sock.on('stu:join', (d, cb) => {
    d = d || {};
    const found = sessionOf(d);
    if (!found) return cb && cb({ ok: false, code: 'nocode', reason: d.code ? '입장 코드를 다시 확인해 주세요' : '입장 코드를 써 주세요' });
    const cls = found.cls;
    const name = String(d.name || '').trim().slice(0, 8), num = parseInt(d.num, 10);
    if (!name || !(num > 0 && num < 60)) return cb && cb({ ok: false, reason: '번호와 이름을 써 주세요' });
    S = sessions[cls];
    let s = d.sid && S.students.get(d.sid);
    if (s && (s.num !== num || s.name !== name)) s = null; // 같은 태블릿을 다른 학생이 쓰는 경우
    if (!s) s = students(S).find(x => x.num === num && x.name === name);
    // 캐릭터는 한 반에서 한 명만: 다른 친구가 먼저 고른 동물은 고를 수 없어요(26종이 다 차면 그때만 겹쳐요)
    const takenSet = takenOf(S, s), want = JC.ANIMALS.some(a => a.id === d.animal) ? d.animal : null;
    const full = takenSet.size >= JC.ANIMALS.length;
    if (!s) {
      if (!want || (takenSet.has(want) && !full)) return cb && cb({ ok: false, code: 'taken', reason: '다른 친구가 먼저 고른 캐릭터예요. 다른 동물을 골라 주세요', taken: [...takenSet] });
      s = studentObj({ sid: rid(), num, name, nick: '', animal: want }); S.students.set(s.sid, s);
    } else if (want && want !== s.animal && (!takenSet.has(want) || full) && S.phase === 'lobby') s.animal = want;
    s.nick = String(d.nick || '').trim().slice(0, 5);
    if (s.sock && s.sock !== sock.id) { const old = io.sockets.sockets.get(s.sock); if (old) { old.emit('kicked', '다른 기기에서 같은 이름으로 들어왔어요'); old.disconnect(true); } }
    s.sock = sock.id; s.online = true; me = s;
    sock.join('S|' + cls);
    if (s.active && S.assign[s.sid] != null && S.mapIds.length) sock.join(room(S, S.mapIds[S.assign[s.sid]]));
    cb && cb({ ok: true, sid: s.sid, animal: s.animal });
    if (S.phase === 'lobby') broadcast(S); else { sock.emit('state', studentState(S, s)); teacherState(S); }
    emitTaken(S);
  });
  // 입장 화면에서 이미 고른 동물 보기
  sock.on('stu:peek', (d, cb) => { const P = sessionOf(d); [...sock.rooms].filter(r => r.startsWith('P|')).forEach(r => sock.leave(r));
    if (!P) return cb && cb({ open: false, taken: [] }); sock.join('P|' + P.cls);
    cb && cb({ open: !!P, cls: P.cls, taken: P ? [...takenOf(P, P.students.get(d.sid) || students(P).find(x => x.num === parseInt(d.num, 10) && x.name === String(d.name || '').trim()))] : [] }); });
  sock.on('stu:answer', (d, cb) => { if (!S || !me) return; const r = answer(S, me, d.qi | 0, d.choice | 0); cb && cb(r); if (r) teacherState(S); });
  sock.on('stu:place', (d, cb) => { if (!S || !me) return; const r = place(S, me, d || {}); cb && cb(r); if (r.ok) { teacherState(S); sock.emit('state', studentState(S, me)); } });
  sock.on('stu:pos', d => { if (!S || !me || S.phase !== 'race') return; if (!S.pos) S.pos = {}; S.pos[me.sid] = d; });
  sock.on('stu:ko', d => { if (S && me) ko(S, me, d && d.by); });
  sock.on('stu:finish', () => { if (S && me) finish(S, me); });
  sock.on('stu:coin', (d, cb) => { if (!S || !me || S.phase !== 'race' || !me.active) return; const m = mapOf(S, me), list = (S.coins || {})[m.id] || [], i = d && d.i | 0;
    if (!list[i] || me.got.includes(i)) return; me.got.push(i); me.coinN++; me.coinsAll = (me.coinsAll || 0) + 1; add(S, me, 1); cb && cb({ ok: true, score: me.score }); });
  sock.on('stu:shield', () => { if (!S || !me || S.phase !== 'race' || !me.shield) return; me.shield = false; const m = mapOf(S, me); pushFeed(S, m.id, `🛡 ${label(me)} 방패로 막았어요!`); });
  sock.on('stu:revive', (d, cb) => { if (!S || !me || S.phase !== 'race' || !me.active || me.reviveUsed || !me.reviveQ) return cb && cb({ ok: false, used: true });
    me.reviveUsed = true; const choice = d && d.choice, ok = choice === me.reviveQ.answer; if (ok) { me.revives = (me.revives || 0) + 1; const m = mapOf(S, me); pushFeed(S, m.id, `🛟 ${label(me)} 영어로 부활!`); }
    cb && cb({ ok, answer: me.reviveQ.answer }); });

  // 교사
  sock.on('t:login', (d, cb) => { if (pwOk(d && d.pw)) { const tk = rid() + rid(); tokens.add(tk); teacher = true; cb({ ok: true, token: tk }); } else cb({ ok: false }); });
  sock.on('t:resume-token', (d, cb) => { if (d && tokens.has(d.token)) { teacher = true; cb({ ok: true }); } else cb({ ok: false }); });
  const T = (name, fn) => sock.on(name, (d, cb) => { if (!teacher) return cb && cb({ ok: false, reason: '로그인이 필요해요' }); try { fn(d || {}, cb || (() => { })); } catch (e) { console.error(e); cb && cb({ ok: false, reason: e.message }); } });
  T('t:open', (d, cb) => {
    const cls = CLASSES.includes(d.cls) ? d.cls : null; if (!cls) return cb({ ok: false, reason: '반을 골라요' });
    if (S) sock.leave('T|' + S.cls);
    if (!sessions[cls]) sessions[cls] = newSession(cls, d.unit || '10', d.set || 1);
    S = sessions[cls];
    if (S.phase === 'lobby') { if (d.unit) S.unit = d.unit; if (JC.SETS[d.set | 0]) S.set = d.set | 0; setCode(S, d.code); }
    sock.join('T|' + cls); joinWatch(); cb({ ok: true }); teacherState(S); emitTaken(S);
  });
  function setCode(P, c) { c = cleanCode(c); if (!c || c === P.code || Object.values(sessions).some(x => x !== P && x.code === c)) return false; P.code = c; return true; }
  T('t:suggest', (d, cb) => { const P = CLASSES.includes(d.cls) ? sessions[d.cls] : null; cb({ ok: true, code: P && !d.fresh ? P.code : genCode(), open: !!P }); });
  function joinWatch() { if (!S) return; [...sock.rooms].filter(r => r.startsWith(S.cls + '|')).forEach(r => sock.leave(r)); if (S.mapIds[S.watch]) sock.join(room(S, S.mapIds[S.watch])); }
  T('t:settings', (d, cb) => { if (!S) return cb({ ok: false });
    if (d.unit) S.unit = d.unit;
    if (d.code) setCode(S, d.code === 'new' ? genCode() : d.code);
    if (JC.SETS[d.set | 0] && (S.phase === 'lobby' || S.phase === 'final')) S.set = d.set | 0;
    cb({ ok: true }); broadcast(S); });
  T('t:start', (d, cb) => { if (!S) return cb({ ok: false });
    if (!students(S).some(s => s.online)) return cb({ ok: false, reason: '아직 들어온 학생이 없어요' });
    if (S.phase === 'final') { S.game++; }
    S.paused = false; startGame(S); joinWatch(); cb({ ok: true }); });
  T('t:pause', (d, cb) => { if (!S || S.paused || ['lobby', 'final'].includes(S.phase)) return cb({ ok: false });
    S.paused = true; S.pausedAt = now(); clearTimeout(S.timer); broadcast(S); cb({ ok: true }); });
  T('t:resume', (d, cb) => { if (!S || !S.paused) return cb({ ok: false });
    const sh = now() - S.pausedAt; S.paused = false; S.phaseStart += sh; if (S.phaseEnd) S.phaseEnd += sh; S.raceStart += sh;
    if (S.phaseEnd) S.timer = setTimeout(() => advance(S), Math.max(0, S.phaseEnd - now()));
    broadcast(S); cb({ ok: true }); });
  T('t:skip', (d, cb) => { if (!S || ['lobby', 'final'].includes(S.phase)) return cb({ ok: false }); S.paused = false; clearTimeout(S.timer); advance(S); joinWatch(); cb({ ok: true }); });
  T('t:end', (d, cb) => { if (!S) return cb({ ok: false }); S.paused = false; clearTimeout(S.timer); if (S.round) finishGame(S); else setPhase(S, 'lobby'); cb({ ok: true }); });
  T('t:lobby', (d, cb) => { if (!S) return cb({ ok: false }); clearTimeout(S.timer); S.paused = false; S.round = 0; S.assign = {}; students(S).forEach(s => s.active = false); setPhase(S, 'lobby'); cb({ ok: true }); });
  T('t:watch', (d, cb) => { if (!S) return cb({ ok: false }); S.watch = Math.max(0, Math.min(5, d.idx | 0)); joinWatch(); teacherState(S); cb({ ok: true }); });
  T('t:kick', (d, cb) => { if (!S) return cb({ ok: false }); const s = S.students.get(d.sid); if (!s) return cb({ ok: false });
    if (s.sock) { const so = io.sockets.sockets.get(s.sock); if (so) { so.emit('kicked', '선생님이 내보냈어요'); so.disconnect(true); } }
    S.students.delete(d.sid); if (S.phase === 'lobby') broadcast(S); else teacherState(S); emitTaken(S); cb({ ok: true }); });
  T('t:resetMaps', (d, cb) => { if (!S) return cb({ ok: false }); Object.keys(S.pieces).forEach(k => S.pieces[k] = []); S.mapIds.forEach(id => emitPieces(S, id)); cb({ ok: true }); });
  T('t:upload', (d, cb) => {
    if (!S) return cb({ ok: false });
    const wb = XLSX.read(Buffer.from(d.data), { type: 'buffer' });
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
    const b = { 1: [], 2: [], 3: [] }; let n = 0;
    rows.slice(1).forEach(r => { const t = parseInt(r[0], 10); if (![1, 2, 3].includes(t) || !r[1] || !r[2] || !r[3] || !r[4]) return;
      b[t].push({ t, unit: 'custom', q: String(r[1]).trim(), a: String(r[2]).trim(), o: [String(r[3]).trim(), String(r[4]).trim()] }); n++; });
    if (!n) return cb({ ok: false, reason: '문제를 찾지 못했어요. 양식(유형·문제·정답·오답1·오답2)을 확인해 주세요.' });
    S.custom = b; S.unit = 'custom'; cb({ ok: true, n, by: [b[1].length, b[2].length, b[3].length] }); broadcast(S);
  });

  sock.on('disconnect', () => {
    if (me && S && me.sock === sock.id) { me.online = false; me.sock = null; if (S.phase === 'lobby') broadcast(S); else teacherState(S); }
  });
});

server.listen(PORT, () => console.log(`점프 대소동! 서버 실행 중 → http://localhost:${PORT}  (교사: /teacher)`));
module.exports = { server, sessions };
