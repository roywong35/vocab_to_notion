chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "add-vocab",
    title: "Add vocab to Notion",
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
        const idx = parentText.indexOf(selectedText);
        if (idx === -1) return "";
        const start = Math.max(0, idx - 250);
        const end = Math.min(
          parentText.length,
          idx + selectedText.length + 250
        );
        return parentText.slice(start, end).trim();
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
