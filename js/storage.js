const KEY = "mmt_data_v1";
(function () {

const defaults = () => ({
  schemaVersion: 1,
  rounds: [],
  settings: {
    theme: "dark",
    defaultRoundSec: 120,
    showLogReference: true,
    autoAdvance: false,
    showAnswerCorner: false,
    sync: {
      enabled: false,
      token: "",
      repo: "julianv-94/zeta",
      branch: "main",
      path: "data/rounds.json",
      lastSyncedAt: null,
      lastSha: null
    }
  }
});

let memoryData = defaults();
let storageAvailable = true;
let lastError = "";

function testStorage() {
  try {
    const probe = "__mmt_probe__";
    localStorage.setItem(probe, "1");
    localStorage.removeItem(probe);
    return true;
  } catch (error) {
    lastError = error.message;
    return false;
  }
}

storageAvailable = testStorage();

function migrate(raw) {
  const data = raw && typeof raw === "object" ? raw : defaults();
  const baseSettings = defaults().settings;
  const incoming = data.settings || {};
  return {
    schemaVersion: 1,
    rounds: Array.isArray(data.rounds) ? data.rounds : [],
    settings: {
      ...baseSettings,
      ...incoming,
      sync: { ...baseSettings.sync, ...(incoming.sync || {}) }
    }
  };
}

function read() {
  if (!storageAvailable) return memoryData;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const data = defaults();
      localStorage.setItem(KEY, JSON.stringify(data));
      return data;
    }
    return migrate(JSON.parse(raw));
  } catch (error) {
    storageAvailable = false;
    lastError = error.message;
    memoryData = defaults();
    return memoryData;
  }
}

function write(data) {
  const migrated = migrate(data);
  if (!storageAvailable) {
    memoryData = migrated;
    return;
  }
  try {
    const serialized = JSON.stringify(migrated);
    if (serialized.length > 4_000_000) {
      alert("Local storage is nearly full. Export your data and clear older rounds soon.");
    }
    localStorage.setItem(KEY, serialized);
  } catch (error) {
    storageAvailable = false;
    lastError = error.message;
    memoryData = migrated;
  }
}

function getStorageStatus() {
  return { storageAvailable, lastError };
}

function getData() {
  return read();
}

function saveRound(round) {
  const data = read();
  data.rounds.push(round);
  write(data);
  return round;
}

function deleteRound(roundId) {
  const data = read();
  data.rounds = data.rounds.filter((round) => round.roundId !== roundId);
  write(data);
}

function updateSettings(partial) {
  const data = read();
  data.settings = { ...data.settings, ...partial };
  write(data);
  return data.settings;
}

function exportData() {
  return JSON.stringify(read(), null, 2);
}

function importData(json) {
  const parsed = migrate(JSON.parse(json));
  if (!Array.isArray(parsed.rounds)) throw new Error("Imported data must include rounds.");
  write(parsed);
  return parsed;
}

function clearAllData() {
  if (!confirm("Clear all mental math data from this browser?")) return false;
  if (!confirm("This cannot be undone. Clear all saved rounds?")) return false;
  write(defaults());
  return true;
}

function mergeRounds(localRounds, remoteRounds) {
  const byId = new Map();
  for (const round of remoteRounds || []) {
    if (round?.roundId) byId.set(round.roundId, round);
  }
  for (const round of localRounds || []) {
    if (round?.roundId) byId.set(round.roundId, round);
  }
  return [...byId.values()].sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt));
}

function mergeRemote(remote) {
  const data = read();
  const remoteRounds = Array.isArray(remote?.rounds) ? remote.rounds : [];
  data.rounds = mergeRounds(data.rounds, remoteRounds);
  write(data);
  return data;
}

function setSyncMeta(partial) {
  const data = read();
  data.settings.sync = { ...data.settings.sync, ...partial };
  write(data);
  return data.settings.sync;
}

window.MMTStorage = {
  clearAllData,
  deleteRound,
  exportData,
  getData,
  getStorageStatus,
  importData,
  mergeRemote,
  saveRound,
  setSyncMeta,
  updateSettings
};
})();
