// ============== حفظ واستعادة جلسة المسابقة ==============

const ACTIVE_SESSION_KEY = 'qa_app_active_quiz_session';
const SESSION_VERSION = 1;
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 ساعة

// ─── حفظ الجلسة الحالية ───
function persistCurrentSession() {
  if (!currentQuizSession || !currentClassContext || !currentSubjectContext) return;
  if (!currentQuizSession.questions || currentQuizSession.questions.length === 0) return;

  try {
    // حوّل Set لـ Array للتسلسل
    const absentArr = currentQuizSession.absentStudentIds
      ? Array.from(currentQuizSession.absentStudentIds)
      : [];

    const payload = {
      savedAt: Date.now(),
      version: SESSION_VERSION,
      context: {
        classId: currentClassContext.id,
        classLabel: currentClassContext.label,
        classGender: currentClassContext.gender,
        subjectId: currentSubjectContext.id,
        subjectName: currentSubjectContext.name,
        subjectIcon: currentSubjectContext.icon,
        subjectColor: currentSubjectContext.color,
        subjectColorDark: currentSubjectContext.colorDark,
        unitContext: currentUnitContext ? { ...currentUnitContext } : null
      },
      session: {
        questionsCount: currentQuizSession.questionsCount,
        attemptsPerQuestion: currentQuizSession.attemptsPerQuestion,
        shuffleChoices: currentQuizSession.shuffleChoices,
        timePerQuestion: currentQuizSession.timePerQuestion || 0,
        questions: currentQuizSession.questions,
        currentQuestionIndex: currentQuizSession.currentQuestionIndex,
        studentScores: currentQuizSession.studentScores,
        studentSelectionWeights: currentQuizSession.studentSelectionWeights,
        absentStudentIds: absentArr
      }
    };
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn('Failed to persist session:', e);
  }
}

// ─── مسح الجلسة المحفوظة ───
function clearPersistedSession() {
  try {
    localStorage.removeItem(ACTIVE_SESSION_KEY);
  } catch (e) {
    console.warn('Failed to clear session:', e);
  }
}

// ─── تحميل الجلسة المحفوظة وفحصها ───
function loadPersistedSession() {
  try {
    const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (!raw) return null;
    const payload = JSON.parse(raw);

    // فحص الإصدار
    if (payload.version !== SESSION_VERSION) {
      clearPersistedSession();
      return null;
    }

    // فحص العمر
    const age = Date.now() - (payload.savedAt || 0);
    if (age > SESSION_MAX_AGE_MS) {
      clearPersistedSession();
      return null;
    }

    // فحص أساسي للبنية
    if (!payload.context || !payload.session || !Array.isArray(payload.session.questions)) {
      clearPersistedSession();
      return null;
    }

    // فحص: هل المسابقة لم تنتهِ؟
    if (payload.session.currentQuestionIndex >= payload.session.questions.length) {
      clearPersistedSession();
      return null;
    }

    return payload;
  } catch (e) {
    console.warn('Failed to load persisted session:', e);
    clearPersistedSession();
    return null;
  }
}

// ─── استعادة الجلسة بالكامل ───
function restorePersistedSession(payload) {
  if (!payload) return false;

  // أعد بناء السياقات
  currentClassContext = {
    id: payload.context.classId,
    label: payload.context.classLabel,
    gender: payload.context.classGender
  };
  currentSubjectContext = {
    id: payload.context.subjectId,
    name: payload.context.subjectName,
    icon: payload.context.subjectIcon,
    color: payload.context.subjectColor,
    colorDark: payload.context.subjectColorDark
  };
  currentUnitContext = payload.context.unitContext;

  // أعد بناء الجلسة (Array → Set للغائبين)
  currentQuizSession = {
    classId: currentClassContext.id,
    subjectId: currentSubjectContext.id,
    unitContext: currentUnitContext,
    questionsCount: payload.session.questionsCount,
    attemptsPerQuestion: payload.session.attemptsPerQuestion,
    shuffleChoices: payload.session.shuffleChoices,
    timePerQuestion: payload.session.timePerQuestion || 0,
    questions: payload.session.questions,
    currentQuestionIndex: payload.session.currentQuestionIndex,
    studentScores: payload.session.studentScores,
    studentSelectionWeights: payload.session.studentSelectionWeights || {},
    absentStudentIds: new Set(payload.session.absentStudentIds || [])
  };

  return true;
}

// ─── helper: وصف العمر الزمني ───
function describeAge(ms) {
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return 'قبل لحظات';
  const min = Math.floor(sec / 60);
  if (min < 60) return `قبل ${min} دقيقة${min === 1 ? '' : min === 2 ? 'تين' : ''}`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `قبل ${hr} ساعة${hr === 1 ? '' : hr === 2 ? 'تين' : ''}`;
  return 'قبل أكثر من يوم';
}

// ─── helper: وصف أعلى نقاط ───
function describeTopStudent(studentScores, absentArr) {
  const absent = new Set(absentArr || []);
  const entries = Object.entries(studentScores)
    .filter(([id]) => !absent.has(id))
    .map(([id, s]) => ({ id, ...s }));
  if (entries.length === 0) return null;
  entries.sort((a, b) => b.points - a.points);
  const top = entries[0];
  if (top.points === 0) return null;
  return `${top.name} — ${top.points} ${getRestorePointsWord(top.points)}`;
}

function getRestorePointsWord(n) {
  if (n === 1) return 'نقطة';
  if (n === 2) return 'نقطتان';
  if (n >= 3 && n <= 10) return 'نقاط';
  return 'نقطة';
}

// ─── حوار الاستعادة ───
function showRestoreDialog(payload) {
  const overlay = document.getElementById('restore-modal-overlay');
  if (!overlay) return;

  // املأ بيانات الحوار
  const ctx = payload.context;
  const sess = payload.session;
  const ageMs = Date.now() - payload.savedAt;

  document.getElementById('restore-date').textContent = describeAge(ageMs);
  document.getElementById('restore-class').textContent = ctx.classLabel || '—';
  document.getElementById('restore-subject').textContent =
    `${ctx.subjectIcon || ''} ${ctx.subjectName || ''}`.trim();
  document.getElementById('restore-unit').textContent =
    (ctx.unitContext?.mode === 'comprehensive')
      ? 'أسئلة شاملة'
      : (ctx.unitContext?.unitName || '—');
  document.getElementById('restore-progress').textContent =
    `السؤال ${(sess.currentQuestionIndex || 0) + 1} من ${sess.questions.length}`;

  const topDesc = describeTopStudent(sess.studentScores, sess.absentStudentIds);
  document.getElementById('restore-top').textContent = topDesc || '— لا توجد نقاط بعد —';

  overlay.style.display = 'flex';

  const { animate } = anime;
  animate('.restore-modal', {
    translateY: [30, 0],
    opacity: [0, 1],
    scale: [0.95, 1],
    duration: 400,
    ease: 'outCubic'
  });
}

function closeRestoreDialog() {
  document.getElementById('restore-modal-overlay').style.display = 'none';
}

// ─── الإجراءات ───
function acceptRestore() {
  const payload = loadPersistedSession();
  if (!payload) {
    closeRestoreDialog();
    return;
  }

  const ok = restorePersistedSession(payload);
  closeRestoreDialog();

  if (!ok) return;

  // افتح شاشة السؤال مباشرة من حيث توقّفت المسابقة
  if (typeof openQuestionScreen === 'function') {
    resumeQuestionScreenFromIndex();
  }
}

function declineRestore() {
  if (!confirm('سيُحذف تقدّم المسابقة المحفوظة نهائياً. متابعة؟')) return;
  clearPersistedSession();
  closeRestoreDialog();
}

// ─── استئناف شاشة السؤال من الفهرس الحالي (بدل تصفيره) ───
function resumeQuestionScreenFromIndex() {
  if (!currentQuizSession || !currentClassContext || !currentSubjectContext) return;

  // ضع معلومات السياق في الـ DOM
  const setup = (typeof loadSetup === 'function') ? loadSetup() : null;
  if (setup && typeof renderTopBar === 'function') {
    renderTopBar(setup);
  }

  document.getElementById('qz-ctx-subject-icon').textContent = currentSubjectContext.icon;
  document.getElementById('qz-ctx-subject').textContent = currentSubjectContext.name;
  document.getElementById('qz-ctx-unit').textContent =
    currentUnitContext.mode === 'comprehensive' ? 'أسئلة شاملة' : currentUnitContext.unitName;
  document.getElementById('qz-progress-total').textContent = currentQuizSession.questions.length;

  const section = document.getElementById('screen-question');
  section.style.setProperty('--current-subject-color', currentSubjectContext.color);
  section.style.setProperty('--current-subject-color-dark', currentSubjectContext.colorDark);

  // فعّل زر "من سيجيب"
  const whoBtn = document.getElementById('btn-who-answers');
  if (whoBtn) whoBtn.disabled = false;

  // ابنِ اللوحة الجانبية
  if (typeof renderScoreboard === 'function') renderScoreboard();

  // اعرض السؤال الحالي (دون تصفير الفهرس)
  if (typeof showCurrentQuestion === 'function') {
    showCurrentQuestion();
  }
  showScreen('screen-question');
}

// ─── التحقق عند بدء التطبيق ───
function checkForPersistedSessionOnStartup() {
  const payload = loadPersistedSession();
  if (!payload) return false;
  showRestoreDialog(payload);
  return true;
}

// ─── حفظ أخير عند إغلاق التبويب ───
window.addEventListener('beforeunload', () => {
  // احفظ فقط إن كنا في شاشة السؤال
  const active = document.querySelector('.screen.active');
  if (active && active.id === 'screen-question' && currentQuizSession) {
    try {
      persistCurrentSession();
    } catch (e) { /* تجاهل */ }
  }
});

// ─── ربط الأحداث ───
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-restore-accept')?.addEventListener('click', acceptRestore);
  document.getElementById('btn-restore-decline')?.addEventListener('click', declineRestore);

  // فحص الجلسة بعد تحميل كل شيء (تأخير بسيط لضمان تحميل بقية الـ JS)
  setTimeout(() => {
    checkForPersistedSessionOnStartup();
  }, 300);
});
