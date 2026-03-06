const NOTION_API_VERSION = "2022-06-28";

// Normalize LLM language codes to a consistent set before saving to Notion.
// LLMs sometimes return country codes (JP) instead of ISO 639-1 (JA), or
// include region suffixes (ZH-TW). This map enforces a clean, unified value.
const LANG_NORMALIZE = {
  JP: "JA",       // country code → ISO 639-1
  "JA-JP": "JA",
  "ZH-TW": "ZH",
  "ZH-CN": "ZH",
  "EN-US": "EN",
  "EN-GB": "EN",
  "KO-KR": "KO",
  "PT-BR": "PT",
};

function normalizeLanguage(code) {
  const upper = (code ?? "EN").toUpperCase();
  return LANG_NORMALIZE[upper] ?? upper;
}

async function saveToNotion(payload) {
  const {
    word,
    pronunciation,
    part_of_speech,
    meaning,
    example_sentence,
    tags,
    detected_language,
    context,
    notionToken,
    notionDatabaseId,
  } = payload;

  const tagNames = tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .map((name) => ({ name }));

  const today = new Date().toISOString().split("T")[0];

  const body = {
    parent: { database_id: notionDatabaseId },
    properties: {
      Word: {
        title: [{ text: { content: word } }],
      },
      Pronunciation: {
        rich_text: [{ text: { content: pronunciation } }],
      },
      "Part of Speech": {
        select: { name: part_of_speech },
      },
      Definition: {
        rich_text: [{ text: { content: meaning } }],
      },
      Example: {
        rich_text: [{ text: { content: example_sentence } }],
      },
      Tags: {
        multi_select: tagNames,
      },
      Language: {
        select: { name: normalizeLanguage(detected_language) },
      },
      "Context Snippet": {
        rich_text: [{ text: { content: context } }],
      },
      Created: {
        date: { start: today },
      },
    },
  };

  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${notionToken}`,
      "Content-Type": "application/json",
      "Notion-Version": NOTION_API_VERSION,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let body = {};
    try { body = await res.json(); } catch {}
    console.error("[Vocab to Notion] Notion API error", res.status, body);
    const err = new Error(body.message ?? `Notion API error ${res.status}`);
    err.status = res.status;
    err.notionCode = body.code ?? "";
    throw err;
  }

  return await res.json();
}
