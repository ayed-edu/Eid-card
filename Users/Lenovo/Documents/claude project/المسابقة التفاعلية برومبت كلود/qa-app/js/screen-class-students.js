/* ═══════════════════════════════════════════════════
   screen-class-students.js — شاشة طلاب الفصل
   ═══════════════════════════════════════════════════ */

let currentClassContext       = null;
let originalStudentsSnapshot  = null;

// دالة الصيغة العربية (تُغطّي جميع الحالات بشكل أكمل من الإصدار السابق)
function getStudentWord(count, gender) {
  if (gender === 'boys') {
    if (count === 0)                    return 'طلاب';
    if (count === 1)                    return 'طالب';
    if (count === 2)                    return 'طالبان';
    if (count >= 3 && count <= 10)      return 'طلاب';
    return 'طالباً';
  } else {
    if (count === 0)                    return 'طالبات';
    if (count === 1)                    return 'طالبة';
    if (count === 2)                    return 'طالبتان';
    if (count >= 3 && count <= 10)      return 'طالبات';
    return 'طالبة';
  }
}

// ─── فتح الشاشة ─────────────────────────────────

function openClassStudentsScreen(cls) {
  currentClassContext = cls;

  const card = document.getElementById('class-students-card');
  card.classList.remove('gender-boys', 'gender-girls');
  card.classList.add(`gender-${cls.gender}`);

  document.getElementById('cs-class-label').textContent = cls.label;

  // وضع العرض فعّال، وضع التعديل مخفي
  document.getElementById('cs-view-mode').style.display  = '';
  document.getElementById('cs-edit-mode').style.display  = 'none';

  renderStudentsList();
  showScreen('screen-class-students');

  if (typeof anime !== 'undefined') {
    const { animate, stagger } = anime;

    animate('.class-students-card', {
      translateY: [30, 0],
      opacity:    [0, 1],
      duration:   500,
      ease:       'outCubic',
    });

    animate('.student-row', {
      translateX: [20, 0],
      opacity:    [0, 1],
      duration:   400,
      delay:      stagger(40),
      ease:       'outCubic',
    });
  } else {
    document.getElementById('class-students-card').style.opacity = '1';
  }
}

// ─── رسم قائمة الطلاب (وضع العرض) ──────────────

function renderStudentsList() {
  if (!currentClassContext) return;

  const all      = loadStudents();
  const students = all[currentClassContext.id] || [];

  document.getElementById('cs-students-count').textContent = students.length;
  document.getElementById('cs-students-word').textContent  =
    getStudentWord(students.length, currentClassContext.gender);

  const list = document.getElementById('cs-students-list');
  list.innerHTML = '';

  students.forEach((s, i) => {
    const row = document.createElement('div');
    row.className = 'student-row';

    const numSpan  = document.createElement('span');
    numSpan.className   = 'student-number';
    numSpan.textContent = i + 1;

    const nameSpan  = document.createElement('span');
    nameSpan.className   = 'student-name';
    nameSpan.textContent = s.name;

    row.appendChild(numSpan);
    row.appendChild(nameSpan);
    list.appendChild(row);
  });
}

// ─── وضع التعديل ─────────────────────────────────

function enterEditMode() {
  if (!currentClassContext) return;

  const all = loadStudents();
  originalStudentsSnapshot = JSON.parse(JSON.stringify(all[currentClassContext.id] || []));

  document.getElementById('cs-view-mode').style.display = 'none';
  document.getElementById('cs-edit-mode').style.display = '';

  renderEditList(originalStudentsSnapshot);
}

function renderEditList(students) {
  const list = document.getElementById('cs-students-edit-list');
  list.innerHTML = '';
  students.forEach((s, i) => list.appendChild(buildEditRow(s.name, i)));
}

function buildEditRow(name, index) {
  const row = document.createElement('div');
  row.className = 'student-edit-row';

  const numSpan = document.createElement('span');
  numSpan.className   = 'student-number';
  numSpan.textContent = index + 1;

  const input = document.createElement('input');
  input.type        = 'text';
  input.className   = 'student-input';
  input.value       = name;
  input.placeholder = 'اسم الطالب/الطالبة';

  const deleteBtn = document.createElement('button');
  deleteBtn.type      = 'button';
  deleteBtn.className = 'btn-delete-row';
  deleteBtn.textContent = '🗑️';
  deleteBtn.title     = 'حذف';
  deleteBtn.addEventListener('click', () => {
    const currentName = input.value.trim() || name;
    if (confirm(`حذف "${currentName}"؟`)) {
      row.remove();
      refreshEditNumbers();
    }
  });

  row.appendChild(numSpan);
  row.appendChild(input);
  row.appendChild(deleteBtn);
  return row;
}

function refreshEditNumbers() {
  document.querySelectorAll('#cs-students-edit-list .student-edit-row').forEach((r, i) => {
    r.querySelector('.student-number').textContent = i + 1;
  });
}

function addNewEditRow() {
  const list   = document.getElementById('cs-students-edit-list');
  const newRow = buildEditRow('', list.children.length);
  list.appendChild(newRow);
  refreshEditNumbers();
  newRow.querySelector('.student-input').focus();
}

// ─── حفظ التعديلات ──────────────────────────────

function saveEdits() {
  if (!currentClassContext) return;

  const inputs     = document.querySelectorAll('#cs-students-edit-list .student-input');
  const cleaned    = [];
  const seen       = new Set();
  let   duplicates = 0;

  inputs.forEach(inp => {
    const name = inp.value.trim().replace(/\s+/g, ' ');
    if (!name) return;
    if (seen.has(name)) { duplicates++; return; }
    seen.add(name);
    cleaned.push(name);
  });

  if (cleaned.length === 0) {
    alert('يجب وجود اسم واحد على الأقل في القائمة.');
    return;
  }

  if (duplicates > 0) {
    const ok = confirm(`وجدنا ${duplicates} اسماً مكرّراً وسيتم حذف التكرار. متابعة؟`);
    if (!ok) return;
  }

  // الحفاظ على id الأسماء غير المتغيّرة
  const ts          = Date.now();
  const prevById    = new Map();
  (originalStudentsSnapshot || []).forEach(s => prevById.set(s.name, s.id));

  const updated = cleaned.map((name, i) => ({
    id:     prevById.get(name) || `s_${ts}_${i}`,
    name,
    gender: currentClassContext.gender,
  }));

  const all = loadStudents();
  all[currentClassContext.id] = updated;
  localStorage.setItem(STUDENTS_STORAGE_KEY, JSON.stringify(all));

  originalStudentsSnapshot = null;
  exitEditModeUI();
  renderStudentsList();

  // أنميشن تحديث القائمة
  if (typeof anime !== 'undefined') {
    const { animate, stagger } = anime;
    animate('.student-row', {
      translateX: [10, 0],
      opacity:    [0, 1],
      duration:   350,
      delay:      stagger(30),
      ease:       'outCubic',
    });
  }
}

// ─── إلغاء التعديل ──────────────────────────────

function cancelEdits() {
  const inputs         = document.querySelectorAll('#cs-students-edit-list .student-input');
  const currentValues  = Array.from(inputs).map(i => i.value.trim());
  const originalValues = (originalStudentsSnapshot || []).map(s => s.name);

  const changed =
    currentValues.length !== originalValues.length ||
    currentValues.some((v, i) => v !== originalValues[i]);

  if (changed) {
    const ok = confirm('سيتم تجاهل التعديلات. متابعة؟');
    if (!ok) return;
  }

  originalStudentsSnapshot = null;
  exitEditModeUI();
}

function exitEditModeUI() {
  document.getElementById('cs-edit-mode').style.display = 'none';
  document.getElementById('cs-view-mode').style.display = '';
}

// ─── التنقّل ─────────────────────────────────────

function backToClasses() {
  currentClassContext      = null;
  originalStudentsSnapshot = null;
  showScreen('screen-classes');
  if (typeof renderClassesScreen === 'function') renderClassesScreen();
}

function continueToUnits() {
  if (!currentClassContext) {
    alert('لا يوجد فصل مختار.');
    return;
  }

  // currentSubjectContext مُعيَّن تلقائياً من APP_CONFIG في initFromConfig()
  if (!currentSubjectContext) {
    console.error('currentSubjectContext غير مُعيَّن — تأكد من تحميل app-config.js');
    return;
  }

  if (typeof openUnitsScreen === 'function') {
    openUnitsScreen(currentSubjectContext);
  } else {
    alert('شاشة الوحدات غير محمَّلة.');
  }
}

// ─── ربط الأحداث ────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-back-to-classes-2')?.addEventListener('click',    backToClasses);
  document.getElementById('btn-continue-to-subjects')?.addEventListener('click', continueToUnits);
  document.getElementById('btn-edit-students')?.addEventListener('click',        enterEditMode);
  document.getElementById('btn-add-student-row')?.addEventListener('click',      addNewEditRow);
  document.getElementById('btn-save-edits')?.addEventListener('click',           saveEdits);
  document.getElementById('btn-cancel-edits')?.addEventListener('click',         cancelEdits);
});
