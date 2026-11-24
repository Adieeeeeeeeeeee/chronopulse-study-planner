let state = { workspace: {}, tasks: [], sessions: [], habits: [] };
let dailyChart = null;
let subjectChart = null;

// Timer state
let timerSeconds = 25 * 60;
let timerInterval = null;

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

function playBell() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (_) {}
}

async function loadData() {
  const res = await fetch('/api/data');
  state = await res.json();
  if (state.workspace.theme_mode === 'dark') {
    document.body.classList.add('dark');
  } else {
    document.body.classList.remove('dark');
  }
  renderAll();
}

function renderAll() {
  const totalMinutes = state.sessions.reduce((sum, s) => sum + s.minutes, 0);
  const totalHours = (totalMinutes / 60).toFixed(1);
  const target = state.workspace.weekly_target_hours || 24;

  document.getElementById('kpiHours').textContent = `${totalHours} hrs`;
  document.getElementById('kpiTargetNote').textContent = `Target: ${target} hrs / week`;

  const completedTasks = state.tasks.filter(t => t.completed).length;
  const pendingTasks = state.tasks.length - completedTasks;
  document.getElementById('kpiPending').textContent = pendingTasks;
  document.getElementById('kpiCompletedNote').textContent = `${completedTasks} completed`;

  const habitsDone = state.habits.filter(h => h.doneToday).length;
  const habitRatio = state.habits.length ? habitsDone / state.habits.length : 1;
  const hourRatio = Math.min(1, (totalMinutes / 60) / target);
  const score = Math.round((habitRatio * 50) + (hourRatio * 50));
  document.getElementById('kpiConsistency').textContent = `${score} / 100`;

  renderHabits();
  renderTasks();
  renderCharts();
}

function renderHabits() {
  const list = document.getElementById('habitList');
  list.innerHTML = '';
  state.habits.forEach(habit => {
    const li = document.createElement('li');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = habit.doneToday;
    cb.addEventListener('change', async () => {
      await fetch(`/api/habits/${habit.id}`, { method: 'PATCH' });
      loadData();
    });
    const span = document.createElement('span');
    span.textContent = habit.title;
    if (habit.doneToday) span.style.textDecoration = 'line-through';
    li.append(cb, span);
    list.appendChild(li);
  });
}

function renderTasks() {
  const query = document.getElementById('searchInput').value.toLowerCase();
  const tbody = document.getElementById('taskTableBody');
  tbody.innerHTML = '';

  state.tasks
    .filter(t => t.title.toLowerCase().includes(query) || t.subject.toLowerCase().includes(query))
    .forEach(task => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><input type="checkbox" ${task.completed ? 'checked' : ''} data-id="${task.id}" class="task-toggle" /></td>
        <td>${task.title}</td>
        <td>${task.subject}</td>
        <td>${task.priority}</td>
        <td>${task.dueDate}</td>
        <td>${task.estimatedHours}h</td>
        <td><button class="btn secondary task-del" data-id="${task.id}">Delete</button></td>
      `;
      tbody.appendChild(tr);
    });

  document.querySelectorAll('.task-toggle').forEach(el => {
    el.addEventListener('change', async (e) => {
      await fetch(`/api/tasks/${e.target.dataset.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: e.target.checked })
      });
      loadData();
    });
  });

  document.querySelectorAll('.task-del').forEach(el => {
    el.addEventListener('click', async (e) => {
      await fetch(`/api/tasks/${e.target.dataset.id}`, { method: 'DELETE' });
      showToast('Task removed');
      loadData();
    });
  });
}

function renderCharts() {
  const recent = [...state.sessions].slice(0, 7).reverse();
  const dailyLabels = recent.map(s => `${s.date} (${s.subject})`);
  const dailyMins = recent.map(s => s.minutes);

  if (dailyChart) dailyChart.destroy();
  dailyChart = new Chart(document.getElementById('dailyChart'), {
    type: 'bar',
    data: {
      labels: dailyLabels,
      datasets: [{ label: 'Minutes', data: dailyMins, backgroundColor: '#2563eb' }]
    }
  });

  const subjectTotals = {};
  state.sessions.forEach(s => {
    subjectTotals[s.subject] = (subjectTotals[s.subject] || 0) + s.minutes;
  });

  if (subjectChart) subjectChart.destroy();
  subjectChart = new Chart(document.getElementById('subjectChart'), {
    type: 'doughnut',
    data: {
      labels: Object.keys(subjectTotals),
      datasets: [{
        data: Object.values(subjectTotals),
        backgroundColor: ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444']
      }]
    }
  });
}

// Form Listeners
document.getElementById('taskForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    title: document.getElementById('taskTitle').value,
    subject: document.getElementById('taskSubject').value,
    priority: document.getElementById('taskPriority').value,
    estimatedHours: document.getElementById('taskHours').value,
    dueDate: document.getElementById('taskDueDate').value
  };
  const res = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (res.ok) {
    e.target.reset();
    showToast('Task saved');
    loadData();
  } else {
    const err = await res.json();
    showToast(err.error || 'Invalid input');
  }
});

document.getElementById('sessionForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    subject: document.getElementById('sessionSubject').value,
    topic: document.getElementById('sessionTopic').value,
    minutes: document.getElementById('sessionMinutes').value,
    date: document.getElementById('sessionDate').value
  };
  const res = await fetch('/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (res.ok) {
    e.target.reset();
    showToast('Study session logged');
    loadData();
  }
});

document.getElementById('searchInput').addEventListener('input', renderTasks);

document.getElementById('themeToggleBtn').addEventListener('click', async () => {
  const next = document.body.classList.contains('dark') ? 'light' : 'dark';
  await fetch('/api/workspace', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ theme_mode: next })
  });
  loadData();
});

// Exports
document.getElementById('exportCsvBtn').addEventListener('click', () => {
  const rows = [['ID', 'Title', 'Subject', 'Priority', 'DueDate', 'EstHours', 'Completed']];
  state.tasks.forEach(t => rows.push([t.id, t.title, t.subject, t.priority, t.dueDate, t.estimatedHours, t.completed]));
  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'chronopulse-tasks.csv';
  a.click();
});

document.getElementById('exportJsonBtn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'chronopulse-backup.json';
  a.click();
});

// Timer controls
function updateTimerDisplay() {
  const mins = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
  const secs = String(timerSeconds % 60).padStart(2, '0');
  document.getElementById('timerDisplay').textContent = `${mins}:${secs}`;
}

document.querySelectorAll('.chip').forEach(btn => {
  btn.addEventListener('click', () => {
    clearInterval(timerInterval);
    timerInterval = null;
    timerSeconds = Number(btn.dataset.mins) * 60;
    updateTimerDisplay();
  });
});

document.getElementById('startTimerBtn').addEventListener('click', () => {
  if (timerInterval) return;
  timerInterval = setInterval(() => {
    if (timerSeconds > 0) {
      timerSeconds--;
      updateTimerDisplay();
    } else {
      clearInterval(timerInterval);
      timerInterval = null;
      playBell();
      showToast('Focus session complete!');
    }
  }, 1000);
});

document.getElementById('pauseTimerBtn').addEventListener('click', () => {
  clearInterval(timerInterval);
  timerInterval = null;
});

document.getElementById('resetTimerBtn').addEventListener('click', () => {
  clearInterval(timerInterval);
  timerInterval = null;
  timerSeconds = 25 * 60;
  updateTimerDisplay();
});

// Set default dates
const today = new Date().toISOString().slice(0, 10);
document.getElementById('taskDueDate').value = today;
document.getElementById('sessionDate').value = today;

loadData();
