(function () {
const { DrillController } = window.MMTDrill;
const { pbMessage } = window.MMTAnalytics;
const { MODE_LABELS, SUBMODE_OPTIONS, getSubModeLabel } = window.MMTProblems;
const { clearAllData, deleteRound, exportData, getData, getStorageStatus, importData, saveRound, updateSettings } = window.MMTStorage;
const { renderProgress } = window.MMTViz;
const { renderWeaknesses } = window.MMTWeaknesses;

const roots = {
  train: document.querySelector("#trainRoot"),
  history: document.querySelector("#historyRoot"),
  progress: document.querySelector("#progressRoot"),
  weaknesses: document.querySelector("#weaknessRoot")
};

let selectedMode = "morning";
let selectedSubMode = "standard";
let progressRange = "30";
let activeTab = "train";
let drill;

function setStorageWarning() {
  const status = getStorageStatus();
  const banner = document.querySelector("#storageWarning");
  if (status.storageAvailable) {
    banner.classList.add("hidden");
    return;
  }
  banner.textContent = `Storage is unavailable. Rounds will stay in memory only for this page session. ${status.lastError || ""}`;
  banner.classList.remove("hidden");
}

function route() {
  const next = (location.hash || "#train").slice(1);
  const tab = roots[next] ? next : "train";
  if (drill?.active && tab !== "train") {
    drill.abort();
  }
  activeTab = tab;
  document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.add("hidden"));
  document.querySelector(`#${tab}`).classList.remove("hidden");
  document.querySelectorAll(".tabs button").forEach((button) => button.classList.toggle("active", button.dataset.tab === tab));
  renderActiveTab();
}

function renderActiveTab() {
  const data = getData();
  if (activeTab === "train") renderTrain(data);
  if (activeTab === "history") renderHistory(data);
  if (activeTab === "progress") renderProgress(roots.progress, data, progressRange);
  if (activeTab === "weaknesses") renderWeaknesses(roots.weaknesses, data, { startFocusedRound });
  setStorageWarning();
}

function renderTrain(data) {
  if (drill?.active) return;
  const selectedOption = SUBMODE_OPTIONS[selectedMode].find((option) => option.value === selectedSubMode) || SUBMODE_OPTIONS[selectedMode][0];
  roots.train.innerHTML = `
    <section class="section">
      <div class="section-header">
        <div>
          <h2>Train</h2>
          <p>Pick a daily mode, keep your hands on the keyboard, and press Enter for each answer.</p>
        </div>
      </div>
      <div class="grid cols-3" id="modeCards">
        <button type="button" class="mode-card ${selectedMode === "morning" ? "selected" : ""}" data-mode="morning">
          <h3>Morning</h3>
          <p>Standard Zetamac arithmetic.</p>
        </button>
        <button type="button" class="mode-card ${selectedMode === "afternoon" ? "selected" : ""}" data-mode="afternoon">
          <h3>Afternoon</h3>
          <p>Larger numbers, decimal division, and percentages.</p>
        </button>
        <button type="button" class="mode-card ${selectedMode === "evening" ? "selected" : ""}" data-mode="evening">
          <h3>Evening</h3>
          <p>Trader-specific isolated drills.</p>
        </button>
      </div>
    </section>
    <section class="section surface" style="padding:16px">
      <div class="controls">
        <label>Sub-mode
          <select id="subModeSelect">
            ${SUBMODE_OPTIONS[selectedMode].map((option) => `<option value="${option.value}">${option.label}</option>`).join("")}
          </select>
        </label>
        <label>Round length
          <input id="durationInput" type="number" min="15" max="600" step="15" value="${selectedOption.duration || data.settings.defaultRoundSec}">
        </label>
        <button type="button" class="primary" id="startRound">Start Round</button>
      </div>
      ${selectedSubMode === "log_exp" && data.settings.showLogReference ? `
        <div class="reference-card section" style="margin-top:16px">
          <strong>Log/exp reference:</strong> ln(2) ~= 0.693, ln(3) ~= 1.099, ln(10) ~= 2.303, e ~= 2.718, e^2 ~= 7.389
          <button type="button" id="hideLogReference" style="margin-left:12px">Hide</button>
        </div>
      ` : ""}
    </section>
    <div id="settingsRoot"></div>
  `;
  roots.train.querySelector("#subModeSelect").value = selectedSubMode;
  roots.train.querySelectorAll("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedMode = button.dataset.mode;
      selectedSubMode = SUBMODE_OPTIONS[selectedMode][0].value;
      renderTrain(getData());
    });
  });
  roots.train.querySelector("#subModeSelect").addEventListener("change", (event) => {
    selectedSubMode = event.target.value;
    renderTrain(getData());
  });
  roots.train.querySelector("#startRound").addEventListener("click", () => {
    const settings = getData().settings;
    startRound({
      mode: selectedMode,
      subMode: selectedSubMode,
      durationSec: Number(roots.train.querySelector("#durationInput").value) || selectedOption.duration || 120,
      autoAdvance: !!settings.autoAdvance,
      showAnswerCorner: !!settings.showAnswerCorner,
      returnHash: "#history"
    });
  });
  roots.train.querySelector("#hideLogReference")?.addEventListener("click", () => {
    updateSettings({ showLogReference: false });
    renderTrain(getData());
  });
  renderSettings(roots.train.querySelector("#settingsRoot"), data);
}

function renderSettings(host, data) {
  if (!host) return;
  const s = data.settings;
  const sync = s.sync || {};
  host.innerHTML = `
    <section class="section surface settings-panel">
      <h3>Settings</h3>
      <div class="row">
        <label class="inline">
          <input type="checkbox" id="setAutoAdvance" ${s.autoAdvance ? "checked" : ""}>
          Auto-advance on correct (block Enter on wrong)
        </label>
        <label class="inline">
          <input type="checkbox" id="setShowAnswer" ${s.showAnswerCorner ? "checked" : ""}>
          Show answer in bottom-right corner
        </label>
      </div>
      <h3 style="margin-top:18px">Cloud sync (GitHub)</h3>
      <p class="muted" style="margin:0">Stores rounds in <code>${sync.repo || "owner/repo"}/${sync.path || "data/rounds.json"}</code>. PAT is stored in this browser only.</p>
      <div class="row">
        <label class="inline">
          <input type="checkbox" id="syncEnabled" ${sync.enabled ? "checked" : ""}>
          Enable sync
        </label>
        <label>Repo (owner/name)
          <input type="text" id="syncRepo" value="${sync.repo || ""}">
        </label>
        <label>Branch
          <input type="text" id="syncBranch" value="${sync.branch || "main"}">
        </label>
        <label>Path
          <input type="text" id="syncPath" value="${sync.path || "data/rounds.json"}">
        </label>
        <label>GitHub PAT (fine-grained, contents:write)
          <input type="password" id="syncToken" value="${sync.token || ""}" placeholder="github_pat_...">
        </label>
      </div>
      <div class="row">
        <button type="button" class="primary" id="saveSync">Save</button>
        <button type="button" id="syncPullNow">Pull now</button>
        <button type="button" id="syncPushNow">Push now</button>
        <span class="sync-status" id="syncStatus">${syncStatusText(sync)}</span>
      </div>
    </section>
  `;
  host.querySelectorAll("#setAutoAdvance,#setShowAnswer").forEach((el) => {
    el.addEventListener("change", () => {
      updateSettings({
        autoAdvance: host.querySelector("#setAutoAdvance").checked,
        showAnswerCorner: host.querySelector("#setShowAnswer").checked
      });
    });
  });
  host.querySelector("#saveSync").addEventListener("click", () => {
    const next = {
      enabled: host.querySelector("#syncEnabled").checked,
      repo: host.querySelector("#syncRepo").value.trim(),
      branch: host.querySelector("#syncBranch").value.trim() || "main",
      path: host.querySelector("#syncPath").value.trim() || "data/rounds.json",
      token: host.querySelector("#syncToken").value.trim()
    };
    window.MMTStorage.setSyncMeta(next);
    setSyncStatus("Saved.", "ok");
    if (window.MMTSync) applySyncIndicator(window.MMTSync.currentState());
    if (next.enabled) runSync({ direction: "pull" });
  });
  host.querySelector("#syncPullNow").addEventListener("click", () => runSync({ direction: "pull" }));
  host.querySelector("#syncPushNow").addEventListener("click", () => runSync({ direction: "push" }));
}

function syncStatusText(sync) {
  if (!sync?.enabled) return "Disabled.";
  if (sync.lastSyncedAt) return `Last synced ${new Date(sync.lastSyncedAt).toLocaleString()}.`;
  return "Enabled, not yet synced.";
}

function setSyncStatus(text, kind) {
  const el = document.querySelector("#syncStatus");
  if (!el) return;
  el.textContent = text;
  el.classList.remove("ok", "err");
  if (kind) el.classList.add(kind);
}

async function runSync({ direction }) {
  try {
    setSyncStatus("Syncing...", "");
    const result = await window.MMTSync.sync({ direction });
    setSyncStatus(result.message || "Synced.", "ok");
    if (activeTab !== "train") renderActiveTab();
    else {
      const settingsHost = roots.train.querySelector("#settingsRoot");
      if (settingsHost) renderSettings(settingsHost, getData());
    }
  } catch (error) {
    setSyncStatus(`Sync error: ${error.message}`, "err");
  }
}

function startRound(config) {
  if (!drill) {
    drill = new DrillController(roots.train, {
      onComplete: (round) => {
        const before = getData().rounds;
        const message = pbMessage(round, before);
        saveRound(round);
        window.MMTSync?.autoSync?.();
        return message;
      },
      onAbortStateChange: (active) => {
        document.querySelector("#appHeader").classList.toggle("drill-active", active);
      }
    });
  }
  location.hash = "#train";
  activeTab = "train";
  drill.start(config);
}

function startFocusedRound(subType) {
  const settings = getData().settings;
  startRound({
    mode: "custom",
    subMode: subType,
    focusedSubType: subType,
    durationSec: 60,
    autoAdvance: !!settings.autoAdvance,
    showAnswerCorner: !!settings.showAnswerCorner,
    returnHash: "#weaknesses"
  });
}

function renderHistory(data) {
  roots.history.innerHTML = `
    <div class="section-header">
      <div>
        <h2>History</h2>
        <p>Newest rounds first. Export regularly if you care about long-term records.</p>
      </div>
    </div>
    <section class="section surface" style="padding:16px">
      <div class="controls">
        <label>From
          <input id="fromDate" type="date">
        </label>
        <label>To
          <input id="toDate" type="date">
        </label>
        <label>Mode
          <select id="modeFilter">
            <option value="all">All</option>
            <option value="morning">Morning</option>
            <option value="afternoon">Afternoon</option>
            <option value="evening">Evening</option>
            <option value="custom">Focused</option>
          </select>
        </label>
        <label>Sub-mode
          <select id="subModeFilter"><option value="all">All</option></select>
        </label>
        <label><span>Show aborted</span>
          <input id="showAborted" type="checkbox">
        </label>
      </div>
      <div class="file-row" style="margin-top:14px">
        <button type="button" id="exportBtn">Export JSON</button>
        <label>Import JSON
          <input id="importFile" type="file" accept="application/json,.json">
        </label>
        <button type="button" class="danger" id="clearBtn">Clear All Data</button>
      </div>
    </section>
    <div id="historyTable"></div>
  `;

  const today = new Date();
  const from = new Date();
  from.setDate(today.getDate() - 30);
  roots.history.querySelector("#fromDate").value = from.toISOString().slice(0, 10);
  roots.history.querySelector("#toDate").value = today.toISOString().slice(0, 10);

  const subModes = [...new Set(data.rounds.map((round) => round.subMode))].sort();
  roots.history.querySelector("#subModeFilter").innerHTML += subModes.map((subMode) => `<option value="${subMode}">${subMode}</option>`).join("");

  const rerender = () => renderHistoryTable(data);
  roots.history.querySelectorAll("#fromDate,#toDate,#modeFilter,#subModeFilter,#showAborted").forEach((item) => {
    item.addEventListener("change", rerender);
  });
  roots.history.querySelector("#exportBtn").addEventListener("click", exportJson);
  roots.history.querySelector("#importFile").addEventListener("change", importJson);
  roots.history.querySelector("#clearBtn").addEventListener("click", () => {
    if (clearAllData()) renderActiveTab();
  });
  renderHistoryTable(data);
}

function renderHistoryTable(data) {
  const fromValue = roots.history.querySelector("#fromDate").value;
  const toValue = roots.history.querySelector("#toDate").value;
  const mode = roots.history.querySelector("#modeFilter").value;
  const subMode = roots.history.querySelector("#subModeFilter").value;
  const showAborted = roots.history.querySelector("#showAborted").checked;
  const from = fromValue ? new Date(`${fromValue}T00:00:00`).getTime() : 0;
  const to = toValue ? new Date(`${toValue}T23:59:59`).getTime() : Infinity;
  const rounds = [...data.rounds]
    .filter((round) => showAborted || !round.aborted)
    .filter((round) => mode === "all" || round.mode === mode)
    .filter((round) => subMode === "all" || round.subMode === subMode)
    .filter((round) => {
      const started = new Date(round.startedAt).getTime();
      return started >= from && started <= to;
    })
    .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));

  roots.history.querySelector("#historyTable").innerHTML = `
    <div class="table-wrap surface">
      <table>
        <thead>
          <tr>
            <th>Date/time</th><th>Mode</th><th>Sub-mode</th><th>Duration</th><th>Score</th><th>PPM</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${rounds.length ? rounds.map((round) => `
            <tr>
              <td>${new Date(round.startedAt).toLocaleString()}${round.aborted ? `<br><span class="wrong">aborted</span>` : ""}</td>
              <td><span class="pill ${round.mode}">${MODE_LABELS[round.mode] || round.mode}</span></td>
              <td>${getSubModeLabel(round.mode, round.subMode)}</td>
              <td>${round.durationSec}s</td>
              <td>${round.summary.attempted} / ${round.summary.correct} / ${Math.round(round.summary.accuracy * 1000) / 10}%</td>
              <td>${round.summary.problemsPerMin.toFixed(1)}</td>
              <td>
                <button type="button" data-detail="${round.roundId}">View detail</button>
                <button type="button" class="danger" data-delete="${round.roundId}">Delete</button>
              </td>
            </tr>
            <tr class="hidden" id="detail-${round.roundId}"><td colspan="7" class="attempt-detail">${attemptTable(round)}</td></tr>
          `).join("") : `<tr><td colspan="7" class="muted">No rounds match these filters.</td></tr>`}
        </tbody>
      </table>
    </div>
  `;
  roots.history.querySelectorAll("[data-detail]").forEach((button) => {
    button.addEventListener("click", () => roots.history.querySelector(`#detail-${button.dataset.detail}`).classList.toggle("hidden"));
  });
  roots.history.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!confirm("Delete this round?")) return;
      deleteRound(button.dataset.delete);
      renderHistory(getData());
    });
  });
}

function attemptTable(round) {
  return `
    <table>
      <thead><tr><th>Problem</th><th>Your Answer</th><th>Correct</th><th>Time</th><th>Sub-Type</th></tr></thead>
      <tbody>${(round.attempts || []).map((attempt) => `
        <tr>
          <td>${attempt.problemText}</td>
          <td class="${attempt.correct ? "right" : "wrong"}">${attempt.userAnswer}</td>
          <td>${attempt.correctAnswer}</td>
          <td>${(attempt.timeMs / 1000).toFixed(2)}s</td>
          <td>${attempt.subType}</td>
        </tr>
      `).join("") || `<tr><td colspan="5" class="muted">No attempts.</td></tr>`}</tbody>
    </table>
  `;
}

function exportJson() {
  const blob = new Blob([exportData()], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `mental-math-trainer-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function importJson(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      if (!confirm("Replace current local data with this import?")) return;
      importData(String(reader.result));
      renderActiveTab();
    } catch (error) {
      alert(`Import failed: ${error.message}`);
    }
  };
  reader.readAsText(file);
}

document.querySelectorAll(".tabs button").forEach((button) => {
  button.addEventListener("click", () => {
    location.hash = `#${button.dataset.tab}`;
  });
});

function applySyncIndicator(state) {
  const el = document.querySelector("#syncIndicator");
  const label = document.querySelector("#syncLabel");
  if (!el || !label) return;
  el.classList.remove("ok", "err", "busy");
  let text = state.label || "";
  let title = "";
  if (state.kind === "off") {
    text = "off";
    title = "Cloud sync is disabled. Configure it under Train > Cloud sync.";
  } else if (state.kind === "busy") {
    el.classList.add("busy");
    text = state.label || "syncing";
    title = "Syncing with GitHub...";
  } else if (state.kind === "ok") {
    el.classList.add("ok");
    text = "synced";
    title = state.at ? `Last synced ${new Date(state.at).toLocaleString()}` : "Synced";
  } else if (state.kind === "err") {
    el.classList.add("err");
    text = "error";
    title = state.label || "Sync error";
  } else if (state.kind === "idle") {
    text = "idle";
    title = "Sync enabled, waiting for first sync.";
  }
  label.textContent = text;
  el.setAttribute("title", title);
}

if (window.MMTSync) {
  applySyncIndicator(window.MMTSync.currentState());
  window.MMTSync.onState(applySyncIndicator);
}

window.addEventListener("hashchange", route);
roots.progress.addEventListener("change", (event) => {
  if (event.target.id === "progressRange") {
    progressRange = event.target.value;
    renderProgress(roots.progress, getData(), progressRange);
  }
});

if (!location.hash) location.hash = "#train";
route();

(async () => {
  const sync = getData().settings.sync;
  if (sync?.enabled && sync?.token && sync?.repo) {
    try {
      await window.MMTSync.pull();
      renderActiveTab();
    } catch (error) {
      console.warn("Initial sync pull failed:", error.message);
    }
  }
})();
})();
