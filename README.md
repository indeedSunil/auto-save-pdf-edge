# PDF Save Timer — extension only

No Linux helper, terminal setup, or separate process.

1. Extract `pdf-save-timer-extension.zip`.
2. Open `edge://extensions` and enable **Developer mode**.
3. Click **Load unpacked** and select the extracted folder containing `manifest.json`.
4. Open the extension's **Details** and enable **Allow access to file URLs** for PDFs on your computer.
5. Open a PDF in Edge. It starts automatically. Click the extension icon to change the interval or turn it off.

If you loaded the previous version from this project's `extension` folder, click **Reload** on its extension card and accept the new debugger permission if Edge asks. The old helper is no longer used.

Default interval: **12 seconds**, adjustable from **5 to 600 seconds**. A URL path ending in `.pdf`, or a tab title ending in a `.pdf` filename, identifies a PDF. Your example `file:///home/linus/6th%20Sem/ai/2._problem_solving_and_search.pdf` qualifies. Detection is a filename/title heuristic, not inspection of the document's contents.

Only the active PDF in the focused Edge window receives shortcut requests. Switching to an ordinary tab or another application stops the timer. There is no idle polling or background PDF scanning. Settings are remembered.

## Browser limitation

This uses the [extension debugger API](https://developer.chrome.com/docs/extensions/reference/api/debugger) and its `Input.dispatchKeyEvent` command to request Ctrl+S in the PDF tab. Edge displays a debugging banner; canceling it turns autosave off. Opening DevTools may disconnect it as well.

**This is not an OS-level keypress.** Some Edge PDF viewer versions may ignore this browser input or block attaching to their protected viewer. If that happens, an extension alone cannot guarantee the same result as physically pressing Ctrl+S. The popup reports API errors, but Edge can accept an input request without saving anything. Save As dialogs still need manual completion.

This rewritten version has **not been tested**, as requested. Try it on a copy and check whether an annotation survives reopening the PDF.

Source files are in `extension/`. `python3 scripts/package.py` only makes the ZIP; it is not needed to use the extension.
