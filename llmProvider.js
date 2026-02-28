const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";

const LANG_LABELS = {
  "zh-TW": "Traditional Chinese (繁體中文)",
  en: "English",
  ja: "Japanese (日本語)",
};

function buildPrompt(word, context, preferredLang) {
  const langLabel = LANG_LABELS[preferredLang] ?? LANG_LABELS["zh-TW"];

  return `You are a vocabulary assistant. Analyze the given word in its context and return a JSON object.

Word: "${word}"
Context: "${context}"
Preferred output language: ${langLabel}

Return ONLY a valid JSON object with exactly these fields — no markdown, no explanation, no code fences:

{
  "word": "<the word as given>",
  "part_of_speech": "<e.g. noun, verb, adjective>",
  "pronunciation": "<IPA notation for English words; hiragana reading for Japanese words>",
  "meaning": "<one concise context-aware meaning written in ${langLabel}. If the contextual meaning differs significantly from the general meaning, append a short clarification in parentheses at the end.>",
  "example_sentence": "<one short natural sentence written in the word's OWN language (not the preferred language) that uses the word itself>",
  "example_translation": "<translation of the example_sentence into ${langLabel}>"
}

Rules:
- Detect the word's language automatically from the word itself.
- The meaning and example_translation must be in ${langLabel}.
- The example_sentence must be in the word's own language and must contain the word.
- Keep everything concise. meaning should be 1–2 sentences max.
- Return ONLY the JSON object. No other text.`;
}

async function getDefinition(word, context, preferredLang) {
  const prompt = buildPrompt(word, context, preferredLang);

  const res = await fetch(
    `${GEMINI_ENDPOINT}?key=${CONFIG.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2 },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${err}`);
  }

  const json = await res.json();
  const raw = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  // Strip any accidental markdown code fences
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Failed to parse Gemini response as JSON: ${cleaned}`);
  }

  // Validate and return normalized schema
  return {
    word: parsed.word ?? word,
    part_of_speech: parsed.part_of_speech ?? "",
    pronunciation: parsed.pronunciation ?? "",
    meaning: parsed.meaning ?? "",
    example_sentence: parsed.example_sentence ?? "",
    example_translation: parsed.example_translation ?? "",
  };
}
