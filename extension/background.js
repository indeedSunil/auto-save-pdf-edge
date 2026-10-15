import { DEFAULT_INTERVAL, intervalValue, isPdf, documentKey } from "./core.js";

let enabled = true;
let interval = DEFAULT_INTERVAL;
let target = null;
let targetDocument = "";
let timer;
let generation = 0;
let failure = null;
let last = { kind: "idle", text: "Waiting for a PDF in the active Edge tab." };
const ready = Promise.all([
  chrome.storage.local.get(["enabled", "interval"]),
  chrome.storage.session.get("failure")
]).then(([settings, session]) => {
  enabled = settings.enabled !== false;
  try { interval = intervalValue(settings.interval ?? DEFAULT_INTERVAL); } catch {}
  failure = session.failure ?? null;
});
let queue = Promise.resolve();
function enqueue(operation) {
  const result = queue.then(() => ready).then(operation);
  queue = result.catch(error => setStatus("error", error.message));
  return result;
}
function cancelTimer() {
  generation++;
  clearTimeout(timer);
  timer = null;
  return generation;
}
async function setStatus(kind, text) {
  last = { kind, text };
  await chrome.action.setBadgeText({ text: kind === "error" ? "!" : kind === "active" ? "ON" : "" });
  await chrome.action.setBadgeBackgroundColor({ color: kind === "error" ? "#b44232" : "#216958" });
}
async function detach() {
  const old = target;
  target = null;
  targetDocument = "";
  if (old) await chrome.debugger.detach(old).catch(() => {});
}
async function activePdf() {
  const win = await chrome.windows.getLastFocused();
  if (!enabled || !win.focused || win.type !== "normal") return null;
  const [tab] = await chrome.tabs.query({ active: true, windowId: win.id });
  return tab && tab.status === "complete" && !tab.pendingUrl && !tab.discarded && isPdf(tab) ? tab : null;
}
function arm(epoch) {
  clearTimeout(timer);
  timer = setTimeout(() => { void enqueue(() => tick(epoch)); }, interval * 1000);
}
async function fail(tab, error) {
  failure = { key: documentKey(tab), text: error.message || String(error) };
  await chrome.storage.session.set({ failure });
  cancelTimer();
  await detach();
  await setStatus("error", `Edge could not send the shortcut: ${failure.text}. Click Retry in the popup.`);
}
async function refresh(epoch) {
  if (epoch !== generation) return;
  const tab = await activePdf();
  if (epoch !== generation) return;
  if (!tab) {
    await detach();
    await setStatus("idle", enabled ? "Waiting for a PDF in the active Edge window." : "Autosave is off.");
    return;
  }
  const key = documentKey(tab);
  if (failure?.key === key) {
    await detach();
    await setStatus("error", `Edge could not send the shortcut: ${failure.text}. Click Retry.`);
    return;
  }
  try {
    if (target?.tabId !== tab.id || targetDocument !== key) {
      await detach();
      if (epoch !== generation) return;
      const next = { tabId: tab.id };
      await chrome.debugger.attach(next, "1.3");
      target = next;
      targetDocument = key;
      if (epoch !== generation) { await detach(); return; }
    }
    await setStatus("active", `PDF detected. Ctrl+S every ${interval} seconds.`);
    if (epoch === generation) arm(epoch);
  } catch (error) {
    if (epoch === generation) await fail(tab, error);
  }
}
function refreshSoon() {
  const epoch = cancelTimer();
  void enqueue(() => refresh(epoch));
}
async function tick(epoch) {
  if (epoch !== generation || !target) return;
  const tab = await activePdf();
  if (epoch !== generation) return;
  if (!tab || tab.id !== target.tabId || documentKey(tab) !== targetDocument) {
    refreshSoon();
    return;
  }
  const destination = target;
  try {
    // CDP input goes to this tab, not to another application. This is a browser
    // input request, not an OS keystroke; the built-in PDF viewer may ignore it.
    // The Control modifier applies to this event only, so Ctrl is never held.
    const key = { key: "s", code: "KeyS", windowsVirtualKeyCode: 83, modifiers: 2 };
    try {
      await chrome.debugger.sendCommand(destination, "Input.dispatchKeyEvent", { type: "rawKeyDown", ...key });
    } finally {
      await chrome.debugger.sendCommand(destination, "Input.dispatchKeyEvent", { type: "keyUp", ...key });
    }
    if (epoch !== generation) return;
    await setStatus("active", `Ctrl+S requested at ${new Date().toLocaleTimeString()}. Next in ${interval}s.`);
    arm(epoch);
  } catch (error) {
    if (epoch === generation) await fail(tab, error);
  }
}

chrome.tabs.onActivated.addListener(refreshSoon);
chrome.windows.onFocusChanged.addListener(refreshSoon);
chrome.tabs.onUpdated.addListener((id, change, tab) => {
  if ((tab.active || id === target?.tabId) &&
      (change.status || change.url || change.title || change.discarded !== undefined)) refreshSoon();
});
chrome.tabs.onRemoved.addListener(id => { if (id === target?.tabId) refreshSoon(); });
chrome.debugger.onDetach.addListener((source, reason) => {
  if (source.tabId !== target?.tabId) return;
  target = null;
  targetDocument = "";
  cancelTimer();
  void enqueue(async () => {
    if (reason === "canceled_by_user") {
      enabled = false;
      await chrome.storage.local.set({ enabled });
      await setStatus("idle", "Paused because debugging was canceled. Switch autosave on to resume.");
    } else { await refresh(generation); }
  });
});
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || sender.url !== chrome.runtime.getURL("popup.html")) return;
  if (message.type !== "state") cancelTimer();
  enqueue(async () => {
    if (message.type === "settings") {
      interval = intervalValue(message.interval);
      enabled = Boolean(message.enabled);
      failure = null;
      await chrome.storage.session.remove("failure");
      await chrome.storage.local.set({ enabled, interval });
      await refresh(generation);
    } else if (message.type === "retry") {
      failure = null;
      await chrome.storage.session.remove("failure");
      await refresh(generation);
    } else if (message.type !== "state") { throw new Error("Unknown request."); }
    return { enabled, interval, last };
  }).then(state => respond({ ok: true, ...state }), error => respond({ ok: false, error: error.message }));
  return true;
});
refreshSoon();
