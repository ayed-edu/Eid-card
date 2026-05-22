/* ═══════════════════════════════════════════════════
   app.js — الدوال العامة المشتركة لتطبيق سباق الأبطال
   ═══════════════════════════════════════════════════ */

// ─── مفاتيح localStorage ───
const STORAGE_KEYS = {
  SETUP: 'qa_app_setup',
};

// ─── حفظ بيانات الإعداد ───
function saveSetup(data) {
  localStorage.setItem(STORAGE_KEYS.SETUP, JSON.stringify(data));
}

// ─── تحميل بيانات الإعداد ───
function loadSetup() {
  const raw = localStorage.getItem(STORAGE_KEYS.SETUP);
  return raw ? JSON.parse(raw) : null;
}

// ─── إدارة الشاشات ───
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(screenId);
  if (target) target.classList.add('active');
}

// ─── تهيئة السياق من APP_CONFIG ───
function initFromConfig() {
  if (typeof APP_CONFIG === 'undefined') {
    console.error('APP_CONFIG غير محمَّل!');
    return;
  }

  // هذه المتغيّرات معرَّفة بـ let في screen-subjects.js و screen-units.js
  // نعيّنها هنا بعد اكتمال تحميل كل السكربتات (DOMContentLoaded)
  currentSubjectContext = {
    id:       APP_CONFIG.subject.id,
    name:     APP_CONFIG.subject.name,
    icon:     APP_CONFIG.subject.icon,
    color:    APP_CONFIG.subject.color,
    colorDark: APP_CONFIG.subject.colorDark
  };

  currentUnitContext = null;
}

// ─── تحديث الشريط العلوي من CONFIG ───
function updateTopBarFromConfig() {
  if (typeof APP_CONFIG === 'undefined') return;
  const subjectIconEl = document.getElementById('tb-subject-icon');
  const subjectNameEl = document.getElementById('tb-subject-name');
  const gradeEl       = document.getElementById('tb-grade');
  if (subjectIconEl) subjectIconEl.textContent = APP_CONFIG.subject.icon;
  if (subjectNameEl) subjectNameEl.textContent = APP_CONFIG.subject.name;
  if (gradeEl)       gradeEl.textContent       = APP_CONFIG.grade;
}

// ─── فحص الإعداد عند بدء التطبيق ───
document.addEventListener('DOMContentLoaded', () => {
  // 1. هيّئ APP_CONFIG
  initFromConfig();

  // حدّث عنوان شاشة الإعداد من CONFIG
  const setupSubtitle = document.getElementById('setup-subtitle-grade');
  if (setupSubtitle && typeof APP_CONFIG !== 'undefined') {
    setupSubtitle.textContent =
      `أسئلة تفاعلية — ${APP_CONFIG.subject.name} — ${APP_CONFIG.grade}`;
  }

  // 2. تحقّق من جلسة محفوظة
  const hasRestorable = (typeof checkForPersistedSessionOnStartup === 'function')
    && checkForPersistedSessionOnStartup();

  if (hasRestorable) return;

  // 3. تحقّق من الإعداد الأولي
  const setup = loadSetup();
  if (setup && setup.setupCompleted) {
    updateTopBarFromConfig();
    showScreen('screen-classes');
    if (typeof renderClassesScreen === 'function') renderClassesScreen();
  } else {
    showScreen('screen-setup');
    document.getElementById('top-bar')?.classList.add('hidden');
  }
});
