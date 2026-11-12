// 점프 대소동! — 학생 화면
(() => {
  const $ = id => document.getElementById(id);
  const { T, WW, WH, PIECES } = JC;
  const sock = io({ transports: ['websocket', 'polling'] });
  let saved = {}; try { saved = JSON.parse(localStorage.getItem('jc_join') || '{}'); } catch (e) { }
  const oldAnimals = { chicken: 'chick', horse: 'zebra', chameleon: 'crocodile' };
  const savedAnimal = oldAnimals[saved.animal] || saved.animal;
  const urlCode = (new URLSearchParams(location.search).get('code') || '').toUpperCase();
  let pick = { code: urlCode || saved.code || '', animal: JC.ANIMALS.some(a => a.id === savedAnimal)
    ? savedAnimal : JC.ANIMALS[Math.floor(Math.random() * JC.ANIMALS.length)].id };
  let st = null, joined = false, off = 0, rtt = 1e9;
  const sNow = () => Date.now() + off;

  // ── 시간 맞추기 ──
  function sync() { for (let i = 0; i < 4; i++) setTimeout(() => { const t0 = Date.now(); sock.emit('time', t0, s => { const t1 = Date.now(); if (t1 - t0 <= rtt + 30) { rtt = Math.min(rtt, t1 - t0); off = s - (t0 + t1) / 2; } }); }, i * 300); }
  setInterval(() => { rtt += 40; sync(); }, 20000);

  // ── 첫 화면 ↔ 입장 화면 ──
  function showEntry() {
    if (joined) return;
    const joining = location.hash === '#join';
    $('home').classList.toggle('hide', joining);
    $('join').classList.toggle('hide', !joining);
    if (joining) peek();
  }
  addEventListener('hashchange', showEntry);
  $('backHome').onclick = () => { location.hash = ''; };
  $('openHow').onclick = () => $('how').showModal();

  // ── 입장 화면 ──
  const codeEl = $('code'); codeEl.value = pick.code; let peekT = 0;
  codeEl.addEventListener('input', () => { codeEl.value = codeEl.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); pick.code = codeEl.value; clearTimeout(peekT); peekT = setTimeout(peek, 250); });
  if (urlCode && !location.hash) location.hash = '#join';
  const an = $('animals');
  let taken = new Set(), allFull = false;
  JC.ANIMALS.forEach(a => { const b = document.createElement('button'); b.type = 'button'; b.dataset.animal = a.id; b.appendChild(JR.animalCard(a.id, 128)); b.appendChild(document.createTextNode(a.ko));
    b.onclick = () => { if (b.classList.contains('taken')) return err('다른 친구가 먼저 고른 캐릭터예요'); pick.animal = a.id; err(''); markAnimals(); }; an.appendChild(b); });
  // 이미 고른 동물은 흐리게 하고 누를 수 없어요. 내가 고른 동물이 뺏겼으면 남은 동물로 옮겨요.
  function markAnimals() {
    allFull = taken.size >= JC.ANIMALS.length;
    if (taken.has(pick.animal) && !allFull) { const free = JC.ANIMALS.filter(a => !taken.has(a.id)); pick.animal = free.length ? free[Math.floor(Math.random() * free.length)].id : pick.animal; }
    [...an.children].forEach(x => { const t = taken.has(x.dataset.animal) && !allFull; x.classList.toggle('taken', t); x.classList.toggle('on', x.dataset.animal === pick.animal); });
  }
  function peek() { if (pick.code.length < 4) { taken = new Set(); return markAnimals(); } sock.emit('stu:peek', { code: pick.code, sid: saved.sid, num: $('num').value, name: $('name').value.trim() }, r => { taken = new Set(r && r.taken || []); codeEl.classList.toggle('ok', !!(r && r.open)); markAnimals(); }); }
  sock.on('taken', d => { if (d.code !== pick.code || joined) return; const mine = d.list.find(o => o.sid === saved.sid); taken = new Set(d.list.filter(o => o !== mine).map(o => o.animal)); markAnimals(); });
  markAnimals();
  $('num').value = saved.num || ''; $('name').value = saved.name || ''; $('nick').value = saved.nick || '';
  ['go', 'backHome'].forEach(id => { const el = $(id); el.addEventListener('pointerdown', () => el.classList.add('down')); ['pointerup', 'pointerleave', 'pointercancel'].forEach(n => el.addEventListener(n, () => el.classList.remove('down'))); });
  $('go').onclick = () => { SFX.unlock(); doJoin(false); try { if (matchMedia('(pointer:coarse)').matches) document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(() => { }); } catch (e) { } };
  function doJoin(silent) {
    const d = { code: pick.code, num: $('num').value, name: $('name').value.trim(), nick: $('nick').value.trim(), animal: pick.animal, sid: saved.sid };
    if (!silent) { if (d.code.length < 4) return err('선생님이 알려 준 입장 코드를 써 주세요'); if (!d.num || !d.name) return err('번호와 이름을 써 주세요'); }
    sock.emit('stu:join', d, r => {
      if (!r || !r.ok) { if (r && r.taken) { taken = new Set(r.taken); markAnimals(); } if (!silent) err(r ? r.reason : '연결이 안 돼요'); return; }
      if (r.animal) { d.animal = r.animal; pick.animal = r.animal; }
      saved = Object.assign(d, { sid: r.sid }); localStorage.setItem('jc_join', JSON.stringify(saved)); joined = true;
      $('home').classList.add('hide'); $('join').classList.add('hide'); $('stage').classList.remove('hide'); err('');
    });
  }
  function err(m) { $('err').textContent = m || ''; }
  sock.on('connect', () => { sync(); if (joined || (saved.sid && saved.code && !urlCode)) doJoin(true); if (!joined) peek(); });
  showEntry();
  sock.on('kicked', m => { joined = false; alert(m); $('stage').classList.add('hide'); location.hash = '#join'; showEntry(); });

  // ── 상태 받기 ──
  let pieces = [], mapId = null, lastPhaseKey = '';
  sock.on('state', s => {
    const prev = st; st = s;
    if (s.map) { if (mapId !== s.map.id || !prev || prev.round !== s.round) { remote = {}; } mapId = s.map.id; pieces = s.pieces || []; } else mapId = null;
    const key = s.phase + '|' + s.round + '|' + s.game;
    if (key !== lastPhaseKey) { lastPhaseKey = key; enterPhase(); }
    $('pause').classList.toggle('hide', !s.paused);
    $('hScore').textContent = '⭐ ' + s.me.score + '점';
    ui();
  });
  sock.on('pieces', d => { if (d.mapId === mapId) { pieces = d.pieces; if (st && st.phase === 'place') ui(); } });
  sock.on('feed', d => { if (d.mapId === mapId) toast(d.text); });
  let remote = {};
  sock.on('pos', d => { if (!st) return; Object.keys(d).forEach(sid => { if (sid === st.me.sid) return; const a = d[sid];
    const r = remote[sid] || (remote[sid] = { x: a[0], y: a[1] }); r.tx = a[0]; r.ty = a[1]; r.f = a[2]; r.s = a[3]; r.fin = a[4]; r.at = performance.now(); }); });

  let toastT = 0;
  function toast(t) { let el = document.querySelector('.toast'); if (!el) { el = document.createElement('div'); el.className = 'toast'; $('wrap').appendChild(el); } el.textContent = t; el.style.opacity = 1; clearTimeout(toastT); toastT = setTimeout(() => el.style.opacity = 0, 2600); }

  // ── 단계별 화면 ──
  let quizLocal = [], placeSel = -1, ghost = null, eraseTarget = null, race = null;
  function enterPhase() {
    const p = st.phase;
    if (p === 'quiz') { quizLocal = [null, null, null]; lastSlot = -1; }
    if (p === 'place') { placeSel = -1; ghost = null; eraseTarget = null; }
    { const el = $('revive'); if (el) el.remove(); }
    if (p === 'race') startRace(); else race = null;
    if (p === 'result' && race) race = null;
  }
  const ov = $('ov'); let mini = null;
  function animalChip(a, name) { const s = document.createElement('span'); s.className = 'chip'; const cv = JR.animalCard(a, 52); s.appendChild(cv); s.appendChild(document.createTextNode(name)); return s; }
  function ui() {
    if (!st) return;
    const p = st.phase, me = st.me;
    $('stage').dataset.phase = p;
    $('ctrl').classList.toggle('hide', p !== 'race' || !st.map);
    $('placeBar').classList.toggle('hide', p !== 'place' || !st.map);
    $('hRound').textContent = st.round ? `${st.round} / ${st.rounds} 라운드` : '대기 중';
    $('hMap').innerHTML = st.map ? `<span class="pill">${st.map.slot} · ${JC.mapById(st.map.id).ko}</span>` : '';
    if (st.event && st.round) $('hMap').innerHTML += `<span class="pill event-pill">🎉 ${JC.EVENTS[st.event].ko}</span>`;
    ov.innerHTML = '';
    if (p === 'lobby' || (!st.map && p !== 'final')) {
      const d = document.createElement('div'); d.className = 'panel lobby-panel'; d.style.textAlign = 'center';
      d.innerHTML = `<h2>${p === 'lobby' ? '대기실' : '다음 라운드부터 함께해요!'}</h2><span class="tag-teal">입장 인원</span><div class="lobby-count">${st.online || 1}<small>명</small></div>
        <div class="lobby-bar"><i style="width:${Math.min(100, (st.online || 1) / 30 * 100)}%"></i></div><div class="lobby-me"></div>
        <div class="lobby-wait">${p === 'lobby' ? '선생님이 시작할 때까지 기다려요' : '이번 라운드가 끝나면 들어가요'}</div><span class="tag-teal wide">라운드마다 새 맵에 배정돼요</span>`;
      const meBox = d.querySelector('.lobby-me'); const cv2 = JR.animalCard(me.animal, 160); meBox.appendChild(cv2);
      const n = document.createElement('b'); n.textContent = `${me.num}번 ${me.name}${me.nick ? ' · ' + me.nick : ''}`; meBox.appendChild(n);
      ov.appendChild(d); return;
    }
    if (p === 'preview') {
      const d = document.createElement('div'); d.className = 'panel preview-panel';
      const m = JC.mapById(st.map.id);
      d.innerHTML = `<span class="tag-teal">${st.round} / ${st.rounds} 라운드</span>${st.event ? `<div class="event-tag">🎉 깜짝 이벤트 · ${JC.EVENTS[st.event].ko}<small>${JC.EVENTS[st.event].desc}</small></div>` : ''}${st.shield ? '<div class="shield-tag">🛡 역전 방패를 받았어요! 함정을 한 번 막아 줘요</div>' : ''}<h2>${st.map.slot}맵 · ${m.ko}</h2><canvas class="mini" width="640" height="352"></canvas><div class="muted">${m.desc}</div>
        <div class="with"><i></i>함께 뛸 친구들<i></i></div><div class="mates"></div><span class="tag-teal wide">잠시 후 영어 퀴즈가 시작돼요</span>`;
      mini = d.querySelector('.mini');
      const box = d.querySelector('.mates');
      st.mates.forEach(o => { const e = document.createElement('span'); e.appendChild(JR.animalCard(o.animal, 96)); const b = document.createElement('b'); b.textContent = o.name + (o.sid === me.sid ? ' (나)' : ''); e.appendChild(b); box.appendChild(e); });
      ov.appendChild(d); return;
    }
    if (p === 'quiz') { quizUI(); return; }
    if (p === 'place') { placeUI(); return; }
    if (p === 'result') { resultUI(); return; }
    if (p === 'final') { finalUI(); return; }
  }

  // ── 퀴즈 ──
  const KIND = { 1: '낱말을 보고 알맞은 그림과 뜻을 골라요', 2: '문장을 읽고 알맞은 뜻을 골라요', 3: '대화를 읽고 알맞은 응답을 골라요' };
  let lastSlot = -1;
  function curSlot() { const el = (sNow() - st.phaseStart) / 1000; const sch = JC.quizSchedule(); for (let i = 0; i < 3; i++) if (el < sch[i].end + JC.QUIZ_FB) return i; return 2; }
  function speak(text) { try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = 0.9; speechSynthesis.speak(u); } catch (e) { } }
  function quizUI() {
    if (!st.quiz || !st.quiz.length) { ov.innerHTML = '<div class="panel"><h2>문제를 준비하고 있어요</h2></div>'; return; }
    const qi = curSlot(); lastSlot = qi; const q = st.quiz[qi]; if (!q) return;
    const a = quizLocal[qi] || (st.ans && st.ans[qi]);
    const d = document.createElement('div'); d.className = 'quiz';
    const prompt = q.t === 3 ? `A: ${q.q}\nB: ________` : q.q;
    d.innerHTML = `<div class="top">학생 태블릿 · ${st.round} / ${st.rounds}라운드 <span style="flex:1"></span><button class="speak" id="spk">🔊 듣기</button></div>
      <h2 class="quiz-heading">영어 퀴즈</h2><div class="qn">${qi + 1} / 3문제 · 남은 시간 <span id="qt">-</span>초</div><div class="bar"><i id="qbar"></i></div>
      <div class="kind">${qi + 1}번 · ${KIND[q.t] || ''}</div><div class="prompt"></div><div class="opts"></div><div class="fb"></div>`;
    d.querySelector('.prompt').textContent = prompt;
    const opts = d.querySelector('.opts');
    q.choices.forEach((c, i) => { const b = document.createElement('button'); b.innerHTML = `<b>${'ABC'[i]}</b><span></span>`; b.querySelector('span').textContent = c;
      if (a) { if (i === a.answer) b.classList.add('right'); else if (i === a.choice) b.classList.add('wrong'); b.disabled = true; }
      b.onclick = () => choose(qi, i); opts.appendChild(b); });
    const fb = d.querySelector('.fb');
    if (a) { fb.textContent = a.ok ? '⭕ 정답!' : '❌ 아쉬워요! 초록색이 정답이에요'; fb.style.color = a.ok ? '#8fe3c8' : '#ffb3b3'; }
    else if (expired(qi)) { fb.textContent = '⏰ 시간이 끝났어요'; fb.style.color = '#ffd66b'; }
    d.querySelector('#spk').onclick = () => speak(q.q);
    ov.appendChild(d);
  }
  function expired(qi) { const el = (sNow() - st.phaseStart) / 1000; return el > JC.quizSchedule()[qi].end; }
  function choose(qi, i) {
    if (quizLocal[qi] || expired(qi) || st.paused) return;
    quizLocal[qi] = { choice: i, pending: true, answer: -1 };
    sock.emit('stu:answer', { qi, choice: i }, r => { if (!r) { quizLocal[qi] = null; return; } quizLocal[qi] = { choice: i, ok: r.ok, answer: r.answer }; r.ok ? SFX.right() : SFX.wrong(); ui(); });
    ui();
  }

  // ── 조각 설치 ──
  function placeUI() {
    const of = $('offer'); of.innerHTML = '';
    const placed = st.placed, used = st.usedIdx || [], needN = st.need || 1, left = Math.max(0, needN - (st.placedN || 0));
    const head = document.createElement('div'); head.className = 'hint'; head.style.alignSelf = 'center'; head.style.minWidth = '160px';
    head.innerHTML = placed ? '✅ 설치 완료!<br>친구들을 기다려요' : `<b class="left">${left}개 더 놓아요</b><br>` + (st.offer.length > needN ? `정답 ${st.okCount}개 → 후보 ${st.offer.length}개 중 ${needN}개` : `정답 ${st.okCount}개 → 조각 ${needN}개 지급`);
    of.appendChild(head);
    (st.offer || []).forEach((t, i) => { const d = PIECES[t]; const b = document.createElement('button');
      b.appendChild(JR.pieceIcon(t, 128, 0));
      const tx = document.createElement('div'); tx.innerHTML = `<div class="nm">${d.ko}<span class="kindT ${d.kind}">${d.kind === 'help' ? '도움' : d.kind === 'trap' ? '함정' : '도구'}</span></div><div class="ds">${used.includes(i) ? '✅ 놓았어요' : d.desc}</div>`; b.appendChild(tx);
      if (i === placeSel) b.classList.add('on'); if (used.includes(i)) b.classList.add('used'); if (placed || used.includes(i)) b.disabled = true;
      b.onclick = () => selectPiece(i); of.appendChild(b); });
    if (placeSel >= 0 && used.includes(placeSel)) { placeSel = -1; ghost = null; eraseTarget = null; }
    const free = (st.offer || []).map((t, i) => i).filter(i => !used.includes(i));
    if (!placed && placeSel < 0 && free.length && free.length <= left) selectPiece(free[0], true);   // 고를 필요가 없으면 바로 다음 조각
    const t = st.offer && st.offer[placeSel];
    $('rotBtn').classList.toggle('hide', !t || !PIECES[t].rot || !!placed);
    $('okBtn').disabled = !!placed || placeSel < 0;
    $('okBtn').dataset.art = placed ? 'installed' : t === 'eraser' ? '' : 'install';
    $('okBtn').textContent = placed ? '설치 완료' : t === 'eraser' ? '지우기 확정' : '설치 확정';
  }
  function selectPiece(i, silent) {
    if (st.placed || (st.usedIdx || []).includes(i)) return; placeSel = i; const t = st.offer[i];
    if (t !== 'eraser') { if (!ghost) ghost = { gx: 18, gy: 8, rot: 0 }; ghost.type = t; if (!PIECES[t].rot) ghost.rot = 0; }
    else ghost = null;
    if (!silent) placeUI(); else setTimeout(placeUI);
  }
  $('rotBtn').onclick = () => { if (ghost && PIECES[ghost.type].rot) { ghost.rot = (ghost.rot + 1) % PIECES[ghost.type].rot; } };
  $('okBtn').onclick = () => {
    if (!st || st.phase !== 'place' || st.placed || placeSel < 0) return;
    const t = st.offer[placeSel];
    const d = t === 'eraser' ? { choice: placeSel, target: eraseTarget } : { choice: placeSel, gx: ghost.gx, gy: ghost.gy, rot: ghost.rot };
    if (t === 'eraser' && !eraseTarget) return toast('지울 친구 조각을 눌러요');
    if (t !== 'eraser') { const c = JC.canPlace(JC.mapById(mapId), pieces, Object.assign({ type: t }, ghost)); if (!c.ok) return toast(c.reason); }
    sock.emit('stu:place', d, r => { if (!r.ok) toast(r.reason); else { SFX.place(); toast(r.done ? '모두 설치했어요!' : t === 'eraser' ? '지웠어요! 하나 더 놓아요' : '하나 더 놓아요!'); if (ghost) ghost = { gx: Math.min(JC.COLS - 4, ghost.gx + 3), gy: ghost.gy, rot: 0, type: ghost.type }; } });
  };

  // ── 결과 ──
  function resultUI() {
    const d = document.createElement('div'); d.className = 'panel';
    const m = JC.mapById(st.map.id);
    d.innerHTML = `<div class="muted">${st.round} / ${st.rounds} 라운드 결과 · ${st.map.slot} ${m.ko}</div><h2>이번 라운드 <span class="plus">+${st.rp || 0}점</span></h2>`;
    const rows = document.createElement('div'); rows.className = 'rows';
    (st.result || []).forEach((o, i) => { const r = document.createElement('div'); r.className = 'row' + (o.sid === st.me.sid ? ' me' : '');
      r.innerHTML = `<span class="r">${o.fin ? o.order : '-'}</span>`; r.appendChild(JR.animalCard(o.animal, 72));
      const g = document.createElement('span'); g.className = 'grow'; g.textContent = o.name + (o.fin && o.order === 1 ? ' 🏁 첫 완주' : o.fin ? ' 🚩 완주' : ''); r.appendChild(g);
      const t = document.createElement('span'); t.className = 'muted'; t.textContent = (o.fin ? o.time.toFixed(1) + '초 · ' : '') + (o.coin ? `동전 ${o.coin} · ` : '') + (o.trap ? `함정 ${o.trap}회 · ` : ''); r.appendChild(t);
      const p = document.createElement('span'); p.className = 'plus'; p.textContent = '+' + o.rp; r.appendChild(p); rows.appendChild(r); });
    d.appendChild(rows);
    if (st.quizReview) { const q = document.createElement('div'); q.className = 'muted'; q.style.marginTop = '10px';
      q.innerHTML = '영어 ' + st.quizReview.map(x => x.ok ? '⭕' : '❌').join(' ') + ' · 점수: 정답 1 · 완주 3 · 첫 완주 +2 · 동전 1 · 내 함정 성공 1 (최대 3)' + (st.event === 'double' ? ' · 이번 라운드는 두 배!' : ''); d.appendChild(q); }
    ov.appendChild(d);
  }
  function finalUI() {
    const d = document.createElement('div'); d.className = 'panel';
    d.innerHTML = `<div class="muted">게임 끝! · ${st.cls}</div><h2>${st.rank ? `나는 ${st.total}명 중 ${st.rank}등!` : '게임이 끝났어요'}</h2>
      <div style="font-weight:800;margin-top:4px">⭐ ${st.me.score}점 · 🚩 완주 ${st.me.finishes}번 · 🏁 첫 완주 ${st.me.firsts}번 · 영어 ${st.me.correct}/${st.me.asked}</div>`;
    const rows = document.createElement('div'); rows.className = 'rows';
    (st.top || []).forEach((o, i) => { const r = document.createElement('div'); r.className = 'row'; r.innerHTML = `<span class="r">${i + 1}</span>`; r.appendChild(JR.animalCard(o.animal, 72));
      const g = document.createElement('span'); g.className = 'grow'; g.textContent = o.name; r.appendChild(g); const p = document.createElement('span'); p.className = 'plus'; p.textContent = o.score + '점'; r.appendChild(p); rows.appendChild(r); });
    d.appendChild(rows);
    const w = st.wrongs || []; const h = document.createElement('h3'); h.style.margin = '14px 0 0'; h.textContent = w.length ? `틀린 문제 다시 보기 (${w.length}개)` : '영어 문제를 모두 맞혔어요! 👏'; d.appendChild(h);
    const wl = document.createElement('div'); wl.className = 'wrongList';
    w.forEach(x => { const e = document.createElement('div'); e.innerHTML = `<span></span><br>정답: <b></b> <span class="muted">(내 답: <i></i>)</span>`; e.querySelector('span').textContent = x.q; e.querySelector('b').textContent = x.aText; e.querySelector('i').textContent = x.mine; wl.appendChild(e); });
    d.appendChild(wl); ov.appendChild(d);
  }

  // ── 경기 ──
  function startRace() {
    if (!st.map) return;
    const m = JC.mapById(st.map.id), info = JC.mapInfo(m);
    const W = JC.buildWorld(m, pieces);
    const sp = info.spawns[Math.max(0, st.mySpawn) % info.spawns.length];
    race = { W, m, p: JC.newPlayer(sp), acc: 0, last: performance.now(), sent: 0, fin: !!st.fin, cd: -1, piecesRef: pieces, coins: st.coins || [], got: new Set(st.got || []), shield: !!st.shield };
    if (st.event === 'lowgrav') W.info = Object.assign({}, W.info, { grav: Math.max(0.42, W.info.grav * 0.6) });
    if (st.fin) race.p.fin = true;
  }
  const keys = { l: 0, r: 0, j: 0, jp: 0 };
  addEventListener('keydown', e => { if (e.repeat) return; if (['ArrowLeft', 'a', 'A'].includes(e.key)) keys.l = 1; if (['ArrowRight', 'd', 'D'].includes(e.key)) keys.r = 1;
    if ([' ', 'ArrowUp', 'w', 'W'].includes(e.key)) { keys.j = 1; keys.jp = 1; if (e.key === ' ') e.preventDefault(); } });
  addEventListener('keyup', e => { if (['ArrowLeft', 'a', 'A'].includes(e.key)) keys.l = 0; if (['ArrowRight', 'd', 'D'].includes(e.key)) keys.r = 0; if ([' ', 'ArrowUp', 'w', 'W'].includes(e.key)) keys.j = 0; });
  function hold(el, k) {
    const ids = new Set();
    el.addEventListener('pointerdown', e => { e.preventDefault(); ids.add(e.pointerId); el.setPointerCapture && el.setPointerCapture(e.pointerId); keys[k] = 1; if (k === 'j') keys.jp = 1; el.classList.add('down'); });
    const up = e => { ids.delete(e.pointerId); if (!ids.size) { keys[k] = 0; el.classList.remove('down'); } };
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(n => el.addEventListener(n, up));
    el.addEventListener('contextmenu', e => e.preventDefault());
  }
  hold($('bL'), 'l'); hold($('bR'), 'r'); hold($('bJ'), 'j');
  $('snd').onclick = () => { $('snd').textContent = SFX.toggle() ? '🔊' : '🔇'; };
  $('fs').onclick = () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(() => { }); };

  function raceTime() { return ((st.paused ? st.pausedAt : sNow()) - st.raceStart) / 1000; }
  function updateRace(dtReal) {
    if (!race || !st || st.phase !== 'race') return;
    const t = raceTime();
    // 카운트다운
    if (t < 0) { const n = Math.ceil(-t); if (n !== race.cd) { race.cd = n; if (n <= 3) SFX.tick(); } return; }
    if (race.cd !== 0) { race.cd = 0; SFX.go(); }
    if (st.paused || t > JC.RACE_TIME) return;
    race.acc += Math.min(dtReal, 0.1);
    const step = 1 / 60;
    if (race.reviving) { race.acc = 0; if (performance.now() > race.reviving.until) reviveDone(false, -1); else { const bar = document.querySelector('#revive .bar i'); if (bar) bar.style.width = Math.max(0, (race.reviving.until - performance.now()) / REVIVE_MS * 100) + '%'; } }
    while (race.acc >= step && !race.reviving) {
      race.acc -= step;
      const now = t - race.acc;
      const wasAirborne = !race.p.on && race.p.vy > 0;
      const ev = JC.step(race.p, { l: keys.l, r: keys.r, j: keys.j, jp: keys.jp }, step, race.W, now, now); keys.jp = 0;
      if (wasAirborne && race.p.on && !ev.die) race.landUntil = performance.now() + 125;
      if (ev.jump) SFX.jump(); if (ev.spring) SFX.spring(); if (ev.portal) SFX.portal();
      if (ev.die && ev.die !== 'fall' && race.shield) { race.shield = false; const q = race.p; q.dead = 0; q.inv = 1.6; q.vy = -420; q.on = null; SFX.spring(); sock.emit('stu:shield'); toast('🛡 방패가 막아 줬어요!'); }
      else if (ev.die) { SFX.die(); sock.emit('stu:ko', { by: ev.die }); if (st.revive && !race.reviveUsed) { reviveAsk(); break; } }
      if (race.p.dead <= 0 && !race.p.fin) race.coins.forEach((k, i) => { if (race.got.has(i)) return; if (Math.abs(race.p.x + 11 - k.x) < 24 && Math.abs(race.p.y + 13 - k.y) < 26) { race.got.add(i); SFX.right(); sock.emit('stu:coin', { i }, r => { if (r && r.ok) $('hScore').textContent = '⭐ ' + r.score + '점'; }); } });
      else { const g = race.p.on; if (g && !['move', 'cloud', 'ghost', 'bouncy', 'spring', 'conv'].includes(g.k) && race.p.dead <= 0) race.safe = { x: race.p.x, y: race.p.y }; }
      if (ev.finish && !race.fin) { race.fin = true; SFX.finish(); sock.emit('stu:finish'); toast('🚩 도착! 친구들을 응원해요'); }
    }
    const nowMs = performance.now();
    if (nowMs - race.sent > 75) { race.sent = nowMs; const p = race.p; sock.emit('stu:pos', [Math.round(p.x), Math.round(p.y), p.face, stateCode(p), p.fin ? 1 : 0]); }
  }
  // ── 부활 찬스: 라운드마다 한 번, 떨어지거나 함정에 걸리면 영어 문제를 맞혀 그 자리에서 다시 ──
  const REVIVE_MS = 7000;
  function reviveAsk() {
    const q = st.revive; race.reviveUsed = true; race.reviving = { until: performance.now() + REVIVE_MS };
    const d = document.createElement('div'); d.id = 'revive'; d.className = 'revive';
    d.innerHTML = `<div class="rv-top">🛟 부활 찬스! <small>맞히면 떨어진 곳에서 다시 뛰어요 (라운드마다 한 번)</small></div><div class="bar"><i style="width:100%"></i></div><div class="rv-q"></div><div class="rv-opts"></div>`;
    d.querySelector('.rv-q').textContent = q.t === 3 ? `A: ${q.q}  →  B: ?` : q.q;
    q.choices.forEach((c, i) => { const b = document.createElement('button'); b.textContent = c; b.onclick = () => { if (!race || !race.reviving || race.reviving.sent) return; race.reviving.sent = true; race.reviving.until = performance.now() + 3000;
      sock.emit('stu:revive', { choice: i }, r => { [...d.querySelectorAll('button')].forEach((x, k) => { x.disabled = true; if (r && k === r.answer) x.classList.add('right'); else if (k === i) x.classList.add('wrong'); }); setTimeout(() => reviveDone(!!(r && r.ok), i), 550); }); }; d.querySelector('.rv-opts').appendChild(b); });
    $('wrap').appendChild(d); try { speechSynthesis.cancel(); } catch (e) { }
  }
  function reviveDone(ok, choice) {
    const el = $('revive'); if (el) el.remove(); if (!race || !race.reviving) return;
    if (choice < 0) sock.emit('stu:revive', { choice: -1 }, () => { });   // 시간 초과도 기회를 쓴 것으로
    race.reviving = null; if (st) st.revive = null; const p = race.p;
    if (ok && race.safe) { p.dead = 0; p.x = race.safe.x; p.y = race.safe.y - 2; p.vx = p.vy = 0; p.on = null; p.inv = 1.8; SFX.right(); toast('🛟 부활! 다시 달려요'); }
    else { p.dead = 0.05; if (choice >= 0) SFX.wrong(); toast('아쉬워요! 출발점에서 다시 시작해요'); }
  }
  function stateCode(p) { if (p.dead > 0) return 3; if (p.fin) return 4; if (!p.on) return 2; if (performance.now() < race.landUntil) return 5; return Math.abs(p.vx) > 30 ? 1 : 0; }
  const STN = ['idle', 'run', 'air', 'dead', 'win', 'land'];

  // ── 캔버스 ──
  const cv = $('game'), c = cv.getContext('2d'); let scale = 1, dpr = 1;
  function fit() {
    const w = $('wrap'); const bw = w.clientWidth - 8, bh = w.clientHeight - 8; if (bw <= 0 || bh <= 0) return;
    scale = Math.min(bw / WW, bh / WH); dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.style.width = WW * scale + 'px'; cv.style.height = WH * scale + 'px'; cv.width = Math.round(WW * scale * dpr); cv.height = Math.round(WH * scale * dpr);
  }
  addEventListener('resize', fit); new ResizeObserver(fit).observe($('wrap'));
  function toWorld(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * WW, y: (e.clientY - r.top) / r.height * WH }; }
  let dragging = false;
  cv.addEventListener('pointerdown', e => { if (!st || st.phase !== 'place' || st.placed) return; dragging = true; cv.setPointerCapture(e.pointerId); pointerPlace(e, true); });
  cv.addEventListener('pointermove', e => { if (dragging) pointerPlace(e); });
  cv.addEventListener('pointerup', () => dragging = false);
  function pointerPlace(e, first) {
    const w = toWorld(e), t = st.offer[placeSel];
    if (t === 'eraser') { if (!first) return; const hit = pieces.find(p => { const d = PIECES[p.type]; return w.x >= p.gx * T - 6 && w.x <= (p.gx + d.w) * T + 6 && w.y >= p.gy * T - 6 && w.y <= (p.gy + d.h) * T + 6; }); eraseTarget = hit ? hit.id : null; return; }
    if (!ghost) { if (placeSel < 0 && st.offer.length) selectPiece(0); if (!ghost) return; }
    const d = PIECES[ghost.type];
    // 손가락에 가리지 않게 조금 위쪽에 놓아요
    ghost.gx = Math.max(0, Math.min(JC.COLS - d.w, Math.round(w.x / T - d.w / 2)));
    ghost.gy = Math.max(1, Math.min(JC.ROWS - 1, Math.round(w.y / T - 1.4)));
  }

  let lastT = performance.now();
  function frame() {
    const nowMs = performance.now(), dt = (nowMs - lastT) / 1000; lastT = nowMs;
    requestAnimationFrame(frame);
    if (!st || !joined) return;
    updateRace(dt);
    // 남은 시간
    const ref = st.paused ? st.pausedAt : sNow();
    let left = null;
    if (st.phase === 'race') left = Math.min(JC.RACE_TIME, Math.max(0, Math.ceil((st.raceStart + JC.RACE_TIME * 1000 - ref) / 1000)));
    else if (st.phaseEnd) left = Math.max(0, Math.ceil((st.phaseEnd - ref) / 1000));
    if (st.phase === 'quiz') { const el = ((st.paused ? st.pausedAt : sNow()) - st.phaseStart) / 1000, qi = curSlot(), sch = JC.quizSchedule()[qi];
      if (qi !== lastSlot) ui();
      const remain = Math.max(0, sch.end - el); const qt = document.getElementById('qt'); if (qt) qt.textContent = Math.ceil(remain);
      const bar = document.getElementById('qbar'); if (bar) bar.style.width = (remain / JC.QUIZ_SLOTS[qi] * 100) + '%';
      const fbEl = document.querySelector('.quiz .fb');
      if (remain <= 0 && !quizLocal[qi] && !(st.ans && st.ans[qi]) && fbEl && !fbEl.textContent) ui();
      left = Math.ceil(remain); }
    $('hTime').textContent = left == null ? '--' : left + '초';
    cv.style.visibility = (!st.map || ['quiz', 'final', 'lobby', 'preview'].includes(st.phase)) ? 'hidden' : 'visible';
    if (st.phase === 'preview' && st.map && mini && mini.isConnected) { const k = mini.getContext('2d'), m = JC.mapById(st.map.id); k.setTransform(0.5, 0, 0, 0.5, 0, 0); k.drawImage(JR.background(m), 0, 0); JR.terrain(k, m, nowMs / 1000); pieces.forEach(p => JR.piece(k, p, nowMs / 1000, { cloudState: {}, arrows: {} }, nowMs / 1000)); }
    if (cv.style.visibility === 'hidden') return;
    draw(nowMs / 1000);
  }
  // 카운트다운 그림(3·2·1·GO!)
  const countdown = new Image(); countdown.src = 'ui/countdown.webp';
  const countBoxes = [[31, 5, 178, 139], [219, 5, 367, 139], [33, 141, 156, 267], [171, 141, 386, 267]];
  function drawCountdown(key, fallback) {
    if (countdown.naturalWidth) { const ratio = countdown.naturalWidth / 400, [left, top, right, bottom] = countBoxes[key], w = right - left, h = bottom - top, height = 190, width = height * w / h;
      c.drawImage(countdown, left * ratio, top * ratio, w * ratio, h * ratio, (WW - width) / 2, (WH - height) / 2, width, height); return; }
    c.fillStyle = '#ffcf29'; c.font = '120px "Jua",sans-serif'; c.textAlign = 'center'; c.fillText(fallback, WW / 2, WH / 2 + 35); c.textAlign = 'left';
  }
  function draw(tt) {
    c.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    const m = JC.mapById(st.map.id);
    const racing = st.phase === 'race' && race;
    const t = racing ? Math.max(0, raceTime()) : tt;
    c.drawImage(JR.background(m), 0, 0);
    JR.terrain(c, m, t);
    const W = racing ? race.W : null;
    pieces.forEach(p => JR.piece(c, p, t, W || { cloudState: {}, arrows: {} }, t));
    if (racing) race.coins.forEach((k, i) => { if (!race.got.has(i)) JR.coin(c, k.x, k.y, tt, i); });
    if (st.phase === 'place') drawPlace(tt);
    // 선수들
    const mates = st.mates || [];
    const info = JC.mapInfo(m);
    if (st.phase === 'race' || st.phase === 'preview' || st.phase === 'result') {
      mates.forEach((o, i) => {
        if (o.sid === st.me.sid) return;
        let r = remote[o.sid]; let x, y, f = 1, s = 'idle';
        if (r && st.phase !== 'preview') { r.x += (r.tx - r.x) * 0.35; r.y += (r.ty - r.y) * 0.35; x = r.x; y = r.y; f = r.f || 1; s = STN[r.s] || 'idle'; }
        else { const sp = info.spawns[i % 6]; x = sp.x; y = sp.y; }
        JR.animal(c, o.animal, x + 11, y + 26, 1, f, tt, s); JR.tag(c, x + 11, y - 6, o.name);
      });
      let p = racing ? race.p : null; let x, y, f = 1, s = 'idle';
      if (p) { x = p.x; y = p.y; f = p.face; s = STN[stateCode(p)]; } else { const sp = info.spawns[Math.max(0, st.mySpawn) % 6]; x = sp.x; y = sp.y; }
      if (p && p.inv > 0 && Math.floor(tt * 20) % 2) { } else JR.animal(c, st.me.animal, x + 11, y + 26, 1, f, tt, s);
      if (racing ? race.shield : st.shield) JR.shield(c, x + 11, y + 26, tt);
      JR.tag(c, x + 11, y - 6, '나', null, true);
    }
    if (racing) {
      const rt = raceTime();
      if (rt < 0) { c.fillStyle = 'rgba(20,46,75,.35)'; c.fillRect(0, 0, WW, WH); const count = Math.ceil(-rt); drawCountdown(3 - Math.max(1, Math.min(3, count)), count); }
      else if (rt < 0.8) drawCountdown(3, 'GO!');
      else if (rt > JC.RACE_TIME) { c.fillStyle = 'rgba(46,61,92,.35)'; c.fillRect(0, 0, WW, WH); c.fillStyle = '#fff'; c.font = '90px "Jua","Noto Sans KR",sans-serif'; c.textAlign = 'center'; c.fillText('시간 끝!', WW / 2, WH / 2 + 30); c.textAlign = 'left'; }
      if (race.p.dead > 0) { c.fillStyle = 'rgba(229,72,77,.18)'; c.fillRect(0, 0, WW, WH); }
    }
  }
  function drawPlace(tt) {
    const m = JC.mapById(st.map.id), info = JC.mapInfo(m);
    // 설치 금지 구역
    c.save(); info.protect.forEach(r => { c.fillStyle = 'rgba(229,72,77,.13)'; c.fillRect(r.x * T, r.y * T, r.w * T, r.h * T); c.strokeStyle = 'rgba(229,72,77,.5)'; c.setLineDash([6, 5]); c.lineWidth = 2; c.strokeRect(r.x * T, r.y * T, r.w * T, r.h * T); });
    c.setLineDash([]); c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = 1; c.beginPath(); for (let x = 0; x <= WW; x += T) { c.moveTo(x, 0); c.lineTo(x, WH); } for (let y = 0; y <= WH; y += T) { c.moveTo(0, y); c.lineTo(WW, y); } c.stroke(); c.restore();
    // 누가 놓았는지
    pieces.forEach(p => { if (p.round === st.round) { c.font = '10px "Jua","Noto Sans KR",sans-serif'; c.fillStyle = 'rgba(46,61,92,.75)'; const w = c.measureText(p.ownerName).width + 8; JR.rr(c, p.gx * T, p.gy * T - 14, w, 13, 6); c.fill(); c.fillStyle = '#fff'; c.fillText(p.ownerName, p.gx * T + 4, p.gy * T - 4); } });
    const t = st.offer && st.offer[placeSel];
    if (st.placed) return;
    if (t === 'eraser') {
      pieces.forEach(p => { const d = PIECES[p.type]; const on = p.id === eraseTarget; c.strokeStyle = on ? '#ff3d7f' : 'rgba(255,61,127,.45)'; c.lineWidth = on ? 4 : 2; c.setLineDash(on ? [] : [5, 4]); c.strokeRect(p.gx * T - 4, p.gy * T - 4, d.w * T + 8, d.h * T + 8); });
      c.setLineDash([]); return;
    }
    if (ghost) {
      const ok = JC.canPlace(m, pieces, Object.assign({ type: ghost.type }, ghost)).ok, d = PIECES[ghost.type];
      JR.piece(c, Object.assign({ id: 'ghost' }, ghost), tt, null, 0, { alpha: 0.75, still: true });
      c.setLineDash([6, 4]); c.lineWidth = 3; c.strokeStyle = ok ? '#1f9d74' : '#e5484d'; c.strokeRect(ghost.gx * T - 2, ghost.gy * T - 2, d.w * T + 4, d.h * T + 4); c.setLineDash([]);
      c.font = '13px "Jua","Noto Sans KR",sans-serif'; c.fillStyle = ok ? '#1f9d74' : '#e5484d'; c.fillText(ok ? '내 조각 미리보기' : '여기는 안 돼요', ghost.gx * T, ghost.gy * T - 8);
    }
  }
  window.__jc = () => ({ race, st }); // 점검용
  fit(); requestAnimationFrame(frame);
})();
