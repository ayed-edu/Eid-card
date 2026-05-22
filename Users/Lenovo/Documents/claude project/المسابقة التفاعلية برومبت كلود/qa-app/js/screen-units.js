/* ═══════════════════════════════════════════════════
   screen-units.js — شاشة اختيار الوحدة
   ═══════════════════════════════════════════════════ */

let currentUnitContext = null;
// شكل currentUnitContext:
//   وحدة:     { mode: 'unit',          subjectId, unitId, unitName }
//   شاملة:    { mode: 'comprehensive', subjectId,         unitName: 'أسئلة شاملة' }

// ─── فتح الشاشة ─────────────────────────────────

function openUnitsScreen(subject) {
  // إن لم يُمرَّر subject، خذه من APP_CONFIG
  if (!subject && typeof APP_CONFIG !== 'undefined') {
    subject = APP_CONFIG.subject;
  }
  if (!subject || !currentClassContext) {
    alert('سياق غير مكتمل (مادة أو فصل).');
    return;
  }

  // تهيئة البنك عند أول دخول
  ensureQuestionsBankInitialized();

  currentSubjectContext = subject;

  // pill السياق
  const pill = document.getElementById('units-context-pill');
  pill.classList.remove('gender-boys', 'gender-girls');
  pill.classList.add(`gender-${currentClassContext.gender}`);
  document.getElementById('units-ctx-class').textContent        = currentClassContext.label;
  document.getElementById('units-ctx-subject-icon').textContent = subject.icon;
  document.getElementById('units-ctx-subject').textContent      = subject.name;

  // لون المادة كمتغيّر CSS على القسم
  const section = document.getElementById('screen-units');
  section.style.setProperty('--current-subject-color',      subject.color);
  section.style.setProperty('--current-subject-color-dark', subject.colorDark);

  renderComprehensiveCard(subject);
  renderUnitsGrid(subject);
  showScreen('screen-units');

  if (typeof anime !== 'undefined') {
    const { animate, stagger } = anime;

    animate('.units-page-title', {
      translateY: [-20, 0],
      opacity:    [0, 1],
      duration:   500,
      ease:       'outCubic',
    });

    animate('.comprehensive-card', {
      translateY: [30, 0],
      opacity:    [0, 1],
      duration:   600,
      delay:      100,
      ease:       'outCubic',
    });

    animate('.unit-card', {
      translateY: [30, 0],
      opacity:    [0, 1],
      scale:      [0.95, 1],
      duration:   500,
      delay:      stagger(60, { start: 300 }),
      ease:       'outCubic',
    });
  } else {
    // fallback بدون أنميشن
    document.querySelector('.units-page-title').style.opacity  = '1';
    document.querySelector('.comprehensive-card').style.opacity = '1';
    document.querySelectorAll('.unit-card').forEach(c => { c.style.opacity = '1'; });
  }
}

// ─── بطاقة الأسئلة الشاملة ──────────────────────

function renderComprehensiveCard(subject) {
  const total = getSubjectTotalQuestions(subject.id);
  const card  = document.getElementById('comprehensive-card');

  document.getElementById('cc-count').textContent = total;

  if (total === 0) {
    card.classList.add('disabled');
    card.onclick = () => alert('لا توجد أسئلة في أي وحدة بعد. أضيفي أسئلة أولاً.');
  } else {
    card.classList.remove('disabled');
    card.onclick = () => handleComprehensiveClick(subject);
  }
}

// ─── شبكة الوحدات ────────────────────────────────

function renderUnitsGrid(subject) {
  const units = getUnitsForSubject(subject.id);
  const grid  = document.getElementById('units-grid');
  grid.innerHTML = '';

  // فحص: هل البنك بالكامل فارغ لهذه المادة؟
  const totalForSubject = (typeof getSubjectTotalQuestions === 'function')
    ? getSubjectTotalQuestions(subject.id) : 0;

  if (totalForSubject === 0) {
    grid.classList.add('units-grid-empty-state');
    const emptyCard = document.createElement('div');
    emptyCard.className = 'empty-bank-card';

    const emojiEl = document.createElement('div');
    emojiEl.className   = 'empty-bank-emoji';
    emojiEl.textContent = '📭';

    const titleEl = document.createElement('h3');
    titleEl.className   = 'empty-bank-title';
    titleEl.textContent = `بنك أسئلة "${subject.name}" فارغ تماماً`;

    const textEl = document.createElement('p');
    textEl.className = 'empty-bank-text';
    textEl.innerHTML = 'لم تُضَف أيّ أسئلة بعد لهذه المادة.<br>ستحتاجين لإضافة أسئلة من شاشة <strong>"إدارة الأسئلة"</strong> (قادمة قريباً).';

    emptyCard.appendChild(emojiEl);
    emptyCard.appendChild(titleEl);
    emptyCard.appendChild(textEl);
    grid.appendChild(emptyCard);
    return;
  }

  // إن وُجدت أسئلة: ارسم البطاقات كالمعتاد
  grid.classList.remove('units-grid-empty-state');

  units.forEach(unit => {
    const count = Array.isArray(unit.questions) ? unit.questions.length : 0;
    const isEmpty = count === 0;

    const card = document.createElement('div');
    card.className      = `unit-card${isEmpty ? ' empty' : ''}`;
    card.dataset.unitId = unit.id;

    let countText;
    if (isEmpty) {
      countText = 'فارغة';
    } else if (count === 1) {
      countText = 'سؤال';
    } else if (count === 2) {
      countText = 'سؤالان';
    } else if (count <= 10) {
      countText = `${count} أسئلة`;
    } else {
      countText = `${count} سؤالاً`;
    }

    const orderEl = document.createElement('div');
    orderEl.className   = 'unit-order';
    orderEl.textContent = unit.order;

    const nameEl = document.createElement('div');
    nameEl.className   = 'unit-name';
    nameEl.textContent = unit.name;

    const metaEl = document.createElement('div');
    metaEl.className   = `unit-meta${isEmpty ? ' empty' : ''}`;
    metaEl.textContent = countText;

    card.appendChild(orderEl);
    card.appendChild(nameEl);
    card.appendChild(metaEl);

    if (!isEmpty) {
      const editBtn       = document.createElement('button');
      editBtn.type        = 'button';
      editBtn.className   = 'btn-unit-edit';
      editBtn.textContent = '✏️';
      editBtn.title       = 'تعديل الأسئلة';
      editBtn.addEventListener('click', e => {
        e.stopPropagation();
        if (typeof openEditUnitScreen === 'function') openEditUnitScreen(subject, unit);
      });
      card.appendChild(editBtn);
    }

    card.addEventListener('click', () => handleUnitClick(subject, unit, count));
    grid.appendChild(card);
  });
}

// ─── معالجات النقر ───────────────────────────────

function handleUnitClick(subject, unit, count) {
  if (count === 0) {
    alert(`وحدة "${unit.name}" فارغة بعد.\n(شاشة إضافة الأسئلة ستُبنى لاحقاً)`);
    return;
  }
  currentUnitContext = {
    mode:      'unit',
    subjectId: subject.id,
    unitId:    unit.id,
    unitName:  unit.name,
  };
  if (typeof openQuizSettingsScreen === 'function') openQuizSettingsScreen();
}

function handleComprehensiveClick(subject) {
  currentUnitContext = {
    mode:      'comprehensive',
    subjectId: subject.id,
    unitName:  'أسئلة شاملة',
  };
  if (typeof openQuizSettingsScreen === 'function') openQuizSettingsScreen();
}

function backToSubjects() {
  // في نموذج المادة الواحدة: الرجوع يعود لشاشة طلاب الفصل
  showScreen('screen-class-students');
}

// ─── ربط الأحداث ────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-back-to-subjects')
    ?.addEventListener('click', backToSubjects);
});
