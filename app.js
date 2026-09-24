const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEK_COLOR_CLASSES = ['week-1', 'week-2', 'week-3', 'week-4', 'week-5'];

const state = {
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1,
  selectedColor: '#2dd4bf',
  dashboard: null,
};

let monthlyChart, donutChart;

const $ = (sel) => document.querySelector(sel);

function pad(n) { return String(n).padStart(2, '0'); }

function showBanner(msg) {
  const banner = $('#banner');
  banner.textContent = msg;
  banner.hidden = false;
}

async function api(path, options) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erreur ${res.status}`);
  }
  return res.json();
}

function populateYearSelect() {
  const select = $('#yearSelect');
  const current = new Date().getFullYear();
  select.innerHTML = '';
  for (let y = current - 3; y <= current + 3; y++) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    if (y === state.year) opt.selected = true;
    select.appendChild(opt);
  }
}

function updatePeriodLabel() {
  $('#periodLabel').textContent = `— ${MONTH_NAMES[state.month - 1].toUpperCase()} ${state.year} —`;
}

async function loadDashboard() {
  try {
    const data = await api(`/api/dashboard?year=${state.year}&month=${state.month}`);
    state.dashboard = data;
    renderAll();
  } catch (err) {
    showBanner(
      `Impossible de charger les données (${err.message}). Vérifie que DATABASE_URL est bien configurée et que schema.sql a été exécuté.`
    );
  }
}

function renderAll() {
  const d = state.dashboard;
  if (!d) return;
  renderMonthlyChart(d);
  renderDonut(d);
  renderWeeklyTable(d);
  renderGridTable(d);
  renderTopHabits(d);
  renderInsights(d);
}

function renderMonthlyChart(d) {
  const ctx = document.getElementById('monthlyChart');
  const labels = d.dailyProgress.map((_, i) => i + 1);
  if (monthlyChart) monthlyChart.destroy();
  monthlyChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: '% habitudes complétées',
        data: d.dailyProgress,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.15)',
        tension: 0.35,
        fill: true,
        pointRadius: 2,
        pointBackgroundColor: '#3b82f6',
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#8a92c0', font: { family: 'Courier New' } }, grid: { color: '#2a3363' } },
        y: {
          min: 0, max: 100,
          ticks: { color: '#8a92c0', callback: (v) => v + '%', font: { family: 'Courier New' } },
          grid: { color: '#2a3363' },
        },
      },
    },
  });
}

function renderDonut(d) {
  const ctx = document.getElementById('donutChart');
  const { completedPct, leftPct } = d.totals;
  if (donutChart) donutChart.destroy();
  donutChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Completed', 'Left'],
      datasets: [{
        data: [completedPct, leftPct],
        backgroundColor: ['#2dd4bf', '#ef4444'],
        borderWidth: 0,
      }],
    },
    options: {
      cutout: '72%',
      plugins: { legend: { display: false }, tooltip: { enabled: true } },
    },
  });
  $('#donutCenter').textContent = `${completedPct}%`;
  $('#legendCompleted').textContent = `${completedPct}%`;
  $('#legendLeft').textContent = `${leftPct}%`;
}

function renderWeeklyTable(d) {
  const table = $('#weeklyTable');
  const weeks = d.weeklySummary;

  let thead = '<thead><tr><th></th>';
  weeks.forEach((w, i) => {
    thead += `<th class="week-head ${WEEK_COLOR_CLASSES[i % 5]}">${w.label.toUpperCase()}</th>`;
  });
  thead += '</tr></thead>';

  const rowsDef = [
    { label: 'Completed', key: 'completed' },
    { label: 'Goal', key: 'goal' },
    { label: 'Left', key: 'left' },
  ];

  let tbody = '<tbody>';
  rowsDef.forEach((r) => {
    tbody += `<tr><td class="row-label">${r.label}</td>`;
    weeks.forEach((w, i) => {
      tbody += `<td class="${WEEK_COLOR_CLASSES[i % 5]}">${w[r.key]}</td>`;
    });
    tbody += '</tr>';
  });

  tbody += '<tr><td class="row-label">Weekly Progress</td>';
  weeks.forEach((w, i) => {
    tbody += `<td class="progress-cell ${WEEK_COLOR_CLASSES[i % 5]}">
        <div class="progress-bar-outer"><div class="progress-bar-inner" style="width:${Math.min(w.progressPct, 100)}%"></div></div>
        <div class="progress-pct">${w.progressPct}%</div>
      </td>`;
  });
  tbody += '</tr></tbody>';

  table.innerHTML = thead + tbody;
}

function renderGridTable(d) {
  const table = $('#gridTable');
  const weeks = d.weeks;

  let thead = '<thead><tr><th class="row-label">Habit</th><th>Goal</th>';
  weeks.forEach((w, i) => {
    w.days.forEach((day) => {
      thead += `<th class="${WEEK_COLOR_CLASSES[i % 5]}">${day}</th>`;
    });
  });
  thead += '<th>Streak</th></tr></thead>';

  let tbody = '<tbody>';
  d.habits.forEach((h) => {
    tbody += `<tr>
      <td class="habit-name-cell">
        <span class="icon">${h.icon}</span>
        <span>${escapeHtml(h.name)}</span>
        <button class="remove" data-id="${h.id}" title="Supprimer">✕</button>
      </td>
      <td>${h.goal}</td>`;
    weeks.forEach((w, i) => {
      w.days.forEach((day) => {
        const checked = h.daysChecked.includes(day);
        tbody += `<td class="check-cell ${WEEK_COLOR_CLASSES[i % 5]} ${checked ? 'checked' : ''}"
                       data-habit-id="${h.id}" data-day="${day}">${checked ? '✓' : ''}</td>`;
      });
    });
    tbody += `<td class="streak-cell">🔥 ${h.streak}</td>`;
    tbody += '</tr>';
  });
  tbody += '</tbody>';

  table.innerHTML = thead + tbody;

  table.querySelectorAll('.check-cell').forEach((cell) => {
    cell.addEventListener('click', onToggleCheck);
  });
  table.querySelectorAll('.remove').forEach((btn) => {
    btn.addEventListener('click', onRemoveHabit);
  });
}

function renderTopHabits(d) {
  const list = $('#topHabitsList');
  if (d.topHabits.length === 0) {
    list.innerHTML = '<li>Aucune habitude pour l\'instant — ajoutes-en une !</li>';
    return;
  }
  list.innerHTML = d.topHabits.map((h) => `
    <li>
      <span class="icon">${h.icon}</span>
      <span>${escapeHtml(h.name)}</span>
      <span class="streak-badge">🔥 ${h.streak}j</span>
    </li>
  `).join('');
}

function renderInsights(d) {
  const list = $('#insightsList');
  const insights = buildInsights(d);
  list.innerHTML = insights.map((ins) => `<li><b>${ins.title}</b>${ins.body}</li>`).join('');
}

function buildInsights(d) {
  const insights = [];
  if (d.habits.length === 0) {
    return [{ title: 'Commence ici', body: 'Ajoute ta première habitude dans le panneau de gauche pour démarrer ton suivi.' }];
  }

  const best = [...d.habits].sort((a, b) => b.streak - a.streak)[0];
  if (best && best.streak > 0) {
    insights.push({ title: 'Keep going!', body: `${best.icon} ${best.name} tient une série de ${best.streak} jour(s). Continue comme ça.` });
  }

  const weakest = [...d.habits].sort((a, b) => a.completedThisMonth - b.completedThisMonth)[0];
  if (weakest) {
    insights.push({ title: 'À surveiller', body: `${weakest.icon} ${weakest.name} n'a été cochée que ${weakest.completedThisMonth} fois ce mois-ci. Un petit coup de pouce ?` });
  }

  insights.push({ title: 'Constance is key', body: 'De petites habitudes répétées chaque jour créent de grands changements sur la durée.' });

  const overallPct = d.totals.completedPct;
  if (overallPct >= 75) {
    insights.push({ title: 'Excellent mois', body: `Tu es à ${overallPct}% de tes objectifs ce mois-ci. Continue sur cette lancée !` });
  } else if (overallPct > 0) {
    insights.push({ title: 'Progression', body: `Tu es à ${overallPct}% de tes objectifs ce mois-ci. Chaque jour compte.` });
  }

  return insights;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function onToggleCheck(e) {
  const cell = e.currentTarget;
  const habitId = cell.dataset.habitId;
  const day = parseInt(cell.dataset.day, 10);
  const date = `${state.year}-${pad(state.month)}-${pad(day)}`;

  cell.classList.toggle('checked');
  cell.textContent = cell.classList.contains('checked') ? '✓' : '';

  try {
    await api('/api/checks', { method: 'POST', body: JSON.stringify({ habitId, date }) });
    await loadDashboard();
  } catch (err) {
    showBanner(`Erreur lors de l'enregistrement : ${err.message}`);
    await loadDashboard();
  }
}

async function onRemoveHabit(e) {
  e.stopPropagation();
  const id = e.currentTarget.dataset.id;
  if (!confirm('Supprimer cette habitude et tout son historique ?')) return;
  try {
    await api(`/api/habits?id=${id}`, { method: 'DELETE' });
    await loadDashboard();
  } catch (err) {
    showBanner(`Erreur lors de la suppression : ${err.message}`);
  }
}

function setupColorPicker() {
  const swatches = document.querySelectorAll('.swatch');
  swatches.forEach((sw, i) => {
    if (i === 0) sw.classList.add('selected');
    sw.addEventListener('click', () => {
      swatches.forEach((s) => s.classList.remove('selected'));
      sw.classList.add('selected');
      state.selectedColor = sw.dataset.color;
    });
  });
}

function setupForm() {
  $('#addHabitForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('#habitName').value.trim();
    const icon = $('#habitIcon').value.trim() || '✅';
    const goal = parseInt($('#habitGoal').value, 10) || 7;
    if (!name) return;

    try {
      await api('/api/habits', {
        method: 'POST',
        body: JSON.stringify({ name, icon, goal, color: state.selectedColor }),
      });
      $('#addHabitForm').reset();
      $('#habitIcon').value = '✅';
      $('#habitGoal').value = 7;
      await loadDashboard();
    } catch (err) {
      showBanner(`Erreur lors de l'ajout : ${err.message}`);
    }
  });
}

function setupPeriodControls() {
  $('#yearSelect').addEventListener('change', (e) => {
    state.year = parseInt(e.target.value, 10);
    updatePeriodLabel();
    loadDashboard();
  });
  $('#monthSelect').addEventListener('change', (e) => {
    state.month = parseInt(e.target.value, 10);
    updatePeriodLabel();
    loadDashboard();
  });
}

function init() {
  populateYearSelect();
  $('#monthSelect').value = state.month;
  updatePeriodLabel();
  setupColorPicker();
  setupForm();
  setupPeriodControls();
  loadDashboard();
}

document.addEventListener('DOMContentLoaded', init);
