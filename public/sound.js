// 아주 작은 효과음 (Web Audio)
window.SFX = (function () {
  let ac = null, on = true;
  function ctx() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } } if (ac && ac.state === 'suspended') ac.resume(); return ac; }
  function tone(f1, f2, dur, type, vol, delay) {
    const a = ctx(); if (!a || !on) return; const t0 = a.currentTime + (delay || 0);
    const o = a.createOscillator(), g = a.createGain(); o.type = type || 'square';
    o.frequency.setValueAtTime(f1, t0); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    g.gain.setValueAtTime(vol || 0.08, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(a.destination); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  return {
    unlock: ctx, toggle() { on = !on; return on; }, get on() { return on; },
    jump() { tone(380, 760, 0.12, 'square', 0.05); },
    spring() { tone(300, 1200, 0.25, 'sine', 0.09); },
    die() { tone(500, 90, 0.4, 'sawtooth', 0.07); },
    finish() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0, 0.16, 'triangle', 0.09, i * 0.09)); },
    right() { tone(660, 0, 0.1, 'triangle', 0.1); tone(990, 0, 0.16, 'triangle', 0.1, 0.09); },
    wrong() { tone(200, 140, 0.28, 'square', 0.06); },
    place() { tone(240, 520, 0.1, 'triangle', 0.1); },
    tick() { tone(880, 0, 0.06, 'sine', 0.07); },
    go() { tone(1180, 0, 0.25, 'sine', 0.1); },
    portal() { tone(400, 1600, 0.3, 'sine', 0.06); },
  };
})();
