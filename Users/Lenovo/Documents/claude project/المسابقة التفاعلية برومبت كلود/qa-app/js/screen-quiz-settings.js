/* ═══════════════════════════════════════════════════
   screen-quiz-settings.js — شاشة إعدادات المسابقة
   ═══════════════════════════════════════════════════ */

let currentQuizSession = null;

const QS_DEFAULTS = {
  questionsCount:      5,
  attemptsPerQuestion: 2,
  shuffleChoices:      true,
};

// ─── فتح الشاشة ─────────────────────────────────

function openQuizSettingsScreen() {
  if (!currentUnitContext || !currentSubjectContext || !currentClassContext) {
    alert('سياق غير مكتمل.');
    return;
  }

  currentQuizSession = {
    classId:               currentClassContext.id,
    subjectId:             currentSubjectContext.id,
    unitContext:           { ...currentUnitContext },
    questionsCount:        QS_DEFAULTS.questionsCount,
    attemptsPerQuestion:   QS_DEFAULTS.attemptsPerQuestion,
    shuffleChoices:        QS_DEFAULTS.shuffleChoices,
    timePerQuestion:       0,
    questions:             [],
    currentQuestionIndex:  0,
    studentScores:         {},
    studentSelectionWeights: {},
    _previewQuestions:     null,
  };

  // pill السياق
  const pill = document.getElementById('qs-context-pill');
  pill.classList.remove('gender-boys', 'gender-girls');
  pill.classList.add(`gender-${currentClassContext.gender}`);
  document.getElementById('qs-ctx-class').textContent       = currentClassContext.label;
  document.getElementById('qs-ctx-subject-icon').textContent = currentSubjectContext.icon;
  document.getElementById('qs-ctx-subject').textContent      = currentSubjectContext.name;
  document.getElementById('qs-ctx-unit').textContent         = currentUnitContext.unitName;

  // عدد الأسئلة المتاحة
  const totalAvailable = getTotalAvailableQuestions();
  document.getElementById('qs-total-badge').textContent = `(من أصل ${totalAvailable})`;

  // إعادة ضبط الشرائح
  resetChips('qs-count-chips',    String(QS_DEFAULTS.questionsCount));
  resetChips('qs-attempts-chips', String(QS_DEFAULTS.attemptsPerQuestion));

  // تحديث تفعيل شرائح العدد بناءً على المتاح
  updateCountChipsAvailability(totalAvailable);

  // toggle الخلط
  document.getElementById('qs-shuffle-toggle').checked = QS_DEFAULTS.shuffleChoices;
  updateToggleText(QS_DEFAULTS.shuffleChoices);

  // اضبط chips الوقت للقيمة الافتراضية 0
  document.querySelectorAll('#qs-time-chips .qs-chip').forEach(ch => {
    ch.classList.toggle('selected', parseInt(ch.dataset.time) === 0);
  });

  // معلومات النقاط
  updatePointsInfo(QS_DEFAULTS.attemptsPerQuestion);

  // عداد المراجعة
  updateReviewCount();

  showScreen('screen-quiz-settings');

  if (typeof anime !== 'undefined') {
    const { animate } = anime;

    animate('.qs-page-title', {
      translateY: [-20, 0],
      opacity:    [0, 1],
      duration:   500,
      ease:       'outCubic',
    });

    animate('.qs-card', {
      translateY: [30, 0],
      opacity:    [0, 1],
      duration:   600,
      delay:      100,
      ease:       'outCubic',
    });

    animate('.qs-start-wrap', {
      translateY: [20, 0],
      opacity:    [0, 1],
      duration:   600,
      delay:      300,
      ease:       'outCubic',
    });
  } else {
    document.querySelector('.qs-page-title').style.opacity  = '1';
    document.querySelector('.qs-card').style.opacity         = '1';
    document.querySelector('.qs-start-wrap').style.opacity   = '1';
  }
}

// ─── إجمالي الأسئلة المتاحة ──────────────────────

function getTotalAvailableQuestions() {
  if (!currentUnitContext || !currentSubjectContext) return 0;
  if (currentUnitContext.mode === 'comprehensive') {
    return getSubjectTotalQuestions(currentSubjectContext.id);
  }
  return getUnitQuestionsCount(currentSubjectContext.id, currentUnitContext.unitId);
}

// ─── إدارة الشرائح ──────────────────────────────

function resetChips(containerId, activeValue) {
  document.querySelectorAll(`#${containerId} .qs-chip`).forEach(chip => {
    chip.classList.toggle('active', chip.dataset.value === activeValue);
  });
}

function updateCountChipsAvailability(total) {
  const container = document.getElementById('qs-count-chips');
  if (!container) return;

  let hasActive = false;

  container.querySelectorAll('.qs-chip').forEach(chip => {
    const val    = chip.dataset.value;
    const isAll  = val === 'all';
    const needed = isAll ? 0 : parseInt(val, 10);
    const tooFew = !isAll && needed > total;

    chip.disabled = tooFew;
    chip.classList.toggle('disabled', tooFew);

    if (chip.classList.contains('active') && tooFew) {
      chip.classList.remove('active');
    } else if (chip.classList.contains('active') && !tooFew) {
      hasActive = true;
    }
  });

  // إن لم يعد هناك chip نشط — نختار أول chip متاح
  if (!hasActive) {
    const first = container.querySelector('.qs-chip:not([disabled])');
    if (first) {
      first.classList.add('active');
      if (currentQuizSession) {
        currentQuizSession.questionsCount =
          first.dataset.value === 'all' ? total : parseInt(first.dataset.value, 10);
      }
    }
  }

  updateReviewCount();
}

// ─── تحديث معلومات النقاط ───────────────────────

function updatePointsInfo(attempts) {
  const el = document.getElementById('qs-points-info');
  if (!el) return;

  const lines = {
    1: '✅ 10 نقاط من المحاولة الأولى',
    2: '✅ 10 نقاط من الأولى  •  ⚡ 5 نقاط من الثانية',
    3: '✅ 10 نقاط من الأولى  •  ⚡ 5 من الثانية  •  ⚠️ 3 نقاط من الثالثة',
  };
  el.textContent = lines[attempts] || '';
}

// ─── تحديث عداد زر المراجعة ─────────────────────

function updateReviewCount() {
  const total      = getTotalAvailableQuestions();
  const activeChip = document.querySelector('#qs-count-chips .qs-chip.active');
  let   count      = QS_DEFAULTS.questionsCount;

  if (activeChip) {
    count = activeChip.dataset.value === 'all'
      ? total
      : parseInt(activeChip.dataset.value, 10);
    count = Math.min(count, total);
  }

  if (currentQuizSession) currentQuizSession.questionsCount = count;

  let word;
  if      (count === 1)  word = 'سؤال واحد';
  else if (count === 2)  word = 'سؤالان';
  else if (count <= 10)  word = `${count} أسئلة`;
  else                   word = `${count} سؤالاً`;

  const el = document.getElementById('qs-review-count');
  if (el) el.textContent = `(${word})`;
}

// ─── تحديث نص Toggle ────────────────────────────

function updateToggleText(checked) {
  const el = document.getElementById('qs-toggle-text');
  if (el) el.textContent = checked ? 'مفعّل' : 'معطَّل';
}

// ─── خلط مصفوفة (Fisher-Yates) ──────────────────

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j      = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// ─── اختيار أسئلة الجلسة ────────────────────────

function pickQuestionsForSession(wantedCount) {
  // إن لم يُمرَّر عدد، نقرأه من الجلسة الحالية
  const total  = getTotalAvailableQuestions();
  const wanted = (wantedCount !== undefined)
    ? Math.min(wantedCount, total)
    : Math.min(currentQuizSession?.questionsCount ?? QS_DEFAULTS.questionsCount, total);

  const bank    = loadQuestionsBank();
  const subject = currentSubjectContext;
  const unit    = currentUnitContext;

  if (unit.mode === 'unit') {
    const pool = Array.isArray(bank[subject.id]?.units?.[unit.unitId]?.questions)
      ? [...bank[subject.id].units[unit.unitId].questions]
      : [];
    shuffleArray(pool);
    return pool.slice(0, Math.min(wanted, pool.length));
  }

  // شاملة — توزيع متوازن بين الوحدات
  const unitsList = getUnitsForSubject(subject.id);
  const perUnit   = Math.floor(wanted / unitsList.length);
  const remainder = wanted % unitsList.length;

  const picked    = [];
  const leftovers = [];

  unitsList.forEach((u, idx) => {
    const pool = Array.isArray(u.questions) ? [...u.questions] : [];
    shuffleArray(pool);
    const alloc = perUnit + (idx < remainder ? 1 : 0);
    picked.push(...pool.slice(0, alloc));
    leftovers.push(...pool.slice(alloc));
  });

  if (picked.length < wanted) {
    shuffleArray(leftovers);
    picked.push(...leftovers.slice(0, wanted - picked.length));
  }

  shuffleArray(picked);
  return picked.slice(0, wanted);
}

// ─── خلط خيارات سؤال واحد ───────────────────────

function shuffleChoicesInQuestion(q) {
  const copy        = { ...q, choices: [...q.choices] };
  const correctText = copy.choices[copy.correctIndex];
  shuffleArray(copy.choices);
  copy.correctIndex = copy.choices.indexOf(correctText);
  return copy;
}

// ─── بدء المسابقة ────────────────────────────────

function startQuiz() {
  let questions = pickQuestionsForSession();

  if (currentQuizSession.shuffleChoices) {
    questions = questions.map(shuffleChoicesInQuestion);
  }

  if (questions.length === 0) {
    alert('لا توجد أسئلة كافية لبدء المسابقة.');
    return;
  }

  currentQuizSession.questions            = questions;
  currentQuizSession.currentQuestionIndex = 0;
  currentQuizSession.studentScores        = {};

  const studentsAll    = loadStudents();
  const classStudents  = studentsAll[currentClassContext.id] || [];

  if (classStudents.length === 0) {
    alert('لا يوجد طلاب في هذا الفصل. أضيفي الطلاب أولاً.');
    return;
  }

  classStudents.forEach(s => {
    currentQuizSession.studentScores[s.id] = {
      name:         s.name,
      gender:       currentClassContext.gender,
      points:       0,
      correctCount: 0,
      attemptsUsed: 0,
      history:      [],
    };
    currentQuizSession.studentSelectionWeights[s.id] = 1.0;
  });

  if (typeof openQuestionScreen === 'function') {
    openQuestionScreen();
  } else {
    alert('شاشة السؤال غير محمَّلة.');
  }
}

// ─── مودال المراجعة ──────────────────────────────

function openReviewModal() {
  if (!currentQuizSession) return;

  const total  = getTotalAvailableQuestions();
  const wanted = currentQuizSession.questionsCount || QS_DEFAULTS.questionsCount;
  const count  = Math.min(wanted, total);

  // إن لم تكن هناك قائمة معاينة، نبني واحدة الآن
  if (!currentQuizSession._previewQuestions) {
    let preview = pickQuestionsForSession(count);
    if (currentQuizSession.shuffleChoices) {
      preview = preview.map(q => shuffleChoicesInQuestion(q));
    }
    currentQuizSession._previewQuestions = preview;
  }

  renderReviewList(currentQuizSession._previewQuestions);

  const overlay = document.getElementById('review-modal-overlay');
  overlay.style.display = 'flex';

  if (typeof anime !== 'undefined') {
    const { animate } = anime;
    animate('#review-modal-overlay .modal-box', {
      scale:   [0.88, 1],
      opacity: [0, 1],
      duration: 320,
      ease:    'outCubic',
    });
  }
}

function closeReviewModal() {
  document.getElementById('review-modal-overlay').style.display = 'none';
}

function renderReviewList(questions) {
  const list = document.getElementById('rm-questions-list');
  if (!list) return;
  list.innerHTML = '';

  if (!questions || questions.length === 0) {
    const empty       = document.createElement('p');
    empty.className   = 'rm-empty';
    empty.textContent = 'لا توجد أسئلة — جميعها مُحذفة من القائمة.';
    list.appendChild(empty);
    return;
  }

  questions.forEach((q, idx) => {
    const item = document.createElement('div');
    item.className = 'rm-question-item';

    // رأس السؤال
    const header = document.createElement('div');
    header.className = 'rm-question-header';

    const numEl = document.createElement('span');
    numEl.className   = 'rm-question-num';
    numEl.textContent = idx + 1;

    const textEl = document.createElement('span');
    textEl.className   = 'rm-question-text';
    textEl.textContent = q.text;

    const delBtn = document.createElement('button');
    delBtn.type       = 'button';
    delBtn.className  = 'rm-delete-btn';
    delBtn.textContent = '✕';
    delBtn.title      = 'حذف من القائمة (لا يؤثر على بنك الأسئلة)';
    delBtn.addEventListener('click', () => deleteFromPreview(idx));

    header.appendChild(numEl);
    header.appendChild(textEl);
    header.appendChild(delBtn);

    // الخيارات
    const choicesEl = document.createElement('div');
    choicesEl.className = 'rm-choices';

    (q.choices || []).forEach((choice, ci) => {
      const span       = document.createElement('span');
      span.className   = `rm-choice${ci === q.correctIndex ? ' correct' : ''}`;
      span.textContent = choice;
      choicesEl.appendChild(span);
    });

    item.appendChild(header);
    item.appendChild(choicesEl);
    list.appendChild(item);
  });
}

function deleteFromPreview(idx) {
  if (!currentQuizSession?._previewQuestions) return;
  currentQuizSession._previewQuestions.splice(idx, 1);
  renderReviewList(currentQuizSession._previewQuestions);
}

// ─── ربط chips الوقت ────────────────────────────

function setupTimeChips() {
  document.querySelectorAll('#qs-time-chips .qs-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const n = parseInt(chip.dataset.time);
      if (currentQuizSession) currentQuizSession.timePerQuestion = n;
      document.querySelectorAll('#qs-time-chips .qs-chip').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
    });
  });
}

// ─── الرجوع للوحدات ──────────────────────────────

function backToUnits() {
  if (typeof openUnitsScreen === 'function') {
    openUnitsScreen(currentSubjectContext);
  } else {
    showScreen('screen-units');
  }
}

// ─── ربط الأحداث ────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {

  document.getElementById('btn-back-to-units')
    ?.addEventListener('click', backToUnits);

  // شرائح عدد الأسئلة
  document.getElementById('qs-count-chips')?.addEventListener('click', e => {
    const chip = e.target.closest('.qs-chip');
    if (!chip || chip.disabled) return;
    document.querySelectorAll('#qs-count-chips .qs-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    // إعادة تعيين المعاينة لأن العدد تغيّر
    if (currentQuizSession) currentQuizSession._previewQuestions = null;
    updateReviewCount();
  });

  // شرائح المحاولات
  document.getElementById('qs-attempts-chips')?.addEventListener('click', e => {
    const chip = e.target.closest('.qs-chip');
    if (!chip) return;
    document.querySelectorAll('#qs-attempts-chips .qs-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    const val = parseInt(chip.dataset.value, 10);
    if (currentQuizSession) currentQuizSession.attemptsPerQuestion = val;
    updatePointsInfo(val);
  });

  // Toggle الخلط
  document.getElementById('qs-shuffle-toggle')?.addEventListener('change', e => {
    const checked = e.target.checked;
    if (currentQuizSession) {
      currentQuizSession.shuffleChoices      = checked;
      currentQuizSession._previewQuestions   = null;
    }
    updateToggleText(checked);
  });

  // زر مراجعة الأسئلة
  document.getElementById('btn-review-questions')
    ?.addEventListener('click', openReviewModal);

  // إغلاق المودال
  document.getElementById('btn-close-review-modal')
    ?.addEventListener('click', closeReviewModal);
  document.getElementById('btn-close-review-modal-footer')
    ?.addEventListener('click', closeReviewModal);
  document.getElementById('review-modal-overlay')
    ?.addEventListener('click', e => {
      if (e.target.id === 'review-modal-overlay') closeReviewModal();
    });

  // chips الوقت
  setupTimeChips();

  // زر بدء المسابقة
  document.getElementById('btn-start-quiz')
    ?.addEventListener('click', startQuiz);
});
