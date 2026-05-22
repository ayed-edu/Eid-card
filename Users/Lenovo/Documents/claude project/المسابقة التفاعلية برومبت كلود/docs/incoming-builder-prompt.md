# مهمة: بناء `builder.html` — صانع نسخ سباق الأبطال

## السياق
نبني صفحة HTML مستقلة (`builder.html`) تستخدمها أنت (المُعدّ) لتحويل ملف JSON بالأسئلة إلى نسخة HTML واحدة جاهزة للمعلم.

المنتج النهائي: ملف HTML واحد مكتفٍ بذاته يعمل offline تماماً — المعلم يفتحه وهو يحتوي على كل شيء.

## القيود التقنية
1. `builder.html` مستقل تماماً (لا يستورد ملفات خارجية).
2. offline كامل — كل شيء داخل ملف واحد.
3. RTL.
4. Vanilla JS فقط.
5. لا تعدّل `index.html` أو أي ملف JS موجود **إلا التعديلات الصغيرة المطلوبة** لدعم البيانات المحقونة.

---

## التعديلات على ملفات التطبيق أولاً

### 1) في `index.html` — أضف عنصر التحميل المضمّن

أضف مباشرة **بعد** `<script src="js/app-config.js"></script>` (أول سكربت):

```html
<!-- بيانات الأسئلة المضمّنة (تُولَّد من builder.html) -->
<script id="embedded-questions-data" type="application/json">
null
</script>
```

> القيمة `null` تعني "لا يوجد بيانات مضمّنة" — التطبيق سيستخدم البنك التجريبي كالمعتاد.

### 2) في `js/data-units.js` — دعم البيانات المضمّنة

أضف هذه الدوال **في بداية الملف** (قبل `DEFAULT_UNITS`):

```javascript
// ============== تحميل البيانات المضمّنة (من builder) ==============

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

function buildBankFromEmbeddedData(data) {
  if (!data || !Array.isArray(data.units)) return false;
  try {
    const bank = {};
    const subjectId = (typeof APP_CONFIG !== 'undefined')
      ? APP_CONFIG.subject.id
      : 'languages';

    bank[subjectId] = {
      name: data.subject?.name || 'المادة',
      icon: data.subject?.icon || '📖',
      color: data.subject?.color || '#10b981',
      units: {}
    };

    data.units.forEach(u => {
      const uid = u.id || `u${u.order}`;
      bank[subjectId].units[uid] = {
        name: u.name,
        order: u.order,
        questions: (u.questions || []).map((q, i) => ({
          id: `q_${uid}_${i + 1}`,
          text: q.text,
          choices: q.choices.slice(),
          correctIndex: q.correctIndex,
          unitId: uid,
          // نسخة أصلية غير قابلة للتعديل
          _original: {
            text: q.text,
            choices: q.choices.slice(),
            correctIndex: q.correctIndex
          }
        }))
      };
    });

    localStorage.setItem(QUESTIONS_STORAGE_KEY, JSON.stringify(bank));
    // علّم أن الأسئلة محقونة (لمنع التلوث بالبنك التجريبي)
    localStorage.setItem(SAMPLE_INJECTED_FLAG_KEY, '1');
    console.log(`✅ تم تحميل ${data.units.length} وحدة من البيانات المضمّنة.`);
    return true;
  } catch (e) {
    console.error('خطأ في بناء البنك من البيانات المضمّنة:', e);
    return false;
  }
}

// يُشغَّل مرة واحدة عند بدء التطبيق
function initEmbeddedDataIfAvailable() {
  const data = loadEmbeddedData();
  if (!data) return false;

  // إن تغيّرت البيانات المضمّنة (نسخة جديدة للملف)
  // نعيد بناء البنك دائماً من المضمّن لضمان التحديث
  const alreadyLoaded = localStorage.getItem('qa_app_embedded_loaded');
  const dataHash = simpleHash(JSON.stringify(data));

  if (alreadyLoaded !== dataHash) {
    buildBankFromEmbeddedData(data);
    localStorage.setItem('qa_app_embedded_loaded', dataHash);
  }
  return true;
}

function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  }
  return String(h);
}
```

#### في دالة `DOMContentLoaded` أسفل ملف `data-units.js`:

استبدل استدعاء الحقن الحالي:
```javascript
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    try {
      injectSampleQuestionsIntoBank();
    } catch (e) {
      console.warn('فشل حقن الأسئلة التجريبية:', e);
    }
  }, 100);
});
```

بـ:
```javascript
document.addEventListener('DOMContentLoaded', () => {
  // أولوية للبيانات المضمّنة (من builder.html)
  const hasEmbedded = initEmbeddedDataIfAvailable();

  if (!hasEmbedded) {
    // لا يوجد بيانات مضمّنة: استخدم البنك التجريبي
    setTimeout(() => {
      try {
        injectSampleQuestionsIntoBank();
      } catch (e) {
        console.warn('فشل حقن الأسئلة التجريبية:', e);
      }
    }, 100);
  }
});
```

---

## الملف الرئيسي: `builder.html`

### هيكل الملف

هذا الملف يحوي:
1. واجهة الـ builder (HTML/CSS بسيط).
2. منطق JavaScript للقراءة والفحص والبناء.
3. **محتوى `index.html` الكامل كـ template string** (ستُضمّنه في خطوة لاحقة).

أنشئ الملف `builder.html` بالمحتوى التالي:

```html
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🏗️ صانع نسخ — سباق الأبطال</title>
  <style>
    :root {
      --primary: #3b82f6;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
      --bg: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
      --card-bg: #ffffff;
      --text: #1e293b;
      --text-soft: #64748b;
      --border: #e2e8f0;
      --radius: 16px;
    }
    *, *::before, *::after { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
      background: var(--bg);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      color: var(--text);
      direction: rtl;
    }
    .builder-wrap {
      max-width: 820px;
      width: 100%;
    }
    .builder-header {
      text-align: center;
      color: #ffffff;
      margin-bottom: 32px;
    }
    .builder-header h1 {
      font-size: clamp(28px, 3vw, 44px);
      font-weight: 800;
      margin: 0 0 8px 0;
      text-shadow: 0 4px 16px rgba(0,0,0,0.3);
    }
    .builder-header p {
      font-size: clamp(15px, 1.2vw, 18px);
      font-weight: 600;
      opacity: 0.9;
      margin: 0;
    }
    .builder-card {
      background: var(--card-bg);
      border-radius: 24px;
      padding: 36px 40px;
      box-shadow: 0 24px 60px rgba(0,0,0,0.2);
    }
    .step {
      margin-bottom: 32px;
      padding-bottom: 32px;
      border-bottom: 2px solid var(--border);
    }
    .step:last-child { border-bottom: none; margin-bottom: 0; }
    .step-title {
      font-size: clamp(18px, 1.5vw, 24px);
      font-weight: 800;
      margin: 0 0 16px 0;
      display: flex;
      align-items: center;
      gap: 10px;
      color: var(--text);
    }
    .step-number {
      background: var(--primary);
      color: #fff;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: 800;
      flex-shrink: 0;
    }

    /* ─── منطقة رفع الملف ─── */
    .drop-zone {
      border: 3px dashed var(--primary);
      border-radius: var(--radius);
      padding: 48px 24px;
      text-align: center;
      cursor: pointer;
      transition: all 0.25s ease;
      background: #f0f7ff;
    }
    .drop-zone:hover, .drop-zone.drag-over {
      background: #dbeafe;
      border-color: #1e40af;
      transform: scale(1.01);
    }
    .drop-zone-icon { font-size: 52px; margin-bottom: 12px; }
    .drop-zone-text {
      font-size: clamp(16px, 1.2vw, 20px);
      font-weight: 700;
      color: var(--primary);
      margin-bottom: 6px;
    }
    .drop-zone-sub { font-size: 14px; color: var(--text-soft); }
    #file-input { display: none; }

    /* ─── معاينة البيانات ─── */
    .preview-box {
      background: #f8fafc;
      border-radius: var(--radius);
      padding: 20px 24px;
      font-size: clamp(14px, 1.1vw, 17px);
      display: none;
    }
    .preview-box.visible { display: block; }
    .preview-row {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 8px 0;
      border-bottom: 1px solid var(--border);
      font-weight: 600;
    }
    .preview-row:last-child { border-bottom: none; }
    .preview-icon { font-size: 18px; flex-shrink: 0; margin-top: 1px; }
    .preview-label { color: var(--text-soft); min-width: 160px; flex-shrink: 0; }
    .preview-value { color: var(--text); flex: 1; }
    .preview-value.good { color: #047857; }
    .preview-value.warn { color: #b45309; }
    .preview-value.bad { color: #b91c1c; }

    .warnings-box {
      background: #fef3c7;
      border: 2px solid #fbbf24;
      border-radius: var(--radius);
      padding: 14px 20px;
      margin-top: 14px;
      display: none;
    }
    .warnings-box.visible { display: block; }
    .warnings-title {
      font-weight: 800;
      color: #92400e;
      margin: 0 0 8px 0;
      font-size: 15px;
    }
    .warnings-list {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .warnings-list li {
      color: #78350f;
      font-size: 14px;
      font-weight: 600;
      padding: 4px 0;
      padding-right: 16px;
      position: relative;
    }
    .warnings-list li::before {
      content: '⚠️';
      position: absolute;
      right: 0;
    }

    .errors-box {
      background: #fef2f2;
      border: 2px solid #fca5a5;
      border-radius: var(--radius);
      padding: 14px 20px;
      margin-top: 14px;
      display: none;
    }
    .errors-box.visible { display: block; }
    .errors-title {
      font-weight: 800;
      color: #b91c1c;
      margin: 0 0 8px 0;
      font-size: 15px;
    }
    .errors-list {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .errors-list li {
      color: #991b1b;
      font-size: 14px;
      font-weight: 600;
      padding: 4px 0;
      padding-right: 20px;
      position: relative;
    }
    .errors-list li::before {
      content: '❌';
      position: absolute;
      right: 0;
    }

    /* ─── اسم الملف ─── */
    .file-name-input {
      width: 100%;
      font-family: inherit;
      font-size: clamp(17px, 1.3vw, 22px);
      padding: 14px 18px;
      border: 2.5px solid var(--border);
      border-radius: 12px;
      direction: ltr;
      text-align: right;
      color: var(--text);
      transition: border-color 0.2s ease;
      background: #f8fafc;
    }
    .file-name-input:focus {
      outline: none;
      border-color: var(--primary);
      background: #fff;
    }
    .file-name-hint {
      margin-top: 8px;
      font-size: 13px;
      color: var(--text-soft);
      font-weight: 600;
    }

    /* ─── زر الإنشاء ─── */
    .btn-build {
      width: 100%;
      background: linear-gradient(135deg, #10b981, #059669);
      color: #fff;
      border: none;
      padding: 18px 24px;
      font-size: clamp(20px, 1.6vw, 26px);
      font-weight: 800;
      border-radius: 16px;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.25s ease;
      box-shadow: 0 10px 24px rgba(16, 185, 129, 0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
    }
    .btn-build:hover:not(:disabled) {
      transform: translateY(-3px);
      box-shadow: 0 16px 36px rgba(16, 185, 129, 0.5);
    }
    .btn-build:disabled {
      background: #94a3b8;
      box-shadow: none;
      cursor: not-allowed;
      transform: none;
    }

    /* ─── حالة النجاح ─── */
    .success-box {
      background: #ecfdf5;
      border: 2px solid #10b981;
      border-radius: var(--radius);
      padding: 20px 24px;
      text-align: center;
      display: none;
      margin-top: 20px;
    }
    .success-box.visible { display: block; }
    .success-emoji { font-size: 48px; margin-bottom: 10px; }
    .success-title {
      font-size: 20px;
      font-weight: 800;
      color: #047857;
      margin: 0 0 8px 0;
    }
    .success-text {
      font-size: 15px;
      color: #065f46;
      font-weight: 600;
      margin: 0;
      line-height: 1.6;
    }

    /* ─── شريط التقدّم ─── */
    .progress-bar-wrap { display: none; margin-top: 12px; }
    .progress-bar-wrap.visible { display: block; }
    .progress-bar {
      background: #e2e8f0;
      border-radius: 999px;
      height: 8px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #10b981, #059669);
      border-radius: 999px;
      transition: width 0.3s ease;
      width: 0%;
    }
    .progress-label {
      font-size: 13px;
      color: var(--text-soft);
      font-weight: 600;
      margin-top: 6px;
      text-align: center;
    }
  </style>
</head>
<body>
<div class="builder-wrap">
  <header class="builder-header">
    <h1>🏗️ صانع نسخ سباق الأبطال</h1>
    <p>أداة لمُعدّ المحتوى — تحوّل ملف JSON بالأسئلة إلى تطبيق HTML جاهز للمعلمين</p>
  </header>

  <div class="builder-card">

    <!-- الخطوة 1: رفع الملف -->
    <div class="step">
      <h2 class="step-title">
        <span class="step-number">1</span>
        ارفع ملف الأسئلة (JSON)
      </h2>
      <div class="drop-zone" id="drop-zone">
        <div class="drop-zone-icon">📂</div>
        <div class="drop-zone-text">اسحب ملف JSON هنا أو انقر للاختيار</div>
        <div class="drop-zone-sub">questions-bank-*.json</div>
      </div>
      <input type="file" id="file-input" accept=".json,application/json">

      <!-- معاينة البيانات -->
      <div class="preview-box" id="preview-box">
        <div class="preview-row">
          <span class="preview-icon">📝</span>
          <span class="preview-label">عنوان التطبيق</span>
          <span class="preview-value" id="pv-title">—</span>
        </div>
        <div class="preview-row">
          <span class="preview-icon">📖</span>
          <span class="preview-label">المادة</span>
          <span class="preview-value" id="pv-subject">—</span>
        </div>
        <div class="preview-row">
          <span class="preview-icon">🏫</span>
          <span class="preview-label">الصف</span>
          <span class="preview-value" id="pv-grade">—</span>
        </div>
        <div class="preview-row">
          <span class="preview-icon">📚</span>
          <span class="preview-label">عدد الوحدات</span>
          <span class="preview-value" id="pv-units">—</span>
        </div>
        <div class="preview-row">
          <span class="preview-icon">❓</span>
          <span class="preview-label">إجمالي الأسئلة</span>
          <span class="preview-value" id="pv-questions">—</span>
        </div>
      </div>

      <div class="warnings-box" id="warnings-box">
        <p class="warnings-title">⚠️ تحذيرات (يمكن المتابعة)</p>
        <ul class="warnings-list" id="warnings-list"></ul>
      </div>

      <div class="errors-box" id="errors-box">
        <p class="errors-title">❌ أخطاء يجب إصلاحها أولاً</p>
        <ul class="errors-list" id="errors-list"></ul>
      </div>
    </div>

    <!-- الخطوة 2: اسم الملف -->
    <div class="step">
      <h2 class="step-title">
        <span class="step-number">2</span>
        اسم ملف الإخراج
      </h2>
      <input
        type="text"
        id="output-filename"
        class="file-name-input"
        placeholder="سباق-الأبطال-لغتي-ثالث"
        value="سباق-الأبطال-لغتي-ثالث"
        autocomplete="off"
        spellcheck="false"
      >
      <p class="file-name-hint">سيُضاف .html تلقائياً · استخدم الشَّرطات لفصل الكلمات</p>
    </div>

    <!-- الخطوة 3: الإنشاء -->
    <div class="step" style="border-bottom:none;margin-bottom:0;padding-bottom:0;">
      <button class="btn-build" id="btn-build" disabled>
        <span>🏗️</span>
        <span>أنشئ النسخة وحمّلها</span>
      </button>

      <div class="progress-bar-wrap" id="progress-wrap">
        <div class="progress-bar">
          <div class="progress-fill" id="progress-fill"></div>
        </div>
        <p class="progress-label" id="progress-label">جاري البناء...</p>
      </div>

      <div class="success-box" id="success-box">
        <div class="success-emoji">✅</div>
        <p class="success-title" id="success-title">تم إنشاء النسخة بنجاح!</p>
        <p class="success-text" id="success-text">—</p>
      </div>
    </div>

  </div>
</div>

<script>
// ============================================================
// BUILDER LOGIC
// ============================================================

// ─── قالب HTML التطبيق (سيُملأ من index.html عند بناء builder) ───
// ⚠️ هذا الثابت MUST يُستبدَل بمحتوى index.html الكامل
// بواسطة سكربت بناء أو يدوياً
// ─────────────────────────────────────────────────────────────
// أثناء التطوير: اترك placeholder واضح
const APP_TEMPLATE_HTML = `__APP_TEMPLATE_PLACEHOLDER__`;
// بعد البناء: سيُستبدَل بمحتوى index.html الكامل كـ string
// ─────────────────────────────────────────────────────────────

let parsedData = null;
let hasErrors = false;

// ─── الـ DOM elements ───
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const previewBox = document.getElementById('preview-box');
const warningsBox = document.getElementById('warnings-box');
const errorsBox = document.getElementById('errors-box');
const warnsList = document.getElementById('warnings-list');
const errorsList = document.getElementById('errors-list');
const btnBuild = document.getElementById('btn-build');
const progressWrap = document.getElementById('progress-wrap');
const progressFill = document.getElementById('progress-fill');
const progressLabel = document.getElementById('progress-label');
const successBox = document.getElementById('success-box');
const outputFilename = document.getElementById('output-filename');

// ─── رفع الملف ───
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) processFile(file);
});
fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (file) processFile(file);
});

function processFile(file) {
  if (!file.name.endsWith('.json')) {
    showError('يجب أن يكون الملف بصيغة JSON.');
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      validateAndPreview(data);
    } catch (err) {
      showError('الملف ليس JSON صحيحاً: ' + err.message);
    }
  };
  reader.readAsText(file, 'utf-8');
}

// ─── فحص البيانات ───
function validateAndPreview(data) {
  parsedData = null;
  hasErrors = false;
  const errors = [];
  const warnings = [];

  // فحص الحقول الأساسية
  if (!data.appTitle) errors.push('الحقل "appTitle" مفقود.');
  if (!data.subject || !data.subject.id) errors.push('الحقل "subject.id" مفقود.');
  if (!data.subject?.name) errors.push('الحقل "subject.name" مفقود.');
  if (!data.subject?.color) warnings.push('الحقل "subject.color" مفقود — سيُستخدم اللون الافتراضي.');
  if (!data.grade) warnings.push('الحقل "grade" مفقود — سيظهر "الصف الدراسي".');
  if (!Array.isArray(data.units) || data.units.length === 0) {
    errors.push('يجب أن يحوي الملف مصفوفة "units" بوحدة واحدة على الأقل.');
  }

  // فحص الوحدات
  let totalQ = 0;
  const unitIds = new Set();
  if (Array.isArray(data.units)) {
    data.units.forEach((u, i) => {
      const label = u.name ? `"${u.name}"` : `(وحدة رقم ${i + 1})`;
      if (!u.id) errors.push(`الوحدة ${label} تفتقر لحقل "id".`);
      else if (unitIds.has(u.id)) errors.push(`الوحدة ${label}: الـ id "${u.id}" مكرّر.`);
      else unitIds.add(u.id);
      if (!u.name) warnings.push(`وحدة بـ id "${u.id}" ليس لها اسم.`);
      if (!Array.isArray(u.questions)) {
        errors.push(`الوحدة ${label} لا تحوي مصفوفة "questions".`);
      } else {
        if (u.questions.length < 5) warnings.push(`الوحدة ${label} لها ${u.questions.length} أسئلة فقط (يُنصح بـ 10+).`);
        u.questions.forEach((q, qi) => {
          const ql = `الوحدة ${label}، السؤال ${qi + 1}`;
          if (!q.text) errors.push(`${ql}: نص السؤال "text" مفقود.`);
          if (!Array.isArray(q.choices) || q.choices.length !== 4) {
            errors.push(`${ql}: يجب أن تحوي "choices" 4 اختيارات بالضبط.`);
          }
          if (typeof q.correctIndex !== 'number' || q.correctIndex < 0 || q.correctIndex > 3) {
            errors.push(`${ql}: "correctIndex" يجب أن يكون 0 أو 1 أو 2 أو 3.`);
          }
        });
        totalQ += u.questions.length;
      }
    });
  }

  // عرض المعاينة
  previewBox.classList.add('visible');
  setPreviewRow('pv-title', data.appTitle || '—', !data.appTitle ? 'bad' : 'good');
  setPreviewRow('pv-subject',
    data.subject ? `${data.subject.icon || ''} ${data.subject.name || ''}`.trim() : '—',
    !data.subject?.name ? 'bad' : 'good'
  );
  setPreviewRow('pv-grade', data.grade || '—', !data.grade ? 'warn' : 'good');
  setPreviewRow('pv-units',
    Array.isArray(data.units) ? `${data.units.length} وحدة` : '—',
    !Array.isArray(data.units) || data.units.length === 0 ? 'bad' : 'good'
  );
  setPreviewRow('pv-questions',
    totalQ > 0 ? `${totalQ} سؤال` : '0',
    totalQ === 0 ? 'bad' : totalQ < 30 ? 'warn' : 'good'
  );

  // عرض التحذيرات
  if (warnings.length > 0) {
    warnsList.innerHTML = warnings.map(w => `<li>${escapeHtml(w)}</li>`).join('');
    warningsBox.classList.add('visible');
  } else {
    warningsBox.classList.remove('visible');
  }

  // عرض الأخطاء
  if (errors.length > 0) {
    hasErrors = true;
    errorsList.innerHTML = errors.map(e => `<li>${escapeHtml(e)}</li>`).join('');
    errorsBox.classList.add('visible');
    btnBuild.disabled = true;
  } else {
    hasErrors = false;
    errorsBox.classList.remove('visible');
    parsedData = data;
    btnBuild.disabled = false;
    autoFillFilename(data);
  }
}

function setPreviewRow(id, value, cls = '') {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = value;
  el.className = `preview-value ${cls}`;
}

function autoFillFilename(data) {
  // اقترح اسم ملف مناسب
  const subject = data.subject?.name || 'مادة';
  const grade = (data.grade || '').replace('الصف ', '').replace(' الابتدائي', '');
  const suggestion = `سباق-الأبطال-${subject}-${grade}`;
  outputFilename.value = suggestion;
}

// ─── بناء النسخة ───
btnBuild.addEventListener('click', buildOutput);

async function buildOutput() {
  if (!parsedData || hasErrors) return;

  btnBuild.disabled = true;
  successBox.classList.remove('visible');
  progressWrap.classList.add('visible');
  setProgress(10, 'جاري التحقّق من البيانات...');

  await sleep(200);

  // تحقّق من وجود template
  if (!APP_TEMPLATE_HTML || APP_TEMPLATE_HTML === '__APP_TEMPLATE_PLACEHOLDER__') {
    alert('⚠️ builder.html لم يُدمج مع index.html بعد.\n\nتعليمات:\n1. افتح builder.html في VS Code.\n2. شغّل سكربت البناء: node build.js\n3. أو انظر قسم "دمج يدوي" في README.');
    btnBuild.disabled = false;
    progressWrap.classList.remove('visible');
    return;
  }

  setProgress(30, 'جاري حقن إعدادات التطبيق...');
  await sleep(200);

  // أنشئ config جديد من بيانات JSON
  const newConfig = buildNewConfig(parsedData);

  setProgress(50, 'جاري حقن الأسئلة...');
  await sleep(200);

  // أنشئ HTML النهائي
  let finalHtml = APP_TEMPLATE_HTML;

  // 1. استبدل APP_CONFIG
  finalHtml = injectAppConfig(finalHtml, newConfig);

  // 2. استبدل placeholder الأسئلة
  const questionsJson = JSON.stringify(parsedData, null, 0);
  finalHtml = finalHtml.replace(
    /(<script id="embedded-questions-data"[^>]*>)[\s\S]*?(<\/script>)/,
    `$1${questionsJson}$2`
  );

  setProgress(75, 'جاري تجميع الملف النهائي...');
  await sleep(200);

  // 3. تعديل العنوان في <title>
  finalHtml = finalHtml.replace(
    /<title>.*?<\/title>/,
    `<title>${escapeHtml(parsedData.appTitle || 'سباق الأبطال')}</title>`
  );

  setProgress(90, 'جاري تنزيل الملف...');
  await sleep(200);

  // 4. تنزيل
  const filename = sanitizeFilename(outputFilename.value || 'سباق-الأبطال') + '.html';
  downloadHtml(finalHtml, filename);

  setProgress(100, 'تم!');

  successBox.classList.add('visible');
  document.getElementById('success-title').textContent = `✅ تم إنشاء "${filename}" بنجاح!`;
  document.getElementById('success-text').textContent =
    `أرسل الملف للمعلمين. يعمل offline بدون إنترنت.\n` +
    `يحوي ${parsedData.units.length} وحدة بإجمالي ${countTotalQuestions(parsedData)} سؤال.`;

  btnBuild.disabled = false;
  setTimeout(() => progressWrap.classList.remove('visible'), 1500);
}

function buildNewConfig(data) {
  return {
    version: '1.0.0',
    buildDate: new Date().toISOString().split('T')[0],
    subject: {
      id: data.subject.id || 'languages',
      name: data.subject.name || 'المادة',
      icon: data.subject.icon || '📖',
      color: data.subject.color || '#10b981',
      colorDark: data.subject.colorDark || '#059669'
    },
    grade: data.grade || 'الصف الدراسي',
    gradeShort: (data.grade || '').replace('الصف ', '').replace(' الابتدائي', 'ابتدائي'),
    appLabel: `${data.subject?.name || ''} — ${(data.grade || '').replace('الصف ', '')}`,
    classesConfig: {
      boys: { enabled: true, count: 6, label: `${(data.grade || 'ثالث')} أولاد` },
      girls: { enabled: true, count: 6, label: `${(data.grade || 'ثالث')} بنات` }
    }
  };
}

function injectAppConfig(html, config) {
  // ابحث عن كتلة APP_CONFIG في الـ HTML وأبدلها
  const configStr = JSON.stringify(config, null, 2);
  return html.replace(
    /(const APP_CONFIG\s*=\s*){[\s\S]*?}(\s*;)/,
    `$1${configStr}$2`
  );
}

function downloadHtml(content, filename) {
  const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(a.href), 60000);
}

// ─── helpers ───
function setProgress(pct, label) {
  progressFill.style.width = pct + '%';
  progressLabel.textContent = label;
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function countTotalQuestions(data) {
  return (data.units || []).reduce((sum, u) => sum + (u.questions || []).length, 0);
}
function sanitizeFilename(name) {
  return name.trim().replace(/[<>:"/\\|?*]/g, '-').replace(/\s+/g, '-');
}
function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function showError(msg) {
  errorsBox.classList.add('visible');
  errorsList.innerHTML = `<li>${escapeHtml(msg)}</li>`;
}
</script>
</body>
</html>
```

### الخطوة الحاسمة: سكربت دمج `index.html` في `builder.html`

أنشئ ملف `build.js` يُشغَّل من سطر الأوامر (Node.js):

```javascript
// build.js
// يُشغَّل هكذا من مجلد المشروع:
//   node build.js
//
// ما يفعله:
//   1. يقرأ index.html
//   2. يقرأ builder.html
//   3. يُدمج index.html داخل builder.html كـ template string
//   4. يكتب النتيجة في builder-ready.html

const fs = require('fs');
const path = require('path');

// ─── مسارات الملفات ───
const INDEX_PATH = path.join(__dirname, 'index.html');
const BUILDER_PATH = path.join(__dirname, 'builder.html');
const OUTPUT_PATH = path.join(__dirname, 'builder-ready.html');

// ─── قراءة الملفات ───
console.log('📖 قراءة index.html...');
const indexHtml = fs.readFileSync(INDEX_PATH, 'utf-8');

console.log('📖 قراءة builder.html...');
let builderHtml = fs.readFileSync(BUILDER_PATH, 'utf-8');

// ─── تحضير index.html كـ string آمن ───
// نُهرّب backticks و backslashes حتى لا تُكسر template string
const safeIndexHtml = indexHtml
  .replace(/\\/g, '\\\\')
  .replace(/`/g, '\\`')
  .replace(/\$\{/g, '\\${');

// ─── حقن index.html في builder.html ───
const PLACEHOLDER = '`__APP_TEMPLATE_PLACEHOLDER__`';
const replacement = `\`${safeIndexHtml}\``;

if (!builderHtml.includes('__APP_TEMPLATE_PLACEHOLDER__')) {
  console.error('❌ لم يُعثَر على __APP_TEMPLATE_PLACEHOLDER__ في builder.html!');
  process.exit(1);
}

builderHtml = builderHtml.replace(PLACEHOLDER, replacement);

// ─── كتابة الملف النهائي ───
fs.writeFileSync(OUTPUT_PATH, builderHtml, 'utf-8');

const sizeKb = Math.round(fs.statSync(OUTPUT_PATH).size / 1024);
console.log(`✅ تم إنشاء builder-ready.html (${sizeKb} KB)`);
console.log('   افتح builder-ready.html في المتصفح لاستخدام صانع النسخ.');
```

---

## ما يجب أن يبقى كما هو (لا تحذفه)

1. ✅ كل ملفات التطبيق الأصلية.
2. ✅ كل JS CSS HTML من الشاشات السابقة.
3. ✅ ملفات `content-prep/` من الجلسة G.
4. ✅ Anime.js v4.

## القيود
- `builder.html` مستقل لا يعتمد على أي مكتبة.
- لا تعديل على منطق أي شاشة قائمة (فقط إضافة دعم البيانات المضمّنة في `data-units.js`).

---

## النتيجة المتوقّعة

### ملفات جديدة:
- `builder.html` — صانع النسخ الخام (يحتاج `node build.js`).
- `build.js` — سكربت الدمج.
- `builder-ready.html` — النتيجة بعد تشغيل `node build.js` (هذا ما تستخدمه).

### سير العمل الكامل:
```
1. أعدّ ملف JSON الأسئلة (مثلاً: questions-bank-لغتي-ثالث.json)
2. شغّل: node build.js
   ← يُنشئ builder-ready.html
3. افتح builder-ready.html في المتصفح
4. ارفع ملف JSON
5. شاهد المعاينة والفحص التلقائي
6. انقر "أنشئ النسخة وحمّلها"
   ← يُنزّل: سباق-الأبطال-لغتي-ثالث.html
7. أرسل الملف للمعلمة
```

### الملف الناتج (`سباق-الأبطال-لغتي-ثالث.html`):
- ملف HTML واحد مكتفٍ بذاته.
- `APP_CONFIG` مُحدَّث بالمادة والصف.
- الأسئلة محقونة في `<script id="embedded-questions-data">`.
- عند أول فتح: التطبيق يقرأ الأسئلة المضمّنة ويبني البنك تلقائياً.
- البنك التجريبي **لا يُحقن** (لأن العلم `SAMPLE_INJECTED_FLAG_KEY` مُعيَّن مسبقاً).

## فحص نهائي
- [ ] `builder.html` يُنشأ بشكل صحيح؟
- [ ] `build.js` يعمل بـ `node build.js` دون أخطاء؟
- [ ] `builder-ready.html` يُنشأ ويُفتح في المتصفح؟
- [ ] رفع JSON صحيح يُظهر المعاينة بالبيانات الصحيحة؟
- [ ] الأخطاء تُوقف زر البناء، التحذيرات لا توقفه؟
- [ ] تسمية الملف تقترح اسماً مناسباً من بيانات JSON؟
- [ ] النقر على "أنشئ" ينزّل ملف HTML صحيح؟
- [ ] الملف المُنزَّل يعمل offline عند فتحه؟
- [ ] الملف المُنزَّل يعرض المادة الصحيحة (من JSON لا من APP_CONFIG الافتراضي)؟
- [ ] عند فتحه لأول مرة: لا أسئلة تجريبية — فقط أسئلة JSON؟
- [ ] لا أخطاء في console عند فتح الملف المُنزَّل؟