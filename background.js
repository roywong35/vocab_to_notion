let pendingContext = "";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "add-vocab",
    title: "Add vocab to Notion",
    contexts: ["selection"],
  });
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "CONTEXT_CAPTURED") {
    pendingContext = msg.context ?? "";
  }
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId !== "add-vocab") return;

  const word = info.selectionText.trim();
  if (!word) return;

  console.log("[Vocab to Notion] Word:", word);
  console.log("[Vocab to Notion] Context:", pendingContext);

  chrome.storage.session.set({ word, context: pendingContext }, () => {
    chrome.action.openPopup();
  });
});
