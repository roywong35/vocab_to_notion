const NOTION_API_VERSION = "2022-06-28";

// Normalize LLM language codes to a consistent set before saving to Notion.
// LLMs sometimes return country codes (JP) instead of ISO 639-1 (JA), or
// include region suffixes (ZH-TW). This map enforces a clean, unified value.
const LANG_NORMALIZE = {
  JP: "JA",
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

// The 9 logical fields this extension writes, mapped to the expected column
// names in the template. fetchPropertyMap uses these names once to resolve
// stable IDs; after that, renames are safe.
const EXPECTED_PROPS = {
  word:          { name: "Word",            type: "title" },
  pronunciation: { name: "Pronunciation",   type: "rich_text" },
  partOfSpeech:  { name: "Part of Speech",  type: "select" },
  definition:    { name: "Definition",      type: "rich_text" },
  example:       { name: "Example",         type: "rich_text" },
  tags:          { name: "Tags",            type: "multi_select" },
  language:      { name: "Language",        type: "select" },
  context:       { name: "Context Snippet", type: "rich_text" },
  created:       { name: "Created",         type: "date" },
};

// Fetches the database schema from Notion and returns a propMap:
// { word: "id1", pronunciation: "id2", ... }
// Throws if any required column is missing so the caller can surface a
// clear error rather than a silent 400.
async function fetchPropertyMap(token, databaseId) {
  const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": NOTION_API_VERSION,
    },
  });

  if (!res.ok) {
    let body = {};
    try { body = await res.json(); } catch {}
    const err = new Error(body.message ?? `Notion schema fetch error ${res.status}`);
    err.status = res.status;
    err.notionCode = body.code ?? "";
    throw err;
  }

  const json = await res.json();
  const props = json.properties ?? {};

  // Build a name → id lookup for quick access.
  const nameToId = {};
  for (const prop of Object.values(props)) {
    nameToId[prop.name] = prop.id;
  }

  // Resolve each expected field to its stable ID.
  const propMap = {};
  const missing = [];

  for (const [key, { name }] of Object.entries(EXPECTED_PROPS)) {
    if (nameToId[name] !== undefined) {
      propMap[key] = nameToId[name];
    } else {
      missing.push(name);
    }
  }

  if (missing.length > 0) {
    const err = new Error(
      `Missing columns in your Notion database: ${missing.join(", ")}. ` +
      `Please duplicate the template again or restore the missing columns.`
    );
    err.code = "SCHEMA_MISMATCH";
    throw err;
  }

  return propMap;
}

async function saveToNotion(payload, propMap) {
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
      [propMap.word]:          { title: [{ text: { content: word } }] },
      [propMap.pronunciation]: { rich_text: [{ text: { content: pronunciation } }] },
      [propMap.partOfSpeech]:  { select: { name: part_of_speech } },
      [propMap.definition]:    { rich_text: [{ text: { content: meaning } }] },
      [propMap.example]:       { rich_text: [{ text: { content: example_sentence } }] },
      [propMap.tags]:          { multi_select: tagNames },
      [propMap.language]:      { select: { name: normalizeLanguage(detected_language) } },
      [propMap.context]:       { rich_text: [{ text: { content: context } }] },
      [propMap.created]:       { date: { start: today } },
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
