// 자동 배정: 학생들을 맵 k개에 고르게 나누고,
// ① 한 게임에서 같은 맵에 두 번 가지 않게 ② 직전 라운드 팀원과 다시 만나는 일을 줄여요.
function mapCount(n) { return Math.max(1, Math.min(6, Math.ceil(n / 5))); }

// students: [{sid, visited:Set(mapIdx), last:Set(sid)}]  → {sid: mapIdx}
function assign(students, k, rnd = Math.random) {
  const n = students.length; if (!n) return {};
  const cap = []; for (let i = 0; i < k; i++) cap.push(Math.floor(n / k) + (i < n % k ? 1 : 0));
  let best = null, bestCost = Infinity;
  for (let it = 0; it < 250; it++) {
    const order = students.slice().sort(() => rnd() - 0.5);
    // 갈 수 있는 맵이 적은 학생부터
    order.sort((a, b) => (k - a.visited.size) - (k - b.visited.size));
    const left = cap.slice(), res = {}, groups = Array.from({ length: k }, () => []);
    let cost = 0;
    for (const s of order) {
      let pick = -1, pc = Infinity;
      const cand = []; for (let i = 0; i < k; i++) if (left[i] > 0) cand.push(i);
      cand.sort(() => rnd() - 0.5);
      for (const i of cand) {
        let c = s.visited.has(i) ? 100 : 0;
        groups[i].forEach(o => { if (s.last.has(o)) c += 3; });
        if (c < pc) { pc = c; pick = i; }
      }
      res[s.sid] = pick; groups[pick].push(s.sid); left[pick]--; cost += pc;
    }
    if (cost < bestCost) { bestCost = cost; best = res; if (cost === 0) break; }
  }
  return best;
}
module.exports = { assign, mapCount };
