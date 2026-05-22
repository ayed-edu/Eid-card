/* ═══════════════════════════════════════════════════
   data-units.js — الوحدات الافتراضية وأدوات بنك الأسئلة
   ═══════════════════════════════════════════════════ */

const SAMPLE_INJECTED_FLAG_KEY = 'qa_app_sample_questions_injected';

// ============== دعم البيانات المضمّنة (من builder.html) ==============

function loadEmbeddedData() {
  const el = document.getElementById('embedded-questions-data');
  if (!el) return null;
  try {
    const text = el.textContent?.trim();
    if (!text || text === 'null') return null;
    return JSON.parse(text);
  } catch (e) {
    console.warn('فشل تحميل البيانات المضمّنة:', e);
    return null;
  }
}

function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  }
  return String(h);
}

function buildBankFromEmbeddedData(data) {
  if (!data || !Array.isArray(data.units)) return false;
  try {
    const bank = {};
    const subjectId = (typeof APP_CONFIG !== 'undefined')
      ? APP_CONFIG.subject.id
      : 'languages';

    bank[subjectId] = {
      name:  data.subject?.name  || 'المادة',
      icon:  data.subject?.icon  || '📖',
      color: data.subject?.color || '#10b981',
      units: {}
    };

    data.units.forEach(u => {
      const uid = u.id || `u${u.order}`;
      bank[subjectId].units[uid] = {
        name:  u.name,
        order: u.order,
        questions: (u.questions || []).map((q, i) => ({
          id:           `q_${uid}_${i + 1}`,
          text:         q.text,
          choices:      q.choices.slice(),
          correctIndex: q.correctIndex,
          unitId:       uid,
          _original: {
            text:         q.text,
            choices:      q.choices.slice(),
            correctIndex: q.correctIndex
          }
        }))
      };
    });

    localStorage.setItem(QUESTIONS_STORAGE_KEY, JSON.stringify(bank));
    localStorage.setItem(SAMPLE_INJECTED_FLAG_KEY, '1');
    console.log(`✅ تم تحميل ${data.units.length} وحدة من البيانات المضمّنة.`);
    return true;
  } catch (e) {
    console.error('خطأ في بناء البنك من البيانات المضمّنة:', e);
    return false;
  }
}

function initEmbeddedDataIfAvailable() {
  const data = loadEmbeddedData();
  if (!data) return false;

  const dataHash      = simpleHash(JSON.stringify(data));
  const alreadyLoaded = localStorage.getItem('qa_app_embedded_loaded');

  if (alreadyLoaded !== dataHash) {
    buildBankFromEmbeddedData(data);
    localStorage.setItem('qa_app_embedded_loaded', dataHash);
  }
  localStorage.setItem('qa_app_from_embedded', '1');
  return true;
}

// ====================================================================

const DEFAULT_UNITS = {
  languages: [
    { id: 'lang-u1', name: 'أسرتي',           order: 1 },
    { id: 'lang-u2', name: 'مدرستي',          order: 2 },
    { id: 'lang-u3', name: 'حيُّنا',           order: 3 },
    { id: 'lang-u4', name: 'هواياتي',         order: 4 },
    { id: 'lang-u5', name: 'صحّتي وغذائي',    order: 5 },
    { id: 'lang-u6', name: 'بيئتي',           order: 6 },
  ],
  math: [
    { id: 'math-u1', name: 'الأعداد حتى 999',  order: 1 },
    { id: 'math-u2', name: 'الجمع والطرح',     order: 2 },
    { id: 'math-u3', name: 'الضرب',            order: 3 },
    { id: 'math-u4', name: 'القسمة',           order: 4 },
    { id: 'math-u5', name: 'الكسور',           order: 5 },
    { id: 'math-u6', name: 'الأشكال الهندسية', order: 6 },
  ],
};

// تهيئة بنك الأسئلة إن لم يكن موجوداً بعد
function ensureQuestionsBankInitialized() {
  let bank    = loadQuestionsBank();
  if (localStorage.getItem('qa_app_from_embedded') === '1') return bank;
  let changed = false;

  SUBJECTS_LIST.forEach(subject => {
    if (!bank[subject.id]) {
      bank[subject.id] = {
        name:  subject.name,
        icon:  subject.icon,
        color: subject.color,
        units: {},
      };
      changed = true;
    }

    const defaults = DEFAULT_UNITS[subject.id] || [];
    defaults.forEach(u => {
      if (!bank[subject.id].units[u.id]) {
        bank[subject.id].units[u.id] = {
          name:      u.name,
          order:     u.order,
          questions: [],
        };
        changed = true;
      }
    });
  });

  if (changed) {
    localStorage.setItem(QUESTIONS_STORAGE_KEY, JSON.stringify(bank));
  }

  return bank;
}

// عدد الأسئلة في وحدة واحدة
function getUnitQuestionsCount(subjectId, unitId) {
  const bank = loadQuestionsBank();
  const unit = bank[subjectId]?.units?.[unitId];
  return (unit && Array.isArray(unit.questions)) ? unit.questions.length : 0;
}

// مجموع أسئلة مادة كاملة
function getSubjectTotalQuestions(subjectId) {
  const bank  = loadQuestionsBank();
  const units = bank[subjectId]?.units || {};
  return Object.values(units).reduce(
    (sum, u) => sum + (Array.isArray(u.questions) ? u.questions.length : 0),
    0
  );
}

// قائمة الوحدات لمادة (مرتّبة حسب order)
function getUnitsForSubject(subjectId) {
  const bank     = loadQuestionsBank();
  const unitsObj = bank[subjectId]?.units || {};
  return Object.entries(unitsObj)
    .map(([id, u]) => ({ id, ...u }))
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}

/* ═══════════════════════════════════════════════════
   بنك الأسئلة التجريبي (للاختبار التقني فقط)
   ستُستبدل هذه الأسئلة لاحقاً بشاشة إدارة الأسئلة
   ═══════════════════════════════════════════════════ */

const SAMPLE_QUESTIONS_BANK = {

  // ── لغتي: وحدة 1 — أسرتي ──
  'lang-u1': [
    {
      text: 'مَن أكبر أفراد الأسرة سِنّاً؟',
      choices: ['الأخ الصغير', 'الجَدّ', 'الطفل', 'الأخت الصغرى'],
      correctIndex: 1,
    },
    {
      text: 'ما جمع كلمة "أُمّ"؟',
      choices: ['أُمّات', 'أُمَّهَات', 'إمام', 'أَوَامِر'],
      correctIndex: 1,
    },
    {
      text: 'كم عدد أفراد الأسرة في الجملة: "أبي وأمي وأخواي الثلاثة"؟',
      choices: ['ثلاثة', 'أربعة', 'خمسة', 'ستة'],
      correctIndex: 2,
    },
    {
      text: 'الكلمة التي تبدأ بحرف مَدّ من بين الكلمات التالية:',
      choices: ['بيت', 'أُم', 'كتاب', 'أب'],
      correctIndex: 2,
    },
    {
      text: 'ضِدّ كلمة "كبير":',
      choices: ['طويل', 'صغير', 'واسع', 'جديد'],
      correctIndex: 1,
    },
  ],

  // ── لغتي: وحدة 2 — مدرستي ──
  'lang-u2': [
    {
      text: 'ما الجملة التي تحتوي على فعل مضارع؟',
      choices: ['ذهبَ خالد إلى المدرسة', 'يكتبُ الطالبُ الدرس', 'اكتبْ بخطٍّ جميل', 'الكتابُ مفيدٌ'],
      correctIndex: 1,
    },
    {
      text: 'كم عدد حروف كلمة "مدرسة"؟',
      choices: ['أربعة', 'خمسة', 'ستة', 'سبعة'],
      correctIndex: 1,
    },
    {
      text: 'مَن يُعَلِّم الطلاب في المدرسة؟',
      choices: ['المدير', 'المعلم', 'الحارس', 'الطبيب'],
      correctIndex: 1,
    },
    {
      text: 'علامة الترقيم المناسبة في نهاية الجملة: "ما اسمك"',
      choices: ['نقطة .', 'علامة استفهام ؟', 'علامة تعجب !', 'فاصلة ،'],
      correctIndex: 1,
    },
    {
      text: 'مرادف كلمة "الفصل" في الجملة: "ندخل الفصل صباحاً":',
      choices: ['الموسم', 'الصَّفّ', 'الباب', 'الجَرَس'],
      correctIndex: 1,
    },
  ],

  // ── لغتي: وحدة 3 — حيُّنا ──
  'lang-u3': [
    {
      text: 'الحَيّ هو:',
      choices: ['مكان نسكن فيه نحن وجيراننا', 'مكان نشتري منه', 'مكان نتعلّم فيه', 'مكان نلعب فيه فقط'],
      correctIndex: 0,
    },
    {
      text: 'مَن هو الجار؟',
      choices: ['مَن يسكن في مدينة أخرى', 'مَن يسكن قريباً من بيتنا', 'مَن يعمل في المدرسة', 'مَن يعمل في المستشفى'],
      correctIndex: 1,
    },
    {
      text: 'اختر الكلمة التي تنتهي بـ "ة":',
      choices: ['كتاب', 'حديقة', 'باب', 'سوق'],
      correctIndex: 1,
    },
    {
      text: 'أين نشتري الطعام عادةً؟',
      choices: ['في المدرسة', 'في المسجد', 'في السوق', 'في الحديقة'],
      correctIndex: 2,
    },
    {
      text: 'أيّ هذه الجمل صحيحة؟',
      choices: ['ذهب الولد إلى السوق', 'ذهب الولد إلى السوقُ', 'ذهب الولدَ إلى السوق', 'ذهب الولد في السوق'],
      correctIndex: 0,
    },
  ],

  // ── لغتي: وحدة 4 — هواياتي ──
  'lang-u4': [
    {
      text: 'ما المقصود بالهواية؟',
      choices: ['عمل يومي إجباري', 'نشاط نحبّه ونمارسه في وقت الفراغ', 'واجب مدرسي', 'وظيفة'],
      correctIndex: 1,
    },
    {
      text: 'اختر هواية رياضية:',
      choices: ['الرسم', 'القراءة', 'كرة القدم', 'الطبخ'],
      correctIndex: 2,
    },
    {
      text: 'جمع كلمة "هواية":',
      choices: ['هوايات', 'أهواء', 'هاوون', 'هَوَى'],
      correctIndex: 0,
    },
    {
      text: 'مرادف "أحبّ" في الجملة: "أُحبّ القراءة":',
      choices: ['أكره', 'أمارس', 'أَهْوَى', 'أنسى'],
      correctIndex: 2,
    },
    {
      text: 'الأداة المستخدمة في هواية الرسم:',
      choices: ['الكرة', 'القلم والورقة', 'العود', 'الخيط'],
      correctIndex: 1,
    },
  ],

  // ── لغتي: وحدة 5 — صحّتي وغذائي ──
  'lang-u5': [
    {
      text: 'مِن أهمّ وجبات اليوم:',
      choices: ['وجبة المساء', 'وجبة الإفطار', 'الحلوى', 'العصير'],
      correctIndex: 1,
    },
    {
      text: 'أيّ هذه الأطعمة مفيد للأسنان؟',
      choices: ['السكاكر والشوكولاتة', 'الحليب', 'المشروبات الغازية', 'الحلوى'],
      correctIndex: 1,
    },
    {
      text: 'كم مرة يجب أن ننظّف أسناننا يومياً على الأقل؟',
      choices: ['مرة', 'مرتين', 'ثلاث مرات', 'لا حاجة لذلك'],
      correctIndex: 1,
    },
    {
      text: 'ما الفائدة الأساسية من الفواكه؟',
      choices: ['تُسبِّب أمراضاً', 'تمنح الجسم فيتامينات', 'تُسبِّب التعب', 'لا فائدة منها'],
      correctIndex: 1,
    },
    {
      text: 'كم ساعة يحتاج الطفل من النوم تقريباً؟',
      choices: ['ساعتان', 'أربع ساعات', 'تسع إلى عشر ساعات', 'خمس عشرة ساعة'],
      correctIndex: 2,
    },
  ],

  // ── لغتي: وحدة 6 — بيئتي ──
  'lang-u6': [
    {
      text: 'البيئة هي:',
      choices: ['مكان وُلِدنا فيه فقط', 'كلّ ما يحيط بنا من ماء وهواء وكائنات', 'الفصل المدرسي', 'البيت فقط'],
      correctIndex: 1,
    },
    {
      text: 'مِن وسائل المحافظة على البيئة:',
      choices: ['رمي النفايات في الشوارع', 'قطع الأشجار', 'إعادة التدوير', 'تلويث الماء'],
      correctIndex: 2,
    },
    {
      text: 'أيّ هذه الموارد مَورد طبيعي؟',
      choices: ['الكتاب', 'الكرسي', 'الماء', 'السيارة'],
      correctIndex: 2,
    },
    {
      text: 'الحديقة العامّة مكان:',
      choices: ['نلعب فيه ونحافظ على نظافته', 'نلوّثه برمي القمامة', 'مغلق دائماً', 'خاصّ بشخص واحد'],
      correctIndex: 0,
    },
    {
      text: 'ضِدّ كلمة "نظيف":',
      choices: ['طاهر', 'وسخ', 'جميل', 'لطيف'],
      correctIndex: 1,
    },
  ],

  // ── الرياضيات: وحدة 1 — الأعداد حتى 999 ──
  'math-u1': [
    {
      text: 'أيّ هذه الأعداد هو الأكبر؟',
      choices: ['237', '732', '372', '327'],
      correctIndex: 1,
    },
    {
      text: 'العدد الذي يأتي بعد 499 مباشرةً:',
      choices: ['498', '500', '599', '400'],
      correctIndex: 1,
    },
    {
      text: 'منزلة الرقم 5 في العدد 152:',
      choices: ['الآحاد', 'العشرات', 'المئات', 'الألوف'],
      correctIndex: 1,
    },
    {
      text: 'كم مئةً في العدد 604؟',
      choices: ['4', '6', '60', '604'],
      correctIndex: 1,
    },
    {
      text: 'العدد المكوّن من 3 مئات و 5 عشرات و 8 آحاد هو:',
      choices: ['358', '583', '835', '538'],
      correctIndex: 0,
    },
  ],

  // ── الرياضيات: وحدة 2 — الجمع والطرح ──
  'math-u2': [
    {
      text: 'ناتج 47 + 38 =',
      choices: ['75', '85', '95', '105'],
      correctIndex: 1,
    },
    {
      text: 'ناتج 92 − 47 =',
      choices: ['45', '55', '35', '139'],
      correctIndex: 0,
    },
    {
      text: 'أيّ العمليات التالية تساوي 100؟',
      choices: ['60 + 30', '55 + 45', '70 + 20', '40 + 50'],
      correctIndex: 1,
    },
    {
      text: 'إذا كان مع خالد 35 ريالاً وأعطاه أبوه 20 ريالاً، فكم معه الآن؟',
      choices: ['15 ريالاً', '45 ريالاً', '55 ريالاً', '65 ريالاً'],
      correctIndex: 2,
    },
    {
      text: 'العدد المفقود في: ___ − 25 = 30',
      choices: ['5', '50', '55', '60'],
      correctIndex: 2,
    },
  ],

  // ── الرياضيات: وحدة 3 — الضرب ──
  'math-u3': [
    {
      text: 'ناتج 6 × 4 =',
      choices: ['10', '20', '24', '64'],
      correctIndex: 2,
    },
    {
      text: 'ناتج 7 × 3 =',
      choices: ['10', '21', '24', '37'],
      correctIndex: 1,
    },
    {
      text: 'الجملة الضربية لجمع: 5 + 5 + 5 + 5',
      choices: ['5 × 5', '4 × 5', '5 × 2', '4 × 4'],
      correctIndex: 1,
    },
    {
      text: 'ناتج 8 × 0 =',
      choices: ['8', '0', '1', '80'],
      correctIndex: 1,
    },
    {
      text: 'إذا اشترى أحمد 4 علب عصير، في كلّ علبة 6 حبّات، فكم حبّة معه؟',
      choices: ['10', '20', '24', '46'],
      correctIndex: 2,
    },
  ],

  // ── الرياضيات: وحدة 4 — القسمة ──
  'math-u4': [
    {
      text: 'ناتج 20 ÷ 4 =',
      choices: ['3', '4', '5', '6'],
      correctIndex: 2,
    },
    {
      text: 'ناتج 18 ÷ 3 =',
      choices: ['5', '6', '7', '15'],
      correctIndex: 1,
    },
    {
      text: 'القسمة هي عكس عملية:',
      choices: ['الجمع', 'الطرح', 'الضرب', 'لا شيء مما سبق'],
      correctIndex: 2,
    },
    {
      text: 'إذا وُزِّعت 24 حلوى على 6 أطفال بالتساوي، فكم نصيب كلّ طفل؟',
      choices: ['3', '4', '5', '6'],
      correctIndex: 1,
    },
    {
      text: 'ناتج 15 ÷ 5 =',
      choices: ['1', '2', '3', '5'],
      correctIndex: 2,
    },
  ],

  // ── الرياضيات: وحدة 5 — الكسور ──
  'math-u5': [
    {
      text: 'كيف نقرأ الكسر ½ ؟',
      choices: ['نصف', 'ثُلث', 'رُبع', 'خُمس'],
      correctIndex: 0,
    },
    {
      text: 'الكسر الذي يدلّ على "ربع":',
      choices: ['1/2', '1/3', '1/4', '1/5'],
      correctIndex: 2,
    },
    {
      text: 'قسّمنا برتقالة إلى 4 أجزاء متساوية وأكلنا جزءاً واحداً. ما الكسر المتبقّي؟',
      choices: ['1/4', '2/4', '3/4', '4/4'],
      correctIndex: 2,
    },
    {
      text: 'أيّ الكسور الآتية أكبر؟',
      choices: ['1/4', '1/2', '1/3', '1/5'],
      correctIndex: 1,
    },
    {
      text: 'الجزء العلوي من الكسر يسمّى:',
      choices: ['المقام', 'البَسط', 'الخطّ', 'العدد'],
      correctIndex: 1,
    },
  ],

  // ── الرياضيات: وحدة 6 — الأشكال الهندسية ──
  'math-u6': [
    {
      text: 'الشكل الذي له 3 أضلاع و 3 زوايا هو:',
      choices: ['المربع', 'المستطيل', 'المثلث', 'الدائرة'],
      correctIndex: 2,
    },
    {
      text: 'الشكل الذي جميع أضلاعه متساوية وله 4 زوايا قائمة:',
      choices: ['المربع', 'المثلث', 'المستطيل', 'الدائرة'],
      correctIndex: 0,
    },
    {
      text: 'كم ضلعاً للمستطيل؟',
      choices: ['ثلاثة', 'أربعة', 'خمسة', 'ستة'],
      correctIndex: 1,
    },
    {
      text: 'الشكل الذي ليس له أضلاع ولا زوايا:',
      choices: ['المثلث', 'الدائرة', 'المربع', 'المستطيل'],
      correctIndex: 1,
    },
    {
      text: 'مجسّم له 6 أوجه مربّعة متساوية:',
      choices: ['الكرة', 'الأسطوانة', 'المكعّب', 'المخروط'],
      correctIndex: 2,
    },
  ],
};

/* ═══════════════════════════════════════════════════
   حقن بنك الأسئلة التجريبي
   ═══════════════════════════════════════════════════ */

function injectSampleQuestionsIntoBank() {
  // إذا سبق وحُقنت الأسئلة (أو مُسح البنك صراحة)، لا تُعِد الحقن
  if (localStorage.getItem(SAMPLE_INJECTED_FLAG_KEY) === '1') {
    return 0;
  }

  ensureQuestionsBankInitialized();

  const bank = loadQuestionsBank();
  let injected = 0;

  Object.entries(SAMPLE_QUESTIONS_BANK).forEach(([unitId, questions]) => {
    let parentSubjectId = null;
    Object.entries(bank).forEach(([subjId, subj]) => {
      if (subj.units && subj.units[unitId]) parentSubjectId = subjId;
    });
    if (!parentSubjectId) return;

    if (bank[parentSubjectId].units[unitId].questions.length > 0) return;

    bank[parentSubjectId].units[unitId].questions = questions.map((q, i) => ({
      id: `q_${unitId}_${i + 1}`,
      text: q.text,
      choices: q.choices.slice(),
      correctIndex: q.correctIndex,
      unitId
    }));
    injected += questions.length;
  });

  if (injected > 0) {
    localStorage.setItem(QUESTIONS_STORAGE_KEY, JSON.stringify(bank));
    localStorage.setItem(SAMPLE_INJECTED_FLAG_KEY, '1');
    console.log(`✅ تم حقن ${injected} سؤالاً تجريبياً في بنك الأسئلة.`);
  } else {
    console.log('ℹ️ بنك الأسئلة لا يحتاج لحقن أسئلة جديدة.');
  }

  return injected;
}

// تشغيل الحقن تلقائياً عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
  // أولوية للبيانات المضمّنة (من builder.html)
  const hasEmbedded = initEmbeddedDataIfAvailable();

  if (!hasEmbedded) {
    // لا يوجد بيانات مضمّنة: استخدم البنك التجريبي كالمعتاد
    setTimeout(() => {
      try {
        injectSampleQuestionsIntoBank();
      } catch (e) {
        console.warn('فشل حقن الأسئلة التجريبية:', e);
      }
    }, 100);
  }
});

// ============== إعادة تعيين بنك الأسئلة ==============

function getTotalQuestionsInBank() {
  const bank = loadQuestionsBank();
  let total = 0;
  Object.values(bank).forEach(subj => {
    Object.values(subj.units || {}).forEach(u => {
      total += (u.questions || []).length;
    });
  });
  return total;
}

function resetQuestionsBank() {
  const bank = loadQuestionsBank();
  Object.values(bank).forEach(subj => {
    Object.values(subj.units || {}).forEach(u => {
      u.questions = [];
    });
  });
  localStorage.setItem(QUESTIONS_STORAGE_KEY, JSON.stringify(bank));
  // ارفع العلم لمنع إعادة الحقن
  localStorage.setItem(SAMPLE_INJECTED_FLAG_KEY, '1');
}
