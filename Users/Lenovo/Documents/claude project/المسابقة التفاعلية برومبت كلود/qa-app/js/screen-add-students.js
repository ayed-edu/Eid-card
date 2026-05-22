/* ═══════════════════════════════════════════════════
   screen-add-students.js — شاشة إضافة الطلاب/الطالبات
   ═══════════════════════════════════════════════════ */

let currentAddClassContext = null;

function openAddStudentsScreen(cls) {
  currentAddClassContext = cls;

  const card = document.querySelector('.add-students-card');
  card.classList.remove('gender-boys', 'gender-girls');
  card.classList.add(`gender-${cls.gender}`);

  // النصوص حسب الجنس
  const actionLabel = cls.gender === 'boys' ? 'إضافة طلاب' : 'إضافة طالبات';
  const genderWord  = cls.gender === 'boys' ? 'الطلاب'     : 'الطالبات';
  document.getElementById('add-students-action-label').textContent = actionLabel;
  document.getElementById('add-students-class-label').textContent  = cls.label;
  document.getElementById('hint-gender-word').textContent          = genderWord;

  // إعادة ضبط المربع والعدّاد
  const textarea = document.getElementById('students-textarea');
  textarea.value = '';
  updateStudentsCounter();

  showScreen('screen-add-students');

  if (typeof anime !== 'undefined') {
    const { animate } = anime;
    animate('.add-students-card', {
      translateY: [30, 0],
      opacity:    [0, 1],
      duration:   500,
      ease:       'outCubic',
    });
  } else {
    document.querySelector('.add-students-card').style.opacity = '1';
  }

  // focus بعد الأنميشن
  setTimeout(() => textarea.focus(), 400);
}

function countValidLines(rawText) {
  return rawText.split('\n')
    .map(l => l.trim().replace(/\s+/g, ' '))
    .filter(l => l.length > 0).length;
}

function cleanStudentNames(rawText) {
  const lines = rawText.split('\n');
  const cleaned    = [];
  const duplicates = [];
  const seen       = new Set();

  for (const line of lines) {
    const trimmed = line.trim().replace(/\s+/g, ' ');
    if (!trimmed) continue;
    if (seen.has(trimmed)) {
      duplicates.push(trimmed);
      continue;
    }
    seen.add(trimmed);
    cleaned.push(trimmed);
  }

  return { cleaned, duplicates };
}

function updateCounterWord(count, gender) {
  const wordEl = document.getElementById('counter-word');
  if (!wordEl) return;

  if (gender === 'boys') {
    if (count === 0)                          wordEl.textContent = 'طلاب';
    else if (count === 1)                     wordEl.textContent = 'طالب';
    else if (count === 2)                     wordEl.textContent = 'طالبان';
    else if (count >= 3 && count <= 10)       wordEl.textContent = 'طلاب';
    else                                      wordEl.textContent = 'طالباً';
  } else {
    if (count === 0)                          wordEl.textContent = 'طالبات';
    else if (count === 1)                     wordEl.textContent = 'طالبة';
    else if (count === 2)                     wordEl.textContent = 'طالبتان';
    else if (count >= 3 && count <= 10)       wordEl.textContent = 'طالبات';
    else                                      wordEl.textContent = 'طالبة';
  }
}

function updateStudentsCounter() {
  const textarea  = document.getElementById('students-textarea');
  const counterEl = document.getElementById('students-counter');
  const saveBtn   = document.getElementById('btn-save-students');

  const count = countValidLines(textarea.value);
  counterEl.textContent = count;

  if (currentAddClassContext) {
    updateCounterWord(count, currentAddClassContext.gender);
  }

  saveBtn.disabled = (count === 0);
}

function saveStudents() {
  if (!currentAddClassContext) return;

  const textarea = document.getElementById('students-textarea');
  const { cleaned, duplicates } = cleanStudentNames(textarea.value);

  if (cleaned.length === 0) {
    alert('لم يتم إدخال أسماء صالحة.');
    return;
  }

  if (duplicates.length > 0) {
    const preview = duplicates.slice(0, 5).join('\n') + (duplicates.length > 5 ? '\n...' : '');
    const proceed = confirm(
      `وجدنا ${duplicates.length} اسماً مكرّراً، وسيتم حذف التكرار تلقائياً.\n\nالأسماء المكرّرة:\n${preview}\n\nهل تريدين المتابعة؟`
    );
    if (!proceed) return;
  }

  const ts       = Date.now();
  const students = cleaned.map((name, i) => ({
    id:     `s_${ts}_${i}`,
    name,
    gender: currentAddClassContext.gender,
  }));

  const all = loadStudents();
  all[currentAddClassContext.id] = students;
  localStorage.setItem(STUDENTS_STORAGE_KEY, JSON.stringify(all));

  if (typeof anime !== 'undefined') {
    const { animate } = anime;
    animate('.add-students-card', {
      translateY: [0, -20],
      opacity:    [1, 0],
      duration:   400,
      ease:       'inOutQuad',
      onComplete() {
        currentAddClassContext = null;
        showScreen('screen-classes');
        if (typeof renderClassesScreen === 'function') renderClassesScreen();
      },
    });
  } else {
    currentAddClassContext = null;
    showScreen('screen-classes');
    if (typeof renderClassesScreen === 'function') renderClassesScreen();
  }
}

function cancelAddStudents() {
  const textarea   = document.getElementById('students-textarea');
  const hasContent = textarea.value.trim().length > 0;

  if (hasContent) {
    const ok = confirm('سيتم تجاهل الأسماء المُدخَلة. هل أنت متأكدة؟');
    if (!ok) return;
  }

  currentAddClassContext = null;
  showScreen('screen-classes');
  if (typeof renderClassesScreen === 'function') renderClassesScreen();
}

// ─── ربط الأحداث ────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const textarea  = document.getElementById('students-textarea');
  const saveBtn   = document.getElementById('btn-save-students');
  const cancelBtn = document.getElementById('btn-cancel-students');
  const backBtn   = document.getElementById('btn-back-to-classes-1');

  if (textarea) {
    textarea.addEventListener('input', updateStudentsCounter);
    textarea.addEventListener('paste', () => setTimeout(updateStudentsCounter, 50));
  }

  saveBtn?.addEventListener('click',   saveStudents);
  cancelBtn?.addEventListener('click', cancelAddStudents);
  backBtn?.addEventListener('click',   cancelAddStudents);
});
