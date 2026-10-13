/**
 * 웹 플래너 도구 (마자 블로그 공용 도구) — 2026-10-14
 * 원본: planner-web (사장님). 이 사이트 페이지의 일부로 들어가도록 옮겼다.
 *  · 데이터는 이 브라우저(LocalStorage)에만 저장된다 — 서버로 보내지 않는다.
 *  · 저장·복원(백업 파일) 때 값을 검사한다(길이·개수·형식) — 남이 만든 파일을 열어도 화면이 깨지거나 스크립트가 돌지 않게.
 */

(function () {
  'use strict';

  // ── Storage Key ──
  const STORAGE_KEY = 'pw_planner_state_v1';

  // ── Initial State ──
  let state = {
    selectedDate: getTodayStr(),
    viewMode: 'monthly', // 'monthly' | 'weekly'
    currentYear: new Date().getFullYear(),
    currentMonth: new Date().getMonth(), // 0-11
    weekStartOffset: 0, // offset in weeks from current week
    taskFilter: 'all', // 'all' | 'active' | 'completed'
    ddays: [
      {
        id: 'dd-1',
        title: '올해 마지막 날',
        targetDate: (new Date().getFullYear()) + '-12-31',
        category: '개인/기념일'
      }
    ],
    tasks: [
      {
        id: 'tk-1',
        text: '이번 주 가장 중요한 일 하나 적어 보기',
        category: '업무',
        priority: 'high',
        dueDate: getTodayStr(),
        completed: false,
        createdAt: Date.now() - 1800000
      },
      {
        id: 'tk-2',
        text: '시간 블록에 오늘 일정 하나 넣어 보기',
        category: '개인',
        priority: 'medium',
        dueDate: getTodayStr(),
        completed: false,
        createdAt: Date.now() - 900000
      }
    ],
    timeblocks: {}
  };

  // ── Helper: Date Formatting ──
  function getTodayStr() {
    const d = new Date();
    return formatDate(d);
  }

  function formatDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function getRelativeDateStr(daysAhead) {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return formatDate(d);
  }

  function parseDate(str) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  // ── 값 검사(저장소·백업 파일에서 읽은 값은 믿지 않는다) ──
  const LIM = { tasks: 500, ddays: 200, text: 200, title: 120, category: 20, days: 400, hour: 5 };
  const ID_RE = /^[A-Za-z0-9_-]{1,40}$/;
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  const HOUR_RE = /^\d{2}:\d{2}$/;
  const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
  const dateOr = (v, fallback) => (typeof v === 'string' && DATE_RE.test(v) && !isNaN(parseDate(v).getTime()) ? v : fallback);

  function sanitizeState(src) {
    if (!src || typeof src !== 'object') return null;
    const out = {};
    out.tasks = (Array.isArray(src.tasks) ? src.tasks : []).slice(0, LIM.tasks).filter(t => t && typeof t === 'object').map((t, i) => ({
      id: ID_RE.test(String(t.id)) ? String(t.id) : 'tk-i' + i + '-' + Date.now().toString(36),
      text: str(t.text, LIM.text),
      category: str(t.category, LIM.category),
      priority: ['high', 'medium', 'low'].includes(t.priority) ? t.priority : 'medium',
      dueDate: t.dueDate ? dateOr(t.dueDate, '') : '',
      completed: t.completed === true,
      createdAt: Number.isFinite(t.createdAt) ? t.createdAt : Date.now()
    })).filter(t => t.text);
    out.ddays = (Array.isArray(src.ddays) ? src.ddays : []).slice(0, LIM.ddays).filter(d => d && typeof d === 'object').map((d, i) => ({
      id: ID_RE.test(String(d.id)) ? String(d.id) : 'dd-i' + i + '-' + Date.now().toString(36),
      title: str(d.title, LIM.title),
      targetDate: dateOr(d.targetDate, ''),
      category: str(d.category, LIM.category)
    })).filter(d => d.title && d.targetDate);
    out.timeblocks = {};
    if (src.timeblocks && typeof src.timeblocks === 'object') {
      Object.keys(src.timeblocks).slice(0, LIM.days).forEach(day => {
        if (!DATE_RE.test(day) || !src.timeblocks[day] || typeof src.timeblocks[day] !== 'object') return;
        const blocks = {};
        Object.keys(src.timeblocks[day]).forEach(h => { if (HOUR_RE.test(h)) blocks[h] = str(src.timeblocks[day][h], LIM.text); });
        out.timeblocks[day] = blocks;
      });
    }
    out.selectedDate = dateOr(src.selectedDate, getTodayStr());
    out.viewMode = src.viewMode === 'weekly' ? 'weekly' : 'monthly';
    out.currentYear = Number.isInteger(src.currentYear) && src.currentYear >= 2000 && src.currentYear <= 2100 ? src.currentYear : new Date().getFullYear();
    out.currentMonth = Number.isInteger(src.currentMonth) && src.currentMonth >= 0 && src.currentMonth <= 11 ? src.currentMonth : new Date().getMonth();
    out.weekStartOffset = Number.isInteger(src.weekStartOffset) && Math.abs(src.weekStartOffset) < 2000 ? src.weekStartOffset : 0;
    out.taskFilter = ['all', 'active', 'completed'].includes(src.taskFilter) ? src.taskFilter : 'all';
    return out;
  }

  // ── LocalStorage Sync ──
  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = sanitizeState(JSON.parse(saved));
        if (parsed) state = { ...state, ...parsed };
        if (!state.selectedDate) state.selectedDate = getTodayStr();
      }
    } catch (e) {
      console.warn('LocalStorage load failed, using defaults', e);
    }
  }

  let saveTimeout = null;
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      indicateSaveStatus();
    } catch (e) {
      console.error('LocalStorage save failed', e);
    }
  }

  function indicateSaveStatus() {
    const dot = document.querySelector('.pw-root .pw-save-dot');
    const label = document.getElementById('saveStatusText');
    if (dot && label) {
      dot.style.background = '#34d399';
      label.textContent = '자동저장됨';
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        dot.style.background = '#10b981';
      }, 1500);
    }
  }

  // ── D-Day Engine ──
  function calculateDDay(targetDateStr) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const target = parseDate(targetDateStr);
    target.setHours(0, 0, 0, 0);

    const diffMs = target.getTime() - today.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return { label: 'D-DAY', diff: 0, status: 'today' };
    if (diffDays > 0) {
      return {
        label: `D-${diffDays}`,
        diff: diffDays,
        status: diffDays <= 3 ? 'urgent' : 'future'
      };
    }
    return {
      label: `D+${Math.abs(diffDays)}`,
      diff: diffDays,
      status: 'past'
    };
  }

  function renderDDays() {
    const container = document.getElementById('ddayGrid');
    if (!container) return;

    // Sort by nearest target date
    const sorted = [...state.ddays].sort((a, b) => {
      return parseDate(a.targetDate).getTime() - parseDate(b.targetDate).getTime();
    });

    if (sorted.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; padding: 24px; text-align: center; color: var(--text-tertiary); font-size: 13.5px;">
          등록된 D-Day가 없습니다. 상단의 '+ D-Day 등록' 버튼을 눌러 목표를 추가해보세요.
        </div>
      `;
      return;
    }

    container.innerHTML = sorted.map(d => {
      const calc = calculateDDay(d.targetDate);
      let statusClass = '';
      if (calc.status === 'today') statusClass = 'dday-today';
      else if (calc.status === 'urgent') statusClass = 'dday-urgent';

      return `
        <div class="dday-card ${statusClass}" data-id="${d.id}">
          <div class="dday-top">
            <span class="dday-category">${escapeHtml(d.category || '목표')}</span>
            <button class="dday-delete-btn" onclick="window.PWPlanner.deleteDDay('${d.id}')" title="삭제">
              <i data-lucide="x" style="width:14px; height:14px;"></i>
            </button>
          </div>
          <div class="dday-count">${calc.label}</div>
          <div class="dday-title" title="${escapeHtml(d.title)}">${escapeHtml(d.title)}</div>
          <div class="dday-date-text">목표일: ${d.targetDate}</div>
        </div>
      `;
    }).join('');

    refreshIcons();
  }

  function addDDay(title, targetDate, category) {
    if (!title || !targetDate) return;
    const newDDay = {
      id: 'dd-' + Date.now(),
      title: title.trim(),
      targetDate,
      category: category.trim() || '일반'
    };
    state.ddays.push(newDDay);
    saveState();
    renderDDays();
    renderCalendar();
  }

  function deleteDDay(id) {
    state.ddays = state.ddays.filter(d => d.id !== id);
    saveState();
    renderDDays();
    renderCalendar();
  }

  // ── Calendar Engine ──
  const MONTH_NAMES = [
    '1월', '2월', '3월', '4월', '5월', '6월',
    '7월', '8월', '9월', '10월', '11월', '12월'
  ];

  function renderCalendar() {
    if (state.viewMode === 'monthly') {
      renderMonthlyCalendar();
    } else {
      renderWeeklyCalendar();
    }
  }

  function renderMonthlyCalendar() {
    const monthlyContainer = document.getElementById('calendarMonthlyContainer');
    const weeklyContainer = document.getElementById('calendarWeeklyContainer');
    if (!monthlyContainer) return;

    monthlyContainer.style.display = 'block';
    if (weeklyContainer) weeklyContainer.style.display = 'none';

    // Update Header Label
    const labelEl = document.getElementById('currentCalendarLabel');
    if (labelEl) {
      labelEl.innerHTML = `${state.currentYear}년 <span>${MONTH_NAMES[state.currentMonth]}</span>`;
    }

    const grid = document.getElementById('calendarDaysGrid');
    if (!grid) return;

    grid.innerHTML = '';

    const firstDayIndex = new Date(state.currentYear, state.currentMonth, 1).getDay(); // 0 is Sun
    const lastDay = new Date(state.currentYear, state.currentMonth + 1, 0).getDate();
    const prevLastDay = new Date(state.currentYear, state.currentMonth, 0).getDate();

    const todayStr = getTodayStr();

    // Days from prev month
    for (let x = firstDayIndex; x > 0; x--) {
      const prevDate = prevLastDay - x + 1;
      const prevMonth = state.currentMonth === 0 ? 11 : state.currentMonth - 1;
      const prevYear = state.currentMonth === 0 ? state.currentYear - 1 : state.currentYear;
      const dateStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(prevDate).padStart(2, '0')}`;
      grid.appendChild(createDayCell(prevDate, dateStr, true));
    }

    // Days of current month
    for (let i = 1; i <= lastDay; i++) {
      const dateStr = `${state.currentYear}-${String(state.currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      grid.appendChild(createDayCell(i, dateStr, false));
    }

    // Days from next month to complete grid (42 cells standard 6 rows)
    const totalRendered = firstDayIndex + lastDay;
    const remaining = 42 - totalRendered;
    for (let j = 1; j <= (remaining < 7 ? remaining : remaining - 7); j++) {
      const nextMonth = state.currentMonth === 11 ? 0 : state.currentMonth + 1;
      const nextYear = state.currentMonth === 11 ? state.currentYear + 1 : state.currentYear;
      const dateStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(j).padStart(2, '0')}`;
      grid.appendChild(createDayCell(j, dateStr, true));
    }
  }

  function createDayCell(dayNumber, dateStr, isOtherMonth) {
    const cell = document.createElement('div');
    cell.className = 'day-cell';
    if (isOtherMonth) cell.classList.add('other-month');

    const dayDate = parseDate(dateStr);
    const dayOfWeek = dayDate.getDay();
    if (dayOfWeek === 0) cell.classList.add('sun');
    if (dayOfWeek === 6) cell.classList.add('sat');

    const todayStr = getTodayStr();
    if (dateStr === todayStr) cell.classList.add('is-today');
    if (dateStr === state.selectedDate) cell.classList.add('is-selected');

    // Dots for tasks & ddays
    const hasTask = state.tasks.some(t => t.dueDate === dateStr && !t.completed);
    const hasDDay = state.ddays.some(d => d.targetDate === dateStr);

    let dotsHtml = '';
    if (hasTask) dotsHtml += '<span class="day-dot" title="할일 있음"></span>';
    if (hasDDay) dotsHtml += '<span class="day-dot day-dot--dday" title="D-Day 있음"></span>';

    cell.innerHTML = `
      <div class="day-cell-top">
        <span class="day-number">${dayNumber}</span>
      </div>
      <div class="day-dots">${dotsHtml}</div>
    `;

    cell.addEventListener('click', () => {
      selectDate(dateStr);
    });

    return cell;
  }

  function renderWeeklyCalendar() {
    const monthlyContainer = document.getElementById('calendarMonthlyContainer');
    const weeklyContainer = document.getElementById('calendarWeeklyContainer');
    if (!weeklyContainer) return;

    if (monthlyContainer) monthlyContainer.style.display = 'none';
    weeklyContainer.style.display = 'block';

    // Calculate Week Range based on selectedDate or today + weekStartOffset
    const baseDate = parseDate(state.selectedDate || getTodayStr());
    baseDate.setDate(baseDate.getDate() + (state.weekStartOffset * 7));

    const dayOfWeek = baseDate.getDay(); // 0 is Sun
    const sunDate = new Date(baseDate);
    sunDate.setDate(baseDate.getDate() - dayOfWeek);

    const satDate = new Date(sunDate);
    satDate.setDate(sunDate.getDate() + 6);

    // Update Header Label
    const labelEl = document.getElementById('currentCalendarLabel');
    if (labelEl) {
      labelEl.innerHTML = `${sunDate.getFullYear()}년 ${sunDate.getMonth() + 1}월 ${sunDate.getDate()}일 ~ <span>${satDate.getMonth() + 1}월 ${satDate.getDate()}일</span>`;
    }

    const grid = document.getElementById('calendarWeeklyGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

    for (let i = 0; i < 7; i++) {
      const cur = new Date(sunDate);
      cur.setDate(sunDate.getDate() + i);
      const curStr = formatDate(cur);

      const col = document.createElement('div');
      col.className = 'week-day-col';
      if (curStr === getTodayStr()) col.classList.add('is-today');
      if (curStr === state.selectedDate) col.classList.add('is-selected');

      const dayTasks = state.tasks.filter(t => t.dueDate === curStr);
      const ddaysThisDay = state.ddays.filter(d => d.targetDate === curStr);

      let tasksHtml = '';
      ddaysThisDay.forEach(d => {
        tasksHtml += `<div class="week-task-pill" style="background:rgba(244,63,94,0.18); border-color:rgba(244,63,94,0.4); color:#fda4af;">🔥 ${escapeHtml(d.title)}</div>`;
      });

      dayTasks.forEach(t => {
        const doneClass = t.completed ? 'is-done' : '';
        tasksHtml += `<div class="week-task-pill ${doneClass}">✓ ${escapeHtml(t.text)}</div>`;
      });

      if (tasksHtml === '') {
        tasksHtml = `<div style="font-size:11px; color:var(--text-muted); text-align:center; margin-top:20px;">일정 없음</div>`;
      }

      col.innerHTML = `
        <div class="week-day-head">
          <div class="week-day-name ${i === 0 ? 'sun' : i === 6 ? 'sat' : ''}">${DAY_NAMES[i]}요일</div>
          <div class="week-day-num">${cur.getDate()}</div>
        </div>
        <div class="week-day-tasks">${tasksHtml}</div>
      `;

      col.addEventListener('click', () => {
        selectDate(curStr);
      });

      grid.appendChild(col);
    }
  }

  function selectDate(dateStr) {
    state.selectedDate = dateStr;
    saveState();
    renderCalendar();
    renderDailyCockpit();
  }

  function navPrev() {
    if (state.viewMode === 'monthly') {
      state.currentMonth--;
      if (state.currentMonth < 0) {
        state.currentMonth = 11;
        state.currentYear--;
      }
    } else {
      state.weekStartOffset--;
    }
    renderCalendar();
  }

  function navNext() {
    if (state.viewMode === 'monthly') {
      state.currentMonth++;
      if (state.currentMonth > 11) {
        state.currentMonth = 0;
        state.currentYear++;
      }
    } else {
      state.weekStartOffset++;
    }
    renderCalendar();
  }

  function navToday() {
    const today = new Date();
    state.currentYear = today.getFullYear();
    state.currentMonth = today.getMonth();
    state.weekStartOffset = 0;
    state.selectedDate = getTodayStr();
    saveState();
    renderCalendar();
    renderDailyCockpit();
  }

  // ── Daily Cockpit & Hourly Timeblock ──
  function renderDailyCockpit() {
    const dateTitleEl = document.getElementById('dailyDateTitle');
    if (!dateTitleEl) return;

    const selDate = parseDate(state.selectedDate);
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const dayName = dayNames[selDate.getDay()];

    dateTitleEl.textContent = `${selDate.getFullYear()}년 ${selDate.getMonth() + 1}월 ${selDate.getDate()}일 (${dayName})`;

    // Render Timeblock rows
    const timeblockContainer = document.getElementById('timeblockWrap');
    if (!timeblockContainer) return;

    timeblockContainer.innerHTML = '';
    const dayBlocks = state.timeblocks[state.selectedDate] || {};

    const HOURS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'];

    HOURS.forEach(hour => {
      const row = document.createElement('div');
      row.className = 'timeblock-row';
      const val = dayBlocks[hour] || '';

      row.innerHTML = `
        <div class="timeblock-hour">${hour}</div>
        <input type="text" class="timeblock-input" placeholder="일정 또는 메모" value="${escapeHtml(val)}" data-hour="${hour}">
      `;

      const input = row.querySelector('.timeblock-input');
      input.addEventListener('input', (e) => {
        updateTimeblock(state.selectedDate, hour, e.target.value);
      });

      timeblockContainer.appendChild(row);
    });
  }

  let timeblockDebounce = null;
  function updateTimeblock(dateStr, hour, text) {
    if (!state.timeblocks[dateStr]) {
      state.timeblocks[dateStr] = {};
    }
    state.timeblocks[dateStr][hour] = text;
    clearTimeout(timeblockDebounce);
    timeblockDebounce = setTimeout(() => {
      saveState();
    }, 400);
  }

  // ── To-Do List Engine ──
  function renderTasks() {
    const listContainer = document.getElementById('todoListWrap');
    if (!listContainer) return;

    // Filter
    let filtered = state.tasks;
    if (state.taskFilter === 'active') {
      filtered = state.tasks.filter(t => !t.completed);
    } else if (state.taskFilter === 'completed') {
      filtered = state.tasks.filter(t => t.completed);
    }

    // Stats
    const totalCount = state.tasks.length;
    const completedCount = state.tasks.filter(t => t.completed).length;
    const pct = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

    const statEl = document.getElementById('todoProgressStat');
    if (statEl) {
      statEl.innerHTML = `진행률 <span>${pct}%</span> (${completedCount}/${totalCount} 완료)`;
    }

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div style="padding: 24px; text-align: center; color: var(--text-tertiary); font-size: 13.5px;">
          해당 상태의 할일이 없습니다.
        </div>
      `;
      return;
    }

    listContainer.innerHTML = filtered.map(t => {
      const priorityBadge = getPriorityBadge(t.priority);
      const isDoneClass = t.completed ? 'is-done' : '';

      return `
        <div class="task-item ${isDoneClass}" data-id="${t.id}">
          <button class="task-checkbox" onclick="window.PWPlanner.toggleTask('${t.id}')">
            ${t.completed ? '<i data-lucide="check" style="width:14px; height:14px;"></i>' : ''}
          </button>
          <div class="task-text">${escapeHtml(t.text)}</div>
          <div class="task-meta">
            ${t.dueDate ? `<span class="task-date-tag">📅 ${t.dueDate}</span>` : ''}
            <span class="badge-tag badge-tag--emerald">${escapeHtml(t.category || '일반')}</span>
            ${priorityBadge}
            <button class="task-delete-btn" onclick="window.PWPlanner.deleteTask('${t.id}')" title="삭제">
              <i data-lucide="trash-2" style="width:14px; height:14px;"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');

    refreshIcons();
  }

  function getPriorityBadge(p) {
    if (p === 'high') {
      return '<span class="badge-tag badge-tag--rose">🔴 높음</span>';
    } else if (p === 'medium') {
      return '<span class="badge-tag badge-tag--amber">🟡 보통</span>';
    }
    return '<span class="badge-tag badge-tag--cyan">🟢 낮음</span>';
  }

  function addTask(text, category, priority, dueDate) {
    if (!text || !text.trim()) return;
    const newTask = {
      id: 'tk-' + Date.now(),
      text: text.trim(),
      category: category || '업무',
      priority: priority || 'medium',
      dueDate: dueDate || '',
      completed: false,
      createdAt: Date.now()
    };
    state.tasks.unshift(newTask);
    saveState();
    renderTasks();
    renderCalendar();
  }

  function toggleTask(id) {
    const task = state.tasks.find(t => t.id === id);
    if (task) {
      task.completed = !task.completed;
      saveState();
      renderTasks();
      renderCalendar();
    }
  }

  function deleteTask(id) {
    state.tasks = state.tasks.filter(t => t.id !== id);
    saveState();
    renderTasks();
    renderCalendar();
  }

  function setTaskFilter(filterName) {
    state.taskFilter = filterName;
    document.querySelectorAll('.filter-chip').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filterName);
    });
    renderTasks();
  }

  // ── JSON Backup & Restore ──
  function exportData() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', `web-planner-backup-${getTodayStr()}.json`);
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function importData(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const raw = JSON.parse(e.target.result);
        const imported = raw && raw.tasks && raw.ddays ? sanitizeState(raw) : null;
        if (imported) {
          state = { ...state, ...imported };
          saveState();
          initUI();
          alert('플래너 데이터를 성공적으로 복원했습니다.');
        } else {
          alert('유효하지 않은 백업 파일 형식입니다.');
        }
      } catch (err) {
        alert('파일을 읽는 중 오류가 발생했습니다.');
      }
    };
    reader.readAsText(file);
  }

  function resetData() {
    if (confirm('모든 플래너 데이터를 초기화하시겠습니까? (이 작업은 되돌릴 수 없습니다.)')) {
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
    }
  }

  function printPlanner() {
    window.print();
  }

  // ── Helpers & Icons ──
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function refreshIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  // ── UI Init & Event Listeners ──
  function initUI() {
    loadState();
    renderDDays();
    renderCalendar();
    renderDailyCockpit();
    renderTasks();

    // View Toggle Buttons (Monthly vs Weekly)
    const btnMonthly = document.getElementById('btnViewMonthly');
    const btnWeekly = document.getElementById('btnViewWeekly');

    if (btnMonthly && btnWeekly) {
      btnMonthly.addEventListener('click', () => {
        state.viewMode = 'monthly';
        btnMonthly.classList.add('active');
        btnWeekly.classList.remove('active');
        renderCalendar();
      });
      btnWeekly.addEventListener('click', () => {
        state.viewMode = 'weekly';
        btnWeekly.classList.add('active');
        btnMonthly.classList.remove('active');
        renderCalendar();
      });
    }

    // Nav Arrows
    const prevBtn = document.getElementById('btnCalPrev');
    const nextBtn = document.getElementById('btnCalNext');
    const todayBtn = document.getElementById('btnCalToday');
    if (prevBtn) prevBtn.addEventListener('click', navPrev);
    if (nextBtn) nextBtn.addEventListener('click', navNext);
    if (todayBtn) todayBtn.addEventListener('click', navToday);

    // Todo Form Add
    const todoAddBtn = document.getElementById('todoAddBtn');
    const todoInput = document.getElementById('todoInput');
    const todoCategory = document.getElementById('todoCategory');
    const todoPriority = document.getElementById('todoPriority');
    const todoDueDate = document.getElementById('todoDueDate');

    if (todoAddBtn && todoInput) {
      const handleAdd = () => {
        const text = todoInput.value;
        if (!text || !text.trim()) return;
        addTask(
          text,
          todoCategory ? todoCategory.value : '업무',
          todoPriority ? todoPriority.value : 'medium',
          todoDueDate ? todoDueDate.value : state.selectedDate
        );
        todoInput.value = '';
      };

      todoAddBtn.addEventListener('click', handleAdd);
      todoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleAdd();
      });
    }

    // Todo Filter Buttons
    document.querySelectorAll('.filter-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        setTaskFilter(btn.dataset.filter);
      });
    });

    // D-Day Modal Open/Close
    const openDDayModalBtn = document.getElementById('btnOpenDDayModal');
    const ddayModal = document.getElementById('ddayModal');
    const closeDDayModalBtn = document.getElementById('btnCloseDDayModal');
    const saveDDayModalBtn = document.getElementById('btnSaveDDayModal');

    if (openDDayModalBtn && ddayModal) {
      openDDayModalBtn.addEventListener('click', () => {
        ddayModal.classList.add('active');
        const targetInput = document.getElementById('modalDDayTarget');
        if (targetInput && !targetInput.value) {
          targetInput.value = getRelativeDateStr(7);
        }
      });
    }

    if (closeDDayModalBtn && ddayModal) {
      closeDDayModalBtn.addEventListener('click', () => {
        ddayModal.classList.remove('active');
      });
    }

    if (saveDDayModalBtn && ddayModal) {
      saveDDayModalBtn.addEventListener('click', () => {
        const title = document.getElementById('modalDDayTitle').value;
        const target = document.getElementById('modalDDayTarget').value;
        const cat = document.getElementById('modalDDayCategory').value;
        if (!title || !target) {
          alert('목표 이름과 목표일을 입력해주세요.');
          return;
        }
        addDDay(title, target, cat);
        ddayModal.classList.remove('active');
        document.getElementById('modalDDayTitle').value = '';
      });
    }

    // FAQ Accordion
    document.querySelectorAll('.faq-question').forEach(q => {
      q.addEventListener('click', () => {
        const item = q.parentElement;
        item.classList.toggle('active');
      });
    });

    // Toolbar buttons
    const btnPrint = document.getElementById('btnToolbarPrint');
    const btnExport = document.getElementById('btnToolbarExport');
    const btnImport = document.getElementById('btnToolbarImport');
    const fileImportInput = document.getElementById('fileImportInput');
    const btnReset = document.getElementById('btnToolbarReset');

    if (btnPrint) btnPrint.addEventListener('click', printPlanner);
    if (btnExport) btnExport.addEventListener('click', exportData);
    if (btnImport && fileImportInput) {
      btnImport.addEventListener('click', () => fileImportInput.click());
      fileImportInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          importData(e.target.files[0]);
        }
      });
    }
    if (btnReset) btnReset.addEventListener('click', resetData);

    refreshIcons();
  }

  // ── Expose to Global Window ──
  window.PWPlanner = {
    toggleTask,
    deleteTask,
    deleteDDay,
    selectDate,
    exportData,
    importData,
    resetData,
    printPlanner
  };

  // Run on DOM load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUI);
  } else {
    initUI();
  }
})();
