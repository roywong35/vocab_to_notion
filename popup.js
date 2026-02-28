const DEFAULT_LANG = "zh-TW";

function show(el) { el.classList.remove("hidden"); }
function hide(el) { el.classList.add("hidden"); }

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
  const meaningInput  = document.getElementById("meaning-input");
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

      let currentPronunciation = "";

      speakBtn.addEventListener("click", () => speak(word, currentPronunciation));

      try {
        const data = await getDefinition(word, context, preferredLang);

        // Pronunciation
        if (data.pronunciation) {
          currentPronunciation = data.pronunciation;
          pronunciationEl.textContent = data.pronunciation;
          show(pronunciationEl);
        }

        // Part of speech badge
        if (data.part_of_speech) {
          posBadgeEl.textContent = data.part_of_speech;
          show(posBadgeEl);
        }

        // Populate editable fields
        meaningInput.value = data.meaning;
        exampleInput.value = data.example_sentence;
        exampleTranslationEl.textContent = data.example_translation;

        // Show form, hide loading
        hide(loadingEl);
        show(formBodyEl);

        // Enable save button (Notion integration will wire this up later)
        saveBtn.disabled = false;

      } catch (err) {
        console.error("[Vocab to Notion] Error:", err);
        hide(loadingEl);
        show(errorStateEl);
      }
    });
  });
});
