/* ═══════════════════════════════════════════════════
   screen-subjects.js — شاشة اختيار المادة
   ═══════════════════════════════════════════════════ */

let currentSubjectContext = null;

function openSubjectsScreen() {
  if (!currentClassContext) {
    alert('لا يوجد فصل مختار.');
    return;
  }

  // pill السياق — اسم الفصل وعدد طلابه
  const pill = document.getElementById('subjects-context-pill');
  pill.classList.remove('gender-boys', 'gender-girls');
  pill.classList.add(`gender-${currentClassContext.gender}`);

  document.getElementById('ctx-class-name').textContent = currentClassContext.label;

  const all      = loadStudents();
  const students = all[currentClassContext.id] || [];
  document.getElementById('ctx-count').textContent = students.length;
  document.getElementById('ctx-word').textContent  =
    getStudentWord(students.length, currentClassContext.gender);

  renderSubjectsGrid();
  showScreen('screen-subjects');

  if (typeof anime !== 'undefined') {
    const { animate, stagger } = anime;

    animate('.subjects-page-title', {
      translateY: [-20, 0],
      opacity:    [0, 1],
      duration:   500,
      ease:       'outCubic',
    });

    animate('.subject-card', {
      translateY: [40, 0],
      opacity:    [0, 1],
      scale:      [0.95, 1],
      duration:   600,
      delay:      stagger(120),
      ease:       'outCubic',
    });
  } else {
    document.querySelectorAll('.subject-card').forEach(c => { c.style.opacity = '1'; });
    document.querySelector('.subjects-page-title').style.opacity = '1';
  }
}

function renderSubjectsGrid() {
  const grid = document.getElementById('subjects-grid');
  grid.innerHTML = '';

  SUBJECTS_LIST.forEach(subject => {
    const stats = getSubjectStats(subject.id);
    const card  = document.createElement('div');
    card.className           = 'subject-card';
    card.dataset.subjectId   = subject.id;
    card.style.setProperty('--subject-color',      subject.color);
    card.style.setProperty('--subject-color-dark', subject.colorDark);

    const hasQuestions = stats.questionsCount > 0;

    let statsText;
    if (hasQuestions) {
      const unitWord =
        stats.unitsCount === 1 ? 'وحدة' :
        stats.unitsCount === 2 ? 'وحدتان' : 'وحدات';
      const qWord = stats.questionsCount === 1 ? 'سؤال' : 'سؤالاً';
      statsText = `${stats.unitsCount} ${unitWord} • ${stats.questionsCount} ${qWord}`;
    } else {
      statsText = 'بنك الأسئلة فارغ';
    }

    // بناء البطاقة بأمان (textContent بدل innerHTML للنصوص المتغيّرة)
    const iconEl  = document.createElement('div');
    iconEl.className   = 'subject-icon';
    iconEl.textContent = subject.icon;

    const nameEl  = document.createElement('div');
    nameEl.className   = 'subject-name';
    nameEl.textContent = subject.name;

    const statsEl = document.createElement('div');
    statsEl.className   = `subject-stats${hasQuestions ? '' : ' empty'}`;
    statsEl.textContent = statsText;

    card.appendChild(iconEl);
    card.appendChild(nameEl);
    card.appendChild(statsEl);

    card.addEventListener('click', () => handleSubjectClick(subject));
    grid.appendChild(card);
  });
}

function handleSubjectClick(subject) {
  currentSubjectContext = subject;
  if (typeof openUnitsScreen === 'function') {
    openUnitsScreen(subject);
  } else {
    alert('شاشة الوحدات غير محمَّلة.');
  }
}

function backToClassStudents() {
  showScreen('screen-class-students');
  if (typeof renderStudentsList === 'function') renderStudentsList();
}

// ============== Modal إعادة تعيين بنك الأسئلة ==============

function openResetBankModal() {
  const total = typeof getTotalQuestionsInBank === 'function' ? getTotalQuestionsInBank() : 0;

  if (total === 0) {
    alert('بنك الأسئلة فارغ بالفعل، لا يوجد ما يُحذف.');
    return;
  }

  document.getElementById('reset-bank-count-value').textContent = total;
  const overlay = document.getElementById('reset-bank-modal-overlay');
  overlay.style.display = 'flex';

  if (typeof anime !== 'undefined') {
    const { animate } = anime;
    animate('.reset-bank-modal', {
      translateY: [20, 0],
      opacity: [0, 1],
      duration: 300,
      ease: 'outCubic'
    });
  }
}

function closeResetBankModal() {
  document.getElementById('reset-bank-modal-overlay').style.display = 'none';
}

function confirmResetBank() {
  if (typeof resetQuestionsBank !== 'function') {
    alert('وظيفة إعادة التعيين غير متوفّرة.');
    return;
  }

  resetQuestionsBank();
  closeResetBankModal();

  // في نموذج المادة الواحدة: لا نعيد رسم شاشة المواد
  // فقط إن كانت شاشة الوحدات ظاهرة، أعد رسمها
  if (typeof renderUnitsGrid === 'function' && currentSubjectContext) {
    renderUnitsGrid(currentSubjectContext);
    if (typeof renderComprehensiveCard === 'function') {
      renderComprehensiveCard(currentSubjectContext);
    }
  }

  setTimeout(() => {
    alert('✅ تم مسح بنك الأسئلة بنجاح.\nيمكنكِ الآن بناء بنك أسئلة جديد من شاشة "إدارة الأسئلة" (قادمة قريباً).');
  }, 250);
}

// ─── ربط الأحداث ────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-back-to-class-students')
    ?.addEventListener('click', backToClassStudents);

  document.getElementById('btn-reset-bank')
    ?.addEventListener('click', openResetBankModal);
  document.getElementById('btn-reset-bank-confirm')
    ?.addEventListener('click', confirmResetBank);
  document.getElementById('btn-reset-bank-cancel')
    ?.addEventListener('click', closeResetBankModal);
  document.getElementById('reset-bank-modal-close')
    ?.addEventListener('click', closeResetBankModal);
  document.getElementById('reset-bank-modal-overlay')
    ?.addEventListener('click', (e) => {
      if (e.target.id === 'reset-bank-modal-overlay') closeResetBankModal();
    });
});
