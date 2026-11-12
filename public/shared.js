// 점프 대소동! — 서버와 학생·교사 화면이 함께 쓰는 규칙 (맵·조각·물리)
(function (root) {
  const T = 32, COLS = 40, ROWS = 22, WW = COLS * T, WH = ROWS * T;

  // ── 시간표 ──────────────────────────────────────────────
  const PHASE = { preview: 6, quiz: 27, place: 24, race: 33, result: 9 };
  const QUIZ_SLOTS = [6, 7, 9];          // 1번 6초 · 2번 7초 · 3번 9초
  const QUIZ_FB = 1.3;                   // 정답 확인 시간
  function quizSchedule() {              // 각 문제 시작·끝(초)
    let t = 0; return QUIZ_SLOTS.map(s => { const r = { start: t, end: t + s }; t += s + QUIZ_FB; return r; });
  }
  const RACE_COUNTDOWN = 3, RACE_TIME = 30;

  // ── 동물 캐릭터 ──────────────────────────────────────────
  const ANIMALS = [
    { id: 'chick', ko: '병아리', c: '#ffd84d' }, { id: 'sheep', ko: '양', c: '#f4f1ea' },
    { id: 'raccoon', ko: '너구리', c: '#9a9aa6' }, { id: 'elephant', ko: '코끼리', c: '#c9a6e8' },
    { id: 'rabbit', ko: '토끼', c: '#cfcfd6' }, { id: 'penguin', ko: '펭귄', c: '#33405a' },
    { id: 'cat', ko: '고양이', c: '#536589' }, { id: 'dog', ko: '강아지', c: '#f1d6a8' },
    { id: 'bear', ko: '곰', c: '#8b5e3c' }, { id: 'fox', ko: '여우', c: '#ef7d3a' },
    { id: 'frog', ko: '개구리', c: '#7cc95a' }, { id: 'panda', ko: '판다', c: '#ffffff' },
    { id: 'pig', ko: '돼지', c: '#f7a8b8' }, { id: 'duck', ko: '오리', c: '#ffd04f' },
    { id: 'squirrel', ko: '다람쥐', c: '#a85432' }, { id: 'hedgehog', ko: '고슴도치', c: '#855437' },
    { id: 'turtle', ko: '거북이', c: '#8da755' }, { id: 'otter', ko: '수달', c: '#8b5e3c' },
    { id: 'crocodile', ko: '악어', c: '#85954e' }, { id: 'hamster', ko: '햄스터', c: '#d3a878' },
    { id: 'lion', ko: '사자', c: '#cb883b' }, { id: 'giraffe', ko: '기린', c: '#dca543' },
    { id: 'zebra', ko: '얼룩말', c: '#eee8dc' }, { id: 'rhino', ko: '코뿔소', c: '#7899ad' },
    { id: 'camel', ko: '낙타', c: '#c99657' }, { id: 'kangaroo', ko: '캥거루', c: '#c78144' },
    { id: 'koala', ko: '코알라', c: '#9a9aa2' }, { id: 'alpaca', ko: '알파카', c: '#f3e3cb' },
    { id: 'meerkat', ko: '미어캣', c: '#e0b07a' }, { id: 'capybara', ko: '카피바라', c: '#b9774d' },
    { id: 'badger', ko: '오소리', c: '#8f8f95' }, { id: 'tapir', ko: '맥', c: '#8a6654' },
    { id: 'fennec', ko: '사막여우', c: '#f2d3a0' }, { id: 'gazelle', ko: '가젤', c: '#c9793f' },
  ];

  // ── 조각 ─────────────────────────────────────────────────
  // kind: help(도움) · trap(함정) · tool(지우개)
  const PIECES = {
    plat:   { ko: '고정 발판', kind: 'help', w: 3, h: 1, desc: '그냥 밟는 나무 발판' },
    move:   { ko: '이동 발판', kind: 'help', w: 3, h: 1, rot: 2, desc: '왔다 갔다 움직여요' },
    spring: { ko: '스프링', kind: 'help', w: 1, h: 1, desc: '밟으면 높이 튀어 올라요' },
    ice:    { ko: '미끄럼 발판', kind: 'help', w: 3, h: 1, desc: '쭉 미끄러져요' },
    cloud:  { ko: '구름 발판', kind: 'help', w: 3, h: 1, desc: '밟으면 잠시 뒤 사라져요' },
    fan:    { ko: '바람 선풍기', kind: 'help', w: 1, h: 1, rot: 4, desc: '바람으로 밀어 줘요' },
    honey:  { ko: '끈끈 꿀 발판', kind: 'help', w: 3, h: 1, desc: '느려지고 점프가 낮아요' },
    saw:    { ko: '톱날', kind: 'trap', w: 1, h: 1, desc: '닿으면 출발점으로!' },
    spike:  { ko: '가시공', kind: 'trap', w: 1, h: 1, desc: '뾰족뾰족 조심!' },
    bow:    { ko: '석궁', kind: 'trap', w: 1, h: 1, rot: 4, desc: '화살을 쏴요' },
    ball:   { ko: '철퇴', kind: 'trap', w: 1, h: 1, desc: '빙글빙글 흔들려요' },
    hole:   { ko: '블랙홀', kind: 'trap', w: 1, h: 1, desc: '빨아들여요' },
    fire:   { ko: '불꽃 기둥', kind: 'trap', w: 1, h: 1, rot: 4, desc: '불꽃을 뿜어요' },
    eraser: { ko: '지우개', kind: 'tool', w: 1, h: 1, desc: '친구가 놓은 조각 하나를 지워요' },
  };
  const HELP = ['plat', 'move', 'spring', 'ice', 'cloud', 'fan', 'honey'];
  const TRAP = ['saw', 'spike', 'bow', 'ball', 'hole', 'fire'];
  const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]]; // rot 0:→ 1:↓ 2:← 3:↑

  // ── 맵 ───────────────────────────────────────────────────
  // base: [x, y, w, h, 종류, 옵션]  (칸 단위, y는 위쪽 줄)
  const MAPS = [
    { id: 'roof', set: 1, ko: '학교 옥상', desc: '넓은 기본 발판과 짧은 지름길', theme: 'city',
      sky: ['#7fe7ee', '#c9f5f3'], ground: '#c6473d', edge: '#c3c6ca',
      base: [[0, 15, 7, 7], [10, 14, 6, 8], [17, 11, 5, 1, 'thin'], [19, 16, 5, 6], [26, 13, 5, 9], [33, 12, 7, 10]] },
    { id: 'cloud', set: 1, ko: '구름 정거장', desc: '작은 발판을 계단처럼 오르는 길', theme: 'mountain',
      sky: ['#a9e0f0', '#e2f6fb'], ground: '#5a7ba3', edge: '#ffffff',
      base: [[0, 17, 6, 5], [8, 16, 4, 1, 'thin'], [14, 14, 4, 1, 'thin'], [20, 12, 4, 1, 'thin'], [26, 13, 4, 1, 'thin'], [31, 11, 3, 1, 'thin'], [35, 10, 5, 12]] },
    { id: 'toy', set: 1, ko: '장난감 창고', desc: '낮은 길과 높은 지름길이 갈라지는 곳 · 컨베이어', theme: 'toy',
      sky: ['#e4c0f2', '#f6e7fb'], ground: '#6b4f8c', edge: '#fde7ff',
      base: [[0, 16, 7, 6], [9, 18, 8, 4, 'conv', 1], [19, 18, 7, 4, 'conv', -1], [28, 17, 4, 5], [34, 15, 6, 7],
             [8, 13, 3, 1, 'thin'], [13, 10, 4, 1, 'thin'], [20, 10, 4, 1, 'thin'], [27, 11, 4, 1, 'thin']] },
    { id: 'jungle', set: 1, ko: '정글 다리', desc: '흔들 다리를 건너 높은 언덕으로 · 강물 조심', theme: 'jungle', pit: 20.4,
      sky: ['#a6e6c4', '#dcf6e7'], ground: '#3e7357', edge: '#d8ffe8',
      base: [[0, 15, 6, 7], [8, 17, 4, 1, 'bridge'], [14, 17, 4, 1, 'move', { dx: 3, p: 4 }], [22, 17, 4, 1, 'bridge'], [28, 14, 5, 8], [35, 11, 5, 11]] },
    { id: 'snow', set: 1, ko: '눈꽃 산장', desc: '짧은 오르막과 긴 얼음 착지 구간', theme: 'snow',
      sky: ['#b6d8f7', '#eef6ff'], ground: '#6f8fb8', edge: '#ffffff',
      base: [[0, 16, 6, 6], [8, 16, 5, 1, 'ice'], [15, 14, 5, 1, 'ice'], [22, 12, 4, 1], [27, 12, 13, 10, 'ice']] },
    { id: 'moon', set: 1, ko: '달빛 기지', desc: '높낮이가 번갈아 나오는 점프 · 몸이 가벼워요', theme: 'moon', grav: 0.62,
      sky: ['#9f97e6', '#cfc8f6'], ground: '#4b3f86', edge: '#efe9ff',
      base: [[0, 16, 6, 6], [9, 12, 4, 1, 'thin'], [15, 17, 4, 1, 'thin'], [21, 12, 4, 1, 'thin'], [27, 16, 4, 1, 'thin'], [33, 11, 7, 11]] },

    { id: 'volcano', set: 2, ko: '화산 섬', desc: '용암에서 불기둥이 솟아요', theme: 'volcano', pit: 20,
      sky: ['#f6b38a', '#fde0c6'], ground: '#5b3a33', edge: '#ffd3b0',
      base: [[0, 15, 6, 7], [9, 14, 4, 8], [16, 15, 3, 7], [22, 13, 4, 9], [29, 14, 3, 8], [34, 12, 6, 10]],
      geysers: [[7, 0], [13.5, 1.6], [19.5, 0.8], [26.5, 2.2], [32, 1.2]] },
    { id: 'candy', set: 2, ko: '사탕 공장', desc: '말랑 젤리를 밟으면 통통 튀어요', theme: 'candy',
      sky: ['#ffc6dc', '#fff0f6'], ground: '#b65d86', edge: '#fff4fa',
      base: [[0, 16, 5, 6], [7, 19, 4, 1, 'bouncy'], [13, 13, 5, 1, 'thin'], [20, 19, 4, 1, 'bouncy'], [26, 13, 4, 1, 'thin'], [32, 11, 8, 11]] },
    { id: 'sea', set: 2, ko: '바닷속 신전', desc: '물속에서는 점프를 여러 번 할 수 있어요', theme: 'sea', water: true,
      sky: ['#5fb8d6', '#2b6f9e'], ground: '#2f5d6e', edge: '#c9f4ff',
      base: [[0, 16, 6, 6], [10, 18, 5, 4], [18, 13, 4, 1, 'thin'], [25, 17, 5, 5], [33, 12, 7, 10]] },
    { id: 'ghost', set: 2, ko: '유령 성', desc: '깜빡깜빡 사라지는 발판', theme: 'ghost',
      sky: ['#7e86b8', '#bfc4e3'], ground: '#3c3f63', edge: '#e5e8ff',
      base: [[0, 16, 6, 6], [8, 15, 3, 1, 'ghost', 0], [13, 14, 3, 1, 'ghost', 1.0], [18, 15, 4, 1, 'thin'], [24, 13, 3, 1, 'ghost', 0.5], [29, 12, 3, 1, 'ghost', 1.5], [34, 12, 6, 10]] },
    { id: 'desert', set: 2, ko: '사막 피라미드', desc: '모래바람이 뒤로 밀어요', theme: 'desert', wind: { period: 5, on: 1.6, warn: 0.9, f: -950 },
      sky: ['#f7d68e', '#fdf1cf'], ground: '#b07d3e', edge: '#fff2c9',
      base: [[0, 17, 6, 5], [8, 16, 4, 6], [14, 14, 4, 8], [20, 12, 5, 10], [27, 14, 4, 8], [33, 13, 7, 9]] },
    { id: 'space', set: 2, ko: '우주 정거장', desc: '몸이 가볍고 순간이동 문이 있어요', theme: 'space', grav: 0.62,
      sky: ['#2b2f5e', '#5a4f99'], ground: '#4a5578', edge: '#d9e3ff',
      base: [[0, 15, 6, 7], [9, 18, 4, 1, 'thin'], [15, 14, 4, 1, 'thin'], [21, 16, 4, 1, 'thin'], [27, 13, 4, 1, 'thin'], [33, 11, 7, 11], [22, 7, 5, 1, 'thin']],
      portals: [[11, 16, 24, 5]] },

    // ── 추가 맵 3종: 발판·장애물 그림 묶음(kits)을 써요. base 일곱째 값이 그림 이름 ──
    { id: 'harbor', set: 3, ko: '종이배 항구', desc: '튜브로 튀어 오르고, 구르는 밧줄과 파도를 피해요', theme: 'harbor', kit: 'harbor', pit: 20.4,
      sky: ['#8fdff0', '#e3f8fb'], ground: '#b9793f', edge: '#8fbf4d',
      base: [[0, 15, 6, 7, 'solid', 0, 'crate'], [8, 15, 4, 1, 'thin', 0, 'cork'], [14, 13, 5, 1, 'thin', 0, 'boats'], [20, 17, 3, 2, 'bouncy', 0, 'buoy'], [24, 12, 4, 1, 'thin', 0, 'cork'], [29, 14, 4, 1, 'thin', 0, 'boats'], [34, 12, 6, 10, 'solid', 0, 'crate']],
      mobs: [{ img: 'rope', w: 54, r: 20, x0: 15, y0: 13, x1: 18.2, y1: 13, p: 3.6, roll: 1, sit: 1 }, { img: 'wave', w: 124, r: 36, x0: 8, y0: 18.1, x1: 31, y1: 18.1, p: 9, face: -1 }] },
    { id: 'station', set: 3, ko: '장난감 우주 정거장', desc: '몸이 가벼워요 · 구르는 달 돌과 소용돌이 조심', theme: 'toystation', kit: 'station', grav: 0.62,
      sky: ['#3b3a78', '#7a6cc4'], ground: '#7f86d6', edge: '#cfd0f5',
      base: [[0, 16, 6, 6, 'solid', 0, 'console'], [8, 14, 4, 1, 'thin', 0, 'solar'], [14, 17, 3, 2, 'bouncy', 0, 'spring'], [18, 11, 6, 1, 'thin', 0, 'truss'], [26, 14, 4, 1, 'thin', 0, 'solar'], [31, 17, 3, 2, 'bouncy', 0, 'spring'], [35, 10, 5, 12, 'solid', 0, 'console']],
      mobs: [{ img: 'moon', w: 52, r: 20, x0: 19, y0: 11, x1: 23, y1: 11, p: 4.2, roll: 1, sit: 1 }, { img: 'vortex', w: 86, r: 14, x0: 28.5, y0: 8.5, x1: 28.5, y1: 8.5, p: 1, spin: 1, pull: 125 }] },
    { id: 'bazaar', set: 3, ko: '노을 사막 시장', desc: '방석으로 통통 · 구르는 항아리를 넘고 회오리를 타요', theme: 'bazaar', kit: 'bazaar',
      sky: ['#ff9e7a', '#ffd9a8'], ground: '#e9a94e', edge: '#f6d08a',
      base: [[0, 16, 6, 6, 'solid', 0, 'brick'], [8, 15, 4, 1, 'thin', 0, 'awning'], [13, 18, 3, 2, 'bouncy', 0, 'cushion'], [17, 12, 5, 1, 'thin', 0, 'mat'], [24, 14, 4, 1, 'thin', 0, 'awning'], [29, 12, 4, 1, 'thin', 0, 'mat'], [34, 13, 6, 9, 'solid', 0, 'brick']],
      mobs: [{ img: 'pot', w: 62, r: 19, x0: 18, y0: 12, x1: 21, y1: 12, p: 3.8, sit: 1, face: 1 }, { img: 'tornado', w: 84, r: 26, x0: 23.5, y0: 10.2, x1: 33, y1: 10.2, p: 7.5, fx: 'toss' }] },
  ];
  // 맵 세트(한 게임에 쓰는 6개). 30명까지는 6개가 필요해서 추가 맵 3종에 기존 맵 3종을 더했어요.
  const SETS = { 1: ['roof', 'cloud', 'toy', 'jungle', 'snow', 'moon'], 2: ['volcano', 'candy', 'sea', 'ghost', 'desert', 'space'], 3: ['harbor', 'station', 'bazaar', 'jungle', 'snow', 'candy'] };
  const SET_KO = { 1: '기본 맵', 2: '새 맵', 3: '추가 맵' };
  // 움직이는 장애물 위치(px). sit: 발판 위에 얹혀 구름
  function mobPos(mb, t) { const a = t / mb.p * Math.PI * 2, u = (1 - Math.cos(a)) / 2, r = mb.r;
    return { x: (mb.x0 + (mb.x1 - mb.x0) * u) * T, y: (mb.y0 + (mb.y1 - mb.y0) * u) * T - (mb.sit ? r : 0), dir: Math.sin(a) >= 0 ? 1 : -1, u }; }
  // 마지막 라운드 깜짝 이벤트
  const EVENTS = { double: { ko: '점수 두 배', desc: '이번 라운드 점수가 모두 두 배예요!' }, lowgrav: { ko: '둥실둥실', desc: '몸이 가벼워져서 높이, 멀리 뛰어요!' }, coinrain: { ko: '동전 비', desc: '동전이 두 배로 쏟아져요!' } };
  // 동전 자리(px, 가운데). 틈 위(위험한 길)에 먼저, 남으면 발판 위에 놓아요
  function coinSpots(m, pieces, n, rnd) {
    rnd = rnd || Math.random; const info = mapInfo(m), used = new Set(); pieces.forEach(p => cellsOf(p).forEach(c => used.add(c[0] + ',' + c[1])));
    const tops = m.base.map(b => ({ x0: b[0], x1: b[0] + b[2] + (b[4] === 'move' ? b[5].dx : 0), y: b[1] })).sort((a, b) => a.x0 - b.x0), gaps = [], safe = [];
    tops.forEach((b, i) => { safe.push([(b.x0 + b.x1) / 2, b.y - 2.4 - rnd()]); const nx = tops[i + 1]; if (nx && nx.x0 > b.x1) gaps.push([(b.x1 + nx.x0) / 2, Math.min(b.y, nx.y) - 2.2 - rnd() * 1.6]); });
    const okSpot = q => { const gx = Math.floor(q[0]), gy = Math.floor(q[1]); return gy >= 2 && gx >= 1 && gx < COLS - 1 && !inProtect(m, gx, gy) && !used.has(gx + ',' + gy) && !baseCellSet(m).has(gx + ',' + gy); };
    const sh = a => a.map(v => [rnd(), v]).sort((x, y) => x[0] - y[0]).map(v => v[1]);
    const order = sh(gaps.filter(okSpot)).concat(sh(safe.filter(okSpot))), out = [];
    for (const q of order) { if (out.length >= n) break; if (out.some(o => Math.abs(o.x - q[0] * T) < 48 && Math.abs(o.y - q[1] * T) < 48)) continue; out.push({ x: Math.round(q[0] * T), y: Math.round(q[1] * T) }); }
    return out;
  }
  const SLOT = ['A', 'B', 'C', 'D', 'E', 'F'];
  function mapById(id) { return MAPS.find(m => m.id === id); }
  function mapsOfSet(s) { return (SETS[s] || SETS[1]).map(mapById); }

  // 맵 부가 정보(출발점·도착점·보호 구역)
  function mapInfo(m) {
    if (m._info) return m._info;
    const sp = m.base[0];
    const fp = m.base.reduce((a, b) => (b[0] + b[2] > a[0] + a[2] ? b : a));
    const flag = { x: (fp[0] + fp[2] - 2) * T, y: (fp[1] - 3) * T, w: 2 * T, h: 3 * T };
    const spawns = []; for (let i = 0; i < 6; i++) spawns.push({ x: sp[0] * T + 10 + i * ((sp[2] * T - 40) / 5), y: sp[1] * T - 27 });
    const protect = [
      { x: sp[0], y: sp[1] - 5, w: sp[2] + 1, h: 5 },
      { x: fp[0] + fp[2] - 6, y: fp[1] - 5, w: 6, h: 5 },
    ];
    (m.portals || []).forEach(p => { protect.push({ x: p[0] - 1, y: p[1] - 1, w: 3, h: 4 }); protect.push({ x: p[2] - 1, y: p[3] - 1, w: 3, h: 4 }); });
    m._info = { flag, spawns, protect, pitY: (m.pit || 22.6) * T, grav: m.grav || 1 };
    return m._info;
  }

  // ── 시간에 따라 움직이는 것들 ────────────────────────────
  function hash(s) { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
  function phaseOf(id) { return (hash(String(id)) % 1000) / 1000; }
  function ghostVisible(ph, t) { const c = ((t + ph) % 3 + 3) % 3; return c < 2.1; }
  function ghostWarn(ph, t) { const c = ((t + ph) % 3 + 3) % 3; return c > 1.55 && c < 2.1; }
  function geyserState(ph, t) { const c = ((t + ph) % 3.2 + 3.2) % 3.2; return c < 1.0 ? 2 : (c > 2.6 ? 1 : 0); } // 2 불, 1 예고
  function windState(w, t) { const c = ((t % w.period) + w.period) % w.period; if (c < w.warn) return 1; if (c < w.warn + w.on) return 2; return 0; }
  function fireState(ph, t) { const c = ((t + ph * 3) % 3 + 3) % 3; return c < 1.2 ? 2 : (c > 2.55 ? 1 : 0); }

  // 이동 발판 위치(오프셋 px)
  function moveOffset(dxTiles, period, ph, t) {
    const a = (t / period + ph) * Math.PI * 2;
    return { o: (1 - Math.cos(a)) / 2 * dxTiles * T, v: Math.sin(a) * Math.PI / period * dxTiles * T };
  }

  // ── 설치 검사 ─────────────────────────────────────────────
  function cellsOf(p) {
    const d = PIECES[p.type]; const out = [];
    for (let i = 0; i < d.w; i++) for (let j = 0; j < d.h; j++) out.push([p.gx + i, p.gy + j]);
    return out;
  }
  function baseCellSet(m) {
    if (m._cells) return m._cells;
    const s = new Set();
    m.base.forEach(b => { if (b[4] === 'move') { for (let i = 0; i < b[2] + (b[5].dx || 0); i++) s.add((b[0] + i) + ',' + b[1]); }
      else for (let i = 0; i < b[2]; i++) for (let j = 0; j < b[3]; j++) s.add((b[0] + i) + ',' + (b[1] + j)); });
    m._cells = s; return s;
  }
  function inProtect(m, x, y) { return mapInfo(m).protect.some(r => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h); }
  function canPlace(m, pieces, np) {
    if (np.type === 'eraser') return { ok: false, reason: '지우개는 조각을 눌러 써요' };
    const bc = baseCellSet(m), used = new Set();
    pieces.forEach(p => cellsOf(p).forEach(c => used.add(c[0] + ',' + c[1])));
    for (const [x, y] of cellsOf(np)) {
      if (x < 0 || y < 1 || x >= COLS || y >= ROWS) return { ok: false, reason: '맵 밖이에요' };
      if (inProtect(m, x, y)) return { ok: false, reason: '출발·도착 근처는 설치 금지' };
      if (bc.has(x + ',' + y)) return { ok: false, reason: '기본 발판과 겹쳐요' };
      if (used.has(x + ',' + y)) return { ok: false, reason: '다른 조각과 겹쳐요' };
    }
    return { ok: true };
  }
  function randomSpot(m, pieces, type, rnd) {
    rnd = rnd || Math.random;
    for (let k = 0; k < 400; k++) {
      const p = { type, gx: 6 + Math.floor(rnd() * 28), gy: 4 + Math.floor(rnd() * 15), rot: PIECES[type].rot ? Math.floor(rnd() * PIECES[type].rot) : 0 };
      if (canPlace(m, pieces, p).ok) return p;
    }
    return null;
  }

  // ── 월드(물리용) ─────────────────────────────────────────
  function buildWorld(m, pieces) {
    const info = mapInfo(m);
    const W = { m, info, pieces, cloudState: {}, stat: [], arrows: {} };
    // 고정된 단단한 것(화살 길이 계산용)
    m.base.forEach(b => { if (!['move', 'ghost'].includes(b[4])) W.stat.push({ x: b[0] * T, y: b[1] * T, w: b[2] * T, h: b[3] * T }); });
    pieces.forEach(p => { if (['plat', 'spring', 'ice', 'honey', 'fan', 'bow', 'fire'].includes(p.type)) W.stat.push({ x: p.gx * T, y: p.gy * T, w: PIECES[p.type].w * T, h: T }); });
    pieces.forEach(p => {
      if (p.type !== 'bow') return;
      const d = DIRS[p.rot || 0]; let x = p.gx * T + 16, y = p.gy * T + 16, len = 0;
      while (len < 15 * T) { x += d[0] * 8; y += d[1] * 8; len += 8;
        if (x < 0 || y < 0 || x > WW || y > WH) break;
        if (len > 20 && W.stat.some(r => x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h)) break; }
      W.arrows[p.id] = len;
    });
    return W;
  }
  function solidsAt(W, t, now) {
    const out = [], m = W.m;
    m.base.forEach((b, i) => {
      const r = { x: b[0] * T, y: b[1] * T, w: b[2] * T, h: b[3] * T, k: b[4] || 'solid', vx: 0, vy: 0 };
      if (b[4] === 'move') { const mo = moveOffset(b[5].dx, b[5].p, 0, t); r.x += mo.o; r.vx = mo.v; }
      if (b[4] === 'conv') r.cv = b[5];
      if (b[4] === 'ghost' && !ghostVisible(b[5], t)) return;
      out.push(r);
    });
    W.pieces.forEach(p => {
      const d = PIECES[p.type];
      if (['saw', 'spike', 'ball', 'hole', 'eraser'].includes(p.type)) return;
      const r = { x: p.gx * T, y: p.gy * T, w: d.w * T, h: d.h * T, k: p.type, vx: 0, vy: 0, pid: p.id };
      if (p.type === 'move') { const mo = moveOffset(3, 3.2, phaseOf(p.id), t); if (p.rot === 1) { r.y -= mo.o; r.vy = -mo.v; } else { r.x += mo.o; r.vx = mo.v; } }
      if (p.type === 'cloud') { const cs = W.cloudState[p.id]; if (cs && now - cs > 0.55 && now - cs < 2.8) return; if (cs && now - cs >= 2.8) delete W.cloudState[p.id]; }
      if (p.type === 'plat' || p.type === 'cloud' || p.type === 'ice' || p.type === 'honey' || p.type === 'move') r.h = T * 0.5;
      out.push(r);
    });
    return out;
  }
  // 위험한 것: {c:원(cx,cy,r) | r:사각형, by: 조각 id}
  function hazardsAt(W, t) {
    const out = [], m = W.m;
    W.pieces.forEach(p => {
      const cx = p.gx * T + 16, cy = p.gy * T + 16, ph = phaseOf(p.id);
      if (p.type === 'saw') out.push({ c: [cx, cy, 15], by: p.id });
      if (p.type === 'spike') out.push({ c: [cx, cy, 13], by: p.id });
      if (p.type === 'ball') { const a = Math.PI / 2 + 1.2 * Math.sin(t * 1.9 + ph * 6); out.push({ c: [cx + Math.cos(a) * 82, cy + Math.sin(a) * 82, 16], by: p.id }); }
      if (p.type === 'hole') out.push({ c: [cx, cy, 11], by: p.id, hole: true });
      if (p.type === 'bow') { const len = W.arrows[p.id] || 0, per = 2.2, c = ((t + ph * per) % per + per) % per, dist = 18 + c * 380;
        if (dist < len) { const d = DIRS[p.rot || 0]; out.push({ c: [cx + d[0] * dist, cy + d[1] * dist, 6], by: p.id, arrow: d }); } }
      if (p.type === 'fire' && fireState(ph, t) === 2) { const d = DIRS[p.rot || 0];
        const x1 = cx + d[0] * 16, y1 = cy + d[1] * 16, x2 = cx + d[0] * (16 + 3 * T), y2 = cy + d[1] * (16 + 3 * T);
        out.push({ r: { x: Math.min(x1, x2) - (d[0] ? 0 : 10), y: Math.min(y1, y2) - (d[1] ? 0 : 10), w: Math.abs(x2 - x1) || 20, h: Math.abs(y2 - y1) || 20 }, by: p.id }); }
    });
    (m.mobs || []).forEach(mb => { if (mb.fx === 'toss') return; const q = mobPos(mb, t); out.push({ c: [q.x, q.y, mb.r], by: 'map' }); });
    (m.geysers || []).forEach(g => { if (geyserState(g[1], t) === 2) out.push({ r: { x: g[0] * T - 10, y: 8 * T, w: 20 + T, h: 13 * T }, by: 'map' }); });
    return out;
  }

  // ── 플레이어 물리 ───────────────────────────────────────
  const P = { G: 2000, JUMP: 720, RUN: 250, ACC: 2600, AIR: 1700, MAXFALL: 900, PW: 22, PH: 26 };
  function newPlayer(spawn) { return { x: spawn.x, y: spawn.y, vx: 0, vy: 0, face: 1, on: null, coyote: 0, buf: 0, cut: false, dead: 0, inv: 0, fin: false, swimCd: 0, portalCd: 0, sx: spawn.x, sy: spawn.y, anim: 0 }; }
  function overlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

  function step(p, inp, dt, W, t, now) {
    const ev = {}; const m = W.m, info = W.info;
    if (p.fin) { p.vx = 0; p.vy = 0; return ev; }
    if (p.dead > 0) { p.dead -= dt; if (p.dead <= 0) { p.x = p.sx; p.y = p.sy; p.vx = p.vy = 0; p.inv = 0.6; ev.respawn = 1; } return ev; }
    if (p.inv > 0) p.inv -= dt;
    if (p.portalCd > 0) p.portalCd -= dt;
    const solids = solidsAt(W, t, now);
    const g = p.on;
    // 바닥 상태
    let run = P.RUN, acc = p.on ? P.ACC : P.AIR, jumpV = P.JUMP;
    const water = !!m.water;
    if (g && g.k === 'ice' || g && g.k === 'ice' ) acc = 520;
    if (g && g.k === 'honey') { run *= 0.42; jumpV *= 0.62; }
    if (water) run *= 0.85;
    const dir = (inp.r ? 1 : 0) - (inp.l ? 1 : 0);
    if (dir) p.face = dir;
    const target = dir * run;
    const dv = target - p.vx, maxdv = acc * dt;
    p.vx += Math.max(-maxdv, Math.min(maxdv, dv));
    // 중력
    let grav = P.G * info.grav, maxFall = P.MAXFALL;
    if (water) { grav *= 0.38; maxFall = 230; }
    // 바람: 맵 모래바람
    if (m.wind && windState(m.wind, t) === 2) p.vx += m.wind.f * dt * (p.on ? 0.55 : 1);
    // 선풍기·블랙홀
    const pc = { x: p.x + P.PW / 2, y: p.y + P.PH / 2 };
    W.pieces.forEach(pc2 => {
      const cx = pc2.gx * T + 16, cy = pc2.gy * T + 16;
      if (pc2.type === 'fan') { const d = DIRS[pc2.rot || 0];
        const zone = d[0] ? { x: d[0] > 0 ? cx + 16 : cx - 16 - 7 * T, y: cy - 22, w: 7 * T, h: 44 } : { x: cx - 22, y: d[1] > 0 ? cy + 16 : cy - 16 - 7 * T, w: 44, h: 7 * T };
        if (overlap({ x: p.x, y: p.y, w: P.PW, h: P.PH }, zone)) { if (d[1] < 0) { p.vy -= 3300 * info.grav * dt; } else if (d[1] > 0) p.vy += 1500 * dt; else p.vx += d[0] * 1600 * dt; ev.wind = 1; } }
      if (pc2.type === 'hole') { const dx = cx - pc.x, dy = cy - pc.y, d = Math.hypot(dx, dy);
        if (d < 120 && d > 1) { const f = 1500 * (1 - d / 120); p.vx += dx / d * f * dt; p.vy += dy / d * f * dt; } }
    });
    (m.mobs || []).forEach(mb => { if (!mb.pull && mb.fx !== 'toss') return; const q = mobPos(mb, t), dx = q.x - pc.x, dy = q.y - pc.y, d = Math.hypot(dx, dy);
      if (mb.pull && d < mb.pull && d > 1) { const f = 1300 * (1 - d / mb.pull); p.vx += dx / d * f * dt; p.vy += dy / d * f * dt; }
      if (mb.fx === 'toss' && d < mb.r + 14 && !(p.tossCd > 0)) { p.vy = -780; p.vx += q.dir * 120; p.on = null; p.bounced = true; p.cut = true; p.tossCd = 0.7; ev.spring = 1; } });
    if (p.tossCd > 0) p.tossCd -= dt;
    p.vy = Math.min(maxFall, p.vy + grav * dt);
    // 점프
    if (inp.jp) p.buf = 0.13; else p.buf -= dt;
    if (p.on) p.coyote = 0.09; else p.coyote -= dt;
    p.swimCd -= dt;
    if (p.buf > 0 && p.coyote > 0) { p.vy = -jumpV; p.buf = 0; p.coyote = 0; p.on = null; p.cut = false; ev.jump = 1; }
    else if (water && p.buf > 0 && p.swimCd <= 0) { p.vy = -400; p.buf = 0; p.swimCd = 0.22; ev.jump = 1; }
    if (!inp.j && p.vy < -260 && !p.cut && !p.bounced) { p.vy *= 0.55; p.cut = true; }
    // 움직이는 바닥에 실려 가기
    if (g) { const cur = solids.find(s => s.pid ? s.pid === g.pid : (s.k === g.k && Math.abs(s.y - g.y) < 1 && Math.abs(s.x - g.x) < 40));
      if (cur) { p.x += cur.vx * dt; if (cur.vy > 0) p.y += cur.vy * dt; if (cur.cv) p.x += cur.cv * 85 * dt; } }
    // x 이동
    p.x += p.vx * dt;
    let box = { x: p.x, y: p.y, w: P.PW, h: P.PH };
    for (const s of solids) if (overlap(box, s)) {
      if (p.vx > 0 || (p.x + P.PW / 2 < s.x + s.w / 2)) p.x = s.x - P.PW; else p.x = s.x + s.w;
      p.vx = 0; box.x = p.x;
    }
    if (p.x < 0) { p.x = 0; p.vx = 0; } if (p.x > WW - P.PW) { p.x = WW - P.PW; p.vx = 0; }
    // y 이동
    p.y += p.vy * dt; box = { x: p.x, y: p.y, w: P.PW, h: P.PH };
    const was = p.on; p.on = null; p.bounced = p.bounced && p.vy < 0;
    for (const s of solids) if (overlap(box, s)) {
      if (p.vy >= 0 && p.y + P.PH - s.y < 22) {
        p.y = s.y - P.PH; p.on = s;
        if (s.k === 'spring') { p.vy = -1060; p.on = null; p.bounced = true; ev.spring = 1; }
        else if (s.k === 'bouncy') { p.vy = -980; p.on = null; p.bounced = true; ev.spring = 1; }
        else { if (p.vy > 300) ev.land = 1; p.vy = 0; }
        if (s.k === 'cloud' && !W.cloudState[s.pid]) W.cloudState[s.pid] = now;
      } else if (p.vy < 0) { p.y = s.y + s.h; p.vy = 0; }
      else { // 움직이는 발판에 끼임 → 위로 밀기
        p.y = s.y - P.PH; }
      box.y = p.y;
    }
    p.anim += dt * (Math.abs(p.vx) > 20 ? 1 : 0.3);
    // 순간이동 문
    (m.portals || []).forEach(q => {
      const a = { x: q[0] * T - 6, y: q[1] * T, w: T + 12, h: 2 * T };
      if (p.portalCd <= 0 && overlap({ x: p.x, y: p.y, w: P.PW, h: P.PH }, a)) { p.x = q[2] * T + 5; p.y = q[3] * T; p.vx = 0; p.vy = 0; p.portalCd = 1; ev.portal = 1; }
    });
    // 죽음
    if (p.y > info.pitY) { kill(p, 'fall'); ev.die = 'fall'; return ev; }
    if (p.inv <= 0) {
      const hb = { x: p.x + 3, y: p.y + 3, w: P.PW - 6, h: P.PH - 5 };
      for (const h of hazardsAt(W, t)) {
        let hit = false;
        if (h.c) { const nx = Math.max(hb.x, Math.min(h.c[0], hb.x + hb.w)), ny = Math.max(hb.y, Math.min(h.c[1], hb.y + hb.h)); hit = (h.c[0] - nx) ** 2 + (h.c[1] - ny) ** 2 < h.c[2] * h.c[2]; }
        else hit = overlap(hb, h.r);
        if (hit) { kill(p, h.by); ev.die = h.by; return ev; }
      }
    }
    // 도착
    if (overlap({ x: p.x, y: p.y, w: P.PW, h: P.PH }, info.flag)) { p.fin = true; ev.finish = 1; }
    return ev;
  }
  function kill(p, by) { p.dead = 0.8; p.vx = 0; p.vy = -300; p.killedBy = by; }

  const api = { T, COLS, ROWS, WW, WH, PHASE, QUIZ_SLOTS, QUIZ_FB, quizSchedule, RACE_COUNTDOWN, RACE_TIME,
    ANIMALS, PIECES, HELP, TRAP, DIRS, MAPS, SETS, SET_KO, EVENTS, coinSpots, mobPos, SLOT, mapById, mapsOfSet, mapInfo, phaseOf, ghostVisible, ghostWarn, geyserState, windState, fireState, moveOffset,
    cellsOf, canPlace, randomSpot, buildWorld, solidsAt, hazardsAt, P, newPlayer, step, overlap, baseCellSet };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.JC = api;
})(this);
