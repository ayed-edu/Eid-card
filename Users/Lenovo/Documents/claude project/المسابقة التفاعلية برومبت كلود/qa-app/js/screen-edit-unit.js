/* ═══════════════════════════════════════════════════
   screen-edit-unit.js — شاشة تعديل أسئلة الوحدة
   TASK-J
   ═══════════════════════════════════════════════════ */

let editUnitContext   = null;
let editingQuestions  = [];

// ─── فتح الشاشة ─────────────────────────────────

function openEditUnitScreen(subject, unit) {
  editUnitContext = {
    subjectId: subject.id,
    unitId:    unit.id,
    unitName:  unit.name,
  };

  // pill السياق
  const pill = document.getElementById('edit-unit-pill');
  if (pill && typeof currentClassContext !== 'undefined' && currentClassContext) {
    pill.classList.remove('gender-boys', 'gender-girls');
    pill.classList.add(`gender-${currentClassContext.gender}`);
  }
  const ctxClassEl = document.getElementById('edit-unit-ctx-class');
  const ctxUnitEl  = document.getElementById('edit-unit-ctx-unit');
  if (ctxClassEl) ctxClassEl.textContent = currentClassContext?.label || '—';
  if (ctxUnitEl)  ctxUnitEl.textContent  = unit.name;

  document.getElementById('edit-unit-title').textContent =
    `✏️ تعديل أسئلة: ${unit.name}`;

  // تحميل الأسئلة
  const bank  = loadQuestionsBank();
  const rawQs = bank[subject.id]?.units?.[unit.id]?.questions || [];

  editingQuestions = rawQs.map(q => ({
    ...q,
    choices: q.choices.slice(),
    _original: q._original
      ? { text: q._original.text, choices: q._original.choices.slice(), correctIndex: q._original.correctIndex }
      : null,
  }));

  renderEditQuestions();
  showScreen('screen-edit-unit');
}

// ─── رسم قائمة الأسئلة ──────────────────────────

function renderEditQuestions() {
  const list = document.getElementById('edit-questions-list');
  if (!list) return;
  list.innerHTML = '';

  if (editingQuestions.length === 0) {
    const p = document.createElement('p');
    p.className   = 'edit-empty-msg';
    p.textContent = 'لا توجد أسئلة في هذه الوحدة.';
    list.appendChild(p);
    return;
  }

  editingQuestions.forEach((q, idx) => buildQuestionCard(q, idx, list));
}

// ─── بناء بطاقة سؤال واحد ───────────────────────

function buildQuestionCard(q, idx, container) {
  const arabicNums = ['١','٢','٣','٤','٥','٦','٧','٨','٩','١٠',
                      '١١','١٢','١٣','١٤','١٥','١٦','١٧','١٨','١٩','٢٠'];
  const num        = arabicNums[idx] || String(idx + 1);
  const hasOrig    = !!q._original;

  const card = document.createElement('div');
  card.className    = 'edit-q-card';
  card.dataset.qIdx = idx;

  card.innerHTML = `
    <div class="edit-q-header">
      <span class="edit-q-num">السؤال ${num}</span>
      <div class="edit-q-actions">
        <button type="button" class="btn-restore-q" title="استعادة النص الأصلي" ${hasOrig ? '' : 'disabled'}>↺ أصل</button>
        <button type="button" class="btn-delete-q"  title="حذف هذا السؤال">🗑 حذف</button>
      </div>
    </div>
    <label class="edit-field-label">نص السؤال</label>
    <textarea class="edit-q-text" rows="2" dir="rtl"></textarea>
    <label class="edit-field-label">الاختيارات</label>
    <div class="edit-choices-wrap"></div>
    <p class="edit-q-hint">● الدائرة المحدَّدة = الإجابة الصحيحة</p>
  `;

  // تعيين النصوص بشكل آمن (بدون innerHTML)
  card.querySelector('.edit-q-text').value = q.text;

  // بناء الاختيارات
  const choicesWrap = card.querySelector('.edit-choices-wrap');
  q.choices.forEach((ch, ci) => {
    const row = document.createElement('div');
    row.className = 'edit-choice-row';

    const radio     = document.createElement('input');
    radio.type      = 'radio';
    radio.name      = `correct-q${idx}`;
    radio.value     = String(ci);
    radio.checked   = (q.correctIndex === ci);
    radio.className = 'edit-radio';

    const label     = document.createElement('span');
    label.className = 'edit-choice-letter';
    label.textContent = String.fromCharCode(0x0041 + ci); // A B C D

    const textIn      = document.createElement('input');
    textIn.type       = 'text';
    textIn.value      = ch;
    textIn.className  = 'edit-choice-input';
    textIn.dir        = 'rtl';

    row.appendChild(radio);
    row.appendChild(label);
    row.appendChild(textIn);
    choicesWrap.appendChild(row);
  });

  // ─── الأحداث ───

  card.querySelector('.edit-q-text').addEventListener('input', e => {
    editingQuestions[idx].text = e.target.value;
    persistEditUnit();
  });

  choicesWrap.querySelectorAll('.edit-choice-input').forEach((inp, ci) => {
    inp.addEventListener('input', e => {
      editingQuestions[idx].choices[ci] = e.target.value;
      persistEditUnit();
    });
  });

  choicesWrap.querySelectorAll('.edit-radio').forEach(radio => {
    radio.addEventListener('change', e => {
      editingQuestions[idx].correctIndex = parseInt(e.target.value, 10);
      persistEditUnit();
    });
  });

  const restoreBtn = card.querySelector('.btn-restore-q');
  if (hasOrig) {
    restoreBtn.addEventListener('click', () => restoreOneQuestion(idx));
  }

  card.querySelector('.btn-delete-q').addEventListener('click', () => deleteOneQuestion(idx));

  container.appendChild(card);
}

// ─── حفظ في localStorage ────────────────────────

function persistEditUnit() {
  if (!editUnitContext) return;
  const bank = loadQuestionsBank();
  const unit = bank[editUnitContext.subjectId]?.units?.[editUnitContext.unitId];
  if (!unit) return;
  unit.questions = editingQuestions;
  localStorage.setItem(QUESTIONS_STORAGE_KEY, JSON.stringify(bank));
}

// ─── استعادة سؤال واحد ──────────────────────────

function restoreOneQuestion(idx) {
  const q = editingQuestions[idx];
  if (!q?._original) return;
  editingQuestions[idx] = {
    ...q,
    text:         q._original.text,
    choices:      q._original.choices.slice(),
    correctIndex: q._original.correctIndex,
  };
  persistEditUnit();
  renderEditQuestions();
}

// ─── حذف سؤال ────────────────────────────────────

function deleteOneQuestion(idx) {
  const q       = editingQuestions[idx];
  const preview = q.text.length > 45 ? q.text.slice(0, 45) + '…' : q.text;
  if (!confirm(`حذف السؤال:\n"${preview}"؟\n\nلا يمكن التراجع عن الحذف.`)) return;
  editingQuestions.splice(idx, 1);
  persistEditUnit();
  renderEditQuestions();
}

// ─── استعادة كل الوحدة ──────────────────────────

function restoreAllEditUnit() {
  const hasAny = editingQuestions.some(q => q._original);
  if (!hasAny) {
    alert('لا توجد نسخة أصلية محفوظة لأسئلة هذه الوحدة.\n(الأسئلة التجريبية لا تحتفظ بنسخة أصلية)');
    return;
  }
  if (!confirm(`استعادة كل أسئلة "${editUnitContext?.unitName || 'الوحدة'}" للنص الأصلي؟\nلا يمكن التراجع.`)) return;

  editingQuestions = editingQuestions.map(q =>
    q._original
      ? { ...q, text: q._original.text, choices: q._original.choices.slice(), correctIndex: q._original.correctIndex }
      : q
  );
  persistEditUnit();
  renderEditQuestions();
}

// ─── رجوع لشاشة الوحدات ─────────────────────────

function backFromEditUnit() {
  editingQuestions = [];
  editUnitContext  = null;
  if (typeof currentSubjectContext !== 'undefined' && currentSubjectContext &&
      typeof openUnitsScreen === 'function') {
    openUnitsScreen(currentSubjectContext);
  } else {
    showScreen('screen-units');
  }
}

// ─── ربط الأحداث عند التحميل ────────────────────

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-back-from-edit')
    ?.addEventListener('click', backFromEditUnit);
  document.getElementById('btn-restore-all-unit')
    ?.addEventListener('click', restoreAllEditUnit);
});
