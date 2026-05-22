/* ═══════════════════════════════════════════════════
   screen-question.js — شاشة السؤال (الجزء 2-أ)
   ═══════════════════════════════════════════════════ */

// حالة السؤال الحالي (مؤقتة لكل سؤال)
let qzState = {
  currentQuestion:   null,
  attemptsRemaining: 3,
  attemptsUsed:      0,
  disabledChoices:   new Set(),
  isAnswered:        false,
  activeStudentId:   null,
  isTransitioning:   false,
  timerInterval:     null,
  timeRemaining:     0,
  timeStartedAt:     0,
  inReadyPhase:      false,
  lastTickSec:       -1,
};

// يستخرج الاسم الأول مع التعامل الذكي مع أسماء "عبد ..."
function getFirstName(fullName) {
  if (!fullName || typeof fullName !== 'string') return '';
  const cleaned = fullName.trim().replace(/\s+/g, ' ');
  const parts = cleaned.split(' ');
  if (parts.length === 0) return cleaned;
  const first = parts[0];
  if (first === 'عبد' && parts.length >= 2) {
    return `عبد ${parts[1]}`;
  }
  return first;
}

// ─── رسائل التعزيز المتنوّعة ────────────────────

const REINFORCE_MESSAGES = {
  '3pts': [
    (s) => `${getFirstName(s.name)} ممتاز! إجابة من أول محاولة 🌟`,
    (s) => `${getFirstName(s.name)} ${s.gender === 'boys' ? 'مبدع' : 'مبدعة'}! إجابة سريعة وصحيحة ⚡`,
    (s) => `أحسنت يا ${getFirstName(s.name)}، حصلت على 3 نقاط 💎`,
    (s) => `رائع يا ${getFirstName(s.name)}! إجابة موفّقة 🎯`,
    (s) => `${getFirstName(s.name)} فعلاً ${s.gender === 'boys' ? 'متميّز' : 'متميّزة'} 🏆`,
  ],
  '2pts': [
    (s) => `${getFirstName(s.name)} أحسنت! نقطتان لك 👏`,
    (s) => `جيد جداً يا ${getFirstName(s.name)}، حصلت على نقطتين ✨`,
    (s) => `${getFirstName(s.name)} ${s.gender === 'boys' ? 'تستحقّ' : 'تستحقّين'} التقدير، ${s.gender === 'boys' ? 'استمر' : 'استمري'} 💪`,
    (s) => `بارك الله فيك يا ${getFirstName(s.name)}، نقطتان لمحاولتك 🌟`,
  ],
  '1pt': [
    (s) => `${getFirstName(s.name)} لا ${s.gender === 'boys' ? 'تستسلم' : 'تستسلمي'}، حصلت على نقطة 💪`,
    (s) => `جميل يا ${getFirstName(s.name)}، نقطة من ثالث محاولة 🌱`,
    (s) => `أنت ${s.gender === 'boys' ? 'تتعلّم' : 'تتعلّمين'} يا ${getFirstName(s.name)}، وكل محاولة درس 📚`,
    (s) => `${getFirstName(s.name)} المثابرة قيمة، نقطة لك 🎈`,
  ],
  'fail': [
    (s) => `${getFirstName(s.name)} لا بأس، ${s.gender === 'boys' ? 'عوّض' : 'عوّضي'} في السؤال القادم 🌱`,
    (s) => `${getFirstName(s.name)} خطأ بسيط، الفرصة قادمة 💛`,
    (s) => `لا ${s.gender === 'boys' ? 'تيأس' : 'تيأسي'} يا ${getFirstName(s.name)}، كل سؤال جديد فرصة جديدة ✨`,
    (s) => `${getFirstName(s.name)} ما زالت أمامك فرص رائعة 🌈`,
  ],
};

function pickRandomReinforce(category, student) {
  const arr = REINFORCE_MESSAGES[category] || [];
  if (!arr.length) return '';
  return arr[Math.floor(Math.random() * arr.length)](student);
}

// ─── فتح شاشة السؤال ────────────────────────────

function openQuestionScreen() {
  if (!currentQuizSession?.questions?.length) {
    alert('لا توجد جلسة مسابقة جاهزة.');
    return;
  }

  // تهيئة قائمة الغائبين (مؤقتة لهذه الجلسة فقط)
  if (!currentQuizSession.absentStudentIds) {
    currentQuizSession.absentStudentIds = new Set();
  }

  document.getElementById('qz-ctx-subject-icon').textContent = currentSubjectContext.icon;
  document.getElementById('qz-ctx-subject').textContent      = currentSubjectContext.name;
  document.getElementById('qz-ctx-unit').textContent         =
    currentUnitContext.mode === 'comprehensive' ? 'أسئلة شاملة' : currentUnitContext.unitName;
  document.getElementById('qz-progress-total').textContent   = currentQuizSession.questions.length;

  const section = document.getElementById('screen-question');
  section.style.setProperty('--current-subject-color',      currentSubjectContext.color);
  section.style.setProperty('--current-subject-color-dark', currentSubjectContext.colorDark);

  currentQuizSession.currentQuestionIndex = 0;

  // فعّل زر "من سيجيب"
  const whoBtn = document.getElementById('btn-who-answers');
  if (whoBtn) whoBtn.disabled = false;

  // أعد ضبط شريط الطالب النشط
  document.getElementById('qz-active-student').textContent = '— لم يُختر طالب بعد —';
  document.getElementById('qz-active-score').textContent   = '⭐ —';

  // ابنِ اللوحة الجانبية
  renderScoreboard();

  showCurrentQuestion();
  if (typeof persistCurrentSession === 'function') persistCurrentSession();
  showScreen('screen-question');
}

// ─── عرض السؤال الحالي (مرحلة ready ثم السؤال) ──

function showCurrentQuestion() {
  const idx = currentQuizSession.currentQuestionIndex;
  const q   = currentQuizSession.questions[idx];
  if (!q) { finishQuiz(); return; }

  qzState.currentQuestion   = q;
  qzState.attemptsRemaining = currentQuizSession.attemptsPerQuestion;
  qzState.attemptsUsed      = 0;
  qzState.disabledChoices   = new Set();
  qzState.isAnswered        = false;
  qzState.isTransitioning   = false;
  stopTimer();

  document.getElementById('qz-progress-current').textContent = idx + 1;

  // في وضع "بلا وقت": اعرض السؤال مباشرة بدون شاشة ready
  if (!currentQuizSession.timePerQuestion || currentQuizSession.timePerQuestion <= 0) {
    qzState.inReadyPhase    = false;
    qzState.activeStudentId = null;
    document.getElementById('ready-overlay').style.display    = 'none';
    document.getElementById('qz-question-card').style.display = '';

    document.getElementById('qz-active-student').textContent = '— لم يُختر طالب بعد —';
    document.getElementById('qz-active-score').innerHTML     = '⭐ —';

    renderQuestionContent(q);

    if (typeof anime !== 'undefined') {
      const { animate, stagger } = anime;
      animate('.qz-question-card', {
        translateY: [20, 0],
        opacity:    [0, 1],
        duration:   500,
        ease:       'outCubic',
      });
      animate('.qz-choice', {
        translateY: [20, 0],
        opacity:    [0, 1],
        duration:   400,
        delay:      stagger(80, { start: 200 }),
        ease:       'outCubic',
      });
    }
    return;
  }

  // غير ذلك: اعرض شاشة ready (الوقت سيبدأ مع رؤية السؤال)
  showReadyOverlay();
}

function showReadyOverlay() {
  qzState.inReadyPhase    = true;
  qzState.activeStudentId = null;

  // أَخفِ بطاقة السؤال واعرض شاشة ready
  document.getElementById('qz-question-card').style.display = 'none';
  document.getElementById('ready-overlay').style.display    = '';

  const idx = currentQuizSession.currentQuestionIndex;
  document.getElementById('ready-current').textContent = idx + 1;
  document.getElementById('ready-total').textContent   = currentQuizSession.questions.length;

  const tInfo = document.getElementById('ready-time-info');
  if (currentQuizSession.timePerQuestion > 0) {
    tInfo.style.display = '';
    document.getElementById('ready-time-value').textContent =
      `${currentQuizSession.timePerQuestion} ثانية`;
  } else {
    tInfo.style.display = 'none';
  }

  document.getElementById('ready-selected').style.display  = 'none';
  document.getElementById('ready-show-btn').disabled       = true;
  document.getElementById('ready-absent-btn').disabled     = true;

  document.getElementById('qz-active-student').textContent = '— لم يُختر طالب بعد —';
  document.getElementById('qz-active-score').innerHTML     = '⭐ —';

  if (typeof anime !== 'undefined') {
    const { animate } = anime;
    animate('.ready-card', {
      translateY: [30, 0],
      opacity:    [0, 1],
      scale:      [0.95, 1],
      duration:   500,
      ease:       'outCubic',
    });
  }
}

function hideReadyOverlay() {
  document.getElementById('ready-overlay').style.display    = 'none';
  document.getElementById('qz-question-card').style.display = '';
  qzState.inReadyPhase = false;
}

function renderQuestionContent(q) {
  renderAttemptsStars();
  document.getElementById('qz-question-text').textContent = q.text;
  renderChoices(q);
  document.getElementById('btn-skip-question').disabled = false;
  startTimerIfNeeded();
}

function actuallyShowQuestion() {
  if (!qzState.activeStudentId) {
    alert('اختاري الطالب أولاً.');
    return;
  }
  hideReadyOverlay();
  renderQuestionContent(qzState.currentQuestion);

  if (typeof anime !== 'undefined') {
    const { animate, stagger } = anime;
    animate('.qz-question-card', {
      translateY: [20, 0],
      opacity:    [0, 1],
      duration:   500,
      ease:       'outCubic',
    });
    animate('.qz-choice', {
      translateY: [20, 0],
      opacity:    [0, 1],
      duration:   400,
      delay:      stagger(80, { start: 200 }),
      ease:       'outCubic',
    });
  }
}

function renderAttemptsStars() {
  const wrap  = document.getElementById('qz-attempts-stars');
  wrap.innerHTML = '';
  const total = currentQuizSession.attemptsPerQuestion;

  for (let i = 0; i < total; i++) {
    const star       = document.createElement('span');
    star.className   = 'qz-star';
    star.textContent = '⭐';
    if (i >= qzState.attemptsRemaining) star.classList.add('used');
    wrap.appendChild(star);
  }

  const lbl = document.getElementById('qz-attempts-label');
  const r   = qzState.attemptsRemaining;
  if (r === total) {
    lbl.textContent = r === 1 ? 'لديك محاولة واحدة' : r === 2 ? 'لديك محاولتان' : 'لديك ثلاث محاولات';
  } else if (r === 1) {
    lbl.textContent = 'بقيت محاولة واحدة';
  } else if (r === 2) {
    lbl.textContent = 'بقيت محاولتان';
  } else {
    lbl.textContent = 'انتهت المحاولات';
  }
}

function renderChoices(q) {
  const grid   = document.getElementById('qz-choices-grid');
  grid.innerHTML = '';
  const labels = ['أ', 'ب', 'ج', 'د'];

  q.choices.forEach((ch, idx) => {
    const btn = document.createElement('button');
    btn.type              = 'button';
    btn.className         = 'qz-choice';
    btn.dataset.choiceIndex = idx;

    const labelEl       = document.createElement('span');
    labelEl.className   = 'qz-choice-label';
    labelEl.textContent = labels[idx];

    const textEl        = document.createElement('span');
    textEl.className    = 'qz-choice-text';
    textEl.textContent  = ch;

    btn.appendChild(labelEl);
    btn.appendChild(textEl);
    btn.addEventListener('click', () => handleChoiceClick(idx));
    grid.appendChild(btn);
  });
}

// ─── معالجة النقر على اختيار ────────────────────

function handleChoiceClick(choiceIndex) {
  if (qzState.isAnswered || qzState.isTransitioning) return;
  if (qzState.disabledChoices.has(choiceIndex)) return;

  if (!qzState.activeStudentId) {
    alert('اختاري الطالب الذي سيجيب أولاً بالضغط على "من سيجيب؟".');
    return;
  }

  const q         = qzState.currentQuestion;
  const isCorrect = choiceIndex === q.correctIndex;
  const btn       = document.querySelector(`.qz-choice[data-choice-index="${choiceIndex}"]`);

  qzState.attemptsUsed++;

  if (isCorrect) {
    stopTimer();
    qzState.isAnswered = true;
    btn.classList.add('correct');

    if (typeof anime !== 'undefined') {
      const { animate } = anime;
      animate(btn, {
        scale:    [1, 1.08, 1],
        duration: 400,
        ease:     'outElastic(1, .6)',
      });
    }

    const pointsMap = { 1: 3, 2: 2, 3: 1 };
    const earned    = pointsMap[qzState.attemptsUsed] || 0;
    if (typeof AudioEngine !== 'undefined') AudioEngine.playCorrect(qzState.attemptsUsed);
    awardPointsToActiveStudent(earned, true);

    const cat     = qzState.attemptsUsed === 1 ? '3pts' : qzState.attemptsUsed === 2 ? '2pts' : '1pt';
    const student = currentQuizSession.studentScores[qzState.activeStudentId];
    showReinforcementToast({
      message:  pickRandomReinforce(cat, student),
      emoji:    '🌟',
      points:   earned,
      positive: true,
    });

    qzState.isTransitioning = true;
    setTimeout(goToNextQuestion, 2600);

  } else {
    btn.classList.add('wrong');
    btn.disabled = true;
    qzState.disabledChoices.add(choiceIndex);
    qzState.attemptsRemaining--;
    if (typeof AudioEngine !== 'undefined') AudioEngine.playWrong();

    if (typeof anime !== 'undefined') {
      const { animate } = anime;
      animate(btn, {
        translateX: [-6, 6, -4, 4, 0],
        duration:   300,
        ease:       'linear',
      });
    }

    renderAttemptsStars();

    if (qzState.attemptsRemaining <= 0) {
      stopTimer();
      qzState.isAnswered = true;
      revealCorrectChoice();
      if (typeof AudioEngine !== 'undefined') AudioEngine.playFail();
      awardPointsToActiveStudent(0, false);

      const student = currentQuizSession.studentScores[qzState.activeStudentId];
      showReinforcementToast({
        message:  pickRandomReinforce('fail', student),
        emoji:    '🌱',
        points:   0,
        positive: false,
      });

      qzState.isTransitioning = true;
      setTimeout(goToNextQuestion, 3000);
    }
  }
}

function revealCorrectChoice() {
  const btn = document.querySelector(`.qz-choice[data-choice-index="${qzState.currentQuestion.correctIndex}"]`);
  if (!btn) return;
  btn.classList.add('revealed');

  if (typeof anime !== 'undefined') {
    const { animate } = anime;
    animate(btn, {
      scale:    [1, 1.06, 1, 1.06, 1],
      duration: 600,
      ease:     'inOutQuad',
    });
  }
}

function awardPointsToActiveStudent(points, gotCorrect, extras = {}) {
  const sid = qzState.activeStudentId;
  if (!sid) return;
  const s = currentQuizSession.studentScores[sid];
  s.points += points;
  if (gotCorrect) s.correctCount = (s.correctCount || 0) + 1;
  s.attemptsUsed = (s.attemptsUsed || 0) + qzState.attemptsUsed;
  s.history = s.history || [];
  s.history.push({
    questionIndex: currentQuizSession.currentQuestionIndex,
    attemptUsed: qzState.attemptsUsed,
    gotCorrect,
    pointsEarned: points,
    skipped: extras.skipped || false,
    timeUp: extras.timeUp || false
  });

  document.getElementById('qz-active-score').innerHTML = `⭐ ${s.points}`;
  if (typeof persistCurrentSession === 'function') persistCurrentSession();
  renderScoreboard();
}

// ─── Toast التعزيز ───────────────────────────────

function showReinforcementToast({ message, emoji, points, positive }) {
  const toast = document.getElementById('reinforce-toast');
  document.getElementById('rt-emoji').textContent   = emoji;
  document.getElementById('rt-message').textContent = message;

  const ptsEl = document.getElementById('rt-points');
  if (positive && points > 0) {
    ptsEl.style.display = '';
    document.getElementById('rt-points-value').textContent = `+${points}`;
  } else {
    ptsEl.style.display = 'none';
  }

  toast.classList.remove('positive', 'gentle');
  toast.classList.add(positive ? 'positive' : 'gentle');
  toast.style.display = 'flex';

  if (typeof anime !== 'undefined') {
    const { animate } = anime;
    animate(toast, {
      translateY: [-30, 0],
      scale:      [0.85, 1],
      opacity:    [0, 1],
      duration:   500,
      ease:       'outBack',
    });
  }

  clearTimeout(showReinforcementToast._timer);
  showReinforcementToast._timer = setTimeout(hideReinforcementToast, 2400);
}

function hideReinforcementToast() {
  const toast = document.getElementById('reinforce-toast');
  if (typeof anime !== 'undefined') {
    const { animate } = anime;
    animate(toast, {
      opacity:    [1, 0],
      translateY: [0, -20],
      duration:   300,
      ease:       'inOutQuad',
    });
    setTimeout(() => { toast.style.display = 'none'; }, 310);
  } else {
    toast.style.display = 'none';
  }
}

// ─── التنقل بين الأسئلة ─────────────────────────

function goToNextQuestion() {
  stopTimer();
  if (typeof persistCurrentSession === 'function') persistCurrentSession();
  currentQuizSession.currentQuestionIndex++;
  if (currentQuizSession.currentQuestionIndex >= currentQuizSession.questions.length) {
    finishQuiz();
    return;
  }

  // امسح الطالب النشط ليعاد اختياره للسؤال الجديد
  qzState.activeStudentId = null;
  document.getElementById('qz-active-student').textContent = '— لم يُختر طالب بعد —';
  document.getElementById('qz-active-score').textContent   = '⭐ —';

  showCurrentQuestion();
}

function skipCurrentQuestion() {
  stopTimer();
  if (qzState.isTransitioning) return;
  if (!confirm('تخطّي هذا السؤال دون احتساب نقاط؟')) return;

  if (qzState.activeStudentId) {
    const s = currentQuizSession.studentScores[qzState.activeStudentId];
    s.history = s.history || [];
    const already = s.history.some(h => h.questionIndex === currentQuizSession.currentQuestionIndex);
    if (!already) {
      s.history.push({
        questionIndex: currentQuizSession.currentQuestionIndex,
        attemptUsed: 0,
        gotCorrect: false,
        pointsEarned: 0,
        skipped: true,
        timeUp: false
      });
      renderScoreboard();
      if (typeof persistCurrentSession === 'function') persistCurrentSession();
    }
  }

  goToNextQuestion();
}

// ─── إنهاء المسابقة ─────────────────────────────

function finishQuiz() {
  if (typeof clearPersistedSession === 'function') clearPersistedSession();
  if (typeof showWinnerScreen === 'function') {
    showWinnerScreen();
  } else if (typeof openResultsScreen === 'function') {
    openResultsScreen();
  } else {
    alert('شاشة النتائج غير محمَّلة.');
    showScreen('screen-quiz-settings');
  }
}

function confirmEndQuiz() {
  stopTimer();
  openEndQuizModal();
}

function openEndQuizModal() {
  if (!currentQuizSession) return;

  const overlay = document.getElementById('end-quiz-modal-overlay');
  const introEl = document.getElementById('eq-intro');

  const total = currentQuizSession.questions.length;
  const currentIdx = currentQuizSession.currentQuestionIndex;
  const currentQNum = Math.min(currentIdx + 1, total);
  const remaining = Math.max(0, total - currentQNum);

  let answersCount = 0;
  Object.values(currentQuizSession.studentScores).forEach(s => {
    answersCount += (s.history || []).filter(h => !h.skipped).length;
  });

  let intro;
  if (currentIdx === 0 && answersCount === 0) {
    intro = 'لم تبدأ المسابقة فعلياً بعد. هل تريدين إلغاءها؟';
  } else if (remaining === 0) {
    intro = 'أنتِ في السؤال الأخير. هل تريدين إنهاء المسابقة الآن؟';
  } else if (remaining <= 2) {
    intro = `تبقّى ${remaining === 1 ? 'سؤال واحد فقط' : 'سؤالان فقط'}! هل تريدين إنهاء المسابقة الآن أم إكمالها؟`;
  } else {
    intro = 'المسابقة في منتصفها. اختاري ما يناسبك:';
  }

  introEl.textContent = intro;
  document.getElementById('eq-current-q').textContent = `${currentQNum} / ${total}`;
  document.getElementById('eq-remaining-q').textContent = remaining;
  document.getElementById('eq-answers-count').textContent = answersCount;

  overlay.style.display = 'flex';
  if (typeof anime !== 'undefined') {
    const { animate } = anime;
    animate('.end-quiz-modal', {
      translateY: [20, 0],
      opacity: [0, 1],
      duration: 300,
      ease: 'outCubic'
    });
  }
}

function closeEndQuizModal() {
  document.getElementById('end-quiz-modal-overlay').style.display = 'none';
}

function endQuizNow() {
  closeEndQuizModal();
  finishQuiz();
}

function continueQuiz() {
  closeEndQuizModal();
  if (!qzState.isAnswered && !qzState.inReadyPhase && currentQuizSession.timePerQuestion > 0) {
    if (qzState.timeRemaining > 0) {
      qzState.timeStartedAt = Date.now() - ((currentQuizSession.timePerQuestion - qzState.timeRemaining) * 1000);
      qzState.timerInterval = setInterval(tickTimer, 100);
    }
  }
}

// ══════════════════════════════════════════════════
// Modal اختيار الطالب
// ══════════════════════════════════════════════════

function openWhoModal() {
  renderWhoStudentsGrid();
  const overlay = document.getElementById('who-modal-overlay');
  overlay.style.display = 'flex';

  if (typeof anime !== 'undefined') {
    const { animate } = anime;
    animate('.who-modal', {
      translateY: [30, 0],
      opacity:    [0, 1],
      duration:   350,
      ease:       'outCubic',
    });
  }
}

function closeWhoModal() {
  document.getElementById('who-modal-overlay').style.display = 'none';
}

function renderWhoStudentsGrid() {
  const grid = document.getElementById('who-students-grid');
  grid.innerHTML = '';
  const activeEntries = Object.entries(currentQuizSession.studentScores)
    .filter(([id]) => !isStudentAbsent(id));

  if (activeEntries.length === 0) {
    grid.innerHTML = '<p style="text-align:center;padding:20px;color:var(--text-secondary);font-weight:700;">لا يوجد طلاب نشطون. أعِد تشغيل المسابقة.</p>';
    return;
  }

  activeEntries.forEach(([sid, s]) => {
    const btn = document.createElement('button');
    btn.type              = 'button';
    btn.className         = 'who-student-btn';
    btn.dataset.studentId = sid;
    btn.dataset.gender    = s.gender;
    btn.innerHTML = `
      <span class="who-student-name"></span>
      <span class="who-student-pts">⭐ ${s.points}</span>
    `;
    btn.querySelector('.who-student-name').textContent = s.name;
    btn.addEventListener('click', () => {
      setActiveStudent(sid);
      closeWhoModal();
    });
    grid.appendChild(btn);
  });

  if (typeof anime !== 'undefined') {
    const { animate, stagger } = anime;
    animate('.who-student-btn', {
      translateY: [10, 0],
      opacity:    [0, 1],
      duration:   300,
      delay:      stagger(20),
      ease:       'outCubic',
    });
  }
}

// ══════════════════════════════════════════════════
// خوارزمية الاختيار العشوائي العادل
// ══════════════════════════════════════════════════

function weightedRandomStudentId() {
  const ids = Object.keys(currentQuizSession.studentScores)
    .filter(id => !isStudentAbsent(id));
  if (ids.length === 0) return null;

  ids.forEach(id => {
    if (typeof currentQuizSession.studentSelectionWeights[id] !== 'number') {
      currentQuizSession.studentSelectionWeights[id] = 1.0;
    }
  });

  let total = 0;
  ids.forEach(id => total += currentQuizSession.studentSelectionWeights[id]);
  let r = Math.random() * total;
  for (const id of ids) {
    r -= currentQuizSession.studentSelectionWeights[id];
    if (r <= 0) return id;
  }
  return ids[ids.length - 1];
}

function updateWeightsAfterSelection(selectedId) {
  const w = currentQuizSession.studentSelectionWeights;
  Object.keys(w).forEach(id => {
    if (id === selectedId) {
      w[id] = Math.max(w[id] * 0.45, 0.05);
    } else {
      w[id] = Math.min(w[id] + 0.08, 2.5);
    }
  });
}

function setActiveStudent(studentId) {
  qzState.activeStudentId = studentId;
  updateWeightsAfterSelection(studentId);

  const s = currentQuizSession.studentScores[studentId];

  // الشريط العلوي
  document.getElementById('qz-active-student').textContent = s.name;
  document.getElementById('qz-active-score').textContent   = `⭐ ${s.points}`;

  // اللوحة الجانبية
  document.querySelectorAll('.qz-sb-row').forEach(r => r.classList.remove('active'));
  document.querySelector(`.qz-sb-row[data-student-id="${studentId}"]`)?.classList.add('active');

  // شاشة ready (إن كنّا فيها)
  if (qzState.inReadyPhase) {
    const sel = document.getElementById('ready-selected');
    sel.style.display = '';
    document.getElementById('ready-selected-name').textContent = s.name;
    document.getElementById('ready-show-btn').disabled         = false;
    document.getElementById('ready-absent-btn').disabled       = false;

    if (typeof anime !== 'undefined') {
      const { animate } = anime;
      animate('#ready-selected', {
        scale:   [0.85, 1.05, 1],
        opacity: [0.4, 1],
        duration: 450,
        ease:    'outBack',
      });
    }
  }
}

// ══════════════════════════════════════════════════
// العجلة
// ══════════════════════════════════════════════════

function openWheelModal() {
  const overlay  = document.getElementById('wheel-modal-overlay');
  const statusEl = document.getElementById('slot-status');
  const resultEl = document.getElementById('slot-result');

  resultEl.style.display = 'none';
  statusEl.style.display = '';
  statusEl.textContent   = 'الأسماء تستدير…';

  buildSlotStrip();
  overlay.style.display = 'flex';
  if (typeof AudioEngine !== 'undefined') AudioEngine.playSlotSpin();

  const winnerId = weightedRandomStudentId();
  if (!winnerId) return;

  setTimeout(() => spinSlotToStudent(winnerId), 250);
}

function closeWheelModal() {
  document.getElementById('wheel-modal-overlay').style.display = 'none';
  const strip = document.getElementById('slot-strip');
  if (strip) {
    strip.style.transition = 'none';
    strip.style.transform  = 'translateY(0)';
    document.querySelectorAll('.slot-row.landed').forEach(r => r.classList.remove('landed'));
  }
}

// ══════════════════════════════════════════════════
// سلوت ماشين عمودي
// ══════════════════════════════════════════════════

const SLOT_REPEATS     = 5;
const SLOT_ROW_HEIGHT  = 64;
const SLOT_TURNS       = 3;
const SLOT_DURATION    = 3500;

function buildSlotStrip() {
  const strip = document.getElementById('slot-strip');
  strip.innerHTML        = '';
  strip.style.transition = 'none';
  strip.style.transform  = 'translateY(0)';

  const ids = Object.keys(currentQuizSession.studentScores)
    .filter(id => !isStudentAbsent(id));
  if (!ids.length) return;

  for (let r = 0; r < SLOT_REPEATS; r++) {
    ids.forEach((id, idx) => {
      const s   = currentQuizSession.studentScores[id];
      const row = document.createElement('div');
      row.className           = 'slot-row';
      row.dataset.studentId   = id;
      row.dataset.tone        = (idx % 4).toString();
      row.textContent         = s.name;
      strip.appendChild(row);
    });
  }
}

function spinSlotToStudent(studentId) {
  const strip = document.getElementById('slot-strip');
  const win   = document.getElementById('slot-window');
  const ids   = Object.keys(currentQuizSession.studentScores)
    .filter(id => !isStudentAbsent(id));
  const n     = ids.length;
  if (!n) return;

  const idx = ids.indexOf(studentId);
  if (idx < 0) return;

  const winH         = win.offsetHeight;
  const middleOffset = (winH - SLOT_ROW_HEIGHT) / 2;
  const fullCycle    = n * SLOT_ROW_HEIGHT;
  const targetOffset = (SLOT_TURNS * fullCycle) + (idx * SLOT_ROW_HEIGHT);
  const finalY       = -(targetOffset - middleOffset);

  strip.style.transition = 'none';
  strip.style.transform  = 'translateY(0)';
  void strip.getBoundingClientRect();

  strip.style.transition = `transform ${SLOT_DURATION}ms cubic-bezier(0.15, 0.85, 0.25, 1)`;
  strip.style.transform  = `translateY(${finalY}px)`;

  setTimeout(() => {
    highlightLandedRow(studentId);
    if (typeof AudioEngine !== 'undefined') AudioEngine.playSlotDing();

    const statusEl = document.getElementById('slot-status');
    const resultEl = document.getElementById('slot-result');
    const nameEl   = document.getElementById('slot-result-name');

    statusEl.style.display = 'none';
    nameEl.textContent     = currentQuizSession.studentScores[studentId].name;
    resultEl.style.display = '';

    if (typeof anime !== 'undefined') {
      const { animate } = anime;
      animate('#slot-result', {
        scale:    [0.85, 1.05, 1],
        opacity:  [0, 1],
        duration: 500,
        ease:     'outBack',
      });
    }

    document.getElementById('btn-slot-confirm').onclick = () => {
      setActiveStudent(studentId);
      closeWheelModal();
    };
  }, SLOT_DURATION + 150);
}

function highlightLandedRow(studentId) {
  document.querySelectorAll(`.slot-row[data-student-id="${studentId}"]`)
    .forEach(r => r.classList.add('landed'));
}

function markSlotResultAsAbsentAndRespin() {
  const nameEl      = document.getElementById('slot-result-name');
  const currentName = nameEl?.textContent?.trim();
  if (!currentName) return;

  let absentId = null;
  Object.entries(currentQuizSession.studentScores).forEach(([id, s]) => {
    if (s.name === currentName && !isStudentAbsent(id)) absentId = id;
  });
  if (!absentId) { closeWheelModal(); return; }

  currentQuizSession.absentStudentIds.add(absentId);
  delete currentQuizSession.studentSelectionWeights[absentId];
  renderScoreboard();
  if (typeof persistCurrentSession === 'function') persistCurrentSession();

  const remaining = Object.keys(currentQuizSession.studentScores)
    .filter(id => !isStudentAbsent(id));
  if (remaining.length === 0) {
    alert('جميع الطلاب الآن غائبون. لا يمكن إجراء القرعة.');
    closeWheelModal();
    return;
  }

  const statusEl = document.getElementById('slot-status');
  const resultEl = document.getElementById('slot-result');
  resultEl.style.display = 'none';
  statusEl.style.display = '';
  statusEl.textContent   = `🚫 تم استبعاد ${currentName}. القرعة من جديد…`;

  buildSlotStrip();

  const winnerId = weightedRandomStudentId();
  if (!winnerId) { closeWheelModal(); return; }
  setTimeout(() => spinSlotToStudent(winnerId), 600);
}

// ══════════════════════════════════════════════════
// لوحة النقاط الجانبية
// ══════════════════════════════════════════════════

function renderScoreboard() {
  const list = document.getElementById('qz-sb-list');
  if (!list) return;
  list.innerHTML = '';

  const totalQuestions = currentQuizSession.questions.length;
  const currentQIdx = currentQuizSession.currentQuestionIndex;

  const sorted = Object.entries(currentQuizSession.studentScores)
    .filter(([id]) => !isStudentAbsent(id))
    .map(([id, s]) => ({ id, ...s }))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return (a.attemptsUsed || 0) - (b.attemptsUsed || 0);
    });

  sorted.forEach((s, i) => {
    const row = document.createElement('li');
    row.className = 'qz-sb-row';
    row.dataset.studentId = s.id;
    if (i === 0) row.classList.add('rank-1');
    else if (i === 1) row.classList.add('rank-2');
    else if (i === 2) row.classList.add('rank-3');
    if (s.id === qzState.activeStudentId) row.classList.add('active');

    const historyMap = buildAnswerHistoryMap(s.history || [], totalQuestions);
    const dotsHtml = renderHistoryDots(historyMap, currentQIdx, s.id);

    row.innerHTML = `
      <div class="qz-sb-main">
        <span class="qz-sb-rank">${i + 1}</span>
        <span class="qz-sb-name"></span>
        <span class="qz-sb-pts">⭐ ${s.points}</span>
      </div>
      <div class="qz-sb-history">${dotsHtml}</div>
    `;
    row.querySelector('.qz-sb-name').textContent = s.name;
    list.appendChild(row);
  });

  const absentCount = currentQuizSession.absentStudentIds?.size || 0;
  if (absentCount > 0) {
    const note = document.createElement('div');
    note.className = 'qz-sb-absent-note';
    note.innerHTML = `🚫 الغائبون في هذه المسابقة: <strong>${absentCount}</strong>`;
    list.appendChild(note);
  }
}

function buildAnswerHistoryMap(history, totalQuestions) {
  const map = new Array(totalQuestions).fill(null);
  history.forEach(h => {
    if (typeof h.questionIndex !== 'number') return;
    if (h.questionIndex < 0 || h.questionIndex >= totalQuestions) return;
    map[h.questionIndex] = {
      gotCorrect: h.gotCorrect,
      attempt: h.attemptUsed,
      points: h.pointsEarned,
      skipped: h.skipped || false,
      timeUp: h.timeUp || false
    };
  });
  return map;
}

function renderHistoryDots(historyMap, currentQIdx, studentId) {
  return historyMap.map((entry, idx) => {
    let cls = 'sb-dot';
    let title = `السؤال ${idx + 1}`;

    if (entry === null) {
      cls += ' sb-dot-empty';
      title += ': لم يُسأل';
    } else if (entry.gotCorrect) {
      if (entry.attempt === 1) cls += ' sb-dot-correct-1';
      else if (entry.attempt === 2) cls += ' sb-dot-correct-2';
      else cls += ' sb-dot-correct-3';
      title += `: ✓ من المحاولة ${entry.attempt} (${entry.points} نقطة)`;
    } else if (entry.skipped) {
      cls += ' sb-dot-skipped';
      title += ': تم التخطّي';
    } else if (entry.timeUp) {
      cls += ' sb-dot-timeup';
      title += ': انتهى الوقت';
    } else {
      cls += ' sb-dot-wrong';
      title += ': ✗ جميع المحاولات';
    }

    if (idx === currentQIdx && studentId === qzState.activeStudentId) {
      cls += ' sb-dot-current';
    }

    return `<span class="${cls}" title="${title}"></span>`;
  }).join('');
}

function toggleScoreboard() {
  const sb   = document.getElementById('qz-scoreboard');
  const icon = document.querySelector('.qz-sb-toggle-icon');
  sb.classList.toggle('collapsed');
  if (icon) icon.textContent = sb.classList.contains('collapsed') ? '»' : '«';
}

// ══════════════════════════════════════════════════
// عدّاد الوقت
// ══════════════════════════════════════════════════

function startTimerIfNeeded() {
  const limit = currentQuizSession.timePerQuestion || 0;
  const bar   = document.getElementById('qz-timer-bar');
  if (limit <= 0) {
    if (bar) bar.style.display = 'none';
    return;
  }
  if (bar) bar.style.display = '';
  qzState.timeRemaining = limit;
  qzState.timeStartedAt = Date.now();
  qzState.lastTickSec   = -1;
  updateTimerVisual();
  qzState.timerInterval = setInterval(tickTimer, 100);
}

function tickTimer() {
  if (qzState.isAnswered || qzState.isTransitioning) return;
  const limit = currentQuizSession.timePerQuestion;
  const elapsed = (Date.now() - qzState.timeStartedAt) / 1000;
  qzState.timeRemaining = Math.max(0, limit - elapsed);
  updateTimerVisual();

  // tick صوتي في آخر 5 ثوانٍ (مرّة واحدة لكل ثانية)
  if (qzState.timeRemaining > 0 && qzState.timeRemaining <= 5) {
    const sec = Math.ceil(qzState.timeRemaining);
    if (sec !== qzState.lastTickSec) {
      qzState.lastTickSec = sec;
      if (typeof AudioEngine !== 'undefined') AudioEngine.playTick();
    }
  }

  if (qzState.timeRemaining <= 0) onTimeUp();
}

function updateTimerVisual() {
  const limit = currentQuizSession.timePerQuestion;
  const fill  = document.getElementById('qz-timer-fill');
  const label = document.getElementById('qz-timer-label');
  const bar   = document.getElementById('qz-timer-bar');
  if (!fill || !label || !bar) return;

  const pct = (qzState.timeRemaining / limit) * 100;
  fill.style.width = `${pct}%`;

  bar.classList.remove('warn', 'danger');
  if      (pct < 10) bar.classList.add('danger');
  else if (pct < 30) bar.classList.add('warn');

  label.textContent = `⏱️ ${Math.ceil(qzState.timeRemaining)} ثانية`;
}

function stopTimer() {
  if (qzState.timerInterval) {
    clearInterval(qzState.timerInterval);
    qzState.timerInterval = null;
  }
}

function onTimeUp() {
  stopTimer();
  if (qzState.isAnswered) return;
  qzState.isAnswered     = true;
  qzState.attemptsUsed   = Math.max(qzState.attemptsUsed, currentQuizSession.attemptsPerQuestion);
  qzState.attemptsRemaining = 0;
  renderAttemptsStars();
  revealCorrectChoice();
  if (typeof AudioEngine !== 'undefined') AudioEngine.playTimeUp();
  awardPointsToActiveStudent(0, false, { timeUp: true });

  const student = currentQuizSession.studentScores[qzState.activeStudentId];
  showReinforcementToast({
    message:  `⏰ انتهى الوقت يا ${getFirstName(student?.name || '—')}، الفرصة قادمة 🌱`,
    emoji:    '⏰',
    points:   0,
    positive: false,
  });

  qzState.isTransitioning = true;
  setTimeout(goToNextQuestion, 3000);
}

// ══════════════════════════════════════════════════
// ميزة "الطالب غائب"
// ══════════════════════════════════════════════════

function isStudentAbsent(studentId) {
  return currentQuizSession?.absentStudentIds?.has(studentId);
}

function getActiveStudents() {
  return Object.entries(currentQuizSession.studentScores)
    .filter(([id]) => !isStudentAbsent(id));
}

function markActiveStudentAsAbsent() {
  if (!qzState.activeStudentId) return;
  const sid     = qzState.activeStudentId;
  const student = currentQuizSession.studentScores[sid];
  if (!confirm(`تأكيد: تعليم "${student.name}" كغائب في هذه المسابقة؟\n(سيعود تلقائياً في المسابقات القادمة)`)) {
    return;
  }

  currentQuizSession.absentStudentIds.add(sid);

  // أزل وزنه من خوارزمية الاختيار
  delete currentQuizSession.studentSelectionWeights[sid];

  // أعد رسم اللوحة الجانبية بدونه
  renderScoreboard();
  if (typeof persistCurrentSession === 'function') persistCurrentSession();

  // ارجع لشاشة ready لاختيار طالب آخر
  qzState.activeStudentId = null;
  showReadyOverlay();

  showReinforcementToast({
    message:  `🚫 تم تعليم ${getFirstName(student.name)} كغائب في هذه المسابقة فقط`,
    emoji:    '🚫',
    points:   0,
    positive: false,
  });
}

// ─── ربط الأحداث ────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-skip-question')
    ?.addEventListener('click', skipCurrentQuestion);
  document.getElementById('btn-end-quiz')
    ?.addEventListener('click', confirmEndQuiz);

  // زر "من سيجيب"
  document.getElementById('btn-who-answers')
    ?.addEventListener('click', openWhoModal);
  document.getElementById('who-modal-close')
    ?.addEventListener('click', closeWhoModal);
  document.getElementById('who-modal-overlay')
    ?.addEventListener('click', e => {
      if (e.target.id === 'who-modal-overlay') closeWhoModal();
    });

  // العجلة
  document.getElementById('btn-open-wheel')
    ?.addEventListener('click', () => {
      closeWhoModal();
      setTimeout(openWheelModal, 200);
    });
  document.getElementById('wheel-modal-close')
    ?.addEventListener('click', closeWheelModal);

  // طيّ لوحة النقاط
  document.getElementById('qz-sb-toggle')
    ?.addEventListener('click', toggleScoreboard);

  // شاشة ready
  document.getElementById('ready-who-btn')
    ?.addEventListener('click', openWhoModal);
  document.getElementById('ready-show-btn')
    ?.addEventListener('click', actuallyShowQuestion);
  document.getElementById('ready-absent-btn')
    ?.addEventListener('click', markActiveStudentAsAbsent);

  // زر "الطالب غائب" في modal القرعة
  document.getElementById('btn-slot-absent')
    ?.addEventListener('click', markSlotResultAsAbsentAndRespin);

  // modal إنهاء المسابقة
  document.getElementById('end-quiz-modal-close')?.addEventListener('click', continueQuiz);
  document.getElementById('btn-eq-finish')?.addEventListener('click', endQuizNow);
  document.getElementById('btn-eq-continue')?.addEventListener('click', continueQuiz);
  document.getElementById('end-quiz-modal-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'end-quiz-modal-overlay') continueQuiz();
  });
});
