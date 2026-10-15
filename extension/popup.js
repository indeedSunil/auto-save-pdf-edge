import { intervalValue } from "./core.js";
const $ = id => document.getElementById(id);
async function request(message) {
  const state = await chrome.runtime.sendMessage(message);
  if (!state?.ok) throw new Error(state?.error || "Reload the extension in edge://extensions.");
  $("enabled").checked = state.enabled;
  $("seconds").value = state.interval;
  $("status").textContent = state.last.text;
  $("status").classList.toggle("error", state.last.kind === "error");
  $("retry").hidden = state.last.kind !== "error";
}
function showError(error) {
  $("status").textContent = error.message;
  $("status").classList.add("error");
}
async function save() {
  try {
    const interval = intervalValue($("seconds").value);
    await request({ type: "settings", enabled: $("enabled").checked, interval });
  } catch (error) { showError(error); }
}
$("enabled").addEventListener("change", save);
$("apply").addEventListener("click", save);
$("retry").addEventListener("click", () => request({ type: "retry" }).catch(showError));
request({ type: "state" }).catch(showError);
