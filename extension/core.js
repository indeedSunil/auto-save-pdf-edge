export const DEFAULT_INTERVAL = 12;
export function intervalValue(value) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 5 || number > 600) {
    throw new Error("Choose a whole number from 5 to 600 seconds.");
  }
  return number;
}
export function isPdf(tab) {
  try {
    const url = new URL(tab.url);
    if (!["file:", "http:", "https:", "blob:"].includes(url.protocol)) return false;
    if (/\.pdf$/i.test(decodeURIComponent(url.pathname))) return true;
    // Also support a PDF viewer whose URL has no filename but whose title does.
    return /\.pdf(?:\s*[-–—|]\s*(?:Microsoft Edge|PDF Viewer))?\s*$/i.test(tab.title || "");
  } catch { return false; }
}
export function documentKey(tab) {
  return `${tab.id}:${(tab.url || "").split("#")[0]}`;
}
