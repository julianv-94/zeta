(function () {
const { generateProblem, getToleranceHint } = window.MMTProblems;
const { summarizeAttempts } = window.MMTAnalytics;
const uuid = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

function parseAnswer(value) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^-?(?:\d+\.?\d*|\.\d+)$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function fmt(value) {
  if (Math.abs(value) >= 100) return Number(value).toFixed(0);
  if (Number.isInteger(value)) return String(value);
  return String(Number(value.toFixed(4)));
}

class DrillController {
  constructor(root, { onComplete, onAbortStateChange }) {
    this.root = root;
    this.onComplete = onComplete;
    this.onAbortStateChange = onAbortStateChange;
    this.active = false;
    this.timerId = null;
    this.countdownId = null;
    this.flashId = null;
    this.keyHandler = (event) => {
      if (!this.active) return;
      if (event.key === "Escape") this.abort("escape");
    };
    document.addEventListener("keydown", this.keyHandler);
  }

  start(config) {
    this.stopTimers();
    this.config = { ...config };
    this.autoAdvance = !!config.autoAdvance;
    this.showAnswerCorner = !!config.showAnswerCorner;
    this.round = {
      roundId: uuid(),
      startedAt: new Date().toISOString(),
      endedAt: null,
      mode: config.mode,
      subMode: config.subMode,
      durationSec: Number(config.durationSec),
      aborted: false,
      summary: null,
      attempts: []
    };
    this.seen = new Set();
    this.active = true;
    this.locked = true;
    this.remaining = Number(config.durationSec);
    this.currentProblem = null;
    this.problemShownAt = 0;
    this.onAbortStateChange?.(true);
    this.renderCountdown(3);
  }

  renderCountdown(value) {
    this.root.innerHTML = `<div class="drill-shell"><div class="countdown">${value}</div></div>`;
    let current = value;
    this.countdownId = setInterval(() => {
      current -= 1;
      if (current > 0) {
        this.root.querySelector(".countdown").textContent = current;
      } else {
        this.stopCountdown();
        this.beginRound();
      }
    }, 1000);
  }

  beginRound() {
    this.locked = false;
    this.renderDrill();
    this.nextProblem();
    this.timerId = setInterval(() => {
      this.remaining -= 1;
      this.updateStats();
      if (this.remaining <= 0) this.finish(false);
    }, 1000);
  }

  renderDrill() {
    this.root.innerHTML = `
      <div class="drill-shell">
        <div class="drill-topbar">
          <div>
            <div class="timer" id="drillTimer">${this.remaining}s</div>
            <div id="drillCounter">0 correct / 0 attempted</div>
          </div>
          <button type="button" class="danger" id="abortRound">Abort Esc</button>
        </div>
        <div class="problem-card" id="problemCard">
          <p class="problem-text" id="problemText"></p>
          <input id="answerInput" class="answer-input" inputmode="decimal" autocomplete="off" aria-label="Answer">
          <div class="hint-row" id="hintRow"></div>
        </div>
      </div>
      ${this.showAnswerCorner ? `<div class="answer-peek" id="answerPeek" aria-hidden="true"></div>` : ""}
    `;
    this.input = this.root.querySelector("#answerInput");
    this.input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        this.submitAnswer({ viaEnter: true });
      }
    });
    this.input.addEventListener("input", () => {
      if (!this.autoAdvance) return;
      this.tryAutoAdvance();
    });
    this.root.querySelector("#abortRound").addEventListener("click", () => this.abort("button"));
    this.input.focus();
  }

  nextProblem() {
    this.currentProblem = generateProblem(this.config, this.seen);
    this.problemShownAt = performance.now();
    this.root.querySelector("#problemText").textContent = this.currentProblem.problemText;
    this.root.querySelector("#hintRow").textContent = getToleranceHint(this.config.subMode, this.currentProblem.subType);
    this.input.value = "";
    this.input.focus();
    this.updateAnswerPeek();
  }

  updateAnswerPeek() {
    if (!this.showAnswerCorner) return;
    const peek = this.root.querySelector("#answerPeek");
    if (peek && this.currentProblem) peek.textContent = fmt(this.currentProblem.correctAnswer);
  }

  isCorrect(parsed) {
    if (parsed === null || !this.currentProblem) return false;
    return Math.abs(parsed - this.currentProblem.correctAnswer) <= this.currentProblem.tolerance + 1e-12;
  }

  tryAutoAdvance() {
    if (this.locked || !this.currentProblem) return;
    const parsed = parseAnswer(this.input.value);
    if (parsed === null) return;
    if (!this.isCorrect(parsed)) return;
    this.recordAndAdvance(parsed, true);
  }

  submitAnswer({ viaEnter = false } = {}) {
    if (this.locked || !this.currentProblem) return;
    const parsed = parseAnswer(this.input.value);
    if (parsed === null) return;
    const correct = this.isCorrect(parsed);
    if (this.autoAdvance && viaEnter && !correct) {
      this.flash(false);
      return;
    }
    this.recordAndAdvance(parsed, correct);
  }

  recordAndAdvance(parsed, correct) {
    const elapsed = Math.max(1, Math.round(performance.now() - this.problemShownAt));
    this.round.attempts.push({
      problemId: this.currentProblem.problemId,
      drillType: this.currentProblem.drillType,
      subType: this.currentProblem.subType,
      problemText: this.currentProblem.problemText,
      correctAnswer: this.currentProblem.correctAnswer,
      userAnswer: parsed,
      correct,
      timeMs: elapsed,
      tolerance: this.currentProblem.tolerance
    });
    this.flash(correct);
    this.updateStats();
    this.nextProblem();
  }

  flash(correct) {
    const card = this.root.querySelector("#problemCard");
    card.classList.remove("correct-flash", "wrong-flash");
    card.classList.add(correct ? "correct-flash" : "wrong-flash");
    clearTimeout(this.flashId);
    this.flashId = setTimeout(() => card.classList.remove("correct-flash", "wrong-flash"), 150);
  }

  updateStats() {
    const correct = this.round.attempts.filter((attempt) => attempt.correct).length;
    const attempted = this.round.attempts.length;
    const timer = this.root.querySelector("#drillTimer");
    const counter = this.root.querySelector("#drillCounter");
    if (timer) timer.textContent = `${Math.max(0, this.remaining)}s`;
    if (counter) counter.textContent = `${correct} correct / ${attempted} attempted`;
  }

  abort() {
    if (!this.active) return;
    this.finish(true);
  }

  finish(aborted) {
    if (!this.active) return;
    this.locked = true;
    this.active = false;
    this.stopTimers();
    this.round.aborted = aborted;
    this.round.endedAt = new Date().toISOString();
    this.round.summary = summarizeAttempts(this.round.attempts, this.round.durationSec);
    const message = this.onComplete?.(this.round) || "";
    this.onAbortStateChange?.(false);
    this.renderSummary(message);
  }

  renderSummary(message) {
    const attempts = [...this.round.attempts];
    const slowest = attempts.sort((a, b) => b.timeMs - a.timeMs).slice(0, 3);
    const fastest = [...this.round.attempts].sort((a, b) => a.timeMs - b.timeMs).slice(0, 3);
    const row = (attempt) => `<li><span class="${attempt.correct ? "right" : "wrong"}">${attempt.problemText}</span> ${Math.round(attempt.timeMs / 100) / 10}s, answer ${fmt(attempt.correctAnswer)}</li>`;
    this.root.innerHTML = `
      <div class="summary surface">
        <h2>${this.round.aborted ? "Round Aborted" : "Round Complete"}</h2>
        <p class="muted">${message}</p>
        <div class="summary-grid">
          <div class="metric-card"><h3>Attempted</h3><strong>${this.round.summary.attempted}</strong></div>
          <div class="metric-card"><h3>Correct</h3><strong>${this.round.summary.correct}</strong></div>
          <div class="metric-card"><h3>Accuracy</h3><strong>${Math.round(this.round.summary.accuracy * 1000) / 10}%</strong></div>
          <div class="metric-card"><h3>Problems/min</h3><strong>${this.round.summary.problemsPerMin.toFixed(1)}</strong></div>
        </div>
        <div class="grid cols-2 section">
          <div>
            <h3>Slowest 3</h3>
            <ul>${slowest.map(row).join("") || "<li>No attempts</li>"}</ul>
          </div>
          <div>
            <h3>Fastest 3</h3>
            <ul>${fastest.map(row).join("") || "<li>No attempts</li>"}</ul>
          </div>
        </div>
        <div class="controls">
          <button type="button" class="primary" id="saveExit">Save & Exit</button>
          <button type="button" id="startAgain">Start Another Round</button>
        </div>
      </div>
    `;
    this.root.querySelector("#saveExit").addEventListener("click", () => {
      location.hash = this.config.returnHash || "#history";
    });
    this.root.querySelector("#startAgain").addEventListener("click", () => this.start(this.config));
  }

  stopCountdown() {
    clearInterval(this.countdownId);
    this.countdownId = null;
  }

  stopTimers() {
    this.stopCountdown();
    clearInterval(this.timerId);
    this.timerId = null;
    clearTimeout(this.flashId);
  }

  dispose() {
    this.stopTimers();
    document.removeEventListener("keydown", this.keyHandler);
  }
}

window.MMTDrill = { DrillController };
})();
