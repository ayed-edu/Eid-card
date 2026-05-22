// ============== اختصارات لوحة المفاتيح + تكبير/تصغير الخط ==============

const FONT_STORAGE_KEY = 'qa_app_font_scale';
const FONT_LEVELS = ['font-normal', 'font-large', 'font-xl'];

// ─── تكبير/تصغير الخط ───
function getFontLevel() {
  const stored = localStorage.getItem(FONT_STORAGE_KEY);
  const n = parseInt(stored);
  if (!isNaN(n) && n >= 0 && n < FONT_LEVELS.length) return n;
  return 0;
}

function setFontLevel(n) {
  n = Math.max(0, Math.min(FONT_LEVELS.length - 1, n));
  FONT_LEVELS.forEach(cls => document.body.classList.remove(cls));
  document.body.classList.add(FONT_LEVELS[n]);
  localStorage.setItem(FONT_STORAGE_KEY, String(n));
  flashFontFeedback(n);
}

function increaseFontSize() { setFontLevel(getFontLevel() + 1); }
function decreaseFontSize() { setFontLevel(getFontLevel() - 1); }
function resetFontSize()    { setFontLevel(0); }

function flashFontFeedback(level) {
  let el = document.getElementById('font-feedback');
  if (!el) {
    el = document.createElement('div');
    el.id = 'font-feedback';
    el.className = 'font-feedback';
    document.body.appendChild(el);
  }
  const labels = ['الخط: عادي', 'الخط: كبير', 'الخط: ضخم'];
  el.textContent = `🔤 ${labels[level]}`;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  clearTimeout(flashFontFeedback._t);
  flashFontFeedback._t = setTimeout(() => el.classList.remove('show'), 1500);
}

// تطبيق الخط المحفوظ عند بدء التطبيق
document.addEventListener('DOMContentLoaded', () => {
  const level = getFontLevel();
  FONT_LEVELS.forEach(cls => document.body.classList.remove(cls));
  document.body.classList.add(FONT_LEVELS[level]);
});

// ─── helpers ───
function isTypingInField() {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName?.toLowerCase();
  if (tag === 'input' || tag === 'textarea') return true;
  if (el.isContentEditable) return true;
  return false;
}

function isModalOpen() {
  return [
    'who-modal-overlay',
    'wheel-modal-overlay',
    'review-modal-overlay',
    'shortcuts-modal-overlay',
    'end-quiz-modal-overlay',
    'restore-modal-overlay',
    'reset-bank-modal-overlay'
  ].some(id => {
    const m = document.getElementById(id);
    return m && m.style.display !== 'none' && m.style.display !== '';
  });
}

function getActiveScreen() {
  const s = document.querySelector('.screen.active');
  return s?.id || null;
}

function isReadyPhaseVisible() {
  const r = document.getElementById('ready-overlay');
  return r && r.offsetParent !== null && r.style.display !== 'none';
}

// ─── modal الاختصارات ───
function openShortcutsModal() {
  const overlay = document.getElementById('shortcuts-modal-overlay');
  if (!overlay) return;
  overlay.style.display = 'flex';
  if (typeof anime !== 'undefined') {
    const { animate } = anime;
    animate('.shortcuts-modal', {
      translateY: [20, 0],
      opacity: [0, 1],
      duration: 300,
      ease: 'outCubic'
    });
  }
}

function closeShortcutsModal() {
  const overlay = document.getElementById('shortcuts-modal-overlay');
  if (overlay) overlay.style.display = 'none';
}

// ─── معالج لوحة المفاتيح ───
function handleKeyDown(e) {
  if (isTypingInField()) return;
  if (e.ctrlKey || e.altKey || e.metaKey) return;

  const key = e.key;
  const screen = getActiveScreen();

  // Esc — إغلاق أي modal
  if (key === 'Escape') {
    if (isModalOpen()) {
      // modal إنهاء المسابقة: يُعيد العدّاد عبر continueQuiz
      const endModal = document.getElementById('end-quiz-modal-overlay');
      if (endModal && endModal.style.display !== 'none' && endModal.style.display !== '') {
        if (typeof continueQuiz === 'function') {
          continueQuiz();
        } else {
          endModal.style.display = 'none';
        }
        e.preventDefault();
        return;
      }
      // باقي الـ modals: إغلاق بسيط
      ['who-modal-overlay', 'wheel-modal-overlay',
       'review-modal-overlay', 'shortcuts-modal-overlay',
       'reset-bank-modal-overlay'].forEach(id => {
        const m = document.getElementById(id);
        if (m && m.style.display !== 'none' && m.style.display !== '') {
          m.style.display = 'none';
        }
      });
      e.preventDefault();
    }
    return;
  }

  // ? — قائمة الاختصارات
  if (key === '?') {
    if (!isModalOpen()) {
      openShortcutsModal();
      e.preventDefault();
    }
    return;
  }

  // + / − / 0 — تكبير/تصغير/إعادة الخط
  if (key === '+' || key === '=') { increaseFontSize(); e.preventDefault(); return; }
  if (key === '-' || key === '_') { decreaseFontSize(); e.preventDefault(); return; }
  if (key === '0')                { resetFontSize();    e.preventDefault(); return; }

  // الاختصارات الخاصة بشاشة السؤال فقط
  if (screen !== 'screen-question') return;
  if (isModalOpen()) return;

  const inReady = isReadyPhaseVisible();

  // Space — من سيجيب
  if (key === ' ' || key === 'Spacebar') {
    if (typeof openWhoModal === 'function') { openWhoModal(); e.preventDefault(); }
    return;
  }

  // R — قرعة الأسماء مباشرة
  if (key === 'r' || key === 'R' || key === 'ر') {
    if (typeof openWheelModal === 'function') { openWheelModal(); e.preventDefault(); }
    return;
  }

  // في شاشة ready
  if (inReady) {
    if (key === 'Enter') {
      const btn = document.getElementById('ready-show-btn');
      if (btn && !btn.disabled) { btn.click(); e.preventDefault(); }
    }
    return;
  }

  // 1/2/3/4 — اختيار الإجابات
  if (['1', '2', '3', '4'].includes(key)) {
    const idx = parseInt(key) - 1;
    const btn = document.querySelector(`.qz-choice[data-choice-index="${idx}"]`);
    if (btn && !btn.disabled &&
        !btn.classList.contains('correct') &&
        !btn.classList.contains('wrong') &&
        !btn.classList.contains('revealed')) {
      btn.click();
      e.preventDefault();
    }
    return;
  }

  // S — تخطّي
  if (key === 's' || key === 'S' || key === 'س') {
    if (typeof skipCurrentQuestion === 'function') { skipCurrentQuestion(); e.preventDefault(); }
    return;
  }
}

// ─── ربط الأحداث ───
document.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('keydown', handleKeyDown);

  document.getElementById('btn-font-increase')?.addEventListener('click', increaseFontSize);
  document.getElementById('btn-font-decrease')?.addEventListener('click', decreaseFontSize);
  document.getElementById('btn-sound-toggle')?.addEventListener('click', () => {
    if (typeof AudioEngine !== 'undefined') AudioEngine.toggle();
  });
  document.getElementById('btn-shortcuts-help')?.addEventListener('click', openShortcutsModal);
  document.getElementById('shortcuts-modal-close')?.addEventListener('click', closeShortcutsModal);
  document.getElementById('shortcuts-modal-done')?.addEventListener('click', closeShortcutsModal);
  document.getElementById('shortcuts-modal-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'shortcuts-modal-overlay') closeShortcutsModal();
  });
});
