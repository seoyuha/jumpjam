// 기본 지형만으로 완주할 수 있는지 탐색 봇으로 확인
const JC = require('../public/shared.js');
function clone(p) { return JSON.parse(JSON.stringify(p)); }
function solve(m, pieces = [], limit = 30) {
  const W = JC.buildWorld(m, pieces), info = JC.mapInfo(m);
  const acts = [];
  for (const d of [1, 0, -1]) for (const j of [0, 1]) acts.push({ l: d < 0, r: d > 0, j: !!j });
  let beam = [{ p: JC.newPlayer(info.spawns[0]), t: 0, path: [] }];
  const dt = 1 / 60, F = 6;
  for (let it = 0; it < limit * 10; it++) {
    const next = new Map();
    for (const s of beam) for (const a of acts) {
      const p = clone(s.p); let t = s.t, died = false, fin = false;
      for (let f = 0; f < F; f++) {
        const inp = { l: a.l, r: a.r, j: a.j, jp: a.j && f === 0 && !(s.lastJ) };
        const ev = JC.step(p, inp, dt, W, t, t); t += dt;
        if (ev.die) { died = true; break; } if (ev.finish) { fin = true; break; }
      }
      if (died) continue;
      if (fin) return { ok: true, time: t.toFixed(1) };
      const key = Math.round(p.x / 12) + ',' + Math.round(p.y / 12) + ',' + Math.round(p.vy / 150) + ',' + (p.on ? 1 : 0);
      const score = p.x - Math.abs(p.y - info.flag.y) * 0.3;
      const ex = next.get(key);
      if (!ex || ex.score < score) next.set(key, { p, t, score, lastJ: a.j });
    }
    beam = [...next.values()].sort((a, b) => b.score - a.score).slice(0, 400);
    if (!beam.length) return { ok: false, why: 'all dead' };
  }
  return { ok: false, why: 'timeout', best: Math.round(beam[0].p.x / 32) };
}
module.exports = solve;
if (require.main === module) {
  let bad = 0;
  for (const m of JC.MAPS) { const r = solve(m); if (!r.ok) bad++; console.log((r.ok ? 'OK  ' : 'FAIL') + ' ' + m.ko + ' ' + JSON.stringify(r)); }
  process.exit(bad ? 1 : 0);
}
