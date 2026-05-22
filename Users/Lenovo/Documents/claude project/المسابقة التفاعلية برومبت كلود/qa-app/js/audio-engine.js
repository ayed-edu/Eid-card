/* ═══════════════════════════════════════════════════
   audio-engine.js — محرّك الأصوات (Web Audio API)
   ═══════════════════════════════════════════════════ */

const AudioEngine = (() => {
  const STORAGE_KEY = 'qa_sound_enabled';
  let _ctx = null;
  let _enabled = true;
  let _drumTimers = [];

  function _getCtx() {
    if (!window.AudioContext && !window.webkitAudioContext) return null;
    try {
      if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (_ctx.state === 'suspended') _ctx.resume();
      return _ctx;
    } catch(e) { return null; }
  }

  // نغمة بسيطة: oscillator مع تلاشٍ
  function _osc(freq, dur, type, vol, t0 = 0) {
    const c = _getCtx(); if (!c) return;
    const osc = c.createOscillator();
    const g   = c.createGain();
    osc.connect(g); g.connect(c.destination);
    osc.type = type; osc.frequency.value = freq;
    const now = c.currentTime + t0;
    g.gain.setValueAtTime(0.001, now);
    g.gain.exponentialRampToValueAtTime(vol, now + 0.015);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.start(now); osc.stop(now + dur + 0.05);
  }

  // ضجيج أبيض قصير
  function _noise(dur, vol, t0 = 0) {
    const c = _getCtx(); if (!c) return;
    const n   = Math.ceil(c.sampleRate * dur);
    const buf = c.createBuffer(1, n, c.sampleRate);
    const d   = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    const g   = c.createGain();
    src.buffer = buf; src.connect(g); g.connect(c.destination);
    const now = c.currentTime + t0;
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    src.start(now); src.stop(now + dur + 0.05);
  }

  // ─── الأصوات العامة ───────────────────────────────

  function playCorrect(attempt) {
    if (!_enabled) return;
    if (attempt <= 1) {
      // 3 نقاط — ثلاث نغمات صاعدة مبهجة
      _osc(523, 0.10, 'sine', 0.32, 0.00);
      _osc(659, 0.10, 'sine', 0.30, 0.10);
      _osc(784, 0.25, 'sine', 0.38, 0.20);
    } else if (attempt === 2) {
      // 2 نقطتان — نغمتان
      _osc(523, 0.12, 'sine', 0.28, 0.00);
      _osc(659, 0.22, 'sine', 0.30, 0.12);
    } else {
      // 1 نقطة — نغمة ناعمة
      _osc(523, 0.25, 'sine', 0.25, 0.00);
    }
  }

  function playWrong() {
    if (!_enabled) return;
    _osc(300, 0.15, 'sawtooth', 0.17, 0.00);
    _osc(240, 0.20, 'sawtooth', 0.13, 0.13);
  }

  function playFail() {
    if (!_enabled) return;
    _osc(340, 0.14, 'sine', 0.20, 0.00);
    _osc(294, 0.14, 'sine', 0.18, 0.13);
    _osc(247, 0.28, 'sine', 0.15, 0.27);
  }

  function playTick() {
    if (!_enabled) return;
    _osc(900, 0.05, 'square', 0.18, 0);
  }

  function playTimeUp() {
    if (!_enabled) return;
    _osc(220, 0.28, 'sawtooth', 0.25, 0.00);
    _osc(180, 0.26, 'sawtooth', 0.19, 0.22);
  }

  function playSlotSpin() {
    if (!_enabled) return;
    _noise(0.22, 0.16, 0);
    _osc(350, 0.14, 'sine', 0.10, 0.05);
  }

  function playSlotDing() {
    if (!_enabled) return;
    _osc(1047, 0.06, 'sine', 0.32, 0.00);
    _osc(1319, 0.06, 'sine', 0.28, 0.07);
    _osc(1568, 0.28, 'sine', 0.36, 0.14);
  }

  // ─── Drum Roll متسارع ─────────────────────────────

  function playDrumRoll(durationMs, onDone) {
    _drumTimers.forEach(clearTimeout);
    _drumTimers = [];
    const t0 = Date.now();

    function beat() {
      const elapsed = Date.now() - t0;
      if (elapsed >= durationMs) {
        if (onDone) onDone();
        return;
      }
      const prog = elapsed / durationMs;
      if (_enabled) {
        _noise(0.055, 0.18 + prog * 0.16, 0);
        _osc(88 + Math.random() * 22, 0.05, 'sine', 0.22 + prog * 0.14, 0);
      }
      const interval = Math.max(52, 200 - 148 * prog);
      _drumTimers.push(setTimeout(beat, interval));
    }
    beat();
  }

  function stopDrumRoll() {
    _drumTimers.forEach(clearTimeout);
    _drumTimers = [];
  }

  // ─── Ta-Da عند كشف الفائز ─────────────────────────

  function playTaDa() {
    if (!_enabled) return;
    _osc(523,  0.08, 'sine', 0.30, 0.00);
    _osc(659,  0.08, 'sine', 0.28, 0.07);
    _osc(784,  0.08, 'sine', 0.27, 0.13);
    _osc(1047, 0.40, 'sine', 0.42, 0.19);
    _osc(784,  0.26, 'sine', 0.24, 0.24);
  }

  // ─── فانفير عند شاشة النتائج ──────────────────────

  function playFanfare() {
    if (!_enabled) return;
    const seq = [
      [523,  0.10, 0.00], [659,  0.10, 0.10], [784,  0.10, 0.20],
      [1047, 0.28, 0.30], [784,  0.08, 0.54], [880,  0.08, 0.60],
      [1047, 0.32, 0.68],
    ];
    seq.forEach(([f, d, t]) => _osc(f, d, 'sine', 0.30, t));
  }

  // ─── التحكّم ──────────────────────────────────────

  function toggle() {
    _enabled = !_enabled;
    localStorage.setItem(STORAGE_KEY, _enabled ? '1' : '0');
    _updateBtn();
    if (_enabled) _osc(880, 0.06, 'sine', 0.20, 0);
  }

  function _updateBtn() {
    const btn = document.getElementById('btn-sound-toggle');
    if (!btn) return;
    btn.textContent = _enabled ? '🔊' : '🔇';
    btn.title = _enabled ? 'إيقاف الأصوات' : 'تفعيل الأصوات';
  }

  function init() {
    const s = localStorage.getItem(STORAGE_KEY);
    _enabled = s !== '0';
    document.addEventListener('DOMContentLoaded', _updateBtn);
  }

  init();

  return {
    playCorrect, playWrong, playFail,
    playTick, playTimeUp,
    playSlotSpin, playSlotDing,
    playDrumRoll, stopDrumRoll,
    playTaDa, playFanfare,
    toggle,
    isEnabled: () => _enabled,
  };
})();
