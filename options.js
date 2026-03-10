const DEFAULT_LANG = "zh-TW";

const langSelect      = document.getElementById("lang-select");
const geminiKeyInput  = document.getElementById("gemini-key-input");
const notionTokenInput = document.getElementById("notion-token-input");
const notionDbInput   = document.getElementById("notion-db-input");
const saveBtn         = document.getElementById("save-btn");
const statusEl        = document.getElementById("status");

function applyStrings(lang) {
  const strings = UI_STRINGS[lang] ?? UI_STRINGS[DEFAULT_LANG];
  document.title = strings.optionsTitle;
  document.getElementById("options-title").textContent         = strings.optionsTitle;
  document.getElementById("options-lang-label").textContent    = strings.optionsLangLabel;
  document.getElementById("options-lang-hint").textContent     = strings.optionsLangHint;
  document.getElementById("options-gemini-label").textContent       = strings.optionsGeminiKeyLabel;
  document.getElementById("options-gemini-hint-text").textContent   = strings.optionsGeminiKeyHint + " ";
  document.getElementById("options-notion-token-label").textContent = strings.optionsNotionTokenLabel;
  document.getElementById("options-notion-token-hint").textContent  = strings.optionsNotionTokenHint;
  document.getElementById("options-notion-db-label").textContent          = strings.optionsNotionDbLabel;
  document.getElementById("options-notion-db-hint").textContent           = strings.optionsNotionDbHint;
  document.getElementById("options-notion-db-template-text").textContent  = strings.optionsNotionDbTemplateHint;
  document.getElementById("options-notion-db-template-link").textContent  = strings.optionsNotionDbTemplateLinkText;
  saveBtn.textContent = strings.optionsSaveBtn;
  const donateEl = document.getElementById("options-donate-link");
  if (donateEl) {
    donateEl.href = DONATION_URL;
    donateEl.textContent = strings.supportLinkText;
  }
}

chrome.storage.sync.get(
  ["preferredLang", "geminiApiKey", "notionToken", "notionDatabaseId"],
  (result) => {
    const lang = result.preferredLang ?? DEFAULT_LANG;
    langSelect.value        = lang;
    geminiKeyInput.value    = result.geminiApiKey ?? "";
    notionTokenInput.value  = result.notionToken ?? "";
    notionDbInput.value     = result.notionDatabaseId ?? "";
    applyStrings(lang);
  }
);

langSelect.addEventListener("change", () => applyStrings(langSelect.value));

saveBtn.addEventListener("click", () => {
  const lang = langSelect.value;
  chrome.storage.sync.set(
    {
      preferredLang:    lang,
      geminiApiKey:     geminiKeyInput.value.trim(),
      notionToken:      notionTokenInput.value.trim(),
      notionDatabaseId: notionDbInput.value.trim(),
    },
    () => {
      const strings = UI_STRINGS[lang] ?? UI_STRINGS[DEFAULT_LANG];
      statusEl.textContent = strings.optionsSaved;
      statusEl.classList.add("visible");
      setTimeout(() => statusEl.classList.remove("visible"), 2000);
    }
  );
});
