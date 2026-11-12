// 점프 대소동! — 그리기 (종이·펠트 콜라주 스타일: 배경·지형·조각·동물 캐릭터)
(function () {
  const { T, WW, WH, PIECES, DIRS } = JC;
  const OUT = '#4a3f38';                       // 글자·눈 등에 쓰는 따뜻한 짙은 색
  const SH = 'rgba(45,32,28,.30)';             // 종이 그림자
  function rr(c, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function rrp(c, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function seeded(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
  function circle(c, x, y, r, fill, stroke, lw) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.lineWidth = lw || 2; c.strokeStyle = stroke; c.stroke(); } }
  function shade(hex, f) { const n = parseInt(hex.slice(1, 7), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    if (f < 0) { r *= 1 + f; g *= 1 + f; b *= 1 + f; } else { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; }
    return '#' + ((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b)).toString(16).slice(1); }
  function mk(w, h) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; return cv; }

  // ── 종이 질감 ───────────────────────────────────────────
  let grainCv = null;
  function grainTile() {
    if (grainCv) return grainCv;
    grainCv = mk(160, 160); const g = grainCv.getContext('2d'), R = seeded(4242);
    const id = g.createImageData(160, 160);
    for (let i = 0; i < id.data.length; i += 4) { const v = R() < 0.5 ? 255 : 30; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = R() * (v === 255 ? 30 : 22); }
    g.putImageData(id, 0, 0);
    g.lineCap = 'round';
    for (let i = 0; i < 70; i++) { const x = R() * 160, y = R() * 160, a = R() * 7, l = 3 + R() * 7; g.strokeStyle = R() < 0.5 ? 'rgba(255,255,255,.10)' : 'rgba(60,40,30,.07)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    return grainCv;
  }
  function grain(c, w, h) { c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-atop'; c.fillStyle = c.createPattern(grainTile(), 'repeat'); c.fillRect(0, 0, w, h); c.restore(); }
  // 오려 붙인 종이 한 장: 그림자와 함께 채우기 (미리 그려 두는 그림에만 써요)
  function cut(c, fill, path, blur) { c.save(); c.shadowColor = SH; c.shadowBlur = blur == null ? 7 : blur; c.shadowOffsetY = 3; c.beginPath(); path(c); c.fillStyle = fill; c.fill(); c.restore(); }
  function flat(c, fill, path) { c.beginPath(); path(c); c.fillStyle = fill; c.fill(); }
  function stitch(c, col, path, lw) { c.save(); c.setLineDash([5, 5]); c.lineCap = 'round'; c.lineWidth = lw || 1.6; c.strokeStyle = col; c.beginPath(); path(c); c.stroke(); c.restore(); }
  // 매 프레임 그리는 것은 가벼운 그림자(아래로 살짝 밀어 한 번 더 칠하기)
  function soft(c, fill, path, dy) { dy = dy == null ? 3 : dy; if (dy) { c.save(); c.translate(0, dy); c.beginPath(); path(c); c.fillStyle = 'rgba(45,32,28,.22)'; c.fill(); c.restore(); } c.beginPath(); path(c); c.fillStyle = fill; c.fill(); }

  // 작은 그림 조각을 미리 그려 두기(그림자·질감 포함)
  const SPR = {};
  function spr(key, w, h, fn, pad) {
    if (SPR[key]) return SPR[key];
    pad = pad == null ? 10 : pad; const k = 2, cv = mk((w + pad * 2) * k, (h + pad * 2) * k), c = cv.getContext('2d');
    c.scale(k, k); c.translate(pad, pad); fn(c); grain(c, cv.width, cv.height);
    return (SPR[key] = { cv, w, h, pad });
  }
  function put(c, s, x, y) { c.drawImage(s.cv, x - s.pad, y - s.pad, s.w + s.pad * 2, s.h + s.pad * 2); }
  function putC(c, s, cx, cy, rot, sc) { c.save(); c.translate(cx, cy); if (rot) c.rotate(rot); if (sc) c.scale(sc, sc); c.drawImage(s.cv, -s.w / 2 - s.pad, -s.h / 2 - s.pad, s.w + s.pad * 2, s.h + s.pad * 2); c.restore(); }

  // ── 배경 ────────────────────────────────────────────────
  const bgCache = {};
  function cloudPath(c, x, y, s) { [[0, 0, 20], [22, -10, 25], [50, -2, 21], [72, 4, 15], [26, 8, 22], [52, 9, 18]].forEach(p => { c.moveTo(x + (p[0] + p[2]) * s, y + p[1] * s); c.arc(x + p[0] * s, y + p[1] * s, p[2] * s, 0, 7); }); }
  function clouds(c, R, n, col, y0, y1) { for (let i = 0; i < n; i++) { const x = R() * (WW - 80), y = y0 + R() * (y1 - y0), s = 0.7 + R() * 0.9; cut(c, col, k => cloudPath(k, x, y, s), 10); } }
  function hills(c, R, col, base, amp, step) { cut(c, col, k => { k.moveTo(-20, WH + 20); let x = -20, y = base - R() * amp; k.lineTo(x, y); while (x < WW + 20) { const nx = x + step * (0.7 + R() * 0.6), ny = base - R() * amp; k.quadraticCurveTo((x + nx) / 2, Math.min(y, ny) - amp * (0.3 + R() * 0.5), nx, ny); x = nx; y = ny; } k.lineTo(WW + 20, WH + 20); }, 12); }
  function peaks(c, R, col, base, hMin, hMax, snow) { let x = -80; while (x < WW + 60) { const w = 190 + R() * 190, h = hMin + R() * (hMax - hMin), px = x + w / 2, py = base - h, x0 = x;
      cut(c, col, k => { k.moveTo(x0, base + 60); k.lineTo(px - 14, py + 10); k.quadraticCurveTo(px, py - 8, px + 14, py + 10); k.lineTo(x0 + w, base + 60); }, 12);
      if (snow) cut(c, snow, k => { const d = h * 0.26; k.moveTo(px - 14, py + 10); k.quadraticCurveTo(px, py - 8, px + 14, py + 10); const rx = px + (w / 2) * (d / h), lx = px - (w / 2) * (d / h);
        k.lineTo(rx, py + d); k.lineTo(px + (rx - px) * 0.45, py + d - 12); k.lineTo(px, py + d + 4); k.lineTo(px - (px - lx) * 0.45, py + d - 12); k.lineTo(lx, py + d); }, 4);
      x += w * (0.55 + R() * 0.3); } }
  function buildings(c, R, col, win, hMin, hMax, dome) { let x = -20; while (x < WW) { const w = 56 + R() * 70, h = hMin + R() * (hMax - hMin), bx = x, top = WH - h, dm = dome && R() < 0.45;
      cut(c, col, k => { rrp(k, bx, top, w, h + 30, 8); if (dm) { k.moveTo(bx + w / 2 + w / 2.3, top + 4); k.arc(bx + w / 2, top + 4, w / 2.3, 0, Math.PI, true); } }, 10);
      c.fillStyle = win; for (let yy = top + 18; yy < WH - 14; yy += 26) for (let xx = bx + 11; xx < bx + w - 16; xx += 20) if (R() < 0.62) { rr(c, xx, yy, 10, 13, 3); c.fill(); }
      x += w + 4 + R() * 18; } }
  function stars(c, R, n) { for (let i = 0; i < n; i++) { const x = R() * WW, y = R() * WH * 0.75, r = 1 + R() * 2.2; c.fillStyle = 'rgba(255,250,225,' + (0.5 + R() * 0.5) + ')'; if (R() < 0.18) { c.beginPath(); for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283, q = k % 2 ? r * 1.2 : r * 3.2; c.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } c.fill(); } else circle(c, x, y, r, c.fillStyle); } }
  function moon(c, x, y, r) { cut(c, '#fff3cf', k => k.arc(x, y, r, 0, 7), 16); circle(c, x + r * 0.3, y - r * 0.25, r * 0.2, '#f1dfae'); circle(c, x - r * 0.35, y + r * 0.3, r * 0.14, '#f1dfae'); circle(c, x - r * 0.1, y - r * 0.45, r * 0.1, '#f1dfae'); }
  function tree(c, x, y, s, leaf, trunk) { cut(c, trunk, k => rrp(k, x - 5 * s, y - 30 * s, 10 * s, 34 * s, 4), 4); cut(c, leaf, k => { k.arc(x, y - 52 * s, 26 * s, 0, 7); k.moveTo(x - 4 * s, y - 34 * s); k.arc(x - 20 * s, y - 34 * s, 16 * s, 0, 7); k.moveTo(x + 36 * s, y - 34 * s); k.arc(x + 20 * s, y - 34 * s, 16 * s, 0, 7); }, 8); }
  function pine(c, x, y, s, col, snow) { cut(c, '#8a6a4a', k => rrp(k, x - 4 * s, y - 14 * s, 8 * s, 18 * s, 3), 3); for (let i = 0; i < 3; i++) { const w = (30 - i * 7) * s, ty = y - (12 + i * 24) * s; cut(c, col, k => { k.moveTo(x - w, ty); k.lineTo(x, ty - 36 * s); k.lineTo(x + w, ty); k.closePath(); }, 5); if (snow) flat(c, snow, k => { k.moveTo(x - w * 0.42, ty - 21 * s); k.lineTo(x, ty - 36 * s); k.lineTo(x + w * 0.42, ty - 21 * s); k.lineTo(x + w * 0.15, ty - 25 * s); k.lineTo(x, ty - 20 * s); k.lineTo(x - w * 0.15, ty - 25 * s); k.closePath(); }); } }
  const roofArt = {};
  for (const [key, src] of Object.entries({ sky: 'roof-sky', wall: 'roof-wall', edge: 'roof-edge' })) { const image = new Image(); roofArt[key] = image; image.addEventListener('load', () => { delete stCache.roof; delete bgCache.roof; }, { once: true }); image.src = 'ui/' + src + '.webp'; }
  function background(m) {
    if (bgCache[m.id]) return bgCache[m.id];
    if (m.id === 'roof' && roofArt.sky.naturalWidth) { const scene = mk(WW, WH); scene.getContext('2d').drawImage(roofArt.sky, 0, 0, WW, WH); return (bgCache.roof = scene); }
    const cv = mk(WW, WH), c = cv.getContext('2d');
    const g = c.createLinearGradient(0, 0, 0, WH); g.addColorStop(0, m.sky[0]); g.addColorStop(1, m.sky[1]); c.fillStyle = g; c.fillRect(0, 0, WW, WH);
    const R = seeded(m.id.length * 977 + m.id.charCodeAt(0) * 13 + m.id.charCodeAt(1)), th = m.theme;
    if (th === 'city') { clouds(c, R, 6, 'rgba(255,255,255,.72)', 40, 300);
      hills(c, R, '#a9dcc6', WH - 210, 70, 240); hills(c, R, '#8fd0b4', WH - 150, 50, 200);
      const sx = 520, sy = WH - 250; cut(c, '#f1f4f2', k => { rrp(k, sx, sy + 46, 520, 150, 6); rrp(k, sx + 190, sy, 140, 200, 6); k.moveTo(sx + 176, sy + 4); k.lineTo(sx + 260, sy - 34); k.lineTo(sx + 344, sy + 4); k.closePath(); }, 8);
      cut(c, '#ffffff', k => k.arc(sx + 260, sy + 26, 15, 0, 7), 2); c.strokeStyle = '#7fb9c9'; c.lineWidth = 2.5; c.beginPath(); c.arc(sx + 260, sy + 26, 11, 0, 7); c.moveTo(sx + 260, sy + 19); c.lineTo(sx + 260, sy + 26); c.lineTo(sx + 265, sy + 29); c.stroke();
      c.fillStyle = '#9fd3e6'; for (let r2 = 0; r2 < 3; r2++) for (let k2 = 0; k2 < 14; k2++) { const xx = sx + 16 + k2 * 36; if (xx > sx + 180 && xx < sx + 336) continue; rr(c, xx, sy + 62 + r2 * 42, 24, 24, 3); c.fill(); }
      for (let k2 = 0; k2 < 3; k2++) { rr(c, sx + 208 + k2 * 38, sy + 70, 26, 34, 3); c.fill(); } c.fillStyle = '#bfe3ee'; rr(c, sx + 232, sy + 130, 56, 70, 5); c.fill();
      for (let i = 0; i < 12; i++) tree(c, 30 + i * 112 + R() * 50, WH - 20 + R() * 20, 1.25 + R() * 0.7, ['#6fba7c', '#5aa86d', '#83c98a'][i % 3], '#a9805a');
      c.fillStyle = 'rgba(201,245,243,.28)'; c.fillRect(0, WH - 330, WW, 330); }
    if (th === 'mountain') { cut(c, '#fff0b8', k => k.arc(180, 110, 46, 0, 7), 18); clouds(c, R, 5, '#ffffff', 40, 200); peaks(c, R, shade(m.sky[0], -0.12), WH - 40, 330, 520, '#ffffff'); peaks(c, R, shade(m.sky[0], -0.26), WH - 10, 180, 330, '#f3fbff'); clouds(c, R, 4, 'rgba(255,255,255,.92)', 420, 640); }
    if (th === 'toy') { clouds(c, R, 3, '#fff7fb', 40, 160);
      c.strokeStyle = '#b48fc9'; c.lineWidth = 3; c.beginPath(); c.moveTo(-10, 40); c.quadraticCurveTo(WW / 2, 150, WW + 10, 40); c.stroke();
      const fc = ['#f78fb3', '#7fc7f5', '#ffd66b', '#9be3a7', '#c9a6f5']; for (let i = 0; i < 17; i++) { const u = (i + 0.5) / 17, x = u * WW, y = 40 + 2 * u * (1 - u) * 110; cut(c, fc[i % 5], k => { k.moveTo(x - 20, y - 2); k.lineTo(x + 20, y - 2); k.lineTo(x, y + 40); k.closePath(); }, 5); }
      const bc = ['#f6a5c0', '#9fd3f7', '#ffe08a', '#b3e8bd', '#d5bdf7'];
      for (let i = 0; i < 9; i++) { const x = 40 + i * 145 + R() * 40, n = 2 + Math.floor(R() * 4); let y = WH; for (let j = 0; j < n; j++) { const s = 54 + R() * 34; y -= s; const col = bc[Math.floor(R() * 5)], xx = x + (R() - 0.5) * 24, yy = y; cut(c, col, k => rrp(k, xx, yy, s, s, 10), 8);
          c.fillStyle = 'rgba(255,255,255,.5)'; c.font = Math.round(s * 0.55) + 'px "Jua","Noto Sans KR",sans-serif'; c.textAlign = 'center'; c.fillText('ABCDEFGHJKMNPRSTUWXYZ'[Math.floor(R() * 21)], xx + s / 2, y + s * 0.7); c.textAlign = 'left'; }
        if (R() < 0.5) { const yy = y; cut(c, bc[Math.floor(R() * 5)], k => k.arc(x + 20, yy - 26, 26, 0, 7), 8); } }
      c.fillStyle = 'rgba(246,231,251,.26)'; c.fillRect(0, 0, WW, WH); }
    if (th === 'jungle') { cut(c, '#fff3b0', k => k.arc(1120, 100, 48, 0, 7), 18); clouds(c, R, 4, '#fbfff2', 50, 200); hills(c, R, '#9ed6a0', WH - 250, 110, 260); for (let i = 0; i < 9; i++) tree(c, 50 + i * 150 + R() * 60, WH - 190 + R() * 40, 1.5 + R() * 0.8, '#6fbd82', '#9a7450');
      hills(c, R, '#63ad76', WH - 130, 80, 220); for (let i = 0; i < 7; i++) tree(c, 100 + i * 190 + R() * 70, WH - 70 + R() * 30, 1.9 + R() * 0.9, '#4d9a66', '#7d5a3c');
      for (let i = 0; i < 16; i++) { const x = R() * WW, l = 50 + R() * 90, col = ['#4d9a66', '#6fbd82', '#3f8558'][i % 3]; cut(c, col, k => { k.moveTo(x - 16, -10); k.quadraticCurveTo(x - 20, l * 0.7, x, l); k.quadraticCurveTo(x + 20, l * 0.7, x + 16, -10); k.closePath(); }, 6); } }
    if (th === 'snow') { clouds(c, R, 5, '#ffffff', 40, 190); peaks(c, R, '#a9c9ea', WH - 40, 320, 500, '#ffffff'); hills(c, R, '#dcecfb', WH - 170, 70, 240); for (let i = 0; i < 10; i++) pine(c, 40 + i * 135 + R() * 50, WH - 150 + R() * 50, 1.3 + R() * 0.7, '#6fa58f', '#ffffff');
      hills(c, R, '#f4f9ff', WH - 70, 50, 260); for (let i = 0; i < 6; i++) pine(c, 90 + i * 220 + R() * 70, WH - 40 + R() * 20, 1.7 + R() * 0.8, '#4f8b78', '#ffffff'); }
    if (th === 'moon') { stars(c, R, 80); moon(c, 1070, 125, 58); clouds(c, R, 4, 'rgba(255,255,255,.22)', 60, 240); buildings(c, R, shade(m.sky[0], -0.14), 'rgba(255,240,180,.5)', 220, 420, true); buildings(c, R, shade(m.sky[0], -0.3), 'rgba(255,236,160,.7)', 100, 260, true); }
    if (th === 'volcano') { cut(c, '#ffd98a', k => k.arc(170, 120, 50, 0, 7), 18); clouds(c, R, 4, '#fff1e0', 50, 190);
      for (let i = 5; i >= 0; i--) cut(c, shade('#8d8089', i * 0.09), k => k.arc(800 + i * 26, 150 - i * 30, 26 + i * 9, 0, 7), 10);
      cut(c, '#8a5a52', k => { k.moveTo(470, WH + 20); k.lineTo(745, 190); k.quadraticCurveTo(800, 170, 855, 190); k.lineTo(1130, WH + 20); }, 14);
      cut(c, '#ff8a3d', k => { k.moveTo(745, 190); k.quadraticCurveTo(800, 170, 855, 190); k.lineTo(878, 250); k.lineTo(850, 232); k.lineTo(828, 290); k.lineTo(800, 240); k.lineTo(775, 300); k.lineTo(752, 236); k.lineTo(726, 252); k.closePath(); }, 5);
      flat(c, '#ffc857', k => { k.moveTo(770, 196); k.quadraticCurveTo(800, 186, 830, 196); k.lineTo(822, 230); k.lineTo(800, 214); k.lineTo(780, 236); k.closePath(); });
      hills(c, R, '#a8695a', WH - 150, 90, 230); hills(c, R, '#7c4a42', WH - 60, 60, 200); }
    if (th === 'candy') { clouds(c, R, 6, '#ffffff', 40, 210); hills(c, R, '#ffb3d1', WH - 220, 100, 280);
      for (let i = 0; i < 11; i++) { const x = 40 + i * 120 + R() * 50, y = 250 + R() * 250, r = 26 + R() * 20, col = ['#ff8fb8', '#9ad8ff', '#ffe27a', '#b8f0a8', '#d3b3ff'][i % 5];
        cut(c, '#fff8f0', k => rrp(k, x - 4, y, 8, WH - y + 20, 4), 4); cut(c, col, k => k.arc(x, y, r, 0, 7), 8);
        c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = r * 0.18; c.lineCap = 'round'; c.beginPath(); for (let a = 0; a < 11; a += 0.25) { const q = a / 11 * r * 0.8; c.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } c.stroke(); }
      hills(c, R, '#ffc4dc', WH - 80, 60, 240); for (let i = 0; i < 40; i++) { const x = R() * WW, y = WH - R() * 110; c.save(); c.translate(x, y); c.rotate(R() * 3); rr(c, -6, -2, 12, 4, 2); c.fillStyle = ['#fff', '#9ad8ff', '#ffe27a', '#b8f0a8'][i % 4]; c.fill(); c.restore(); } }
    if (th === 'sea') { for (let i = 0; i < 7; i++) { c.fillStyle = 'rgba(255,255,255,.08)'; c.beginPath(); const x = R() * WW; c.moveTo(x, 0); c.lineTo(x + 70, 0); c.lineTo(x + 250, WH); c.lineTo(x + 130, WH); c.fill(); }
      hills(c, R, '#3f8fb5', WH - 190, 90, 260);
      [[250, 300], [330, 340], [410, 340], [490, 300]].forEach(([x, h]) => { cut(c, '#7fc3d6', k => rrp(k, x, WH - h, 40, h + 20, 8), 8); c.fillStyle = 'rgba(255,255,255,.22)'; for (let yy = WH - h + 16; yy < WH; yy += 30) { rr(c, x + 6, yy, 28, 5, 2.5); c.fill(); } });
      cut(c, '#9bd6e4', k => rrp(k, 228, WH - 372, 324, 34, 10), 8); cut(c, '#9bd6e4', k => { k.moveTo(250, WH - 372); k.lineTo(390, WH - 440); k.lineTo(530, WH - 372); k.closePath(); }, 8);
      hills(c, R, '#2f7397', WH - 80, 60, 220);
      for (let i = 0; i < 16; i++) { const x = R() * WW, h = 70 + R() * 120, col = ['#58b58a', '#3d9c7c', '#7fcf9a'][i % 3]; cut(c, col, k => { k.moveTo(x - 7, WH + 10); k.quadraticCurveTo(x + 22, WH - h * 0.5, x - 8, WH - h); k.quadraticCurveTo(x + 36, WH - h * 0.5, x + 9, WH + 10); k.closePath(); }, 5); }
      for (let i = 0; i < 8; i++) { const x = R() * WW, y = WH - 50 - R() * 40; cut(c, ['#ff9a8b', '#ffc27a', '#f7a8d0'][i % 3], k => { for (let a = 0; a < 5; a++) { const ang = -Math.PI / 2 + (a - 2) * 0.5, ex = x + Math.cos(ang) * 30, ey = y + 20 + Math.sin(ang) * 34; k.moveTo(x - 4, y + 22); k.lineTo(ex - 5, ey); k.arc(ex, ey, 5, Math.PI, 0); k.lineTo(x + 4, y + 22); k.closePath(); } }, 4); } }
    if (th === 'ghost') { stars(c, R, 70); moon(c, 1080, 120, 56); clouds(c, R, 5, 'rgba(255,255,255,.2)', 60, 260); hills(c, R, shade(m.sky[0], -0.14), WH - 200, 90, 260);
      [[170, 330, 90], [300, 250, 70], [400, 380, 100], [860, 300, 86], [980, 240, 70]].forEach(([x, h, w]) => { cut(c, '#5b6094', k => { rrp(k, x, WH - h, w, h + 20, 6); k.moveTo(x - 12, WH - h + 4); k.lineTo(x + w / 2, WH - h - 80); k.lineTo(x + w + 12, WH - h + 4); k.closePath(); }, 10);
        c.fillStyle = '#ffe28a'; for (let yy = WH - h + 40; yy < WH - 40; yy += 70) { rr(c, x + w / 2 - 9, yy, 18, 28, 9); c.fill(); } });
      cut(c, '#5b6094', k => rrp(k, 230, WH - 180, 200, 200, 6), 8);
      hills(c, R, shade(m.sky[0], -0.32), WH - 70, 60, 220);
      for (let i = 0; i < 4; i++) { const x = 560 + i * 80 + R() * 20, y = 170 + R() * 120; cut(c, 'rgba(255,255,255,.55)', k => { k.arc(x, y, 16, Math.PI, 0); k.lineTo(x + 16, y + 22); k.lineTo(x + 8, y + 16); k.lineTo(x, y + 22); k.lineTo(x - 8, y + 16); k.lineTo(x - 16, y + 22); k.closePath(); }, 6); circle(c, x - 5, y, 2.5, '#5b6094'); circle(c, x + 5, y, 2.5, '#5b6094'); } }
    if (th === 'desert') { cut(c, '#fff0b0', k => k.arc(1080, 115, 62, 0, 7), 20); clouds(c, R, 3, '#fffaf0', 50, 170);
      [[430, 340, 420, '#e3b56a', '#cf9d54'], [760, 250, 330, '#ecc27c', '#d9aa60']].forEach(([x, h, w, a, b]) => { cut(c, a, k => { k.moveTo(x, WH); k.lineTo(x + w / 2, WH - h); k.lineTo(x + w, WH); k.closePath(); }, 12); flat(c, b, k => { k.moveTo(x + w / 2, WH - h); k.lineTo(x + w, WH); k.lineTo(x + w * 0.62, WH); k.closePath(); }); });
      hills(c, R, '#f0cd88', WH - 130, 80, 300);
      for (let i = 0; i < 6; i++) { const x = 70 + i * 220 + R() * 80, y = WH - 80 + R() * 30, s = 1 + R() * 0.6; cut(c, '#7fb07a', k => { rrp(k, x - 9 * s, y - 70 * s, 18 * s, 80 * s, 9 * s); rrp(k, x - 30 * s, y - 50 * s, 12 * s, 30 * s, 6 * s); rrp(k, x - 30 * s, y - 30 * s, 26 * s, 12 * s, 6 * s); rrp(k, x + 18 * s, y - 60 * s, 12 * s, 34 * s, 6 * s); rrp(k, x + 4 * s, y - 38 * s, 26 * s, 12 * s, 6 * s); }, 6); }
      hills(c, R, '#e2b468', WH - 50, 50, 260); }
    if (th === 'space') { stars(c, R, 120); cut(c, '#f2a65a', k => k.arc(1040, 150, 72, 0, 7), 18); c.save(); c.beginPath(); c.arc(1040, 150, 72, 0, 7); c.clip(); c.fillStyle = '#f7c07f'; c.fillRect(960, 100, 160, 14); c.fillStyle = '#e58f45'; c.fillRect(960, 130, 160, 12); c.fillRect(960, 168, 160, 9); c.restore();
      c.save(); c.shadowColor = SH; c.shadowBlur = 6; c.shadowOffsetY = 3; c.strokeStyle = '#ffe1b3'; c.lineWidth = 9; c.lineCap = 'round'; c.beginPath(); c.ellipse(1040, 150, 122, 26, -0.3, 0.2, Math.PI - 0.2); c.stroke(); c.restore();
      cut(c, '#8fd3ff', k => k.arc(210, 110, 26, 0, 7), 10); circle(c, 202, 104, 8, '#b9e6ff'); cut(c, '#f7a8d0', k => k.arc(560, 80, 14, 0, 7), 8);
      for (let i = 0; i < 5; i++) { const x = 60 + i * 260 + R() * 40, h = 150 + R() * 140; cut(c, '#4b528a', k => { rrp(k, x, WH - h, 130, h + 20, 14); rrp(k, x + 55, WH - h - 60, 20, 70, 6); }, 10); for (let j = 0; j < 3; j++) circle(c, x + 30 + j * 35, WH - h + 34, 10, 'rgba(160,220,255,.5)'); cut(c, '#ff8fa3', k => k.arc(x + 65, WH - h - 64, 7, 0, 7), 4); }
      cut(c, '#3a3f72', k => rrp(k, -20, WH - 70, WW + 40, 100, 20), 8); }
    if (th === 'harbor') { cut(c, '#fff3b8', k => k.arc(1090, 120, 54, 0, 7), 18); clouds(c, R, 6, '#ffffff', 40, 240);
      hills(c, R, '#9fd9c9', WH - 230, 80, 300);
      // 등대
      cut(c, '#fbf7ee', k => { k.moveTo(1010, WH - 150); k.lineTo(1026, WH - 400); k.lineTo(1074, WH - 400); k.lineTo(1090, WH - 150); k.closePath(); }, 10);
      c.save(); c.beginPath(); c.moveTo(1010, WH - 150); c.lineTo(1026, WH - 400); c.lineTo(1074, WH - 400); c.lineTo(1090, WH - 150); c.clip(); c.fillStyle = '#ef6b5b'; for (let yy = WH - 380; yy < WH - 150; yy += 80) c.fillRect(1000, yy, 100, 38); c.restore();
      cut(c, '#4b5a7a', k => rrp(k, 1016, WH - 432, 68, 36, 6), 6); flat(c, '#ffe58a', k => rrp(k, 1030, WH - 426, 40, 24, 4)); cut(c, '#ef6b5b', k => { k.moveTo(1012, WH - 432); k.lineTo(1050, WH - 470); k.lineTo(1088, WH - 432); k.closePath(); }, 5);
      // 종이배·돛단배
      for (let i = 0; i < 6; i++) { const x = 90 + i * 210 + R() * 60, y = WH - 150 + R() * 30, sc = 0.8 + R() * 0.7, col = ['#fffaf0', '#ffd9a8', '#f7a8b8', '#bfe3f7'][i % 4];
        cut(c, col, k => { k.moveTo(x - 46 * sc, y); k.lineTo(x + 46 * sc, y); k.lineTo(x + 26 * sc, y + 26 * sc); k.lineTo(x - 26 * sc, y + 26 * sc); k.closePath(); k.moveTo(x, y - 4); k.lineTo(x, y - 62 * sc); k.lineTo(x + 34 * sc, y - 4); k.closePath(); k.moveTo(x - 4, y - 4); k.lineTo(x - 4, y - 46 * sc); k.lineTo(x - 28 * sc, y - 4); k.closePath(); }, 6); }
      hills(c, R, '#7fcfe6', WH - 110, 22, 120); hills(c, R, '#5bbcdc', WH - 70, 18, 100);
      // 갈매기
      c.strokeStyle = '#fff'; c.lineWidth = 3; c.lineCap = 'round'; for (let i = 0; i < 7; i++) { const x = 120 + R() * 1000, y = 90 + R() * 230; c.beginPath(); c.moveTo(x - 12, y - 4); c.quadraticCurveTo(x - 5, y - 10, x, y); c.quadraticCurveTo(x + 5, y - 10, x + 12, y - 4); c.stroke(); } }
    if (th === 'toystation') { stars(c, R, 130);
      cut(c, '#ffb3d1', k => k.arc(1050, 150, 78, 0, 7), 18); c.save(); c.beginPath(); c.arc(1050, 150, 78, 0, 7); c.clip(); c.fillStyle = '#ffd0e3'; c.fillRect(960, 104, 180, 16); c.fillStyle = '#f590bb'; c.fillRect(960, 150, 180, 14); c.fillRect(960, 190, 180, 9); c.restore();
      c.save(); c.shadowColor = SH; c.shadowBlur = 6; c.shadowOffsetY = 3; c.strokeStyle = '#fff0b8'; c.lineWidth = 10; c.lineCap = 'round'; c.beginPath(); c.ellipse(1050, 150, 132, 28, -0.25, 0.2, Math.PI - 0.2); c.stroke(); c.restore();
      cut(c, '#9fe3ff', k => k.arc(190, 120, 30, 0, 7), 10); circle(c, 180, 112, 9, '#cdf2ff'); cut(c, '#ffe08a', k => k.arc(470, 70, 13, 0, 7), 6);
      // 장난감 로켓
      const rx = 640, ry = 250; c.save(); c.translate(rx, ry); c.rotate(0.5); cut(c, '#f4f1ff', k => { k.moveTo(0, -70); k.quadraticCurveTo(34, -30, 26, 50); k.lineTo(-26, 50); k.quadraticCurveTo(-34, -30, 0, -70); }, 10); flat(c, '#ef6b8f', k => { k.moveTo(0, -70); k.quadraticCurveTo(20, -50, 24, -30); k.lineTo(-24, -30); k.quadraticCurveTo(-20, -50, 0, -70); });
      cut(c, '#ef6b8f', k => { k.moveTo(-26, 20); k.lineTo(-50, 60); k.lineTo(-26, 50); k.closePath(); k.moveTo(26, 20); k.lineTo(50, 60); k.lineTo(26, 50); k.closePath(); }, 4); circle(c, 0, 0, 13, '#8fd3ff'); circle(c, 0, 0, 13, null, '#6f7bd6', 4); flat(c, '#ffc857', k => { k.moveTo(-14, 52); k.lineTo(0, 92); k.lineTo(14, 52); k.closePath(); }); c.restore();
      // 블록 정거장
      const bc = ['#8f8ee0', '#a79cf0', '#7f86d6', '#b5a8f5'];
      for (let i = 0; i < 6; i++) { const x = 20 + i * 220 + R() * 50, h = 130 + R() * 170, w = 110 + R() * 50; cut(c, bc[i % 4], k => { rrp(k, x, WH - h, w, h + 20, 16); rrp(k, x + w / 2 - 9, WH - h - 54, 18, 62, 6); }, 10); for (let j = 0; j < 3; j++) circle(c, x + 26 + j * (w - 52) / 2, WH - h + 34, 11, 'rgba(190,235,255,.6)'); cut(c, ['#ffd76b', '#ff9cc4', '#9fe3ff'][i % 3], k => k.arc(x + w / 2, WH - h - 60, 9, 0, 7), 4); }
      c.fillStyle = 'rgba(59,58,120,.28)'; c.fillRect(0, 0, WW, WH); }
    if (th === 'bazaar') { cut(c, '#fff0b0', k => k.arc(640, 300, 120, 0, 7), 26); clouds(c, R, 5, 'rgba(255,240,220,.85)', 40, 220);
      hills(c, R, '#f6b77a', WH - 260, 90, 340);
      // 둥근 지붕 건물·탑
      [[90, 250, 150], [420, 200, 120], [820, 270, 170], [1090, 210, 130]].forEach(([x, h, w], i) => { const col = ['#f0a35c', '#e9925a', '#f3ae68', '#e58a55'][i]; cut(c, col, k => { rrp(k, x, WH - h, w, h + 20, 8); k.moveTo(x + w - 10, WH - h + 2); k.arc(x + w / 2, WH - h + 2, w / 2 - 10, 0, Math.PI, true); }, 10);
        cut(c, '#ffd98a', k => k.arc(x + w / 2, WH - h - w / 2 + 6, 8, 0, 7), 3); c.fillStyle = 'rgba(120,60,40,.35)'; for (let j = 0; j < 2; j++) { rr(c, x + 24 + j * (w - 78), WH - h + 46, 30, 46, 15); c.fill(); } });
      // 천막
      for (let i = 0; i < 6; i++) { const x = 40 + i * 215 + R() * 50, y = WH - 150 + R() * 20, w = 150, cols = [['#ef6b5b', '#fff3da'], ['#3fa7a0', '#fff3da'], ['#f7b731', '#fff3da']][i % 3];
        cut(c, '#9a6a43', k => { rrp(k, x + 6, y, 7, 170, 3); rrp(k, x + w - 13, y, 7, 170, 3); }, 3);
        cut(c, cols[0], k => { k.moveTo(x - 8, y + 4); k.lineTo(x + w / 2, y - 46); k.lineTo(x + w + 8, y + 4); k.lineTo(x + w + 8, y + 26); k.lineTo(x - 8, y + 26); k.closePath(); }, 8);
        c.save(); c.beginPath(); c.moveTo(x - 8, y + 4); c.lineTo(x + w / 2, y - 46); c.lineTo(x + w + 8, y + 4); c.lineTo(x + w + 8, y + 26); c.lineTo(x - 8, y + 26); c.clip(); c.fillStyle = cols[1]; for (let k2 = 0; k2 < 4; k2++) { c.beginPath(); c.moveTo(x + w / 2, y - 46); c.lineTo(x - 8 + k2 * 48 + 24, y + 30); c.lineTo(x - 8 + k2 * 48 + 46, y + 30); c.fill(); } c.restore(); }
      // 야자수
      for (let i = 0; i < 5; i++) { const x = 180 + i * 250 + R() * 60, y = WH - 60, h = 150 + R() * 70; c.save(); c.shadowColor = SH; c.shadowBlur = 5; c.shadowOffsetY = 2; c.strokeStyle = '#a8713f'; c.lineWidth = 11; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y + 60); c.quadraticCurveTo(x + 22, y - h / 2, x + 8, y - h); c.stroke(); c.restore();
        for (let k2 = 0; k2 < 6; k2++) { const a2 = -Math.PI / 2 + (k2 - 2.5) * 0.62, ex = x + 8 + Math.cos(a2) * 74, ey = y - h + Math.sin(a2) * 46 + 22; cut(c, k2 % 2 ? '#5fae6a' : '#4b9a5c', k => { k.moveTo(x + 8, y - h); k.quadraticCurveTo((x + 8 + ex) / 2, y - h - 36, ex, ey); k.quadraticCurveTo((x + 8 + ex) / 2, y - h + 4, x + 8, y - h); }, 4); } }
      hills(c, R, '#eda55c', WH - 60, 44, 280); }
    grain(c, WW, WH);
    bgCache[m.id] = cv; return cv;
  }

  // ── 지형 ────────────────────────────────────────────────
  const CAP = { city: '#c3c6ca', harbor: '#8fbf4d', toystation: '#cfd0f5', bazaar: '#f6d08a', mountain: '#ffffff', toy: '#ffe9a8', jungle: '#8fd07a', snow: '#ffffff', moon: '#efe7ff', volcano: '#f0a868', candy: '#fff6fa', sea: '#a7e6d7', ghost: '#dfe3ff', desert: '#fbe6a6', space: '#d5e2ff' };
  function capOf(m) { return CAP[m.theme] || m.edge; }
  function capPath(k, x, y, w) { // 물결 모양으로 오린 윗면
    k.moveTo(x - 3, y + 6); k.arcTo(x - 3, y - 5, x + 8, y - 5, 8); k.lineTo(x + w - 5, y - 5); k.arcTo(x + w + 3, y - 5, x + w + 3, y + 6, 8);
    const n = Math.max(1, Math.round((w + 6) / 18)), sw = (w + 6) / n; for (let i = 0; i < n; i++) { const x1 = x + w + 3 - i * sw; k.quadraticCurveTo(x1 - sw / 2, y + 17, x1 - sw, y + 6); } k.closePath(); }
  function plankRow(c, x, y, w, h, a, b) { cut(c, a, k => rrp(k, x, y, w, h, 6), 6); c.save(); rr(c, x, y, w, h, 6); c.clip(); for (let xx = x, i = 0; xx < x + w; xx += 16, i++) if (i % 2) { c.fillStyle = b; c.fillRect(xx, y, 16, h); } c.fillStyle = 'rgba(255,255,255,.22)'; c.fillRect(x, y, w, 4); c.restore(); for (let xx = x + 8; xx < x + w; xx += 16) circle(c, xx, y + h / 2, 1.6, 'rgba(70,45,25,.55)'); }
  function ropes(c, x, y, w) { c.strokeStyle = '#a98a5c'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(x + 6, y + 2); c.lineTo(x + 6, y - 74); c.moveTo(x + w - 6, y + 2); c.lineTo(x + w - 6, y - 74); c.stroke(); }
  function terrain(c, m, t) {
    const info = JC.mapInfo(m);
    // 바닥 위험(강물·용암): 물결 모양 종이 두 겹
    if (m.pit) { const y = m.pit * T + 6, lava = m.theme === 'volcano';
      [[lava ? '#ffb347' : '#8fd0ee', -6, 22], [lava ? '#ff6f3c' : '#4aa3d8', 3, -30]].forEach(([col, dy, sp]) => { const off = ((t * sp) % 48 + 48) % 48;
        soft(c, col, k => { k.moveTo(-110, WH + 10); k.lineTo(-110 + off, y + dy + 8); for (let x = -110 + off; x < WW + 60; x += 48) { k.quadraticCurveTo(x + 12, y + dy - 6, x + 24, y + dy + 8); k.quadraticCurveTo(x + 36, y + dy + 20, x + 48, y + dy + 8); } k.lineTo(WW + 110, WH + 10); k.closePath(); }, -2); }); }
    // 불기둥
    (m.geysers || []).forEach(gz => { const st = JC.geyserState(gz[1], t), x = gz[0] * T + 16, base = m.pit * T;
      if (st === 1) for (let i = 0; i < 4; i++) circle(c, x + Math.sin(t * 20 + i * 2) * 9, base - 4 - i * 9 - ((t * 60) % 10), 5 - i * 0.7, i % 2 ? '#ffc857' : '#ff8a3d');
      if (st === 2) { const top = 8 * T; [['#ff6f3c', 26, 0], ['#ffa23d', 18, 1.3], ['#ffd76b', 10, 2.4]].forEach(([col, w, ph]) => { soft(c, col, k => { k.moveTo(x - w, base + 10); for (let yy = base; yy > top + 30; yy -= 26) k.quadraticCurveTo(x - w - 7 + Math.sin(yy * 0.08 + t * 14 + ph) * 5, yy - 13, x - w + Math.sin(yy * 0.05 + t * 9 + ph) * 3, yy - 26);
          k.quadraticCurveTo(x, top - 34 + w, x + w, top + 30); for (let yy = top + 30; yy < base; yy += 26) k.quadraticCurveTo(x + w + 7 + Math.sin(yy * 0.09 + t * 13 + ph) * 5, yy + 13, x + w + Math.sin(yy * 0.05 + t * 9 + ph) * 3, yy + 26); k.closePath(); }, 0); }); } });
    if (!stCache[m.id]) { const sc = mk(WW, WH), c2 = sc.getContext('2d');
      drawBases(c2, m, 0, k => !DYN.includes(k), true); const sp0 = m.base[0]; sign(c2, sp0[0] * T + 12, sp0[1] * T - 4);
      const f = info.flag; cut(c2, '#9a7450', k => rrp(k, f.x + 16, f.y - 16, 7, f.h + 14, 3.5), 4); cut(c2, '#ffd76b', k => k.arc(f.x + 19.5, f.y - 18, 6, 0, 7), 3);
      grain(c2, WW, WH); stCache[m.id] = sc; }
    c.drawImage(stCache[m.id], 0, 0);
    drawBases(c, m, t, k => DYN.includes(k) || k === 'conv', false);
    afterBases(c, m, t, info);
  }
  const stCache = {}, DYN = ['move', 'ghost', 'bouncy'];
  function drawBases(c, m, t, pred, isStatic) {
    const cap = capOf(m), th = m.theme;
    m.base.forEach((b, i) => {
      let x = b[0] * T, y = b[1] * T, w = b[2] * T, h = b[3] * T; const k = b[4] || 'solid';
      if (!pred(k)) return;
      if (b[6]) { kitBase(c, m, b, i, t); return; }
      if (th === 'city') { cityBase(c, m, x, y, w, h, i); return; }
      if (k === 'conv') { if (isStatic) { cut(c, m.ground, q => rrp(q, x, y, w, h + 30, 12)); decorate(c, m, x, y, w, h, i); stitch(c, shade(m.ground, 0.35), q => { q.moveTo(x + 8, y + h + 10); q.lineTo(x + 8, y + 26); q.lineTo(x + w - 8, y + 26); q.lineTo(x + w - 8, y + h + 10); }); cut(c, '#4b4460', q => rrp(q, x - 3, y - 3, w + 6, 18, 9), 5); return; }
        const off = ((t * 85 * b[5]) % 24 + 24) % 24; c.save(); rr(c, x, y - 1, w, 14, 7); c.clip(); c.fillStyle = '#ffd76b';
        for (let xx = x - 24; xx < x + w + 24; xx += 24) { const px = xx + off; c.beginPath(); c.moveTo(px, y + 1); c.lineTo(px + 8 * b[5], y + 6); c.lineTo(px, y + 11); c.lineTo(px + 4 * b[5], y + 6); c.fill(); } c.restore(); return; }
      if (k === 'move') { x += JC.moveOffset(b[5].dx, b[5].p, 0, t).o; ropes(c, x, y, w); put(c, spr('bridge' + b[2], w, 22, q => plankRow(q, 0, 0, w, 22, '#c99562', '#b98350')), x, y); return; }
      if (k === 'ghost') { const vis = JC.ghostVisible(b[5], t), warn = JC.ghostWarn(b[5], t); c.save();
        c.globalAlpha = vis ? (warn ? 0.45 + 0.4 * Math.abs(Math.sin(t * 18)) : 0.96) : 0.14; put(c, spr('ghost' + b[2], w, T, q => { cut(q, '#c9b8f5', z => { z.moveTo(0, 12); z.arcTo(0, 0, 12, 0, 12); z.lineTo(w - 12, 0); z.arcTo(w, 0, w, 12, 12); z.lineTo(w, T - 2); const n = Math.round(w / 16); for (let j = 0; j < n; j++) { const x1 = w - j * (w / n); z.quadraticCurveTo(x1 - w / n / 2, T - 14, x1 - w / n, T - 2); } z.closePath(); });
          circle(q, w / 2 - 9, 11, 3.2, '#5b4a99'); circle(q, w / 2 + 9, 11, 3.2, '#5b4a99'); q.strokeStyle = '#5b4a99'; q.lineWidth = 2; q.lineCap = 'round'; q.beginPath(); q.arc(w / 2, 13, 4, 0.2, Math.PI - 0.2); q.stroke(); }), x, y); c.restore(); return; }
      if (k === 'bouncy') { const sq = Math.sin(t * 6 + i) * 2.5; c.save(); c.translate(x + w / 2, y + T); c.scale(1 + sq * 0.012, 1 - sq * 0.03); put(c, spr('jelly' + b[2], w, T, q => { cut(q, '#f0508f', z => { z.moveTo(0, T); z.lineTo(0, 16); z.quadraticCurveTo(0, 0, 18, 0); z.lineTo(w - 18, 0); z.quadraticCurveTo(w, 0, w, 16); z.lineTo(w, T); z.closePath(); });
          flat(q, '#ff9cc4', z => rrp(z, 10, 5, w - 20, 7, 3.5)); for (let xx = 16; xx < w - 10; xx += 22) circle(q, xx, 22, 3.5, 'rgba(255,255,255,.55)'); }), -w / 2, -T); c.restore(); return; }
      // ── 움직이지 않는 발판 ──
      if (k === 'bridge') { ropes(c, x, y, w); plankRow(c, x, y, w, 22, '#c99562', '#b98350'); return; }
      const ice = k === 'ice', body = ice ? '#bfe2f6' : (h <= T ? shade(m.ground, 0.1) : m.ground), top = ice ? '#ffffff' : cap;
      if (h <= T) { cut(c, body, q => rrp(q, x, y + 2, w, h - 4, 12)); stitch(c, shade(body, 0.4), q => { q.moveTo(x + 12, y + h - 9); q.lineTo(x + w - 12, y + h - 9); }); }
      else { cut(c, body, q => rrp(q, x, y, w, h + 30, 14)); decorate(c, m, x, y, w, h, i, ice); stitch(c, shade(body, ice ? -0.12 : 0.35), q => { q.moveTo(x + 8, y + h + 10); q.lineTo(x + 8, y + 26); q.lineTo(x + w - 8, y + 26); q.lineTo(x + w - 8, y + h + 10); }); }
      if (ice) cut(c, '#eaf7ff', q => { const by = y + (h <= T ? h - 6 : 8); for (let xx = x + 10; xx < x + w - 14; xx += 20) { q.moveTo(xx, by); q.lineTo(xx + 6, by + 16); q.lineTo(xx + 12, by); q.closePath(); } }, 3);
      cut(c, top, q => capPath(q, x, y, w), 5);
      if (th === 'candy' && !ice) for (let xx = x + 8; xx < x + w - 4; xx += 13) circle(c, xx, y + 1 + (xx * 7 % 5), 2.6, ['#ff7eb0', '#7fc7f5', '#ffd66b'][Math.floor(xx / 13) % 3]);
      if (th === 'jungle') cut(c, '#6fbd66', q => { for (let xx = x + 10; xx < x + w - 10; xx += 22) { q.moveTo(xx, y - 3); q.lineTo(xx + 4, y - 13); q.lineTo(xx + 8, y - 3); q.closePath(); } }, 2);
    });
  }
  // 학교 옥상: 빨간 벽돌 건물 + 회색 옥상(시안), 얇은 발판은 나무 판
  function cityBase(c, m, x, y, w, h, i) {
    if (h > T && roofArt.wall.naturalWidth && roofArt.edge.naturalWidth) { // 원본 벽·옥상 그림을 이어 붙여요
      const wi = roofArt.wall, tw = Math.min(w, 224), th2 = tw * wi.naturalHeight / wi.naturalWidth;
      c.save(); c.shadowColor = SH; c.shadowBlur = 8; c.shadowOffsetY = 3; c.fillStyle = '#c6473d'; c.fillRect(x, y + 6, w, h + 30); c.restore();
      c.save(); c.beginPath(); c.rect(x, y, w, h + 40); c.clip();
      for (let yy = y + 12, r = 0; yy < y + h + 40; yy += (r ? th2 * 0.58 : th2) - 1, r++) for (let xx = x; xx < x + w; xx += tw - 1) { if (r === 0) c.drawImage(wi, xx, yy, tw, th2); else c.drawImage(wi, 0, wi.naturalHeight * 0.42, wi.naturalWidth, wi.naturalHeight * 0.58, xx, yy, tw, th2 * 0.58); }
      c.restore();
      c.save(); c.shadowColor = SH; c.shadowBlur = 5; c.shadowOffsetY = 2; c.drawImage(roofArt.edge, x - 4, y - 4, w + 8, 20); c.restore(); return; }
    if (h <= T) { plankRow(c, x, y, w, 22, '#c99562', '#b98350'); cut(c, '#8d99ae', q => { rrp(q, x + 14, y + 20, 8, 12, 2); rrp(q, x + w - 22, y + 20, 8, 12, 2); }, 3); return; }
    cut(c, '#c6473d', q => rrp(q, x, y + 6, w, h + 30, 8));
    c.save(); rr(c, x, y + 6, w, h + 30, 8); c.clip();
    c.fillStyle = 'rgba(255,255,255,.07)'; let row = 0; for (let yy = y + 70; yy < y + h + 30; yy += 20, row++) for (let xx = x + (row % 2 ? -22 : 0); xx < x + w; xx += 44) { rr(c, xx + 2, yy, 40, 16, 3); c.fill(); }
    c.fillStyle = '#a7abb1'; c.fillRect(x, y, w, 62); c.strokeStyle = 'rgba(70,75,85,.22)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y + 36); c.lineTo(x + w, y + 36); for (let xx = x + 40, j = 0; xx < x + w; xx += 64, j++) { c.moveTo(xx, y + 14); c.lineTo(xx, y + 36); c.moveTo(xx + 30, y + 36); c.lineTo(xx + 30, y + 62); } c.stroke();
    c.fillStyle = 'rgba(0,0,0,.14)'; c.fillRect(x, y + 62, w, 5);
    const R2 = seeded(i * 17 + 5); for (let yy = y + 96; yy < y + h + 10; yy += 92) for (let xx = x + 22; xx + 46 < x + w - 12; xx += 78) { c.fillStyle = '#f4efe6'; rr(c, xx, yy, 46, 52, 4); c.fill(); c.fillStyle = '#3f4d5e'; c.fillRect(xx + 5, yy + 5, 16, 19); c.fillRect(xx + 25, yy + 5, 16, 19); c.fillRect(xx + 5, yy + 28, 16, 19); c.fillRect(xx + 25, yy + 28, 16, 19); c.fillStyle = '#f4efe6'; rr(c, xx - 4, yy + 50, 54, 7, 3); c.fill(); }
    c.restore();
    cut(c, '#c3c6ca', q => rrp(q, x - 5, y - 5, w + 10, 19, 5), 5); flat(c, '#d9dbde', q => rrp(q, x - 1, y - 3, w + 2, 5, 2.5));
  }
  // 그림 묶음(kits) 발판: 추가 맵에서 써요
  const kitImgs = {}, KIT_CROP = { brick: [0.27, 0, 0.73, 1] };
  function kimg(kit, name) { const key = kit + '/' + name; let im = kitImgs[key]; if (!im) { im = kitImgs[key] = new Image(); im.onload = () => { for (const k in stCache) delete stCache[k]; }; im.src = 'kits/' + key + '.webp'; } return im.naturalWidth ? im : null; }
  function kitBase(c, m, b, i, t) {
    const x = b[0] * T, y = b[1] * T, w = b[2] * T, h = b[3] * T, k = b[4], im = kimg(m.kit, b[6]);
    if (k === 'solid') { // 상자를 쌓아 올린 큰 발판
      cut(c, m.ground, q => rrp(q, x + 3, y + 8, w - 6, h + 30, 8));
      if (!im) return; const cr = KIT_CROP[b[6]] || [0, 0, 1, 1], sw = im.naturalWidth * cr[2], sh = im.naturalHeight * cr[3], cols = Math.max(1, Math.round(w / 66)), tw = w / cols, th2 = tw * sh / sw, pitch = th2 * 0.83, rows = Math.ceil((h + 30) / pitch) + 1;
      for (let r = rows - 1; r >= 0; r--) for (let q = 0; q < cols; q++) c.drawImage(im, im.naturalWidth * cr[0], im.naturalHeight * cr[1], sw, sh, x + q * tw - 1, y - 4 + r * pitch, tw + 2, th2);
      return; }
    if (!im) { soft(c, m.edge, q => rrp(q, x, y, w, 18, 9)); return; }
    const dw = w + 8, dh = dw * im.naturalHeight / im.naturalWidth;
    if (k === 'bouncy') { const sq = Math.sin(t * 6 + i) * 2.5; c.save(); c.translate(x + w / 2, y + h + 4); c.scale(1 + sq * 0.012, 1 - sq * 0.03); c.drawImage(im, -dw / 2, -Math.max(dh, h + 8), dw, Math.max(dh, h + 8)); c.restore(); return; }
    c.save(); c.shadowColor = SH; c.shadowBlur = 7; c.shadowOffsetY = 3; c.drawImage(im, x - 4, y - 5, dw, dh); c.restore();
  }
  // 움직이는 장애물(구르는 밧줄·파도·달 돌·소용돌이·항아리·회오리)
  function mobs(c, m, t) {
    (m.mobs || []).forEach(mb => { const im = kimg(m.kit, mb.img), q = JC.mobPos(mb, t);
      if (!im) { circle(c, q.x, q.y, mb.r, '#e8605a'); return; }
      const dw = mb.w, dh = dw * im.naturalHeight / im.naturalWidth; c.save();
      if (mb.roll) { c.translate(q.x, q.y); c.rotate((q.x - mb.x0 * T) / mb.r); const s2 = (mb.r * 2 + 8) / Math.min(im.naturalWidth, im.naturalHeight); c.drawImage(im, -im.naturalWidth * s2 / 2, -im.naturalHeight * s2 / 2, im.naturalWidth * s2, im.naturalHeight * s2); }
      else if (mb.spin) { c.translate(q.x, q.y); c.rotate(-t * 1.6); c.drawImage(im, -dw / 2, -dh / 2, dw, dh); }
      else if (mb.fx === 'toss') { c.translate(q.x, q.y + mb.r + 14); c.scale(1 + Math.sin(t * 9) * 0.05, 1 - Math.sin(t * 9) * 0.04); c.rotate(Math.sin(t * 5) * 0.06); c.drawImage(im, -dw / 2, -dh, dw, dh); }
      else { c.translate(q.x, mb.sit ? q.y + mb.r : q.y + mb.r + 10); c.scale(mb.face ? mb.face * q.dir : 1, 1); c.translate(0, Math.sin(t * 7) * 1.5); c.drawImage(im, -dw / 2, -dh, dw, dh); }
      c.restore(); });
  }
  // 큰 땅 안쪽 무늬(테마별 오린 종이)
  function decorate(c, m, x, y, w, h, i, ice) {
    const R = seeded(i * 131 + m.id.charCodeAt(0) * 7 + 3), th = m.theme, g = ice ? '#bfe2f6' : m.ground;
    c.save(); rr(c, x, y, w, h + 30, 14); c.clip();
    if (ice) { c.fillStyle = 'rgba(255,255,255,.45)'; for (let n = 0; n < w * h / 5000; n++) { const px = x + R() * w, py = y + 40 + R() * h; c.beginPath(); c.moveTo(px, py); c.lineTo(px + 26, py - 14); c.lineTo(px + 30, py - 8); c.lineTo(px + 4, py + 6); c.fill(); } }
    else if (th === 'city' || th === 'moon') { c.fillStyle = th === 'moon' ? 'rgba(255,236,160,.55)' : 'rgba(255,250,235,.5)'; for (let yy = y + 38; yy < y + h + 10; yy += 34) for (let xx = x + 18; xx < x + w - 24; xx += 30) if (R() < 0.75) { rr(c, xx, yy, 14, 18, 4); c.fill(); } }
    else if (th === 'toy' || th === 'ghost' || th === 'desert') { c.fillStyle = 'rgba(255,255,255,.13)'; let row = 0; for (let yy = y + 34; yy < y + h + 20; yy += 26, row++) for (let xx = x + (row % 2 ? -18 : 6); xx < x + w; xx += 46) { rr(c, xx, yy, 38, 18, 5); c.fill(); } }
    else if (th === 'candy') { c.strokeStyle = 'rgba(255,255,255,.22)'; c.lineWidth = 12; for (let xx = x - h - 40; xx < x + w; xx += 44) { c.beginPath(); c.moveTo(xx, y + h + 40); c.lineTo(xx + h + 40, y); c.stroke(); } }
    else if (th === 'space') { for (let yy = y + 50; yy < y + h; yy += 56) for (let xx = x + 30; xx < x + w - 14; xx += 50) circle(c, xx, yy, 9, 'rgba(160,220,255,.4)'); c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(x, y + 30, w, 6); }
    else { const a = shade(g, 0.16), b2 = shade(g, -0.12); for (let n = 0; n < w * h / 2600; n++) { const px = x + R() * w, py = y + 36 + R() * h, r = 5 + R() * 10; c.fillStyle = R() < 0.5 ? a : b2; c.beginPath(); c.ellipse(px, py, r * 1.3, r * 0.8, R() * 3, 0, 7); c.fill(); } }
    c.restore();
  }
  function sign(c, x, y) { cut(c, '#9a7450', k => rrp(k, x + 12, y - 30, 7, 34, 3.5), 4); cut(c, '#5fae7a', k => rrp(k, x - 8, y - 52, 48, 26, 8), 5); stitch(c, 'rgba(255,255,255,.6)', k => rrp(k, x - 4, y - 48, 40, 18, 5), 1.3);
    c.fillStyle = '#fffaf0'; c.font = '13px "Jua","Noto Sans KR",sans-serif'; c.textAlign = 'center'; c.fillText('출발', x + 16, y - 34); c.textAlign = 'left'; }
  function afterBases(c, m, t, info) {
    mobs(c, m, t);
    // 도착 깃발(펄럭이는 펠트)
    const f = info.flag, w1 = Math.sin(t * 5) * 4, w2 = Math.sin(t * 5 + 1.3) * 4;
    soft(c, m.id === 'roof' ? '#d9423d' : '#7a5cf0', k => { k.moveTo(f.x + 23, f.y - 12); k.quadraticCurveTo(f.x + 44, f.y - 18 + w1, f.x + 76, f.y - 6 + w2); k.lineTo(f.x + 62, f.y + 6 + w2 * 0.6); k.lineTo(f.x + 76, f.y + 20 + w2); k.quadraticCurveTo(f.x + 44, f.y + 12 + w1, f.x + 23, f.y + 20); k.closePath(); });
    c.fillStyle = '#fff'; c.font = '13px "Jua","Noto Sans KR",sans-serif'; c.fillText('도착', f.x + 29, f.y + 8 + w1 * 0.4);
    // 순간이동 문
    (m.portals || []).forEach(p => { [[p[0], p[1], '#7ee8f5', '#d2f8ff'], [p[2], p[3], '#ff9cf2', '#ffdcf9']].forEach(([px, py, col, lite]) => {
      const cx = px * T + 16, cy = py * T + 32; soft(c, col, k => k.ellipse(cx, cy, 22, 34, 0, 0, 7)); flat(c, lite, k => k.ellipse(cx, cy, 15, 26, 0, 0, 7)); flat(c, '#3a2f66', k => k.ellipse(cx, cy, 9, 18, 0, 0, 7));
      c.save(); c.translate(cx, cy); c.strokeStyle = '#fff'; c.lineWidth = 2.5; c.lineCap = 'round'; c.setLineDash([3, 8]); c.lineDashOffset = -t * 30; c.beginPath(); c.ellipse(0, 0, 18.5, 30, 0, 0, 7); c.stroke(); c.restore(); }); });
    // 모래바람
    if (m.wind) { const st = JC.windState(m.wind, t); if (st) { c.save(); c.lineCap = 'round'; c.strokeStyle = st === 2 ? 'rgba(255,246,214,.75)' : 'rgba(255,246,214,.35)'; c.lineWidth = 5;
      for (let i = 0; i < (st === 2 ? 34 : 10); i++) { const yy = (i * 97) % WH, xx = WW - ((t * 900 + i * 211) % (WW + 240)); c.beginPath(); c.moveTo(xx, yy); c.quadraticCurveTo(xx + 40, yy - 8, xx + 80, yy + 2); c.stroke(); } c.restore();
      if (st === 1) { const tw = 250; soft(c, '#ff8a4c', k => rrp(k, WW / 2 - tw / 2, 20, tw, 40, 20)); c.fillStyle = '#fff'; c.font = '22px "Jua","Noto Sans KR",sans-serif'; c.textAlign = 'center'; c.fillText('모래바람이 와요!', WW / 2, 48); c.textAlign = 'left'; } } }
    // 눈·거품
    if (m.theme === 'snow') { for (let i = 0; i < 46; i++) { const x = (i * 263 + Math.sin(t + i) * 30) % WW, y = (i * 137 + t * 40) % WH; circle(c, x, y, 2 + (i % 3), 'rgba(255,255,255,.92)'); } }
    if (m.theme === 'sea') { for (let i = 0; i < 24; i++) { const x = (i * 211) % WW + Math.sin(t * 2 + i) * 6, y = WH - ((t * 50 + i * 97) % WH); circle(c, x, y, 3 + (i % 3), 'rgba(255,255,255,.28)'); circle(c, x - 1, y - 1, 1.2, 'rgba(255,255,255,.7)'); } }
  }

  // ── 조각 ────────────────────────────────────────────────
  function plankSpr(col, lite, dark) { return q => { cut(q, col, z => rrp(z, 0, 0, 96, 16, 7)); flat(q, lite, z => rrp(z, 4, 2.5, 88, 4, 2)); q.strokeStyle = dark; q.lineWidth = 1.4; q.lineCap = 'round'; q.beginPath(); q.moveTo(14, 10.5); q.lineTo(40, 10.5); q.moveTo(52, 11.5); q.lineTo(84, 11.5); q.stroke(); circle(q, 6, 8, 1.7, dark); circle(q, 90, 8, 1.7, dark); }; }
  const starPath = (k, n, r1, r2) => { for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * Math.PI * 2, r = i % 2 ? r2 : r1; k.lineTo(Math.cos(a) * r, Math.sin(a) * r); } k.closePath(); };
  function piece(c, p, t, W, now, opt) {
    opt = opt || {};
    const x = p.gx * T, y = p.gy * T, cx = x + 16, cy = y + 16, ph = JC.phaseOf(p.id || 'x'), d = DIRS[p.rot || 0], ang = Math.atan2(d[1], d[0]);
    c.save();
    if (opt.alpha != null) c.globalAlpha = opt.alpha;
    switch (p.type) {
      case 'plat': put(c, spr('plat', 96, 16, plankSpr('#dba463', '#edc48c', '#a8743a')), x, y); break;
      case 'ice': put(c, spr('ice', 96, 28, q => { cut(q, '#f2fbff', z => { for (let xx = 8; xx < 86; xx += 14) { z.moveTo(xx, 12); z.lineTo(xx + 5, 26); z.lineTo(xx + 10, 12); z.closePath(); } }, 3); cut(q, '#bfe7fb', z => rrp(z, 0, 0, 96, 16, 7)); flat(q, '#ffffff', z => rrp(z, 4, 2.5, 88, 5, 2.5)); }), x, y); break;
      case 'honey': put(c, spr('honey', 96, 30, q => { plankSpr('#dba463', '#edc48c', '#a8743a')(q); cut(q, '#f8b62d', z => { rrp(z, -2, -4, 100, 11, 5.5); [[10, 9], [34, 14], [58, 8], [80, 12]].forEach(([dx, l]) => rrp(z, dx, 2, 9, l + 8, 4.5)); }, 4); flat(q, '#ffd76b', z => rrp(z, 6, -2, 60, 3, 1.5)); }), x, y); break;
      case 'cloud': { let a = 1; if (W && W.cloudState && W.cloudState[p.id]) { const e = now - W.cloudState[p.id]; a = e < 0.55 ? 1 - e * 0.6 : e < 2.8 ? 0.1 : 1; }
        c.globalAlpha *= a; put(c, spr('cloud', 96, 26, q => { cut(q, '#ffffff', z => { [[14, 13, 11], [34, 9, 14], [56, 10, 13], [78, 13, 11]].forEach(o => { z.moveTo(o[0] + o[2], o[1]); z.arc(o[0], o[1], o[2], 0, 7); }); rrp(z, 8, 10, 80, 13, 6); }); flat(q, '#e3f0fb', z => rrp(z, 14, 17, 68, 4, 2)); }), x, y - 4); break; }
      case 'move': { const mo = opt.still ? 0 : JC.moveOffset(3, 3.2, ph, t).o; const ox = p.rot === 1 ? 0 : mo, oy = p.rot === 1 ? -mo : 0, v = p.rot === 1;
        c.save(); c.setLineDash([2, 9]); c.lineCap = 'round'; c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 4; c.beginPath(); if (v) { c.moveTo(x + 48, y + 8); c.lineTo(x + 48, y + 8 - 96); } else { c.moveTo(x + 48, y + 8); c.lineTo(x + 48 + 96, y + 8); } c.stroke(); c.restore();
        put(c, spr('move' + (v ? 'v' : 'h'), 96, 16, q => { cut(q, '#ffcf4a', z => rrp(z, 0, 0, 96, 16, 7)); q.save(); rr(q, 0, 0, 96, 16, 7); q.clip(); q.fillStyle = '#5a5568'; for (let k = 0; k < 5; k++) { q.beginPath(); q.moveTo(8 + k * 22, 0); q.lineTo(18 + k * 22, 0); q.lineTo(10 + k * 22, 16); q.lineTo(k * 22, 16); q.fill(); } q.restore();
          cut(q, '#fffaf0', z => z.arc(48, 8, 9, 0, 7), 3); q.strokeStyle = '#5a5568'; q.lineWidth = 2; q.lineCap = 'round'; q.lineJoin = 'round'; q.beginPath(); if (v) { q.moveTo(48, 3); q.lineTo(48, 13); q.moveTo(45, 6); q.lineTo(48, 3); q.lineTo(51, 6); q.moveTo(45, 10); q.lineTo(48, 13); q.lineTo(51, 10); } else { q.moveTo(43, 8); q.lineTo(53, 8); q.moveTo(46, 5); q.lineTo(43, 8); q.lineTo(46, 11); q.moveTo(50, 5); q.lineTo(53, 8); q.lineTo(50, 11); } q.stroke(); }), x + ox, y + oy); break; }
      case 'spring': put(c, spr('spring', 32, 32, q => { cut(q, '#8d99ae', z => rrp(z, 2, 25, 28, 7, 3.5), 4); q.save(); q.shadowColor = SH; q.shadowBlur = 3; q.shadowOffsetY = 2; q.strokeStyle = '#b8c2d1'; q.lineWidth = 4; q.lineCap = 'round'; q.lineJoin = 'round'; q.beginPath(); q.moveTo(7, 25); q.lineTo(25, 20.5); q.lineTo(7, 16); q.lineTo(25, 11.5); q.stroke(); q.restore(); cut(q, '#f0624d', z => rrp(z, 0, 1, 32, 11, 5.5)); flat(q, '#ff9c8a', z => rrp(z, 5, 3, 22, 3, 1.5)); }), x, y); break;
      case 'fan': { put(c, spr('fan', 32, 32, q => { cut(q, '#7fa9cf', z => rrp(z, 1, 1, 30, 30, 9)); flat(q, '#a9c9e6', z => z.arc(16, 16, 11.5, 0, 7)); }), x, y);
        c.save(); c.translate(cx, cy); c.rotate(opt.still ? 0.4 : t * 18); c.fillStyle = '#fffaf0'; for (let k = 0; k < 3; k++) { c.rotate(2.094); c.beginPath(); c.ellipse(6, 0, 7, 3.6, 0, 0, 7); c.fill(); } c.restore(); circle(c, cx, cy, 3, '#f0624d');
        c.save(); c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 3; c.lineCap = 'round'; const ga = c.globalAlpha; for (let k = 0; k < 5; k++) { const s = ((t * 2.2 + k / 5) % 1) * 7 * T, off = (k - 2) * 7, sx = cx + d[0] * (20 + s) + (d[0] ? 0 : off), sy = cy + d[1] * (20 + s) + (d[1] ? 0 : off); c.globalAlpha = ga * (1 - s / (7 * T)); c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + d[0] * 14, sy + d[1] * 14); c.stroke(); } c.restore(); break; }
      case 'saw': { soft(c, '#8d99ae', k => rrp(k, cx - 3.5, cy, 7, 16, 3), 2);
        putC(c, spr('saw', 36, 36, q => { q.translate(18, 18); cut(q, '#e6ebf1', z => starPath(z, 10, 17.5, 12.5), 4); flat(q, '#c3ccd8', z => z.arc(0, 0, 10.5, 0, 7)); flat(q, '#f0624d', z => z.arc(0, 0, 5, 0, 7)); flat(q, '#fffaf0', z => z.arc(0, 0, 1.8, 0, 7)); }), cx, cy, opt.still ? 0.3 : t * 12); break; }
      case 'spike': putC(c, spr('spike', 34, 34, q => { q.translate(17, 17); cut(q, '#4c4f73', z => starPath(z, 9, 16.5, 9.5), 4); flat(q, '#676b99', z => z.arc(0, 0, 9.5, 0, 7)); flat(q, '#fffaf0', z => { z.arc(-3.6, -1, 2.6, 0, 7); z.moveTo(6.2, -1); z.arc(3.6, -1, 2.6, 0, 7); }); flat(q, '#2c2e45', z => { z.arc(-3.2, -0.6, 1.2, 0, 7); z.moveTo(5.2, -0.6); z.arc(4, -0.6, 1.2, 0, 7); });
          q.strokeStyle = '#2c2e45'; q.lineWidth = 1.6; q.lineCap = 'round'; q.beginPath(); q.moveTo(-6.5, -5.5); q.lineTo(-1.5, -3.8); q.moveTo(6.5, -5.5); q.lineTo(1.5, -3.8); q.stroke(); }), cx, cy, opt.still ? 0 : Math.sin(t * 2 + ph * 6) * 0.3); break;
      case 'bow': { putC(c, spr('bow', 32, 32, q => { cut(q, '#b9824f', z => rrp(z, 3, 3, 26, 26, 8)); flat(q, '#d2a273', z => rrp(z, 6, 6, 20, 5, 2.5)); q.save(); q.shadowColor = SH; q.shadowBlur = 3; q.shadowOffsetY = 2; q.strokeStyle = '#6e4526'; q.lineWidth = 4; q.lineCap = 'round'; q.beginPath(); q.arc(19, 16, 12.5, -1.25, 1.25); q.stroke(); q.restore();
          q.strokeStyle = '#fffaf0'; q.lineWidth = 1.4; q.beginPath(); q.moveTo(19 + Math.cos(-1.25) * 12.5, 16 + Math.sin(-1.25) * 12.5); q.lineTo(11, 16); q.lineTo(19 + Math.cos(1.25) * 12.5, 16 + Math.sin(1.25) * 12.5); q.stroke(); }), cx, cy, ang);
        if (W && W.arrows && W.arrows[p.id] != null) { const per = 2.2, cc = ((t + ph * per) % per + per) % per, dist = 18 + cc * 380;
          if (dist < W.arrows[p.id]) putC(c, spr('arrow', 34, 12, q => { cut(q, '#7a5230', z => rrp(z, 4, 4.5, 22, 3, 1.5), 3); cut(q, '#f0624d', z => { z.moveTo(34, 6); z.lineTo(24, 0.5); z.lineTo(24, 11.5); z.closePath(); }, 3); flat(q, '#ffb347', z => { z.moveTo(0, 1); z.lineTo(8, 4.5); z.lineTo(8, 7.5); z.lineTo(0, 11); z.lineTo(3, 6); z.closePath(); }); }, 6), cx + d[0] * (dist - 8), cy + d[1] * (dist - 8), ang); } break; }
      case 'ball': { const a = Math.PI / 2 + 1.2 * Math.sin((opt.still ? 0.9 : t * 1.9) + ph * 6), bx = cx + Math.cos(a) * 82, by = cy + Math.sin(a) * 82;
        for (let k = 1; k < 9; k++) circle(c, cx + Math.cos(a) * k * 8.6, cy + Math.sin(a) * k * 8.6, 3.2, k % 2 ? '#8d99ae' : '#b8c2d1');
        put(c, spr('anchor', 24, 24, q => { cut(q, '#ffcf4a', z => rrp(z, 0, 0, 24, 24, 7)); flat(q, '#fff0b8', z => rrp(z, 4, 3, 16, 4, 2)); flat(q, '#b98a1e', z => z.arc(12, 13, 3.4, 0, 7)); }), x + 4, y + 4);
        putC(c, spr('ball', 36, 36, q => { q.translate(18, 18); cut(q, '#e2504c', z => z.arc(0, 0, 16.5, 0, 7), 5); flat(q, '#f58a80', z => z.ellipse(-5.5, -6, 5.5, 3.6, -0.6, 0, 7)); }), bx, by, 0); break; }
      case 'hole': { putC(c, spr('hole', 44, 44, q => { q.translate(22, 22); cut(q, '#6b5a9e', z => starPath(z, 7, 21, 15), 5); flat(q, '#43366e', z => z.arc(0, 0, 14.5, 0, 7)); flat(q, '#1e1733', z => z.arc(0, 0, 10, 0, 7)); }), cx, cy, opt.still ? 0 : -t * 2.2);
        c.save(); c.translate(cx, cy); c.strokeStyle = '#cdbdf5'; c.lineWidth = 2.4; c.lineCap = 'round'; for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(0, 0, 12.5, t * 4 + k * 2.09, t * 4 + k * 2.09 + 0.9); c.stroke(); } c.restore(); break; }
      case 'fire': { const st = opt.still ? 0 : JC.fireState(ph, t);
        if (st === 2) { c.save(); c.translate(cx, cy); c.rotate(ang); const L = 14 + 3 * T; [['#ff6f3c', 13, 0], ['#ffa23d', 9, 1.1], ['#ffd76b', 5, 2.2]].forEach(([col, hw, o]) => { soft(c, col, k => { k.moveTo(14, -hw); for (let xx = 14; xx < L - 12; xx += 20) k.quadraticCurveTo(xx + 10, -hw - 5 - Math.sin(xx * 0.3 + t * 22 + o) * 3, xx + 20, -hw + 1); k.quadraticCurveTo(L + 14 - (13 - hw) * 2, 0, L - 2, hw - 1); for (let xx = L - 2; xx > 16; xx -= 20) k.quadraticCurveTo(xx - 10, hw + 5 + Math.sin(xx * 0.27 + t * 19 + o) * 3, xx - 20, hw - 1); k.closePath(); }, 0); }); c.restore(); }
        if (st === 1) { c.save(); c.translate(cx, cy); c.rotate(ang); for (let k = 0; k < 3; k++) circle(c, 20 + k * 7, Math.sin(t * 30 + k) * 4, 3.6 - k * 0.7, k % 2 ? '#ffd76b' : '#ff8a3d'); c.restore(); }
        putC(c, spr('fire', 32, 28, q => { cut(q, '#7d8aa3', z => rrp(z, 1, 2, 22, 24, 7)); flat(q, '#a3aec2', z => rrp(z, 4, 5, 16, 4, 2)); cut(q, '#f0924a', z => rrp(z, 20, 6, 11, 16, 4), 3); flat(q, '#5a2f1e', z => rrp(z, 27, 9, 4, 10, 2)); }), cx, cy, ang); break; }
      case 'eraser': putC(c, spr('eraser', 30, 18, q => { cut(q, '#ff9cbd', z => rrp(z, 0, 0, 30, 18, 6)); q.save(); rr(q, 0, 0, 30, 18, 6); q.clip(); q.fillStyle = '#6f9bea'; q.fillRect(15, 0, 15, 18); q.fillStyle = '#fffaf0'; q.fillRect(13, 0, 3, 18); q.restore(); }), cx, cy, -0.4); break;
    }
    c.restore();
  }
  function pieceIcon(type, size, rot) {
    const cv = mk(size, Math.round(size * 0.75)), d = PIECES[type], scale = size / (Math.max(d.w, 2.4) * T + 8), c = cv.getContext('2d');
    c.translate(size / 2, cv.height / 2); c.scale(scale, scale); c.translate(-d.w * T / 2, -T / 2);
    if (type === 'ball') { c.scale(0.5, 0.5); c.translate(16, -30); }
    piece(c, { type, gx: 0, gy: 0, rot: rot || 0, id: 'icon' }, 0.4, null, 0, { still: true });
    return cv;
  }

  // ── 동물(종이 콜라주 그림 6컷: 대기·달리기 2·점프·착지·완주) ──
  const A = {}; JC.ANIMALS.forEach(a => A[a.id] = a);
  const sheets = new Map();
  const ANIMAL_W = 32, ANIMAL_H = 27;          // 화면에 그리는 기준 크기(판정은 22×26 그대로)
  function animalSheet(id) {
    const frames = window.JumpAnimalSheets && window.JumpAnimalSheets[id];
    if (!Array.isArray(frames)) return null;
    if (!sheets.has(id)) {
      const image = new Image();
      const width = Math.max(...frames.map(([left, , right]) => right - left));
      const height = Math.max(...frames.map(([, top, , bottom]) => bottom - top));
      sheets.set(id, { image, frames, scale: Math.min(ANIMAL_W / width, ANIMAL_H / height) });
      image.src = 'animals/' + id + '.webp';
    }
    return sheets.get(id);
  }
  function animal(c, id, x, y, s, face, t, state) {
    // x: 가운데, y: 발바닥
    const sheet = animalSheet(id);
    c.save(); c.translate(x, y);
    if (!sheet || !sheet.image.naturalWidth) { // 그림을 아직 못 받았을 때: 펠트 동그라미
      const a = A[id] || JC.ANIMALS[0]; c.scale(s, s); soft(c, a.c, k => k.ellipse(0, -13, 14, 13, 0, 0, 7)); circle(c, 5 * face, -15, 2, OUT); c.restore(); return; }
    const one = sheet.frames.length === 1; // 한 컷짜리 동물은 기울이고 눌러서 움직임을 표현해요
    const frame = one ? 0 : state === 'run' ? 1 + Math.floor(t * 10) % 2 : state === 'air' ? 3 : state === 'land' ? 4 : state === 'win' ? 5 : 0;
    const [left, top, right, bottom] = sheet.frames[frame], w = right - left, h = bottom - top;
    let tilt = 0, sx = 1, sy = 1, hop = 0;
    if (one) { if (state === 'run') { tilt = Math.sin(t * 20) * 0.11 + 0.06; hop = -Math.abs(Math.sin(t * 20)) * 2.5; } else if (state === 'air') { tilt = -0.2; sx = 0.94; sy = 1.08; } else if (state === 'land') { sx = 1.14; sy = 0.84; } }
    const bob = state === 'win' ? -Math.abs(Math.sin(t * 8)) * 5 : state === 'idle' ? Math.sin(t * 3 + x * 0.05) * 0.6 : 0;
    if (state !== 'air' && state !== 'dead' && state !== 'card') { c.fillStyle = 'rgba(45,32,28,.20)'; c.beginPath(); c.ellipse(0, 1, 10 * s, 2.6 * s, 0, 0, 7); c.fill(); }
    c.translate(0, (bob + hop + 2) * s);
    c.scale(s * face * sheet.scale * sx, s * sheet.scale * sy); if (tilt) c.rotate(tilt);
    if (state === 'dead') { c.translate(0, -h / 2); c.rotate(Math.sin(t * 20) * 0.6); c.translate(0, h / 2); c.globalAlpha *= 0.7; }
    c.drawImage(sheet.image, left, top, w, h, -w / 2, -h, w, h);
    c.restore();
  }
  function tag(c, x, y, text, col, me) {
    c.font = '12px "Jua","Noto Sans KR",sans-serif'; const w = c.measureText(text).width + 14; y -= 6;
    soft(c, me ? '#ff7a45' : '#fffaf0', k => { rrp(k, x - w / 2, y - 17, w, 17, 8.5); if (me) { k.moveTo(x - 5, y - 1); k.lineTo(x + 5, y - 1); k.lineTo(x, y + 5); k.closePath(); } }, 2);
    c.fillStyle = me ? '#fff' : OUT; c.textAlign = 'center'; c.fillText(text, x, y - 4.5); c.textAlign = 'left';
  }
  function animalCard(id, size) {
    const cv = mk(size, size), c = cv.getContext('2d');
    function draw() { c.clearRect(0, 0, size, size); animal(c, id, size / 2, size * 0.86, size / (ANIMAL_W + 2), 1, 0.5, 'card'); }
    draw();
    const sheet = animalSheet(id);
    if (sheet && !sheet.image.complete) sheet.image.addEventListener('load', draw, { once: true });
    return cv;
  }

  // 글꼴이 늦게 도착하면 미리 그려 둔 그림(표지판 글자 등)을 다시 그려요
  if (document.fonts && document.fonts.load) document.fonts.load('13px "Jua"', '출발도착모래바람이와요!ABCXYZ').then(() => { for (const k in stCache) delete stCache[k]; for (const k in bgCache) delete bgCache[k]; }).catch(() => { });
  function coin(c, x, y, t, i) { const s2 = spr('coin', 26, 26, q => { q.translate(13, 13); cut(q, '#f4b61a', z => z.arc(0, 0, 12, 0, 7), 4); flat(q, '#ffd84a', z => z.arc(0, 0, 9, 0, 7)); flat(q, '#fff3b0', z => starPath(z, 5, 6, 2.6)); });
    c.save(); c.translate(x, y + Math.sin(t * 4 + i) * 3); c.scale(Math.max(0.25, Math.abs(Math.cos(t * 2.4 + i))), 1); c.drawImage(s2.cv, -13 - s2.pad, -13 - s2.pad, 26 + s2.pad * 2, 26 + s2.pad * 2); c.restore(); }
  function shield(c, x, y, t) { c.save(); c.globalAlpha = 0.55 + Math.sin(t * 5) * 0.12; c.beginPath(); c.arc(x, y - 14, 23, 0, 7); c.fillStyle = 'rgba(143,211,255,.35)'; c.fill(); c.lineWidth = 3; c.strokeStyle = '#ffffff'; c.stroke(); c.restore(); }
  window.JR = { coin, shield, background, terrain, piece, pieceIcon, animal, animalCard, tag, rr, circle, shade, OUT, soft };
})();
