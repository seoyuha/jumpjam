// 가상 학생 30명 + 교사로 3라운드 전체 진행 시험
process.env.PORT = 3999;
const { sessions } = require('../server.js');
const ioc = require('socket.io-client');
const JC = require('../public/shared.js');
const URL = 'http://localhost:3999';
const N = +(process.argv[2] || 30);
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fails++; };

(async () => {
  const t = ioc(URL, { transports: ['websocket'] });
  const emit = (s, e, d) => new Promise(r => s.emit(e, d || {}, r));
  const bad = await emit(t, 't:login', { pw: 'nope' }); ok(!bad.ok, '틀린 비밀번호 거절');
  ok((await emit(t, 't:login', { pw: 'finel9932!' })).ok, '교사 로그인');
  let tstate = null; t.on('t:state', s => tstate = s);
  ok((await emit(t, 't:open', { cls: '9반', unit: '10', set: 1, code: 'JAM428' })).ok, '9반 수업 열기');
  await sleep(100); const CODE = tstate.code; ok(CODE === 'JAM428', '입장 코드 ' + CODE);
  { const x = ioc(URL, { transports: ['websocket'] }); const r = await emit(x, 'stu:join', { code: 'NOPE99', num: 1, name: '틀림', animal: 'chick' }); ok(!r.ok, '틀린 코드는 거절: ' + r.reason); x.close(); }

  const studs = [];
  for (let i = 0; i < N; i++) {
    const s = ioc(URL, { transports: ['websocket'] }); const o = { s, i, st: null, pieces: [] };
    s.on('state', x => { o.st = x; if (x.pieces) o.pieces = x.pieces; });
    s.on('pieces', d => { if (o.st && o.st.map && d.mapId === o.st.map.id) o.pieces = d.pieces; });
    const r = await emit(s, 'stu:join', { code: i % 2 ? 'jam428' : CODE, num: i + 1, name: '학생' + (i + 1), nick: i % 3 ? '' : '별' + i, animal: JC.ANIMALS[i % JC.ANIMALS.length].id });
    if (!r.ok) console.log(r); studs.push(o);
  }
  await sleep(300);
  ok(tstate.students.filter(s => s.online).length === N, `${N}명 입장`);
  ok(new Set(tstate.students.map(s => s.animal)).size === Math.min(JC.ANIMALS.length, N), '모두 다른 동물(' + JC.ANIMALS.length + '종)');
  { const x = ioc(URL, { transports: ['websocket'] });
    if (N < JC.ANIMALS.length) { const r = await emit(x, 'stu:join', { cls: '9반', num: 55, name: '겹침', animal: tstate.students[0].animal }); ok(!r.ok && r.code === 'taken', '이미 고른 동물은 거절: ' + r.reason); }
    const pk = await emit(x, 'stu:peek', { cls: '9반' }); ok(pk.open && pk.taken.length === Math.min(JC.ANIMALS.length, N), '입장 화면에 고른 동물 ' + pk.taken.length + '종 표시'); x.close(); }
  ok((await emit(t, 't:start')).ok, '게임 시작');
  const visits = {}, mates = {}, roundMaps = [];
  for (let round = 1; round <= 3; round++) {
    await sleep(300);
    const S = sessions['9반'];
    ok(S.phase === 'preview' && S.round === round, `${round}라운드 미리보기`);
    // 배정 확인
    const groups = {}; Object.entries(S.assign).forEach(([sid, m]) => { (groups[m] = groups[m] || []).push(sid); (visits[sid] = visits[sid] || []).push(S.mapIds[m]); });
    roundMaps.push(S.mapIds.slice());
    const sizes = Object.values(groups).map(g => g.length);
    ok(Math.max(...sizes) - Math.min(...sizes) <= 1, `맵 ${sizes.length}개 · 인원 ${sizes.join('/')}`);
    let repeatPairs = 0; Object.values(groups).forEach(g => g.forEach(a => g.forEach(b => { if (a < b) { const k = a + b; if (mates[k] === round - 1) repeatPairs++; mates[k] = round; } })));
    console.log('     직전 라운드와 같은 팀원 쌍:', repeatPairs);
    await emit(t, 't:skip'); await sleep(300);
    ok(S.phase === 'quiz', '퀴즈 시작');
    ok(studs.every(o => o.st.quiz && o.st.quiz.length === 3), '모두 문제 3개');
    // 1번 정답 하나씩만 랜덤
    for (const o of studs) for (let qi = 0; qi < 3; qi++) {
      const sq = S.students.get(o.st.me.sid).quiz[qi];
      const choice = o.i % 4 === 0 ? (sq.answer + 1) % 3 : sq.answer; // 4명에 1명은 틀리게
      if (qi === 0) await emit(o.s, 'stu:answer', { qi, choice });
    }
    // 2,3번은 시간에 맞춰 내야 해서 시간표를 건너뛰고 직접 기록
    for (const o of studs) { const sx = S.students.get(o.st.me.sid); sx.ans[1] = { choice: sx.quiz[1].answer, ok: true }; sx.ans[2] = o.i % 2 ? { choice: sx.quiz[2].answer, ok: true } : null; }
    await emit(t, 't:skip'); await sleep(300);
    ok(S.phase === 'place', '조각 설치 시작');
    const offerSizes = {}; studs.forEach(o => { offerSizes[o.st.offer.length] = (offerSizes[o.st.offer.length] || 0) + 1; });
    console.log('     후보 수 분포:', JSON.stringify(offerSizes));
    // 절반은 직접 두 개 설치, 나머지는 자동
    let placedOk = 0;
    for (const o of studs.filter(o => o.i % 2 === 0)) {
      const m = JC.mapById(o.st.map.id);
      for (const choice of [0, 1]) { const type = o.st.offer[choice];
        if (type === 'eraser') { const tg = o.pieces[0]; if (tg) { const r = await emit(o.s, 'stu:place', { choice, target: tg.id }); if (r.ok) placedOk++; } continue; }
        const sp = JC.randomSpot(m, o.pieces, type); const r = await emit(o.s, 'stu:place', { choice, gx: sp.gx, gy: sp.gy, rot: sp.rot }); if (r.ok) placedOk++; else console.log('     설치 실패', r.reason); await sleep(5); }
    }
    console.log('     직접 설치 성공:', placedOk);
    { const o = studs[0]; const r = await emit(o.s, 'stu:place', { choice: 0, gx: 20, gy: 5, rot: 0 }); ok(!r.ok, '두 개를 놓은 뒤에는 더 못 놓음: ' + r.reason); }
    // 겹치게 설치 시도 → 거절
    const o0 = studs[1]; const p0 = o0.pieces[0];
    if (p0) { const r = await emit(o0.s, 'stu:place', { choice: 0, gx: p0.gx, gy: p0.gy, rot: 0 }); ok(!r.ok, '겹치는 자리 거절: ' + r.reason); }
    await emit(t, 't:skip'); await sleep(300);
    ok(S.phase === 'race', '경기 시작');
    ok(studs.every(o => o.st.placed && o.st.placedN === 2), '모두 조각 2개 설치(자동 포함)');
    const totalPieces = Object.values(S.pieces).reduce((a, l) => a + l.length, 0);
    console.log('     맵에 남은 조각 수:', totalPieces);
    // 경기: 위치 보내기 + 일부 도착, 함정 KO 1건
    await sleep(JC.RACE_COUNTDOWN * 1000 + 1700);
    for (const o of studs) o.s.emit('stu:pos', [100, 300, 1, 1, 0]);
    { const o = studs[0], sx = S.students.get(o.st.me.sid), before = sx.score, n = o.st.coins.length; ok(n >= 3, '동전 ' + n + '개' + (S.event ? ' · 이벤트 ' + S.event : ''));
      await emit(o.s, 'stu:coin', { i: 0 }); o.s.emit('stu:coin', { i: 0 }); await sleep(60); ok(sx.score - before === (S.event === 'double' ? 2 : 1), '동전 하나는 한 번만 점수');
      if (round === 3) ok(!!S.event && n === (S.event === 'coinrain' ? 8 : 4) || n < 8, '마지막 라운드에 깜짝 이벤트: ' + S.event);
      if (round > 1) console.log('     방패 받은 학생:', studs.filter(x => x.st.shield).length + '명'); }
    { const o = studs[0], sx = S.students.get(o.st.me.sid); ok(o.st.revive && o.st.revive.choices.length === 3, '경기 중 부활 문제 받음: ' + (o.st.revive && o.st.revive.q));
      const r1 = await emit(o.s, 'stu:revive', { choice: sx.reviveQ.answer }); const r2 = await emit(o.s, 'stu:revive', { choice: sx.reviveQ.answer }); ok(r1.ok && !r2.ok, '부활은 라운드마다 한 번만'); }
    const trap = Object.values(S.pieces).flat().find(p => p.type !== 'eraser');
    if (trap) { const victim = studs.find(o => o.st.map.id === Object.keys(S.pieces).find(k => S.pieces[k].includes(trap)) && o.st.me.sid !== trap.owner); if (victim) victim.s.emit('stu:ko', { by: trap.id }); }
    for (const o of studs) if (o.i % 3 !== 2) { o.s.emit('stu:finish'); }
    await sleep(400);
    ok(tstate.maps.reduce((x, m) => x + m.fin, 0) === studs.filter(o => o.i % 3 !== 2).length, '도착 신호를 보낸 학생이 모두 완주 처리됨 · ' + tstate.maps.map(m => m.slot + m.fin + '/' + m.n).join(' '));
    // 일시정지/재개
    await emit(t, 't:pause'); const pe = S.phaseEnd; await sleep(500); await emit(t, 't:resume');
    ok(S.phaseEnd - pe >= 450, '일시정지만큼 시간이 늘어남');
    await emit(t, 't:skip'); await sleep(300);
    ok(S.phase === 'result', '라운드 결과');
    const r0 = studs[0].st; ok(Array.isArray(r0.result) && r0.result.length > 0, '결과 목록: ' + r0.result.map(x => x.name + (x.fin ? '#' + x.order : '')).join(', '));
    await emit(t, 't:skip');
  }
  await sleep(300);
  const S = sessions['9반'];
  ok(S.phase === 'final', '게임 끝 → 최종 결과');
  console.log('     라운드별 맵:', roundMaps.map(r => r.join('·')).join(' | '));
  const rev = Object.values(visits).filter(v => new Set(v).size !== v.length).length;
  ok(rev === 0, '같은 맵 두 번 간 학생 ' + rev + '명');
  const f = studs[0].st; ok(f.rank > 0 && f.top.length === Math.min(5, N), `학생 화면: ${f.rank}등 / ${f.total}명, 틀린 문제 ${f.wrongs.length}개`);
  console.log('     1~3등:', tstate.ranking.slice(0, 3).map(s => `${s.name} ${s.score}점(완주${s.finishes} 첫${s.firsts} 영${s.correct}/${s.asked} 함정${s.trapHits})`).join(' | '));
  const tk = (await emit(t, 't:login', { pw: 'finel9932!' })).token;
  const res = await fetch(URL + '/api/results.xlsx?cls=' + encodeURIComponent('9반') + '&token=' + tk); ok(res.status === 200 && (await res.arrayBuffer()).byteLength > 1000, '결과 엑셀 내려받기');
  // 다음 게임: 맵 세트 2
  await emit(t, 't:settings', { set: 2 }); ok((await emit(t, 't:start')).ok && S.game === 2 && JC.SETS[2].includes(S.mapIds[0]), '다음 게임은 새 맵 세트로 시작');
  ok(Object.values(S.pieces).every(l => l.length === 0), '새 게임은 조각이 비어 있음');
  // 중간에 들어온 학생
  const late = ioc(URL, { transports: ['websocket'] }); let lst = null; late.on('state', x => lst = x);
  await emit(late, 'stu:join', { cls: '9반', num: 40, name: '늦게온', animal: JC.ANIMALS[JC.ANIMALS.length - 1].id }); await sleep(200);
  ok(lst && !lst.map, '늦게 온 학생은 다음 라운드를 기다림');
  await emit(t, 't:skip'); await emit(t, 't:skip'); await emit(t, 't:skip'); await emit(t, 't:skip'); await emit(t, 't:skip'); await sleep(300);
  ok(S.round === 2 && lst.map, '늦게 온 학생이 2라운드에 배정됨 → ' + (lst.map && lst.map.slot));
  console.log(fails ? `\n실패 ${fails}개` : '\n모두 통과');
  process.exit(fails ? 1 : 0);
})();
