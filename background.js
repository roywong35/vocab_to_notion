chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "add-vocab",
    title: "Add Vocabulary to Notion",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== "add-vocab") return;

  const word = info.selectionText.trim();
  if (!word) return;

  console.log("[Vocab to Notion] Word:", word);

  // Inject a function directly into the page to grab the selection context.
  // This is more reliable than message-passing because it works on any tab
  // regardless of whether the content script was pre-injected.
  chrome.scripting.executeScript(
    {
      target: { tabId: tab.id },
      func: (selectedText) => {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return "";
        const range = sel.getRangeAt(0);
        const parentText =
          range.startContainer.parentElement?.textContent ?? "";
        if (!parentText.includes(selectedText)) return "";

        // Split into sentences and return the one containing the word.
        // This keeps context tight (~1 sentence) instead of a fixed 500-char window.
        const sentences = parentText.match(/[^.!?。！？\n]+[.!?。！？\n]?/g) ?? [];
        const match = sentences.find((s) => s.includes(selectedText))?.trim() ?? "";

        // Hard cap at 200 chars as a token safety net.
        return match.slice(0, 200);
      },
      args: [word],
    },
    (results) => {
      const context = results?.[0]?.result ?? "";
      console.log("[Vocab to Notion] Context:", context);

      chrome.storage.session.set({ word, context }, () => {
        chrome.action.openPopup();
      });
    }
  );
});
