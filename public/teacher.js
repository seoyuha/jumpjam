// 점프 대소동! — 선생님 화면 (수업 관리 + TV 중계)
(() => {
  const $ = id => document.getElementById(id);
  const { T, WW, WH } = JC;
  const sock = io({ transports: ['websocket', 'polling'] });
  let token = sessionStorage.getItem('jc_tk') || '', st = null, info = null, off = 0, sideTab = 'stu';
  const sNow = () => Date.now() + off;
  const PHASE_KO = { lobby: '대기실', preview: '코스 미리보기', quiz: '영어 퀴즈', place: '조각 설치', race: '경기 중', result: '라운드 결과', final: '게임 결과' };
  let pick = JSON.parse(localStorage.getItem('jc_tset') || '{"cls":"","unit":"10","set":1}');

  function sync() { const t0 = Date.now(); sock.emit('time', t0, s => { off = s - (t0 + Date.now()) / 2; }); }
  fetch('/api/info').then(r => r.json()).then(d => { info = d; buildSetup(); });
  function showSetup() { showOnly('setup'); suggest(); }

  // ── 로그인 ──
  function showOnly(id) { ['login', 'setup', 'dash'].forEach(x => $(x).classList.toggle('hide', x !== id)); }
  $('loginBtn').onclick = () => sock.emit('t:login', { pw: $('pw').value }, r => { if (!r.ok) return $('lerr').textContent = '비밀번호가 맞지 않아요'; token = r.token; sessionStorage.setItem('jc_tk', token); afterLogin(); });
  $('pw').onkeydown = e => { if (e.key === 'Enter') $('loginBtn').click(); };
  sock.on('connect', () => { sync(); if (token) sock.emit('t:resume-token', { token }, r => { if (r.ok) afterLogin(true); else { token = ''; showOnly('login'); } }); });
  function afterLogin(re) { if (re && pick.cls && st) open(); else if (re && pick.cls && sessionStorage.getItem('jc_open')) open(); else showSetup(); }

  // ── 수업 열기 ──
  function seg(el, items, key, fmt, after) { el.innerHTML = ''; items.forEach(it => { const b = document.createElement('button'); const v = it.id != null ? it.id : it; b.textContent = fmt ? fmt(it) : (it.ko || it);
    if (String(pick[key]) === String(v)) b.classList.add('on'); b.onclick = () => { pick[key] = v; [...el.children].forEach(x => x.classList.toggle('on', x === b)); if (after) after(); }; el.appendChild(b); }); }
  function buildSetup() {
    seg($('sCls'), info.classes, 'cls', null, suggest);
    seg($('sUnit'), info.units.filter(u => u.id !== 'custom'), 'unit', u => u.id === 'all' ? '섞기' : u.ko.split(' · ')[0]);
    seg($('sSet'), [{ id: 1, ko: '기본 맵' }, { id: 2, ko: '새 맵' }, { id: 3, ko: '추가 맵' }], 'set');
  }
  // 학생 입장 코드: 반을 고르면 서버가 쓸 수 있는 코드를 알려 줘요(이미 연 반이면 그 반의 코드)
  const codeEl = $('sCode');
  function suggest(fresh) { if (!pick.cls) return; sock.emit('t:suggest', { cls: pick.cls, fresh: fresh === true }, r => { if (r && r.ok) codeEl.value = r.code; }); }
  codeEl.addEventListener('input', () => { codeEl.value = codeEl.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
  $('newCode').onclick = () => { if (!pick.cls) return $('serr').textContent = '반을 먼저 골라 주세요'; suggest(true); };
  ['newCode', 'openBtn'].forEach(id => { const el = $(id); el.addEventListener('pointerdown', () => el.classList.add('down')); ['pointerup', 'pointerleave', 'pointercancel'].forEach(n => el.addEventListener(n, () => el.classList.remove('down'))); });
  $('openBtn').onclick = () => { if (!pick.cls) return $('serr').textContent = '반을 골라 주세요'; if (codeEl.value && codeEl.value.length < 4) return $('serr').textContent = '입장 코드는 4글자 이상이에요'; $('serr').textContent = ''; open(); };
  // 수업 열기 화면 그림: 캐릭터가 겹치지 않는다는 안내
  (function setupArt() { const cv = $('setupArt'), c = cv.getContext('2d'), ids = JC.ANIMALS.map(a => a.id).sort(() => Math.random() - 0.5).slice(0, 2);
    function loop(ms) { requestAnimationFrame(loop); if ($('setup').classList.contains('hide')) return; const t = ms / 1000; c.clearRect(0, 0, 420, 400);
      c.save(); c.translate(-10, 110); [{ type: 'honey', gx: 2, gy: 7 }, { type: 'honey', gx: 8, gy: 7 }, { type: 'spring', gx: 9, gy: 6 }].forEach((p, i) => JR.piece(c, Object.assign({ id: 's' + i, rot: 0 }, p), t, { cloudState: {}, arrows: {} }, t, { still: true })); c.restore();
      const u = (t * 0.6) % 1, hop = Math.sin(u * Math.PI);
      c.setLineDash([8, 9]); c.lineCap = 'round'; c.strokeStyle = '#fff'; c.lineWidth = 5; c.beginPath(); c.moveTo(170, 320); c.quadraticCurveTo(230, 190, 300, 290); c.stroke(); c.setLineDash([]);
      JR.animal(c, ids[0], 110, 334 - Math.abs(Math.sin(t * 6)) * 6, 3.4, 1, t, 'run'); JR.animal(c, ids[1], 300, 190 - hop * 70, 3.4, 1, t, 'air'); }
    requestAnimationFrame(loop); })();
  function open() {
    localStorage.setItem('jc_tset', JSON.stringify(pick));
    sock.emit('t:open', { cls: pick.cls, unit: pick.unit, set: pick.set, code: codeEl.value }, r => { if (!r.ok) return $('serr').textContent = r.reason || '열 수 없어요'; sessionStorage.setItem('jc_open', 1); showOnly('dash'); fit(); });
  }

  // ── 상태 ──
  let pieces = {}, remote = {}, lastKey = '';
  sock.on('t:state', s => {
    const key = s.phase + s.round + s.game; if (key !== lastKey) { lastKey = key; remote = {}; }
    st = s; s.maps.forEach(m => pieces[m.id] = m.pieces);
    showOnly('dash'); render();
  });
  sock.on('pieces', d => { pieces[d.mapId] = d.pieces; });
  sock.on('pos', d => { Object.keys(d).forEach(sid => { const a = d[sid]; const r = remote[sid] || (remote[sid] = { x: a[0], y: a[1] }); r.tx = a[0]; r.ty = a[1]; r.f = a[2]; r.s = a[3]; }); });
  sock.on('feed', d => { const m = st && st.maps[st.watch]; if (!m || m.id !== d.mapId) return; const el = document.createElement('div'); el.textContent = d.text; $('feed').prepend(el); setTimeout(() => el.remove(), 4000); while ($('feed').children.length > 4) $('feed').lastChild.remove(); });

  const btn = (id, ev, data) => { $(id).onclick = () => sock.emit(ev, data ? data() : {}, r => { if (r && !r.ok && r.reason) alert(r.reason); }); };
  btn('startBtn', 't:start'); btn('skipBtn', 't:skip');
  $('endBtn').onclick = () => { if (confirm('지금 게임을 끝내고 결과를 보여 줄까요?')) sock.emit('t:end', {}, () => { }); };
  $('pauseBtn').onclick = () => sock.emit(st && st.paused ? 't:resume' : 't:pause', {}, () => { });
  $('fsBtn').onclick = () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => { }); };
  $('sideBtn').onclick = () => { $('dash').classList.toggle('wide'); setTimeout(fit, 50); };
  document.querySelectorAll('.sideTabs button').forEach(b => b.onclick = () => { sideTab = b.dataset.t; document.querySelectorAll('.sideTabs button').forEach(x => x.classList.toggle('on', x === b)); render(); });

  function render() {
    if (!st) return;
    $('dash').dataset.phase = st.phase; $('dash').dataset.view = sideTab === 'rank' && !['lobby', 'final'].includes(st.phase) ? 'table' : '';
    $('meta').textContent = `${st.cls} · ${st.unitTitle || ''} · ${st.game}게임 · ${JC.SET_KO[st.set] || ''}`;
    $('codePill').textContent = '입장 코드 ' + st.code;
    $('phase').textContent = (st.event && st.round ? `🎉 ${JC.EVENTS[st.event].ko} · ` : '') + (st.round ? `👥 ${st.round} / ${st.rounds} 라운드 · ` : '') + PHASE_KO[st.phase] + (st.paused ? ' (멈춤)' : '');
    $('startBtn').textContent = st.phase === 'final' ? '다음 게임 시작' : '게임 시작';
    $('startBtn').toggleAttribute('data-next', st.phase === 'final');
    $('startBtn').classList.toggle('hide', !['lobby', 'final'].includes(st.phase));
    ['pauseBtn', 'skipBtn', 'endBtn'].forEach(id => $(id).classList.toggle('hide', ['lobby', 'final'].includes(st.phase)));
    $('pauseBtn').textContent = st.paused ? '▶ 계속하기' : '⏸ 일시정지';
    $('pauseBtn').dataset.art = st.paused ? 'resume' : 'pause';
    $('pause').classList.toggle('hide', !st.paused);
    $('live').classList.toggle('hide', st.phase !== 'race');
    // 맵 탭
    const tabs = $('tabs'); tabs.innerHTML = '';
    if (st.round && st.phase !== 'final') st.maps.forEach((m, i) => { const b = document.createElement('button'); b.className = i === st.watch ? 'on' : '';
      const th = thumb(m.id); const im = document.createElement('img'); im.src = th; im.alt = '';
      b.innerHTML = `<span><b class="slot">${m.slot}맵</b><small>${m.ko}</small></span>`; b.appendChild(im); const n = document.createElement('em'); n.textContent = `${m.fin}/${m.n}`; b.appendChild(n);
      b.onclick = () => sock.emit('t:watch', { idx: i }, () => { }); tabs.appendChild(b); });
    overlay(); renderSide();
  }
  const thumbs = {};
  function thumb(id) { if (thumbs[id]) return thumbs[id]; const cv2 = document.createElement('canvas'); cv2.width = 160; cv2.height = 88; const k = cv2.getContext('2d'), m = JC.mapById(id); k.scale(0.125, 0.125); k.drawImage(JR.background(m), 0, 0); JR.terrain(k, m, 0); const u = cv2.toDataURL('image/jpeg', 0.8); setTimeout(() => { delete thumbs[id]; }, 4000); return (thumbs[id] = u); }
  function chip(a, text) { const s = document.createElement('span'); s.className = 'chip'; s.appendChild(JR.animalCard(a, 52)); s.appendChild(document.createTextNode(text)); return s; }
  function overlay() {
    const o = $('tov'); o.innerHTML = ''; o.style.alignItems = ''; o.style.paddingTop = '';
    const online = st.students.filter(s => s.online), act = st.students.filter(s => s.active);
    if (st.phase === 'lobby') {
      const url = location.origin + '/?code=' + st.code;
      const d = document.createElement('div'); d.className = 'lobbyBox';
      d.innerHTML = `<img src="/qr.svg?u=${encodeURIComponent(url)}" alt="QR"><div style="min-width:0"><div class="muted" style="font-weight:800">태블릿으로 접속해요 · QR을 찍거나 주소로 들어와 코드를 써요</div><div class="url">${location.origin}/</div>
        <h2 class="lobby-title">학생 입장 대기실</h2><div class="lobby-code">입장 코드 <b>${st.code}</b></div><div class="big">접속 ${online.length}명</div><div class="muted">${online.length ? `맵 ${Math.min(6, Math.max(1, Math.ceil(online.length / 5)))}개에 5명 안팎으로 자동 배정돼요` : '학생이 들어오면 여기에 보여요'}</div><div class="joined"></div></div>`;
      online.forEach(s => d.querySelector('.joined').appendChild(chip(s.animal, s.nick || s.name)));
      o.appendChild(d); return;
    }
    if (sideTab === 'rank' && st.phase !== 'final') { resultTable(o); return; }
    const m = st.maps[st.watch];
    if (st.phase === 'preview') { banner(o, st.event ? `🎉 깜짝 이벤트 · ${JC.EVENTS[st.event].ko}` : `새 배정! ${st.round}라운드`, st.event ? JC.EVENTS[st.event].desc : `${st.maps.length}개 맵 · 각자 태블릿에서 코스를 봐요`); return; }
    if (st.phase === 'quiz') { const n = act.reduce((a, s) => a + s.answered, 0); banner(o, '영어 퀴즈 시간!', `답한 문제 ${n} / ${act.length * 3} · 정답 수만큼 조각 후보가 생겨요`); return; }
    if (st.phase === 'place') { const n = act.filter(s => s.placed).length; banner(o, '조각 설치 중', `${n} / ${act.length}명 설치 완료 · 함정을 조심!`, true); return; }
    if (st.phase === 'result') {
      const d = document.createElement('div'); d.className = 'panel'; d.style.width = 'min(900px,94%)';
      d.innerHTML = `<div class="muted">${st.round} / ${st.rounds} 라운드 결과</div><h2>맵별 첫 완주</h2><div class="sumGrid"></div>`;
      st.maps.forEach(mm => { const r = mm.result || []; const first = r.find(x => x.fin && x.order === 1); const e = document.createElement('div');
        e.innerHTML = `<div class="muted">${mm.slot} · ${mm.ko}</div><div style="font-size:18px">${first ? '🏁 ' : '—'}<span></span></div><div class="muted">완주 ${mm.fin} / ${mm.n}</div>`;
        e.querySelector('span').textContent = first ? `${first.name} ${first.time.toFixed(1)}초` : '완주한 친구가 없어요'; d.querySelector('.sumGrid').appendChild(e); });
      o.appendChild(d); return;
    }
    if (st.phase === 'final') { champion(o); return; }
  }
  const laurel = (col) => `<svg class="laurel" viewBox="0 0 120 64" aria-hidden="true"><g fill="${col}">${[-1, 1].map(side => [0, 1, 2, 3, 4].map(i => { const f = (28 + i * 27) * Math.PI / 180, x = 60 + side * 40 * Math.sin(f), y = 30 + 26 * Math.cos(f); return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="9.5" ry="4.6" transform="rotate(${(side * (60 - (28 + i * 27))).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`; }).join('')).join('')}</g></svg>`;
  function scoreRow(s, rank) { const r = document.createElement('div'); r.className = 'frow';
    r.innerHTML = `<span class="rk">${rank}위</span>`; const cvw = document.createElement('span'); cvw.className = 'av'; cvw.appendChild(JR.animalCard(s.animal, 96)); r.appendChild(cvw);
    const nm = document.createElement('b'); nm.className = 'nm'; nm.textContent = s.nick || s.name; r.appendChild(nm);
    const rounds = Math.max(1, st.round); r.insertAdjacentHTML('beforeend', `<span class="cell">${s.finishes} / ${rounds}</span><span class="cell">${s.correct} / ${s.asked}</span><span class="pts">${s.score}점</span>`); return r; }
  // 최종 결과: 시상대 + 최종 순위(시안)
  function champion(o) {
    const d = document.createElement('div'); d.className = 'champ';
    d.innerHTML = `<img class="champ-banner" src="ui/champion.webp" alt="점프 대소동 챔피언!"><div class="confetti"></div>
      <div class="champ-body"><div class="podium3"></div>
      <div class="final-rank"><div class="ribbon">🏁 최종 순위 🏁</div><div class="fhead"><span></span><span>완주</span><span>영어</span><span>점수</span></div><div class="frows"></div></div></div>`;
    const conf = d.querySelector('.confetti'); for (let i = 0; i < 26; i++) { const k = document.createElement('i'); k.style.left = (Math.random() * 100) + '%'; k.style.background = ['#ffd84a', '#ff9cc4', '#b79cf5', '#7fd3f7', '#ffb347'][i % 5]; k.style.animationDelay = (-Math.random() * 6) + 's'; k.style.animationDuration = (4 + Math.random() * 4) + 's'; conf.appendChild(k); }
    const top = st.ranking.slice(0, 3), pod = d.querySelector('.podium3');
    [1, 0, 2].forEach(i => { const s = top[i]; const col = document.createElement('div'); col.className = 'pod p' + (i + 1); if (!s) { col.style.visibility = 'hidden'; pod.appendChild(col); return; }
      const cv2 = JR.animalCard(s.animal, 220); col.appendChild(cv2);
      const st2 = document.createElement('div'); st2.className = 'stump'; st2.innerHTML = laurel(i === 0 ? '#fff3b0' : i === 1 ? '#eef0f2' : '#f3c9a0') + `<b>${i + 1}</b>`; col.appendChild(st2);
      const card = document.createElement('div'); card.className = 'pcard'; card.innerHTML = '<b></b><span></span>'; card.querySelector('b').textContent = s.nick || s.name; card.querySelector('span').textContent = s.score + '점'; col.appendChild(card);
      pod.appendChild(col); });
    const rows = d.querySelector('.frows'); st.ranking.slice(3).forEach((s, i) => rows.appendChild(scoreRow(s, i + 4)));
    if (st.ranking.length <= 3) rows.innerHTML = '<div class="muted" style="padding:14px;text-align:center">모두 시상대에 올랐어요!</div>';
    o.appendChild(d);
  }
  // 학생별 경기 결과 표(순위 탭)
  function resultTable(o) {
    const d = document.createElement('div'); d.className = 'rtable';
    d.innerHTML = `<h2><i></i>학생별 경기 결과<i></i></h2><div class="rhead"><span>순위</span><span>학생</span><span>🏁 완주</span><span>📖 영어</span><span>⭐ 점수</span></div><div class="rrows"></div>`;
    const rows = d.querySelector('.rrows'), rounds = Math.max(1, st.round);
    st.ranking.forEach((s, i) => { const r = document.createElement('div'); r.className = 'rrow';
      r.innerHTML = `<span class="medal m${i < 3 ? i + 1 : 0}">${i + 1}</span>`; const who = document.createElement('span'); who.className = 'who'; const av = document.createElement('span'); av.className = 'av'; av.appendChild(JR.animalCard(s.animal, 96)); who.appendChild(av);
      const nm = document.createElement('b'); nm.textContent = s.nick || s.name; who.appendChild(nm); const sm = document.createElement('small'); sm.textContent = `${s.num}번 ${s.name}`; who.appendChild(sm); r.appendChild(who);
      r.insertAdjacentHTML('beforeend', `<span><em class="cell">${s.finishes} / ${rounds}</em></span><span><em class="cell">${s.correct} / ${s.asked}</em></span><span><em class="pts">${s.score}</em></span>`); rows.appendChild(r); });
    if (!st.ranking.length) rows.innerHTML = '<div class="muted" style="padding:20px;text-align:center">게임을 시작하면 결과가 보여요</div>';
    o.appendChild(d);
  }
  function banner(o, h, sub, small) { const d = document.createElement('div'); d.className = 'panel'; d.style.width = 'auto'; d.style.textAlign = 'center'; d.style.opacity = small ? 0.9 : 0.96;
    if (small) { o.style.alignItems = 'flex-start'; o.style.paddingTop = '16px'; } else { o.style.alignItems = ''; o.style.paddingTop = ''; }
    d.innerHTML = `<h2></h2><div class="muted"></div>`; d.querySelector('h2').textContent = h; d.querySelector('.muted').textContent = sub; o.appendChild(d); }

  function renderSide() {
    const b = $('sideBody'); if (!st) return; b.innerHTML = '';
    if (sideTab === 'stu') {
      const on = st.students.filter(s => s.online).length;
      const h = document.createElement('div'); h.className = 'side-head'; h.innerHTML = `<h3><i></i>학생 현황<i></i></h3><span class="count-pill">👥 접속 ${on} / ${st.students.length}명</span>`; b.appendChild(h);
      st.students.forEach(s => { const r = document.createElement('div'); r.className = 'stu' + (s.online ? '' : ' off');
        r.appendChild(JR.animalCard(s.animal, 80));
        const nm = document.createElement('span'); nm.className = 'nm'; nm.innerHTML = '<b></b><small></small>'; nm.querySelector('b').textContent = s.nick || s.name; nm.querySelector('small').textContent = `${s.num}번 ${s.name} · ${s.score}점`; r.appendChild(nm);
        let status = '', cls = ''; if (!s.online) { status = '끊김'; cls = 'grey'; } else if (!s.active) { status = st.round ? '대기' : '입장'; cls = 'cream'; }
        else if (st.phase === 'quiz') { status = `퀴즈 ${s.answered}/3`; cls = 'gold'; } else if (st.phase === 'place') { status = s.placed ? '설치 완료' : `설치 ${s.placedN || 0}/2`; cls = s.placed ? 'green' : 'gold'; }
        else if (st.phase === 'race') { status = s.fin ? '🏁 완주' : '🏁 경기 중'; cls = s.fin ? 'green' : 'gold'; } else if (st.phase === 'result') { status = s.fin ? '🏁 완주' : '도전'; cls = s.fin ? 'green' : 'cream'; } else { status = '준비'; cls = 'cream'; }
        const stt = document.createElement('span'); stt.className = 'status ' + cls; stt.textContent = (s.slot ? s.slot + ' · ' : '') + status; r.appendChild(stt);
        const x = document.createElement('button'); x.className = 'x'; x.textContent = '×'; x.title = '내보내기'; x.onclick = () => { if (confirm(`${s.name} 학생을 내보낼까요?`)) sock.emit('t:kick', { sid: s.sid }, () => { }); }; r.appendChild(x);
        b.appendChild(r); });
    }
    if (sideTab === 'rank') {
      const h = document.createElement('div'); h.className = 'side-head'; h.innerHTML = `<h3><i></i>순위<i></i></h3><div class="muted" style="font-weight:700">왼쪽 큰 화면에 결과표가 보여요</div>`; b.appendChild(h);
      st.ranking.slice(0, 10).forEach((s, i) => { const r = document.createElement('div'); r.className = 'stu'; r.appendChild(JR.animalCard(s.animal, 80));
        const nm = document.createElement('span'); nm.className = 'nm'; nm.innerHTML = '<b></b><small></small>'; nm.querySelector('b').textContent = `${i + 1}위 ${s.nick || s.name}`; nm.querySelector('small').textContent = `완주 ${s.finishes} · 첫 완주 ${s.firsts} · 영어 ${s.correct}/${s.asked}`; r.appendChild(nm);
        const sc = document.createElement('span'); sc.className = 'status gold'; sc.textContent = s.score + '점'; r.appendChild(sc); b.appendChild(r); });
      const ex = document.createElement('button'); ex.className = 'btn ghost'; ex.style.width = '100%'; ex.style.marginTop = '10px'; ex.textContent = '결과 엑셀로 저장';
      ex.onclick = () => location.href = `/api/results.xlsx?cls=${encodeURIComponent(st.cls)}&token=${token}`; b.appendChild(ex);
      const nt = document.createElement('div'); nt.className = 'muted'; nt.style.cssText = 'margin-top:10px;font-size:12px'; nt.textContent = '점수: 영어 정답 1 · 완주 3 · 첫 완주 +2 · 내 함정에 친구가 걸리면 1 (라운드마다 최대 3)'; b.appendChild(nt);
    }
    if (sideTab === 'set') {
      const d = document.createElement('div'); d.className = 'set';
      d.innerHTML = `<h3>문제 단원 <span class="muted" style="font-weight:600">(다음 퀴즈부터 바뀌어요)</span></h3><select id="unitSel"></select>
        <h3>맵 세트 <span class="muted" style="font-weight:600">(다음 게임부터)</span></h3><select id="setSel"><option value="1">기본 맵 6종 (학교 옥상·구름 정거장·장난감 창고·정글 다리·눈꽃 산장·달빛 기지)</option><option value="2">새 맵 6종 (화산 섬·사탕 공장·바닷속 신전·유령 성·사막 피라미드·우주 정거장)</option><option value="3">추가 맵 6종 (종이배 항구·장난감 우주 정거장·노을 사막 시장·정글 다리·눈꽃 산장·사탕 공장)</option></select>
        <h3>문제 직접 올리기</h3><input type="file" id="xls" accept=".xlsx,.xls"><button class="btn ghost" id="tpl">엑셀 양식 받기</button><button class="btn ghost" id="bankX">기본 문제 엑셀로 보기</button><div class="muted" id="upMsg" style="margin-top:6px"></div>
        <h3>학생 입장 코드</h3><div class="code-row"><b>${st.code}</b><button class="btn ghost" id="codeNew">새 코드</button></div><h3>운영</h3><button class="btn ghost" id="resetMaps">이번 게임 조각 모두 지우기</button><button class="btn ghost" id="toLobby">대기실로 돌아가기</button><button class="btn ghost" id="otherCls">다른 반 열기</button>
        <div class="muted" style="margin-top:12px;font-size:13px">점수: 영어 정답 1 · 완주 3 · 첫 완주 +2 · 내 함정에 친구가 걸리면 1 (라운드마다 최대 3)</div>`;
      b.appendChild(d);
      const us = d.querySelector('#unitSel'); info.units.forEach(u => { const op = document.createElement('option'); op.value = u.id; op.textContent = u.ko; if (u.id === st.unit) op.selected = true; us.appendChild(op); });
      us.onchange = () => sock.emit('t:settings', { unit: us.value }, () => { });
      const ss = d.querySelector('#setSel'); ss.value = st.set; ss.onchange = () => sock.emit('t:settings', { set: +ss.value }, () => { });
      d.querySelector('#codeNew').onclick = () => { if (confirm('입장 코드를 바꿀까요? 이미 들어온 학생은 그대로 있어요.')) sock.emit('t:settings', { code: 'new' }, () => { }); };
      d.querySelector('#tpl').onclick = () => location.href = '/api/template.xlsx';
      d.querySelector('#bankX').onclick = () => location.href = '/api/bank.xlsx';
      d.querySelector('#xls').onchange = e => { const f = e.target.files[0]; if (!f) return; f.arrayBuffer().then(buf => sock.emit('t:upload', { data: buf }, r => { d.querySelector('#upMsg').textContent = r.ok ? `${r.n}문제를 올렸어요 (1번 ${r.by[0]} · 2번 ${r.by[1]} · 3번 ${r.by[2]}). 단원이 '직접 올린 문제'로 바뀌었어요.` : r.reason; })); };
      d.querySelector('#resetMaps').onclick = () => { if (confirm('이번 게임에서 학생들이 놓은 조각을 모두 지울까요?')) sock.emit('t:resetMaps', {}, () => { }); };
      d.querySelector('#toLobby').onclick = () => { if (confirm('게임을 멈추고 대기실로 갈까요?')) sock.emit('t:lobby', {}, () => { }); };
      d.querySelector('#otherCls').onclick = () => { sessionStorage.removeItem('jc_open'); st = null; showSetup(); };
    }
  }
  setInterval(() => { if (st && sideTab !== 'set' && document.activeElement.tagName !== 'SELECT') { } }, 1000);

  // ── TV 캔버스 ──
  const cv = $('cv'), c = cv.getContext('2d'); let scale = 1, dpr = 1;
  function fit() { const w = $('tv'); const bw = w.clientWidth - 8, bh = w.clientHeight - 8; if (bw <= 0 || bh <= 0) return; scale = Math.min(bw / WW, bh / WH); dpr = Math.min(2, devicePixelRatio || 1);
    cv.style.width = WW * scale + 'px'; cv.style.height = WH * scale + 'px'; cv.width = Math.round(WW * scale * dpr); cv.height = Math.round(WH * scale * dpr); }
  addEventListener('resize', fit); new ResizeObserver(fit).observe($('tv'));
  const STN = ['idle', 'run', 'air', 'dead', 'win', 'land'];
  function frame(ms) {
    requestAnimationFrame(frame); if (!st) return;
    const ref = st.paused ? st.pausedAt : sNow();
    let left = null; if (st.phase === 'race') left = Math.min(JC.RACE_TIME, Math.max(0, Math.ceil((st.raceStart + JC.RACE_TIME * 1000 - ref) / 1000))); else if (st.phaseEnd) left = Math.max(0, Math.ceil((st.phaseEnd - ref) / 1000));
    $('time').textContent = left == null ? '--' : left + '초';
    c.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    const mm = st.maps[st.watch];
    const m = mm ? JC.mapById(mm.id) : JC.mapById(JC.mapsOfSet(st.set)[0].id);
    const racing = st.phase === 'race';
    const t = racing ? Math.max(0, (ref - st.raceStart) / 1000) : ms / 1000;
    c.drawImage(JR.background(m), 0, 0); JR.terrain(c, m, t);
    const pcs = mm ? (pieces[mm.id] || []) : [];
    const W = racing ? (frame.W && frame.Wkey === mm.id + pcs.length + st.round ? frame.W : (frame.W = JC.buildWorld(m, pcs), frame.Wkey = mm.id + pcs.length + st.round, frame.W)) : { cloudState: {}, arrows: {} };
    pcs.forEach(p => JR.piece(c, p, t, W, t));
    if (racing && mm) (mm.coins || []).forEach((k, i) => JR.coin(c, k.x, k.y, ms / 1000, i));
    if (mm && ['preview', 'place', 'race', 'result', 'quiz'].includes(st.phase)) {
      const info = JC.mapInfo(m);
      mm.mates.forEach((o, i) => { const r = remote[o.sid]; let x, y, f = 1, s = 'idle';
        if (r && racing) { r.x += (r.tx - r.x) * 0.35; r.y += (r.ty - r.y) * 0.35; x = r.x; y = r.y; f = r.f || 1; s = STN[r.s] || 'idle'; }
        else { const sp = info.spawns[i % 6]; x = sp.x; y = sp.y; }
        JR.animal(c, o.animal, x + 11, y + 26, 1.1, f, ms / 1000, s); JR.tag(c, x + 11, y - 8, o.name);
      });
      if (st.phase === 'place') pcs.forEach(p => { if (p.round === st.round) { c.font = '11px "Jua","Noto Sans KR",sans-serif'; const w = c.measureText(p.ownerName).width + 8; c.fillStyle = 'rgba(46,61,92,.8)'; JR.rr(c, p.gx * T, p.gy * T - 15, w, 14, 7); c.fill(); c.fillStyle = '#fff'; c.fillText(p.ownerName, p.gx * T + 4, p.gy * T - 4); } });
      if (racing) { const rt = (ref - st.raceStart) / 1000; c.textAlign = 'center';
        if (rt < 0) { c.fillStyle = 'rgba(46,61,92,.35)'; c.fillRect(0, 0, WW, WH); c.fillStyle = '#fff'; c.font = '170px "Jua","Noto Sans KR",sans-serif'; c.fillText(Math.ceil(-rt), WW / 2, WH / 2 + 55); }
        else if (rt < 0.8) { c.fillStyle = '#ffd66b'; c.font = '120px "Jua","Noto Sans KR",sans-serif'; c.fillText('출발!', WW / 2, WH / 2 + 40); }
        c.textAlign = 'left';
        c.fillStyle = 'rgba(46,61,92,.82)'; JR.rr(c, 14, WH - 46, 470, 34, 10); c.fill(); c.fillStyle = '#fff'; c.font = '17px "Jua","Noto Sans KR",sans-serif';
        c.fillText(st.maps.map(x => `${x.slot} ${x.fin}/${x.n}`).join('   '), 28, WH - 22); }
    }
    if (st.phase === 'lobby' || st.phase === 'final') { c.fillStyle = 'rgba(46,61,92,.45)'; c.fillRect(0, 0, WW, WH); }
  }
  fit(); requestAnimationFrame(frame);
})();
