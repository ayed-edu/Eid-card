/* ═══════════════════════════════════════════════════
   data-subjects.js — بيانات المواد المتاحة
   ═══════════════════════════════════════════════════ */

const SUBJECTS_LIST = [
  {
    id:          'languages',
    name:        'لغتي',
    icon:        '📖',
    color:       '#10b981',
    colorDark:   '#059669',
    description: 'مهارات اللغة العربية للصف الثالث',
  },
  {
    id:          'math',
    name:        'الرياضيات',
    icon:        '🔢',
    color:       '#f59e0b',
    colorDark:   '#d97706',
    description: 'مهارات العدد والحساب والهندسة',
  },
  // مستقبلاً:
  // { id: 'science', name: 'العلوم', icon: '🔬', color: '#8b5cf6', colorDark: '#7c3aed' },
  // { id: 'islamic', name: 'الدراسات الإسلامية', icon: '🕌', color: '#0891b2', colorDark: '#0e7490' },
];

const QUESTIONS_STORAGE_KEY = 'qa_app_questions';

function loadQuestionsBank() {
  const raw = localStorage.getItem(QUESTIONS_STORAGE_KEY);
  return raw ? JSON.parse(raw) : {};
}

function getSubjectStats(subjectId) {
  const bank = loadQuestionsBank();
  const subj = bank[subjectId];
  if (!subj || !subj.units) return { unitsCount: 0, questionsCount: 0 };

  const units         = Object.values(subj.units);
  const unitsCount    = units.length;
  const questionsCount = units.reduce(
    (sum, u) => sum + (Array.isArray(u.questions) ? u.questions.length : 0),
    0
  );
  return { unitsCount, questionsCount };
}
