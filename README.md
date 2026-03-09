# Vocab to Notion

> Highlight a word in your browser → get an AI-generated definition, pronunciation, and example sentence → save it straight into your Notion vocabulary database.

Built for language learners who want a fast, distraction-free way to capture new words while reading online.

---

## What it does

1. **Highlight any word** on any webpage and right-click → **"Add Vocabulary to Notion"**
2. The popup shows:
   - The word, its pronunciation (IPA or furigana), and part of speech
   - A concise meaning in your preferred language (Traditional Chinese, English, Japanese, and more)
   - An example sentence in the word's original language, with a translation
   - Editable fields for meaning, example, and tags
3. Click **Save to Notion** — the entry lands in your Notion database instantly

You can also **type a word manually** in the popup (useful for words you see in images or videos that can't be highlighted).

---

## Setup

### 1 — Get a free Gemini API Key

Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey) and create a key. It's free and requires only a Google account.

### 2 — Set up your Notion database

Duplicate the ready-made template into your Notion workspace:
👉 [Duplicate Notion template](https://www.notion.so/316474c986dc80c2b38ec2afe49b0227?v=316474c986dc80eb81bd000cd2ca4601&source=copy_link)

The template has the exact column schema the extension expects:

| Column | Type |
|---|---|
| Word | Title |
| Pronunciation | Text |
| Part of Speech | Select |
| Definition | Text |
| Example | Text |
| Tags | Multi-select |
| Language | Select |
| Context Snippet | Text |
| Created | Date |

**Customizing your database:** You can **rename** any column (e.g. to your language) — the extension uses stable IDs and will keep working. You can **add** extra columns; they are ignored. **Do not delete** any of the columns above; removing a required column will cause saves to fail with an error. If that happens, duplicate the template again and reconnect your integration.

### 3 — Create a Notion internal integration

1. Go to [notion.so/profile/integrations](https://www.notion.so/profile/integrations) → **New integration**
2. Give it a name (e.g. "Vocab to Notion"), select your workspace
3. Copy the **Internal Integration Secret** (starts with `ntn_...`)
4. Open your duplicated database → **⋯ menu → Connections → Add connection** → select your integration

### 4 — Find your Notion Database ID

Open your duplicated database in Notion. The URL looks like:
```
https://www.notion.so/your-workspace/316474c986dc80c2b38ec2afe49b0227?v=...
```
The 32-character string before the `?` is your Database ID.

### 5 — Install the extension

1. Download or clone this repo
2. Open Chrome → go to `chrome://extensions`
3. Enable **Developer mode** (toggle, top-right)
4. Click **Load unpacked** → select the `vocab_to_notion` folder
5. Pin the extension to your toolbar

### 6 — Enter your keys in Settings

Click the extension icon → if keys are missing, click **Open Settings**. Enter:
- Your Gemini API Key
- Your Notion Integration Token (`ntn_...`)
- Your Notion Database ID

Click **Save**. You're ready.

---

## Supported meaning languages

- Traditional Chinese (繁體中文)
- Simplified Chinese (简体中文)
- English
- Japanese (日本語)
- Korean (한국어)
- Spanish (Español)

The meaning, part of speech, example translation, and all UI labels automatically match your preferred language.

---

## Tech stack

| Layer | What |
|---|---|
| Platform | Chrome Extension — Manifest V3 |
| LLM | Google Gemini 2.5 Flash-Lite |
| Pronunciation | Web Speech API (local, free) |
| Storage | Notion API |
| Languages | Plain HTML, CSS, JavaScript — no framework |

---

## Privacy

- All API keys are stored locally in `chrome.storage.sync` (synced to your own Chrome profile — never sent to any third-party server).
- The highlighted word and surrounding sentence context are sent to Google Gemini for processing, under Google's standard API terms.
- No data is collected by this extension. No analytics, no tracking.

---

## Donation link

The popup and options pages show a “Buy me a coffee” (or localized equivalent) link. To use your own page, set the URL in **`i18n.js`**: edit the `DONATION_URL` constant at the top (e.g. your [Buy Me a Coffee](https://buymeacoffee.com), [Ko-fi](https://ko-fi.com), or PayPal.me link).

---

## License

MIT
