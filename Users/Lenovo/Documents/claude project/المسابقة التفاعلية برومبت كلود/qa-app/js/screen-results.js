/* ═══════════════════════════════════════════════════
   screen-results.js — شاشة النتائج النهائية (قائمة الشرف)
   ═══════════════════════════════════════════════════ */

let confettiAnimationId = null;

// ─── فتح الشاشة ─────────────────────────────────

function openResultsScreen() {
  if (!currentQuizSession) {
    alert('لا توجد جلسة مسابقة.');
    return;
  }

  // الترويسة
  const setupData = loadSetup();
  document.getElementById('results-subtitle').textContent =
    `مسابقة ${setupData?.competitionName || 'سباق الأبطال'} — ${currentClassContext.label}`;
  document.getElementById('results-context').textContent =
    `${currentSubjectContext.icon} ${currentSubjectContext.name} • ${
      currentUnitContext.mode === 'comprehensive' ? 'أسئلة شاملة' : currentUnitContext.unitName
    }`;

  const ranked = getRankedStudents();

  renderPodium(ranked);
  renderRestList(ranked);

  showScreen('screen-results');

  // أنميشن الدخول
  if (typeof anime !== 'undefined') {
    const { animate, stagger } = anime;

    animate('.results-title', {
      translateY: [-30, 0],
      opacity:    [0, 1],
      scale:      [0.85, 1],
      duration:   700,
      ease:       'outBack',
    });

    animate('.results-subtitle, .results-context', {
      opacity:    [0, 1],
      translateY: [10, 0],
      duration:   500,
      delay:      200,
      ease:       'outCubic',
    });

    animate('.results-actions', {
      translateY: [20, 0],
      opacity:    [0, 1],
      duration:   600,
      delay:      2200,
      ease:       'outCubic',
    });
  }

  animatePodiumEntry();

  // stagger قائمة البقية بعد انتهاء أنيمشن المنصّات
  if (typeof anime !== 'undefined') {
    const { animate, stagger } = anime;
    animate('.rest-row', {
      translateX: [20, 0],
      opacity:    [0, 1],
      duration:   400,
      delay:      stagger(50, { start: 1800 }),
      ease:       'outCubic',
    });
  } else {
    document.querySelectorAll('.rest-row').forEach(r => { r.style.opacity = '1'; });
  }

  startConfetti();
  setTimeout(() => stopConfetti(), 6000);
}

// ─── ترتيب الطلاب ───────────────────────────────

function getRankedStudents() {
  const absent = currentQuizSession.absentStudentIds || new Set();
  const arr = Object.entries(currentQuizSession.studentScores)
    .filter(([id]) => !absent.has(id))
    .map(([id, s]) => ({
      id,
      name:         s.name,
      points:       s.points       || 0,
      correctCount: s.correctCount || 0,
      attemptsUsed: s.attemptsUsed || 0,
    }));
  arr.sort((a, b) => {
    if (b.points       !== a.points)       return b.points       - a.points;
    if (a.attemptsUsed !== b.attemptsUsed) return a.attemptsUsed - b.attemptsUsed;
    return b.correctCount - a.correctCount;
  });
  return arr;
}

// ─── المنصّة ─────────────────────────────────────

function renderPodium(ranked) {
  const container = document.getElementById('podium-container');
  container.innerHTML = '';

  // ترتيب DOM: الثاني (يمين RTL) ← الأول (وسط) ← الثالث (يسار)
  const positions = [
    { rank: 2, height: 160, medal: '🥈', cls: 'rank-2', gridOrder: 0 },
    { rank: 1, height: 220, medal: '🥇', cls: 'rank-1', gridOrder: 1, withCrown: true },
    { rank: 3, height: 120, medal: '🥉', cls: 'rank-3', gridOrder: 2 },
  ];

  const totalQ = currentQuizSession.questions.length;

  positions.forEach(pos => {
    const student = ranked[pos.rank - 1];
    if (!student) return;

    const col     = document.createElement('div');
    col.className = `podium-col ${pos.cls}`;
    col.style.order = pos.gridOrder;

    col.innerHTML = `
      ${pos.withCrown ? '<div class="podium-crown">👑</div>' : ''}
      <div class="podium-card">
        <div class="podium-medal">${pos.medal}</div>
        <div class="podium-name"></div>
        <div class="podium-points">
          <span class="podium-points-value">${student.points}</span>
          <span class="podium-points-label">${getPointsWord(student.points)}</span>
        </div>
        <div class="podium-stats">✓ ${student.correctCount} من ${totalQ}</div>
      </div>
      <div class="podium-block" style="height:${pos.height}px;">
        <div class="podium-rank-number">${pos.rank}</div>
      </div>
    `;
    col.querySelector('.podium-name').textContent = student.name;
    container.appendChild(col);
  });
}

function getPointsWord(n) {
  if (n === 0) return 'نقاط';
  if (n === 1) return 'نقطة';
  if (n === 2) return 'نقطتان';
  if (n >= 3 && n <= 10) return 'نقاط';
  return 'نقطة';
}

// ─── أنيميشن المنصّة ─────────────────────────────

function animatePodiumEntry() {
  // أخفِ كل الأعمدة فوراً
  document.querySelectorAll('.podium-col').forEach(c => {
    c.style.opacity   = '0';
    c.style.transform = 'translateY(40px)';
  });

  if (typeof anime === 'undefined') {
    setTimeout(() => {
      document.querySelectorAll('.podium-col').forEach(c => {
        c.style.opacity   = '1';
        c.style.transform = '';
      });
    }, 400);
    return;
  }

  const { animate } = anime;

  // الثالث أولاً
  setTimeout(() => {
    animate('.podium-col.rank-3', {
      translateY: [40, 0],
      opacity:    [0, 1],
      duration:   600,
      ease:       'outBack',
    });
  }, 400);

  // الثاني
  setTimeout(() => {
    animate('.podium-col.rank-2', {
      translateY: [40, 0],
      opacity:    [0, 1],
      duration:   600,
      ease:       'outBack',
    });
  }, 850);

  // الأول + التاج
  setTimeout(() => {
    animate('.podium-col.rank-1', {
      translateY: [60, 0],
      opacity:    [0, 1],
      duration:   800,
      ease:       'outBack',
    });
    setTimeout(() => {
      animate('.podium-crown', {
        translateY: [-40, 0],
        opacity:    [0, 1],
        rotate:     [-20, 0],
        duration:   700,
        ease:       'outBounce',
      });
    }, 400);
  }, 1400);
}

// ─── قائمة البقية ────────────────────────────────

function renderRestList(ranked) {
  const section = document.getElementById('rest-section');
  const list    = document.getElementById('rest-list');
  list.innerHTML = '';

  const rest = ranked.slice(3);
  if (rest.length === 0) {
    section.style.display = 'none';
    return;
  }
  section.style.display = '';

  const totalQ = currentQuizSession.questions.length;

  rest.forEach((s, i) => {
    const rank = i + 4;
    const row  = document.createElement('div');
    row.className   = 'rest-row';
    row.style.opacity = '0'; // يبدأ مخفياً للـ stagger أنيمشن

    row.innerHTML = `
      <span class="rest-rank">${rank}</span>
      <span class="rest-name"></span>
      <span class="rest-points">⭐ ${s.points} ${getPointsWord(s.points)}</span>
      <span class="rest-stats">✓ ${s.correctCount} من ${totalQ}</span>
    `;
    row.querySelector('.rest-name').textContent = s.name;
    list.appendChild(row);
  });
}

// ══════════════════════════════════════════════════
// Confetti — Canvas يدوي
// ══════════════════════════════════════════════════

function startConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;

  const ctx    = canvas.getContext('2d');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = [
    '#fbbf24', '#f59e0b', '#94a3b8', '#cd7f32',
    '#10b981', '#3b82f6', '#ec4899', '#8b5cf6',
  ];
  const COUNT  = 160;
  const pieces = [];

  for (let i = 0; i < COUNT; i++) {
    pieces.push({
      x:     Math.random() * canvas.width,
      y:     Math.random() * -canvas.height,
      w:     8  + Math.random() * 8,
      h:     12 + Math.random() * 12,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx:    -1 + Math.random() * 2,
      vy:    2  + Math.random() * 3,
      rot:   Math.random() * Math.PI * 2,
      vr:    -0.05 + Math.random() * 0.1,
      shape: Math.random() < 0.5 ? 'rect' : 'circle',
    });
  }

  function onResize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', onResize);
  canvas._confettiResize = onResize;

  function frame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      p.x   += p.vx;
      p.y   += p.vy;
      p.rot += p.vr;
      if (p.y > canvas.height + 20) {
        p.y = -20;
        p.x = Math.random() * canvas.width;
      }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.shape === 'rect') {
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
    confettiAnimationId = requestAnimationFrame(frame);
  }
  frame();
}

function stopConfetti() {
  if (confettiAnimationId) {
    cancelAnimationFrame(confettiAnimationId);
    confettiAnimationId = null;
  }

  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let alpha  = 1;
  const fadeId = setInterval(() => {
    alpha -= 0.08;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (alpha <= 0) clearInterval(fadeId);
  }, 50);

  if (canvas._confettiResize) {
    window.removeEventListener('resize', canvas._confettiResize);
    canvas._confettiResize = null;
  }
}

// ══════════════════════════════════════════════════
// أزرار الإجراءات
// ══════════════════════════════════════════════════

function startNewQuiz() {
  if (typeof clearPersistedSession === 'function') clearPersistedSession();
  stopConfetti();
  currentQuizSession = null;
  currentUnitContext = null;
  // currentSubjectContext تبقى (من APP_CONFIG)

  // ارجع لشاشة طلاب الفصل ليختار المعلم وحدة جديدة
  if (currentClassContext) {
    showScreen('screen-class-students');
    if (typeof renderStudentsList === 'function') renderStudentsList();
  } else {
    showScreen('screen-classes');
    if (typeof renderClassesScreen === 'function') renderClassesScreen();
  }
}

function backToClassesFromResults() {
  if (typeof clearPersistedSession === 'function') clearPersistedSession();
  stopConfetti();
  currentQuizSession    = null;
  currentUnitContext    = null;
  currentSubjectContext = null;
  showScreen('screen-classes');
  if (typeof renderClassesScreen === 'function') renderClassesScreen();
}

function saveResultsAsPdf() {
  prepareSaveSheet();
  document.body.classList.add('saving-results');
  setTimeout(() => {
    window.print();
    setTimeout(() => document.body.classList.remove('saving-results'), 500);
  }, 200);
}

function prepareSaveSheet() {
  const setup           = (typeof loadSetup === 'function') ? loadSetup() : {};
  const competitionName = setup?.competitionName || 'سباق الأبطال';
  const teacherName     = setup?.teacherName || '';
  const schoolName      = setup?.schoolName  || '';
  const className       = currentClassContext?.label   || '';
  const subjectName     = currentSubjectContext?.name  || '';
  const unitName        = (currentUnitContext?.mode === 'comprehensive')
    ? 'أسئلة شاملة'
    : (currentUnitContext?.unitName || '');
  const today   = new Date();
  const dateStr = today.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });

  let sheet = document.getElementById('save-sheet');
  if (!sheet) {
    sheet = document.createElement('div');
    sheet.id        = 'save-sheet';
    sheet.className = 'save-sheet';
    document.body.appendChild(sheet);
  }

  const ranked  = getRankedStudents();
  const totalQ  = currentQuizSession.questions.length;
  const genderSuffix = (currentClassContext?.gender === 'girls') ? 'ـة' : '';
  const rowsHtml = ranked.map((s, i) => `
    <tr>
      <td class="ss-rank">${i + 1}</td>
      <td class="ss-name">${escapeHtml(s.name)}</td>
      <td class="ss-points">${s.points}</td>
      <td class="ss-correct">${s.correctCount} / ${totalQ}</td>
    </tr>
  `).join('');

  sheet.innerHTML = `
    <div class="ss-header">
      <h1 class="ss-title">🏆 قائمة الشرف 🏆</h1>
      <p class="ss-competition">${escapeHtml(competitionName)}</p>
    </div>
    <div class="ss-meta">
      <div class="ss-meta-row">
        <span class="ss-meta-label">المدرسة:</span>
        <span class="ss-meta-value">${escapeHtml(schoolName)}</span>
        <span class="ss-meta-label">المعلمة/المعلم:</span>
        <span class="ss-meta-value">${escapeHtml(teacherName)}</span>
      </div>
      <div class="ss-meta-row">
        <span class="ss-meta-label">الفصل:</span>
        <span class="ss-meta-value">${escapeHtml(className)}</span>
        <span class="ss-meta-label">المادة:</span>
        <span class="ss-meta-value">${escapeHtml(subjectName)}</span>
      </div>
      <div class="ss-meta-row">
        <span class="ss-meta-label">الوحدة:</span>
        <span class="ss-meta-value">${escapeHtml(unitName)}</span>
        <span class="ss-meta-label">عدد الأسئلة:</span>
        <span class="ss-meta-value">${totalQ}</span>
        <span class="ss-meta-label">التاريخ:</span>
        <span class="ss-meta-value">${escapeHtml(dateStr)}</span>
      </div>
    </div>
    <table class="ss-table">
      <thead>
        <tr>
          <th class="ss-th-rank">المركز</th>
          <th class="ss-th-name">اسم الطالب${genderSuffix}</th>
          <th class="ss-th-points">النقاط</th>
          <th class="ss-th-correct">الإجابات الصحيحة</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
    <div class="ss-footer">
      <p>تم إعداد هذه القائمة بواسطة تطبيق "سباق الأبطال" — أداة مسابقات تفاعلية للصفوف الأولية</p>
    </div>
  `;
}

function escapeHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── ربط الأحداث ────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-new-quiz')
    ?.addEventListener('click', startNewQuiz);
  document.getElementById('btn-back-to-classes-final')
    ?.addEventListener('click', backToClassesFromResults);
  document.getElementById('btn-save-pdf')
    ?.addEventListener('click', saveResultsAsPdf);
});
