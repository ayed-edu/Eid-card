/* ═══════════════════════════════════════════════════
   screen-classes.js — منطق شاشة الفصول
   ═══════════════════════════════════════════════════ */

const STUDENTS_STORAGE_KEY = 'qa_app_students';

function loadStudents() {
  const raw = localStorage.getItem(STUDENTS_STORAGE_KEY);
  return raw ? JSON.parse(raw) : {};
}

function renderTopBar(setup) {
  document.getElementById('tb-competition-name').textContent = setup.competitionName || 'سباق الأبطال';
  document.getElementById('tb-teacher-name').textContent    = setup.teacherName     || '';
  document.getElementById('tb-school-name').textContent     = setup.schoolName      || '';
  document.getElementById('top-bar').classList.remove('hidden');
}

function getStudentWord(count, gender) {
  if (gender === 'boys') {
    if (count === 1) return 'طالب';
    if (count === 2) return 'طالبان';
    return 'طالباً';
  }
  if (count === 1) return 'طالبة';
  if (count === 2) return 'طالبتان';
  return 'طالبة';
}

function renderClassCard(cls, studentsMap) {
  const card = document.createElement('div');
  card.className      = 'class-card';
  card.dataset.classId = cls.id;
  card.dataset.gender  = cls.gender;

  const students = studentsMap[cls.id] || [];
  const isFilled = students.length > 0;

  if (isFilled) {
    card.classList.add('filled');
    const word = getStudentWord(students.length, cls.gender);
    card.innerHTML = `
      <div class="class-status-icon">✓</div>
      <div class="class-name">${cls.label}</div>
      <div class="class-status">${students.length} ${word}</div>
    `;
  } else {
    card.classList.add('empty');
    const addLabel = cls.gender === 'boys' ? 'إضافة طلاب' : 'إضافة طالبات';
    card.innerHTML = `
      <div class="class-status-icon">+</div>
      <div class="class-name">${cls.label}</div>
      <div class="class-status">${addLabel}</div>
    `;
  }

  card.addEventListener('click', () => handleClassCardClick(cls, isFilled));
  return card;
}

function handleClassCardClick(cls, isFilled) {
  if (isFilled) {
    if (typeof openClassStudentsScreen === 'function') {
      openClassStudentsScreen(cls);
    } else {
      alert('شاشة طلاب الفصل غير محمَّلة.');
    }
  } else {
    if (typeof openAddStudentsScreen === 'function') {
      openAddStudentsScreen(cls);
    } else {
      alert('شاشة إضافة الطلاب غير محمَّلة.');
    }
  }
}

function renderClassesScreen() {
  const setup = loadSetup();
  if (!setup || !setup.setupCompleted) return;

  renderTopBar(setup);

  const studentsMap   = loadStudents();
  const boysList      = document.getElementById('boys-cards-list');
  const girlsList     = document.getElementById('girls-cards-list');
  const boysEmptyMsg  = document.getElementById('boys-empty-msg');
  const girlsEmptyMsg = document.getElementById('girls-empty-msg');

  boysList.innerHTML  = '';
  girlsList.innerHTML = '';

  const boys  = setup.selectedClasses.filter(c => c.gender === 'boys');
  const girls = setup.selectedClasses.filter(c => c.gender === 'girls');

  boys.forEach(cls  => boysList.appendChild(renderClassCard(cls, studentsMap)));
  girls.forEach(cls => girlsList.appendChild(renderClassCard(cls, studentsMap)));

  boysEmptyMsg.style.display  = boys.length  === 0 ? 'block' : 'none';
  girlsEmptyMsg.style.display = girls.length === 0 ? 'block' : 'none';

  // أنميشن دخول البطاقات
  if (typeof anime !== 'undefined') {
    const { animate, stagger } = anime;

    animate('.classes-page-title', {
      translateY: [-20, 0],
      opacity:    [0, 1],
      duration:   600,
      ease:       'outCubic',
    });

    animate('.class-card', {
      translateY: [30, 0],
      opacity:    [0, 1],
      duration:   500,
      delay:      stagger(60),
      ease:       'outCubic',
    });
  }
}

// ─── أحداث شاشة الفصول ───────────────────────────

document.addEventListener('DOMContentLoaded', () => {

  // زر تعديل الفصول المختارة
  const editBtn = document.getElementById('btn-edit-classes');
  if (editBtn) {
    editBtn.addEventListener('click', () => {
      const setup = loadSetup();
      if (setup) {
        // تعبئة حقول النص بالبيانات المحفوظة
        document.getElementById('input-teacher-name').value     = setup.teacherName     || '';
        document.getElementById('input-school-name').value      = setup.schoolName      || '';
        document.getElementById('input-competition-name').value = setup.competitionName || 'سباق الأبطال';

        // إعادة تعليم checkboxes الفصول المحفوظة
        const savedIds = setup.selectedClasses.map(c => c.id);
        document.querySelectorAll('#screen-setup input[type="checkbox"]').forEach(cb => {
          cb.checked = savedIds.includes(cb.dataset.classId);
        });

        // إعادة تشغيل التحقق لتفعيل الزر
        if (typeof window.validateSetupForm === 'function') {
          window.validateSetupForm();
        }

        // إعادة إظهار كرت الإعداد (قد يكون opacity=0 من أنميشن سابق)
        const card = document.querySelector('.setup-card');
        if (card) card.style.opacity = '1';
      }

      document.getElementById('top-bar').classList.add('hidden');
      showScreen('screen-setup');
    });
  }

  // زر الإعدادات
  const settingsBtn = document.getElementById('btn-settings');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      alert('شاشة الإعدادات ستُبنى لاحقاً');
    });
  }

});
