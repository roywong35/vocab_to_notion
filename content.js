document.addEventListener("contextmenu", () => {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !sel.toString().trim()) return;

  const selectedText = sel.toString();
  const range = sel.getRangeAt(0);
  const parentText = range.startContainer.parentElement?.textContent ?? "";

  const idx = parentText.indexOf(selectedText);
  const start = Math.max(0, idx - 250);
  const end = Math.min(parentText.length, idx + selectedText.length + 250);
  const context = idx === -1 ? "" : parentText.slice(start, end).trim();

  chrome.runtime.sendMessage({ type: "CONTEXT_CAPTURED", context });
});
