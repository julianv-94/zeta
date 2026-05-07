(function () {
const { getData, mergeRemote, setSyncMeta } = window.MMTStorage;

const API = "https://api.github.com";

function b64encode(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

function b64decode(str) {
  try {
    return decodeURIComponent(escape(atob(str.replace(/\s+/g, ""))));
  } catch (error) {
    return atob(str.replace(/\s+/g, ""));
  }
}

function settings() {
  const sync = getData().settings.sync || {};
  if (!sync.repo || !/^[^\/\s]+\/[^\/\s]+$/.test(sync.repo)) {
    throw new Error("Sync repo must be in the form owner/name.");
  }
  if (!sync.token) throw new Error("GitHub PAT is missing.");
  if (!sync.path) throw new Error("Sync path is missing.");
  return { ...sync };
}

async function ghFetch(path, options = {}) {
  const { token, ...rest } = options;
  const response = await fetch(`${API}${path}`, {
    ...rest,
    headers: {
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Authorization": `Bearer ${token}`,
      ...(rest.body ? { "Content-Type": "application/json" } : {}),
      ...(rest.headers || {})
    }
  });
  if (response.status === 404) return { status: 404, body: null };
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) {
    const msg = body?.message || response.statusText || `HTTP ${response.status}`;
    const err = new Error(msg);
    err.status = response.status;
    throw err;
  }
  return { status: response.status, body };
}

async function getRemoteFile(s) {
  const url = `/repos/${s.repo}/contents/${encodeURIComponent(s.path).replace(/%2F/g, "/")}?ref=${encodeURIComponent(s.branch || "main")}`;
  const { status, body } = await ghFetch(url, { token: s.token, method: "GET" });
  if (status === 404 || !body) return { exists: false, sha: null, content: null };
  const decoded = b64decode(body.content || "");
  let parsed = null;
  try { parsed = JSON.parse(decoded); } catch { parsed = null; }
  return { exists: true, sha: body.sha, content: parsed };
}

async function putRemoteFile(s, payload, sha, message) {
  const url = `/repos/${s.repo}/contents/${encodeURIComponent(s.path).replace(/%2F/g, "/")}`;
  const body = {
    message: message || `Update ${s.path}`,
    content: b64encode(JSON.stringify(payload, null, 2)),
    branch: s.branch || "main"
  };
  if (sha) body.sha = sha;
  const { body: result } = await ghFetch(url, {
    token: s.token,
    method: "PUT",
    body: JSON.stringify(body)
  });
  return result?.content?.sha || null;
}

function buildPayload(local) {
  return {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    rounds: local.rounds || []
  };
}

async function pull() {
  const s = settings();
  const remote = await getRemoteFile(s);
  if (!remote.exists) {
    setSyncMeta({ lastSyncedAt: new Date().toISOString(), lastSha: null });
    return { message: "No remote file yet. Push to create one." };
  }
  mergeRemote(remote.content || { rounds: [] });
  setSyncMeta({ lastSyncedAt: new Date().toISOString(), lastSha: remote.sha });
  const count = remote.content?.rounds?.length || 0;
  return { message: `Pulled. Remote had ${count} rounds.` };
}

async function push(force = false) {
  const s = settings();
  let remote = { exists: false, sha: null, content: null };
  try { remote = await getRemoteFile(s); } catch (error) {
    if (error.status !== 404) throw error;
  }
  let merged = getData();
  if (remote.exists && remote.content) {
    merged = mergeRemote(remote.content);
  }
  const payload = buildPayload(merged);
  const sha = force ? remote.sha : (remote.exists ? remote.sha : null);
  const newSha = await putRemoteFile(s, payload, sha, `Sync rounds (${payload.rounds.length})`);
  setSyncMeta({ lastSyncedAt: new Date().toISOString(), lastSha: newSha });
  return { message: `Pushed ${payload.rounds.length} rounds.` };
}

async function sync({ direction = "both" } = {}) {
  if (direction === "pull") return pull();
  if (direction === "push") return push();
  await pull();
  return push();
}

async function autoSync() {
  const sync = getData().settings.sync;
  if (!sync?.enabled || !sync?.token || !sync?.repo) return;
  try { await push(); } catch (error) { console.warn("Auto sync push failed:", error.message); }
}

window.MMTSync = { sync, pull, push, autoSync };
})();
