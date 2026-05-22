// ============== إعدادات التطبيق الثابتة (تُعدَّل لكل نسخة) ==============
// هذا الملف يُعدَّل من قِبَل المُعدّ عند بناء كل نسخة جديدة.
// المعلم لا يراه ولا يعدّله.

const APP_CONFIG = {
  // ─── هوية النسخة ───
  version: '1.0.0',
  buildDate: '2026-05-21',

  // ─── المادة الوحيدة في هذه النسخة ───
  subject: {
    id: 'languages',
    name: 'لغتي',
    icon: '📖',
    color: '#10b981',
    colorDark: '#059669'
  },

  // ─── الصف الدراسي ───
  grade: 'الصف الثالث الابتدائي',
  gradeShort: 'ثالث ابتدائي',

  // ─── عنوان التطبيق في الشريط العلوي والمستندات ───
  appLabel: 'لغتي — الثالث الابتدائي',

  // ─── الفصول المتاحة ───
  // gender: 'boys' | 'girls' | 'both'
  // count: عدد الفصول من كل جنس
  classesConfig: {
    boys: { enabled: true, count: 6, label: 'ثالث أولاد' },
    girls: { enabled: true, count: 6, label: 'ثالث بنات' }
  }
};

// تأكد من توفّر APP_CONFIG قبل أي شيء
Object.freeze(APP_CONFIG);
Object.freeze(APP_CONFIG.subject);
Object.freeze(APP_CONFIG.classesConfig);
