/* ═══════════════════════════════════════════════════
   screen-setup.js — منطق شاشة الإعداد الأولي
   ═══════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {

  // ─── 1. توليد قوائم الفصول ───────────────────────

  function buildClassList(containerId, gender, labelPrefix, count = 6) {
    const container = document.getElementById(containerId);
    if (!container) return;

    for (let n = 1; n <= count; n++) {
      const classId   = `${gender}-${n}`;
      const labelText = `${labelPrefix} (${n})`;

      const labelEl = document.createElement('label');
      labelEl.className = 'checkbox-item';

      const input = document.createElement('input');
      input.type            = 'checkbox';
      input.dataset.classId = classId;
      input.dataset.gender  = gender;
      input.dataset.label   = labelText;
      input.addEventListener('change', validateSetupForm);

      const span = document.createElement('span');
      span.textContent = labelText;

      labelEl.appendChild(input);
      labelEl.appendChild(span);
      container.appendChild(labelEl);
    }
  }

  // قراءة إعدادات الفصول من APP_CONFIG (مع fallback)
  const cc      = (typeof APP_CONFIG !== 'undefined') ? (APP_CONFIG.classesConfig || {}) : {};
  const ccBoys  = cc.boys  || {};
  const ccGirls = cc.girls || {};

  if (ccBoys.enabled !== false) {
    buildClassList('boys-classes',  'boys',
      ccBoys.label  || 'أولاد',
      ccBoys.count  ?? 6);
  } else {
    document.querySelector('.boys-column')?.classList.add('hidden');
  }

  if (ccGirls.enabled !== false) {
    buildClassList('girls-classes', 'girls',
      ccGirls.label || 'بنات',
      ccGirls.count ?? 6);
  } else {
    document.querySelector('.girls-column')?.classList.add('hidden');
  }

  // ─── 2. مراجع العناصر ────────────────────────────

  const inputTeacher     = document.getElementById('input-teacher-name');
  const inputSchool      = document.getElementById('input-school-name');
  const inputCompetition = document.getElementById('input-competition-name');
  const btnConfirm       = document.getElementById('btn-setup-confirm');
  const hintEl           = document.getElementById('setup-hint');

  // ─── 3. التحقق من اكتمال النموذج ─────────────────

  function validateSetupForm() {
    const teacherFilled     = inputTeacher.value.trim().length > 0;
    const schoolFilled      = inputSchool.value.trim().length > 0;
    const competitionFilled = inputCompetition.value.trim().length > 0;

    const anyClassChecked = document.querySelectorAll(
      '#boys-classes input:checked, #girls-classes input:checked'
    ).length > 0;

    const isValid = teacherFilled && schoolFilled && competitionFilled && anyClassChecked;

    btnConfirm.disabled = !isValid;

    if (isValid) {
      hintEl.classList.add('hidden');
    } else {
      hintEl.classList.remove('hidden');
      buildHintMessage(teacherFilled, schoolFilled, competitionFilled, anyClassChecked);
    }
  }

  function buildHintMessage(teacher, school, competition, anyClass) {
    const missing = [];
    if (!teacher)     missing.push('اسم المعلمة');
    if (!school)      missing.push('اسم المدرسة');
    if (!competition) missing.push('اسم المسابقة');
    if (!anyClass)    missing.push('فصل واحد على الأقل');

    if (missing.length > 0) {
      hintEl.textContent = `يرجى إكمال: ${missing.join(' ، ')}`;
    }
  }

  // كشف validateSetupForm عالمياً (تستخدمها screen-classes.js)
  window.validateSetupForm = validateSetupForm;

  // ربط الأحداث بحقول النص
  [inputTeacher, inputSchool, inputCompetition].forEach(input => {
    input.addEventListener('input', validateSetupForm);
  });

  // التحقق الأولي (اسم المسابقة معبّأ مسبقاً لكن الحقول الأخرى فارغة)
  validateSetupForm();

  // ─── 4. أنميشن الدخول بـ Anime.js v4 ─────────────

  // نتحقق من وجود المكتبة قبل استخدامها (لأن الملف placeholder حالياً)
  if (typeof anime !== 'undefined') {
    const { animate, stagger } = anime;

    // إظهار الكرت الرئيسي
    animate('.setup-card', {
      translateY: [30, 0],
      opacity:    [0, 1],
      duration:   600,
      ease:       'outCubic',
    });

    // إظهار الأقسام تتالياً
    animate('.setup-section', {
      translateY: [20, 0],
      opacity:    [0, 1],
      duration:   500,
      delay:      stagger(100, { start: 200 }),
      ease:       'outCubic',
    });

  } else {
    // fallback: إظهار مباشر بدون أنميشن حتى تُضاف المكتبة
    const card = document.querySelector('.setup-card');
    if (card) card.style.opacity = '1';

    document.querySelectorAll('.setup-section').forEach(sec => {
      sec.style.opacity = '1';
    });
  }

  // ─── 5. حفظ البيانات عند النقر على موافق ─────────

  btnConfirm.addEventListener('click', () => {
    const selectedClasses = Array.from(
      document.querySelectorAll('#boys-classes input:checked, #girls-classes input:checked')
    ).map(input => ({
      id:     input.dataset.classId,
      gender: input.dataset.gender,
      label:  input.dataset.label,
    }));

    const setupData = {
      teacherName:     inputTeacher.value.trim(),
      schoolName:      inputSchool.value.trim(),
      competitionName: inputCompetition.value.trim(),
      selectedClasses,
      setupCompleted:  true,
      setupDate:       new Date().toISOString(),
    };

    // أنميشن fade-out ثم حفظ وإشعار
    if (typeof anime !== 'undefined') {
      const { animate } = anime;

      animate('.setup-card', {
        opacity:    [1, 0],
        translateY: [0, -20],
        duration:   500,
        ease:       'inOutQuad',
        onComplete() {
          saveSetup(setupData);
          console.log('Setup saved:', setupData);
          if (typeof updateTopBarFromConfig === 'function') updateTopBarFromConfig();
          showScreen('screen-classes');
          if (typeof renderClassesScreen === 'function') {
            renderClassesScreen();
          }
        },
      });

    } else {
      // fallback بدون أنميشن
      saveSetup(setupData);
      console.log('Setup saved:', setupData);
      if (typeof updateTopBarFromConfig === 'function') updateTopBarFromConfig();
      showScreen('screen-classes');
      if (typeof renderClassesScreen === 'function') {
        renderClassesScreen();
      }
    }
  });

});
