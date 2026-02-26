chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "add-vocab",
    title: "Add vocab to Notion",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== "add-vocab") return;

  const selectedText = info.selectionText.trim();
  console.log("[Vocab to Notion] Selected word:", selectedText);

  chrome.storage.session.set({ selectedWord: selectedText }, () => {
    chrome.action.openPopup();
  });
});
