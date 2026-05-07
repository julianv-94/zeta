(function () {
const { dailyModeMetric, dailyVolume, personalBests, rollingAverage, subtypeSpeed, formatPercent } = window.MMTAnalytics;
let charts = [];

function destroyCharts() {
  charts.forEach((chart) => chart.destroy());
  charts = [];
}

const colors = {
  morning: "#f0b35a",
  afternoon: "#4fb3a4",
  evening: "#68a5ff"
};

function canvas(id) {
  return `<div class="chart-block surface"><h3>${id.title}</h3><canvas id="${id.id}"></canvas></div>`;
}

function datesFrom(rows) {
  return [...new Set(rows.map((row) => row.date))].sort();
}

function modeSeries(rows, mode, dates, multiplier = 1) {
  return dates.map((date) => {
    const row = rows.find((item) => item.date === date && item.mode === mode);
    return row ? row.value * multiplier : null;
  });
}

function renderProgress(root, data, range = "30") {
  destroyCharts();
  const bests = personalBests(data.rounds);
  root.innerHTML = `
    <div class="section-header">
      <div>
        <h2>Progress</h2>
        <p>Completed rounds only. Aborted rounds are excluded.</p>
      </div>
      <label>Range
        <select id="progressRange">
          <option value="7">7 days</option>
          <option value="30">30 days</option>
          <option value="90">90 days</option>
          <option value="all">All</option>
        </select>
      </label>
    </div>
    <div class="kpi-grid">
      <div class="metric-card"><h3>Best Score</h3><strong>${bests.bestScore}</strong><p>correct in one round</p></div>
      <div class="metric-card"><h3>Best Accuracy</h3><strong>${formatPercent(bests.bestAccuracy)}</strong><p>all-time</p></div>
      <div class="metric-card"><h3>Best Speed</h3><strong>${bests.bestPpm.toFixed(1)}</strong><p>problems/min</p></div>
      <div class="metric-card"><h3>Streak</h3><strong>${bests.streak}</strong><p>practice days</p></div>
      <div class="metric-card"><h3>Lifetime</h3><strong>${bests.totalAttempts}</strong><p>attempted</p></div>
    </div>
    ${canvas({ id: "dailyVolume", title: "Daily Volume" })}
    ${canvas({ id: "speedChart", title: "Speed Over Time" })}
    ${canvas({ id: "accuracyChart", title: "Accuracy Over Time" })}
    ${canvas({ id: "subtypeSpeed", title: "Speed by Sub-Type, Last 14 Days" })}
  `;
  root.querySelector("#progressRange").value = range;

  if (!window.Chart) {
    root.insertAdjacentHTML("beforeend", `<p class="muted">Chart.js is unavailable. Reopen with a network connection once to cache the CDN file.</p>`);
    return;
  }

  Chart.defaults.color = "#aeb5c2";
  Chart.defaults.borderColor = "#343845";

  const volume = dailyVolume(data.rounds, range);
  charts.push(new Chart(root.querySelector("#dailyVolume"), {
    type: "bar",
    data: {
      labels: volume.map((row) => row.date),
      datasets: ["morning", "afternoon", "evening"].map((mode) => ({
        label: mode,
        data: volume.map((row) => row[mode]),
        backgroundColor: colors[mode]
      }))
    },
    options: { responsive: true, scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } } }
  }));

  const speedRows = dailyModeMetric(data.rounds, "problemsPerMin", range);
  const speedDates = datesFrom(speedRows);
  const speedDatasets = ["morning", "afternoon", "evening"].flatMap((mode) => {
    const rows = speedRows.filter((row) => row.mode === mode);
    return [
      { label: mode, data: modeSeries(speedRows, mode, speedDates), borderColor: colors[mode], backgroundColor: colors[mode], tension: 0.25 },
      { label: `${mode} 7d avg`, data: modeSeries(rollingAverage(rows), mode, speedDates), borderColor: colors[mode], borderDash: [6, 6], pointRadius: 0, tension: 0.25 }
    ];
  });
  charts.push(new Chart(root.querySelector("#speedChart"), {
    type: "line",
    data: { labels: speedDates, datasets: speedDatasets },
    options: { responsive: true, scales: { y: { beginAtZero: true } } }
  }));

  const accuracyRows = dailyModeMetric(data.rounds, "accuracy", range);
  const accuracyDates = datesFrom(accuracyRows);
  const accuracyDatasets = ["morning", "afternoon", "evening"].flatMap((mode) => {
    const rows = accuracyRows.filter((row) => row.mode === mode);
    return [
      { label: mode, data: modeSeries(accuracyRows, mode, accuracyDates, 100), borderColor: colors[mode], backgroundColor: colors[mode], tension: 0.25 },
      { label: `${mode} 7d avg`, data: modeSeries(rollingAverage(rows), mode, accuracyDates, 100), borderColor: colors[mode], borderDash: [6, 6], pointRadius: 0, tension: 0.25 }
    ];
  });
  charts.push(new Chart(root.querySelector("#accuracyChart"), {
    type: "line",
    data: { labels: accuracyDates, datasets: accuracyDatasets },
    options: { responsive: true, scales: { y: { min: 70, max: 100 } } }
  }));

  const subtypeRows = subtypeSpeed(data.rounds);
  charts.push(new Chart(root.querySelector("#subtypeSpeed"), {
    type: "bar",
    data: {
      labels: subtypeRows.map((row) => row.label),
      datasets: [{
        label: "Avg ms/problem",
        data: subtypeRows.map((row) => Math.round(row.avgTimeMs)),
        backgroundColor: subtypeRows.map((row) => (row.betterThanAverage ? "#58c783" : "#f36d6d"))
      }]
    },
    options: { indexAxis: "y", responsive: true, scales: { x: { beginAtZero: true } } }
  }));
}

window.MMTViz = { renderProgress };
})();
