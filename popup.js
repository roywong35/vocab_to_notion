document.addEventListener("DOMContentLoaded", () => {
  const wordEl = document.getElementById("word");
  const emptyEl = document.getElementById("empty");

  chrome.storage.session.get("selectedWord", (result) => {
    const word = result.selectedWord;
    if (word) {
      wordEl.textContent = word;
    } else {
      wordEl.style.display = "none";
      emptyEl.style.display = "block";
    }
  });
});
