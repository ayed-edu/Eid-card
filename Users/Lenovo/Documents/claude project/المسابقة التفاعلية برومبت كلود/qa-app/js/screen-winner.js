/* ═══════════════════════════════════════════════════
   screen-winner.js — شاشة الفائز قبل قائمة الشرف
   ═══════════════════════════════════════════════════ */

let _winnerActive = false;

function showWinnerScreen() {
  _winnerActive = true;

  // استخدم نفس منطق getRankedStudents (بدون الغائبين)
  const absent = currentQuizSession.absentStudentIds || new Set();
  const ranked = Object.entries(currentQuizSession.studentScores)
    .filter(([id]) => !absent.has(id))
    .map(([id, s]) => ({ id, ...s }))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return (a.attemptsUsed || 0) - (b.attemptsUsed || 0);
    });

  const winner    = ranked[0];
  const hasWinner = winner && winner.points > 0;

  // إخفاء جميع المراحل
  ['winner-phase-1', 'winner-phase-2', 'winner-phase-3', 'winner-no-winner']
    .forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.style.display = 'none'; el.style.opacity = ''; el.style.transform = ''; }
    });

  showScreen('screen-winner');
  _createSparkles();

  if (!hasWinner) {
    _winnerNoWinner();
    return;
  }

  _winnerPhase1(winner);
}

// ─── إنشاء نجوم متطايرة ──────────────────────────────

function _createSparkles() {
  const container = document.getElementById('winner-sparkles');
  if (!container) return;
  container.innerHTML = '';
  const symbols = ['✨', '⭐', '🌟', '💫', '🎉'];
  for (let i = 0; i < 14; i++) {
    const span = document.createElement('span');
    span.className = 'winner-sparkle';
    span.textContent = symbols[i % symbols.length];
    span.style.cssText = `
      left: ${5 + Math.random() * 90}%;
      animation-duration: ${2.5 + Math.random() * 2}s;
      animation-delay: ${Math.random() * 1.5}s;
      font-size: ${18 + Math.random() * 18}px;
    `;
    container.appendChild(span);
  }
}

// ─── حالة لا فائز ────────────────────────────────────

function _winnerNoWinner() {
  const el = document.getElementById('winner-no-winner');
  if (!el) return;
  el.style.display = '';

  if (typeof anime !== 'undefined') {
    const { animate } = anime;
    animate('#winner-no-winner', {
      opacity:    [0, 1],
      translateY: [24, 0],
      duration:   650,
      ease:       'outCubic',
    });
  }

  setTimeout(() => {
    if (!_winnerActive) return;
    _winnerActive = false;
    if (typeof AudioEngine !== 'undefined') AudioEngine.playFanfare();
    openResultsScreen();
  }, 2500);
}

// ─── المرحلة 1: طبل + تشويق (0–2.5 ث) ──────────────

function _winnerPhase1(winner) {
  const el = document.getElementById('winner-phase-1');
  if (!el) return;
  el.style.display = '';

  if (typeof anime !== 'undefined') {
    const { animate } = anime;
    animate('#winner-phase-1', {
      opacity: [0, 1],
      scale:   [0.92, 1],
      duration: 450,
      ease:    'outCubic',
    });
  }

  if (typeof AudioEngine !== 'undefined') {
    AudioEngine.playDrumRoll(2400, () => {
      if (!_winnerActive) return;
      _winnerPhase2(winner);
    });
  } else {
    setTimeout(() => {
      if (!_winnerActive) return;
      _winnerPhase2(winner);
    }, 2500);
  }
}

// ─── المرحلة 2: كشف المركز (2.5–3.5 ث) ─────────────

function _winnerPhase2(winner) {
  const p1 = document.getElementById('winner-phase-1');
  const p2 = document.getElementById('winner-phase-2');
  if (p1) p1.style.display = 'none';
  if (!p2) return;
  p2.style.display = '';

  if (typeof anime !== 'undefined') {
    const { animate } = anime;
    animate('#winner-phase-2', {
      opacity: [0, 1],
      scale:   [0.6, 1.08, 1],
      duration: 650,
      ease:    'outBack',
    });
  }

  setTimeout(() => {
    if (!_winnerActive) return;
    _winnerPhase3(winner);
  }, 1000);
}

// ─── المرحلة 3: كشف الفائز (3.5–5.2 ث) ─────────────

function _winnerPhase3(winner) {
  const p2    = document.getElementById('winner-phase-2');
  const p3    = document.getElementById('winner-phase-3');
  const nameEl = document.getElementById('winner-name-el');
  const ptsEl  = document.getElementById('winner-pts-pill');

  if (p2) p2.style.display = 'none';
  if (!p3) return;

  if (nameEl) nameEl.textContent = winner.name;
  if (ptsEl)  ptsEl.textContent  = `⭐ ${winner.points} ${_ptsWord(winner.points)}`;

  p3.style.display = '';

  if (typeof AudioEngine !== 'undefined') AudioEngine.playTaDa();

  if (typeof anime !== 'undefined') {
    const { animate } = anime;
    animate('.winner-crown-el', {
      translateY: [-90, 0],
      opacity:    [0, 1],
      duration:   680,
      ease:       'outBounce',
    });
    animate('.winner-name-el', {
      opacity:  [0, 1],
      scale:    [0.55, 1.06, 1],
      duration: 700,
      delay:    180,
      ease:     'outBack',
    });
    animate('.winner-pts-pill', {
      opacity:    [0, 1],
      translateY: [22, 0],
      duration:   500,
      delay:      530,
      ease:       'outCubic',
    });
  }

  setTimeout(() => {
    if (!_winnerActive) return;
    _winnerActive = false;
    if (typeof AudioEngine !== 'undefined') AudioEngine.playFanfare();
    openResultsScreen();
  }, 1700);
}

// ─── مساعد ───────────────────────────────────────────

function _ptsWord(n) {
  if (n === 1) return 'نقطة';
  if (n === 2) return 'نقطتان';
  if (n >= 3 && n <= 10) return 'نقاط';
  return 'نقطة';
}
