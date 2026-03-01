const DEFAULT_LANG = "zh-TW";

const PENCIL_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>`;
const CHECK_ICON  = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

const UI_LABELS = {
  "zh-TW": { meaning: "定義", example: "例子", tags: "標籤" },
  en:      { meaning: "Definition", example: "Example", tags: "Tags" },
  ja:      { meaning: "意味", example: "例文", tags: "タグ" },
};

function show(el) { el.classList.remove("hidden"); }
function hide(el) { el.classList.add("hidden"); }

function setupEditToggle(viewId, inputId, btnId) {
  const view  = document.getElementById(viewId);
  const input = document.getElementById(inputId);
  const btn   = document.getElementById(btnId);

  btn.innerHTML = PENCIL_ICON;

  btn.addEventListener("click", () => {
    const isEditing = !input.classList.contains("hidden");
    if (isEditing) {
      view.textContent = input.value;
      hide(input);
      show(view);
      btn.innerHTML = PENCIL_ICON;
      btn.title = "Edit";
    } else {
      input.value = view.textContent;
      hide(view);
      show(input);
      input.focus();
      btn.innerHTML = CHECK_ICON;
      btn.title = "Done";
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

document.addEventListener("DOMContentLoaded", () => {
  const emptyStateEl  = document.getElementById("empty-state");
  const mainEl        = document.getElementById("main");
  const wordEl        = document.getElementById("word");
  const pronunciationEl = document.getElementById("pronunciation");
  const speakBtn      = document.getElementById("speak-btn");
  const posBadgeEl    = document.getElementById("pos-badge");
  const loadingEl     = document.getElementById("loading");
  const formBodyEl    = document.getElementById("form-body");
  const errorStateEl  = document.getElementById("error-state");
  const meaningView   = document.getElementById("meaning-view");
  const meaningInput  = document.getElementById("meaning-input");
  const exampleView   = document.getElementById("example-view");
  const exampleInput  = document.getElementById("example-input");
  const exampleTranslationEl = document.getElementById("example-translation");
  const tagsInput     = document.getElementById("tags-input");
  const saveBtn       = document.getElementById("save-btn");

  chrome.storage.session.get(["word", "context"], (sessionResult) => {
    const word    = sessionResult.word;
    const context = sessionResult.context ?? "";

    if (!word) {
      show(emptyStateEl);
      return;
    }

    show(mainEl);
    wordEl.textContent = word;

    chrome.storage.sync.get("preferredLang", async (syncResult) => {
      const preferredLang = syncResult.preferredLang ?? DEFAULT_LANG;
      const labels = UI_LABELS[preferredLang] ?? UI_LABELS[DEFAULT_LANG];

      document.getElementById("meaning-label").textContent = labels.meaning;
      document.getElementById("example-label").textContent = labels.example;
      document.getElementById("tags-label").textContent    = labels.tags;

      let currentPronunciation = "";
      let llmData = null;

      speakBtn.addEventListener("click", () => speak(word, currentPronunciation));

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
        };

        saveBtn.disabled = true;
        saveBtn.textContent = "Saving...";
        console.log("[Vocab to Notion] Saving payload:", payload);

        try {
          await saveToNotion(payload);
          saveBtn.classList.add("saved");
          saveBtn.textContent = "Saved! ✓";
          setTimeout(() => {
            saveBtn.classList.remove("saved");
            saveBtn.textContent = "Save to Notion";
            saveBtn.disabled = false;
          }, 2500);
        } catch (err) {
          console.error("[Vocab to Notion] Notion save error:", err.message, "code:", err.notionCode);
          saveBtn.classList.add("save-error");
          if (err.status === 401) {
            saveBtn.textContent = "Auth failed — check token";
          } else if (err.status === 404) {
            saveBtn.textContent = "Database not found — check ID";
          } else if (err.message && err.message.length < 60) {
            saveBtn.textContent = err.message;
          } else {
            saveBtn.textContent = "Save failed — open DevTools";
          }
          setTimeout(() => {
            saveBtn.classList.remove("save-error");
            saveBtn.textContent = "Save to Notion";
            saveBtn.disabled = false;
          }, 5000);
        }
      }

      try {
        llmData = await getDefinition(word, context, preferredLang);

        // Pronunciation
        if (llmData.pronunciation) {
          currentPronunciation = llmData.pronunciation;
          pronunciationEl.textContent = llmData.pronunciation;
          show(pronunciationEl);
        }

        // Part of speech badge
        if (llmData.part_of_speech) {
          posBadgeEl.textContent = llmData.part_of_speech;
          show(posBadgeEl);
        }

        // Populate view elements and textarea values
        meaningView.textContent  = llmData.meaning;
        meaningInput.value       = llmData.meaning;
        exampleView.innerHTML    = highlightWordInExample(llmData.example_sentence, word);
        exampleInput.value       = llmData.example_sentence;
        exampleTranslationEl.textContent = llmData.example_translation;

        // Show form, hide loading
        hide(loadingEl);
        show(formBodyEl);

        // Wire up edit toggles
        setupEditToggle("meaning-view", "meaning-input", "meaning-edit-btn");
        setupEditToggle("example-view", "example-input", "example-edit-btn");

        // Enable save button
        saveBtn.disabled = false;
        saveBtn.addEventListener("click", handleSave);

      } catch (err) {
        console.error("[Vocab to Notion] Error:", err);
        hide(loadingEl);
        if (err.code === "RATE_LIMITED") {
          document.getElementById("error-title").textContent  = "Rate limit reached.";
          document.getElementById("error-detail").textContent = "Too many requests sent to Gemini. Wait a moment and try again.";
        } else {
          document.getElementById("error-title").textContent  = "Could not load definition.";
          document.getElementById("error-detail").textContent = "Check your Gemini API key in config.js and try again.";
        }
        show(errorStateEl);
      }
    });
  });
});
