const DEFAULT_LANG = "zh-TW";

const langSelect = document.getElementById("lang-select");
const saveBtn = document.getElementById("save-btn");
const statusEl = document.getElementById("status");

chrome.storage.sync.get("preferredLang", (result) => {
  langSelect.value = result.preferredLang ?? DEFAULT_LANG;
});

saveBtn.addEventListener("click", () => {
  chrome.storage.sync.set({ preferredLang: langSelect.value }, () => {
    statusEl.classList.add("visible");
    setTimeout(() => statusEl.classList.remove("visible"), 2000);
  });
});
