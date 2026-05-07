(function () {
const { getSubtypeLabel } = window.MMTProblems;
const dayKey = (iso) => new Date(iso).toISOString().slice(0, 10);
const validRounds = (rounds, includeAborted = false) => rounds.filter((round) => includeAborted || !round.aborted);
const percent = (value) => Math.round(value * 1000) / 10;

function summarizeAttempts(attempts, durationSec) {
  const attempted = attempts.length;
  const correct = attempts.filter((attempt) => attempt.correct).length;
  const avgTimeMs = attempted ? attempts.reduce((sum, attempt) => sum + attempt.timeMs, 0) / attempted : 0;
  return {
    attempted,
    correct,
    accuracy: attempted ? correct / attempted : 0,
    problemsPerMin: durationSec ? attempted / (durationSec / 60) : 0,
    avgTimeMs
  };
}

function personalBests(rounds) {
  const complete = validRounds(rounds);
  const byMode = {};
  for (const round of complete) {
    const current = byMode[round.mode] || { score: 0, accuracy: 0, ppm: 0 };
    current.score = Math.max(current.score, round.summary.correct || 0);
    current.accuracy = Math.max(current.accuracy, round.summary.accuracy || 0);
    current.ppm = Math.max(current.ppm, round.summary.problemsPerMin || 0);
    byMode[round.mode] = current;
  }

  const days = [...new Set(complete.map((round) => dayKey(round.startedAt)))].sort();
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let cursor = new Date(today); ; cursor.setDate(cursor.getDate() - 1)) {
    const key = cursor.toISOString().slice(0, 10);
    if (days.includes(key)) streak += 1;
    else break;
  }

  return {
    byMode,
    bestScore: Math.max(0, ...complete.map((round) => round.summary.correct || 0)),
    bestAccuracy: Math.max(0, ...complete.map((round) => round.summary.accuracy || 0)),
    bestPpm: Math.max(0, ...complete.map((round) => round.summary.problemsPerMin || 0)),
    streak,
    totalAttempts: complete.reduce((sum, round) => sum + (round.summary.attempted || 0), 0)
  };
}

function pbMessage(round, previousRounds) {
  if (round.aborted) return "Round aborted and excluded from progress charts.";
  const previous = validRounds(previousRounds).filter((item) => item.mode === round.mode);
  const bestAccuracy = Math.max(0, ...previous.map((item) => item.summary.accuracy || 0));
  const bestPpm = Math.max(0, ...previous.map((item) => item.summary.problemsPerMin || 0));
  const bestScore = Math.max(0, ...previous.map((item) => item.summary.correct || 0));
  if (round.summary.correct > bestScore) return "New PB on correct answers.";
  if (round.summary.accuracy > bestAccuracy) return "New PB on accuracy.";
  if (round.summary.problemsPerMin > bestPpm) return "New PB on speed.";
  if (bestPpm > 0) {
    const delta = Math.round(((bestPpm - round.summary.problemsPerMin) / bestPpm) * 100);
    return `Off your best speed by ${Math.max(0, delta)}%.`;
  }
  return "First saved round for this mode.";
}

function roundsInRange(rounds, range = "30") {
  const complete = validRounds(rounds);
  if (range === "all") return complete;
  const days = Number(range);
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return complete.filter((round) => new Date(round.startedAt).getTime() >= cutoff);
}

function dailyVolume(rounds, range = "30") {
  const rows = new Map();
  for (const round of roundsInRange(rounds, range)) {
    const key = dayKey(round.startedAt);
    const row = rows.get(key) || { date: key, morning: 0, afternoon: 0, evening: 0 };
    row[round.mode] += round.summary.attempted || 0;
    rows.set(key, row);
  }
  return [...rows.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function dailyModeMetric(rounds, metric, range = "30") {
  const rows = new Map();
  for (const round of roundsInRange(rounds, range)) {
    const key = `${dayKey(round.startedAt)}:${round.mode}`;
    const row = rows.get(key) || { date: dayKey(round.startedAt), mode: round.mode, count: 0, value: 0, correct: 0, attempted: 0 };
    row.count += 1;
    row.value += round.summary[metric] || 0;
    row.correct += round.summary.correct || 0;
    row.attempted += round.summary.attempted || 0;
    rows.set(key, row);
  }
  return [...rows.values()]
    .map((row) => ({
      date: row.date,
      mode: row.mode,
      value: metric === "accuracy" ? (row.attempted ? row.correct / row.attempted : 0) : row.value / row.count
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function rollingAverage(rows, window = 7) {
  return rows.map((row, index) => {
    const slice = rows.slice(Math.max(0, index - window + 1), index + 1);
    return { ...row, value: slice.reduce((sum, item) => sum + item.value, 0) / slice.length };
  });
}

function subtypeSpeed(rounds, days = 14) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const attempts = validRounds(rounds)
    .filter((round) => new Date(round.startedAt).getTime() >= cutoff)
    .flatMap((round) => round.attempts || []);
  const overall = attempts.length ? attempts.reduce((sum, attempt) => sum + attempt.timeMs, 0) / attempts.length : 0;
  const groups = groupBySubtype(attempts);
  return [...groups.entries()]
    .map(([subType, items]) => ({
      subType,
      label: getSubtypeLabel(subType),
      avgTimeMs: items.reduce((sum, attempt) => sum + attempt.timeMs, 0) / items.length,
      n: items.length,
      betterThanAverage: overall ? items.reduce((sum, attempt) => sum + attempt.timeMs, 0) / items.length <= overall : true
    }))
    .sort((a, b) => b.avgTimeMs - a.avgTimeMs);
}

function groupBySubtype(attempts) {
  const groups = new Map();
  for (const attempt of attempts) {
    if (!attempt.subType) continue;
    const list = groups.get(attempt.subType) || [];
    list.push(attempt);
    groups.set(attempt.subType, list);
  }
  return groups;
}

function weakestAreas(rounds) {
  const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
  const attempts = validRounds(rounds)
    .filter((round) => new Date(round.startedAt).getTime() >= cutoff)
    .flatMap((round) => round.attempts || []);
  const overallAvg = attempts.length ? attempts.reduce((sum, attempt) => sum + attempt.timeMs, 0) / attempts.length : 0;
  const overallAccuracy = attempts.length ? attempts.filter((attempt) => attempt.correct).length / attempts.length : 0;
  const groups = groupBySubtype(attempts);
  return [...groups.entries()]
    .filter(([, items]) => items.length >= 10 && overallAvg > 0)
    .map(([subType, items]) => {
      const avgTimeMs = items.reduce((sum, attempt) => sum + attempt.timeMs, 0) / items.length;
      const accuracy = items.filter((attempt) => attempt.correct).length / items.length;
      return {
        subType,
        label: getSubtypeLabel(subType),
        n: items.length,
        avgTimeMs,
        accuracy,
        overallAvg,
        overallAccuracy,
        weaknessScore: (avgTimeMs / overallAvg) * (1 - accuracy + 0.5)
      };
    })
    .sort((a, b) => b.weaknessScore - a.weaknessScore)
    .slice(0, 5);
}

function recentWrongAttempts(rounds, limit = 50) {
  return [...rounds]
    .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))
    .flatMap((round) => (round.attempts || []).map((attempt) => ({ ...attempt, date: round.startedAt })))
    .filter((attempt) => !attempt.correct)
    .slice(0, limit);
}

function subtypeTrends(rounds) {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const rows = new Map();
  for (const round of validRounds(rounds).filter((round) => new Date(round.startedAt).getTime() >= cutoff)) {
    const date = dayKey(round.startedAt);
    for (const attempt of round.attempts || []) {
      if (!attempt.subType) continue;
      const key = `${attempt.subType}:${date}`;
      const row = rows.get(key) || { subType: attempt.subType, date, attempts: 0, correct: 0, timeMs: 0 };
      row.attempts += 1;
      row.correct += attempt.correct ? 1 : 0;
      row.timeMs += attempt.timeMs;
      rows.set(key, row);
    }
  }
  const grouped = new Map();
  for (const row of rows.values()) {
    const list = grouped.get(row.subType) || [];
    list.push({
      date: row.date,
      accuracy: row.attempts ? row.correct / row.attempts : 0,
      avgTimeMs: row.attempts ? row.timeMs / row.attempts : 0
    });
    grouped.set(row.subType, list);
  }
  return [...grouped.entries()]
    .map(([subType, points]) => {
      points.sort((a, b) => a.date.localeCompare(b.date));
      const half = Math.max(1, Math.floor(points.length / 2));
      const first = points.slice(0, half);
      const second = points.slice(-half);
      const firstScore = average(first.map((p) => p.accuracy)) - average(first.map((p) => p.avgTimeMs)) / 10000;
      const secondScore = average(second.map((p) => p.accuracy)) - average(second.map((p) => p.avgTimeMs)) / 10000;
      const delta = secondScore - firstScore;
      return {
        subType,
        label: getSubtypeLabel(subType),
        trend: delta > 0.03 ? "improving" : delta < -0.03 ? "declining" : "stable",
        points
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

const average = (values) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);

function formatPercent(value) {
  return `${percent(value)}%`;
}

window.MMTAnalytics = {
  dailyModeMetric,
  dailyVolume,
  formatPercent,
  pbMessage,
  personalBests,
  recentWrongAttempts,
  rollingAverage,
  roundsInRange,
  subtypeSpeed,
  subtypeTrends,
  summarizeAttempts,
  weakestAreas
};
})();
