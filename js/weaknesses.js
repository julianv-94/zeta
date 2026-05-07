(function () {
const { formatPercent, recentWrongAttempts, subtypeTrends, weakestAreas } = window.MMTAnalytics;
const { generateSimilarProblems, getToleranceHint } = window.MMTProblems;
const fmt = (value) => (Number.isInteger(value) ? String(value) : String(Number(value.toFixed(4))));

function sparkline(points, field, invert = false) {
  if (!points.length) return "";
  const values = points.map((point) => point[field]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const coords = values.map((value, index) => {
    const x = points.length === 1 ? 55 : (index / (points.length - 1)) * 110;
    const normalized = (value - min) / range;
    const y = invert ? normalized * 28 + 1 : 29 - normalized * 28;
    return `${x},${y}`;
  });
  return `<svg class="sparkline" viewBox="0 0 110 30" aria-hidden="true"><polyline fill="none" stroke="#4fb3a4" stroke-width="2" points="${coords.join(" ")}"></polyline></svg>`;
}

function renderWeaknesses(root, data, callbacks) {
  const weak = weakestAreas(data.rounds);
  const wrong = recentWrongAttempts(data.rounds);
  const trends = subtypeTrends(data.rounds);

  root.innerHTML = `
    <div class="section-header">
      <div>
        <h2>Weaknesses</h2>
        <p>Last 14 days for weak spots, last 30 days for trends.</p>
      </div>
      <label>Sort tracker
        <select id="trendSort">
          <option value="alpha">Alphabetical</option>
          <option value="improving">Most improved</option>
          <option value="declining">Most declined</option>
        </select>
      </label>
    </div>
    <section class="section">
      <h3>Your 5 Weakest Areas</h3>
      <div class="grid cols-3" id="weakCards">
        ${weak.length ? weak.map((item) => `
          <article class="weak-card">
            <h3>${item.label}</h3>
            <p>${item.n} attempts</p>
            <p>${(item.avgTimeMs / 1000).toFixed(1)}s vs ${(item.overallAvg / 1000).toFixed(1)}s avg, ${Math.round((item.avgTimeMs / item.overallAvg - 1) * 100)}% slower</p>
            <p>${formatPercent(item.accuracy)} accuracy vs ${formatPercent(item.overallAccuracy)} usual</p>
            <button type="button" class="primary" data-practice="${item.subType}">Practice this</button>
          </article>
        `).join("") : `<p class="muted">Need at least 10 attempts per sub-type in the last 14 days before weak areas appear.</p>`}
      </div>
    </section>
    <section class="section">
      <h3>Specific Problems You Got Wrong</h3>
      <div class="table-wrap surface">
        <table>
          <thead><tr><th>Problem</th><th>Your Answer</th><th>Correct</th><th>Date</th><th>Action</th></tr></thead>
          <tbody>
            ${wrong.length ? wrong.map((attempt) => `
              <tr>
                <td>${attempt.problemText}</td>
                <td class="wrong">${fmt(attempt.userAnswer)}</td>
                <td>${fmt(attempt.correctAnswer)}</td>
                <td>${new Date(attempt.date).toLocaleString()}</td>
                <td><button type="button" data-similar="${attempt.subType}">Drill similar</button></td>
              </tr>
            `).join("") : `<tr><td colspan="5" class="muted">No wrong answers logged yet.</td></tr>`}
          </tbody>
        </table>
      </div>
      <div id="similarRoot" class="section"></div>
    </section>
    <section class="section">
      <h3>Improvement Tracker</h3>
      <div class="table-wrap surface">
        <table>
          <thead><tr><th>Sub-Type</th><th>Trend</th><th>Accuracy</th><th>Speed</th></tr></thead>
          <tbody id="trendRows"></tbody>
        </table>
      </div>
    </section>
  `;

  const renderTrends = () => {
    const sort = root.querySelector("#trendSort").value;
    const rows = [...trends];
    if (sort === "improving") rows.sort((a, b) => (a.trend === "improving" ? -1 : 1) - (b.trend === "improving" ? -1 : 1));
    if (sort === "declining") rows.sort((a, b) => (a.trend === "declining" ? -1 : 1) - (b.trend === "declining" ? -1 : 1));
    if (sort === "alpha") rows.sort((a, b) => a.label.localeCompare(b.label));
    root.querySelector("#trendRows").innerHTML = rows.length ? rows.map((item) => `
      <tr>
        <td>${item.label}</td>
        <td>${item.trend}</td>
        <td>${sparkline(item.points, "accuracy")}</td>
        <td>${sparkline(item.points, "avgTimeMs", true)}</td>
      </tr>
    `).join("") : `<tr><td colspan="4" class="muted">No trend data yet.</td></tr>`;
  };

  renderTrends();
  root.querySelector("#trendSort").addEventListener("change", renderTrends);
  root.querySelectorAll("[data-practice]").forEach((button) => {
    button.addEventListener("click", () => callbacks.startFocusedRound(button.dataset.practice));
  });
  root.querySelectorAll("[data-similar]").forEach((button) => {
    button.addEventListener("click", () => {
      const problems = generateSimilarProblems(button.dataset.similar);
      root.querySelector("#similarRoot").innerHTML = `
        <div class="surface attempt-detail">
          <h3>10 Similar Problems</h3>
          <table>
            <thead><tr><th>Problem</th><th>Answer</th><th>Hint</th></tr></thead>
            <tbody>${problems.map((item) => `<tr><td>${item.problemText}</td><td>${fmt(item.correctAnswer)}</td><td>${getToleranceHint("", item.subType)}</td></tr>`).join("")}</tbody>
          </table>
        </div>
      `;
    });
  });
}

window.MMTWeaknesses = { renderWeaknesses };
})();
