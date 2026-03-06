const DEFAULT_LANG = "zh-TW";

const PENCIL_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>`;
const CHECK_ICON  = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

// Only allow word-like characters across any language.
// Rejects quotes, brackets, angle brackets, and anything usable for prompt injection.
const SAFE_WORD_RE = /^[\p{L}\p{N}\s'\-]+$/u;
const MAX_WORD_LEN = 30;

function show(el) { el.classList.remove("hidden"); }
function hide(el) { el.classList.add("hidden"); }

function setupEditToggle(viewId, inputId, btnId, strings) {
  const view  = document.getElementById(viewId);
  const input = document.getElementById(inputId);
  const btn   = document.getElementById(btnId);

  btn.innerHTML = PENCIL_ICON;
  btn.title = strings.editTitle;

  btn.addEventListener("click", () => {
    const isEditing = !input.classList.contains("hidden");
    if (isEditing) {
      view.textContent = input.value;
      hide(input);
      show(view);
      btn.innerHTML = PENCIL_ICON;
      btn.title = strings.editTitle;
    } else {
      input.value = view.textContent;
      hide(view);
      show(input);
      input.focus();
      btn.innerHTML = CHECK_ICON;
      btn.title = strings.doneTitle;
    }
  });
}

function highlightWordInExample(sentence, word) {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  return sentence.replace(regex, "<strong>$1</strong>");
}

function isJapanesePronunciation(text) {
  return /[\u3040-\u30FF]/.test(text);
}

function speak(word, pronunciation) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = isJapanesePronunciation(pronunciation) ? "ja-JP" : "en-US";
  window.speechSynthesis.speak(utterance);
}

function validateManualInput(raw, strings) {
  if (!raw)                      return strings.errorEmpty;
  if (raw.length > MAX_WORD_LEN) return strings.errorTooLong;
  if (!SAFE_WORD_RE.test(raw))   return strings.errorInvalidChars;
  return null;
}

document.addEventListener("DOMContentLoaded", () => {
  const emptyStateEl         = document.getElementById("empty-state");
  const mainEl               = document.getElementById("main");
  const wordEl               = document.getElementById("word");
  const pronunciationEl      = document.getElementById("pronunciation");
  const speakBtn             = document.getElementById("speak-btn");
  const posBadgeEl           = document.getElementById("pos-badge");
  const loadingEl            = document.getElementById("loading");
  const formBodyEl           = document.getElementById("form-body");
  const errorStateEl         = document.getElementById("error-state");
  const meaningView          = document.getElementById("meaning-view");
  const meaningInput         = document.getElementById("meaning-input");
  const exampleView          = document.getElementById("example-view");
  const exampleInput         = document.getElementById("example-input");
  const exampleTranslationEl = document.getElementById("example-translation");
  const tagsInput            = document.getElementById("tags-input");
  const saveBtn              = document.getElementById("save-btn");
  const manualWordInput      = document.getElementById("manual-word-input");
  const manualLookupBtn      = document.getElementById("manual-lookup-btn");
  const manualErrorEl        = document.getElementById("manual-error");

  const openSettingsBtn = document.getElementById("open-settings-btn");

  chrome.storage.session.get(["word", "context"], (sessionResult) => {
    // Consume immediately so re-opening without a new selection shows empty state.
    chrome.storage.session.remove(["word", "context"]);

    const sessionWord    = sessionResult.word;
    const sessionContext = sessionResult.context ?? "";

    chrome.storage.sync.get(
      ["preferredLang", "geminiApiKey", "notionToken", "notionDatabaseId"],
      (syncResult) => {
        const preferredLang    = syncResult.preferredLang    ?? DEFAULT_LANG;
        const geminiApiKey     = syncResult.geminiApiKey     ?? "";
        const notionToken      = syncResult.notionToken      ?? "";
        const notionDatabaseId = syncResult.notionDatabaseId ?? "";

        const strings = UI_STRINGS[preferredLang] ?? UI_STRINGS[DEFAULT_LANG];

        // Apply localized field labels
        document.getElementById("meaning-label").textContent = strings.meaning;
        document.getElementById("example-label").textContent = strings.example;
        document.getElementById("tags-label").textContent    = strings.tags;

        // Apply localized empty state strings
        document.getElementById("empty-hint").textContent    = strings.emptyHint;
        document.getElementById("empty-divider").textContent = strings.emptyDivider;
        manualWordInput.placeholder                          = strings.lookupPlaceholder;
        manualLookupBtn.textContent                          = strings.lookupBtn;

        // ── Setup required gate ──────────────────────────────────────────
        if (!geminiApiKey) {
          document.getElementById("error-title").textContent  = strings.errorSetupTitle;
          document.getElementById("error-detail").textContent = strings.errorSetupDetail;
          openSettingsBtn.textContent = strings.openSettingsBtn;
          show(mainEl);
          hide(loadingEl);
          show(errorStateEl);
          show(openSettingsBtn);
          openSettingsBtn.addEventListener("click", () => chrome.runtime.openOptionsPage());
          return;
        }
        // ────────────────────────────────────────────────────────────────

        // ── Core lookup ─────────────────────────────────────────────────
        async function runLookup(word, context) {
          hide(emptyStateEl);
          show(mainEl);
          wordEl.textContent = word;

          // Reset all sub-states (supports repeated manual lookups)
          hide(pronunciationEl);
          hide(posBadgeEl);
          hide(formBodyEl);
          hide(errorStateEl);
          hide(openSettingsBtn);
          show(loadingEl);
          saveBtn.disabled = true;
          saveBtn.className = "save-btn";
          saveBtn.textContent = strings.saveBtn;

          let currentPronunciation = "";
          let llmData = null;

          speakBtn.onclick = () => speak(word, currentPronunciation);

          async function handleSave() {
            const payload = {
              word,
              pronunciation: currentPronunciation,
              part_of_speech: posBadgeEl.textContent,
              meaning: meaningInput.value,
              example_sentence: exampleInput.value,
              tags: tagsInput.value,
              detected_language: llmData?.detected_language ?? "EN",
              context,
              notionToken,
              notionDatabaseId,
            };

            saveBtn.disabled = true;
            saveBtn.textContent = strings.savingBtn;
            console.log("[Vocab to Notion] Saving payload:", payload);

            try {
              const saved = await saveToNotion(payload);
              saveBtn.removeEventListener("click", handleSave);
              saveBtn.classList.add("saved");
              saveBtn.textContent = strings.savedBtn;
              saveBtn.disabled = false;
              saveBtn.addEventListener("click", () => {
                chrome.tabs.create({ url: saved.url });
              }, { once: true });
            } catch (err) {
              console.error("[Vocab to Notion] Notion save error:", err.message, "code:", err.notionCode);
              saveBtn.classList.add("save-error");
              if (err.status === 401) {
                saveBtn.textContent = strings.saveErrorAuth;
              } else if (err.status === 404) {
                saveBtn.textContent = strings.saveErrorNotFound;
              } else if (err.message && err.message.length < 60) {
                saveBtn.textContent = err.message;
              } else {
                saveBtn.textContent = strings.saveErrorGeneric;
              }
              setTimeout(() => {
                saveBtn.classList.remove("save-error");
                saveBtn.textContent = strings.saveBtn;
                saveBtn.disabled = false;
              }, 4000);
            }
          }

          try {
            llmData = await getDefinition(word, context, preferredLang, geminiApiKey);

            if (llmData.pronunciation) {
              currentPronunciation = llmData.pronunciation;
              pronunciationEl.textContent = llmData.pronunciation;
              show(pronunciationEl);
            }

            if (llmData.part_of_speech) {
              posBadgeEl.textContent = llmData.part_of_speech;
              show(posBadgeEl);
            }

            meaningView.textContent  = llmData.meaning;
            meaningInput.value       = llmData.meaning;
            exampleView.innerHTML    = highlightWordInExample(llmData.example_sentence, word);
            exampleInput.value       = llmData.example_sentence;
            exampleTranslationEl.textContent = llmData.example_translation;

            hide(loadingEl);
            show(formBodyEl);

            setupEditToggle("meaning-view", "meaning-input", "meaning-edit-btn", strings);
            setupEditToggle("example-view", "example-input", "example-edit-btn", strings);

            saveBtn.disabled = false;
            saveBtn.addEventListener("click", handleSave);

          } catch (err) {
            console.error("[Vocab to Notion] Error:", err);
            hide(loadingEl);
            if (err.code === "RATE_LIMITED") {
              document.getElementById("error-title").textContent  = strings.errorRateLimitTitle;
              document.getElementById("error-detail").textContent = strings.errorRateLimitDetail;
            } else {
              document.getElementById("error-title").textContent  = strings.errorLlmTitle;
              document.getElementById("error-detail").textContent = strings.errorLlmDetail;
            }
            show(errorStateEl);
          }
        }
        // ────────────────────────────────────────────────────────────────

        if (sessionWord) {
          runLookup(sessionWord, sessionContext);
        } else {
          show(emptyStateEl);
          manualWordInput.focus();

          function attempt() {
            const raw = manualWordInput.value.trim();
            const err = validateManualInput(raw, strings);
            if (err) {
              manualErrorEl.textContent = err;
              show(manualErrorEl);
              return;
            }
            hide(manualErrorEl);
            runLookup(raw, "");
          }

          manualLookupBtn.addEventListener("click", attempt);
          manualWordInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") attempt();
          });
        }
      }
    );
  });
});
