# Privacy Policy — Vocab to Notion

_Last updated: February 2026_

## Overview

Vocab to Notion is a free, open-source Chrome extension. We do not collect, store, or transmit any personal data to the developer.

## What data the extension handles

| Data | Where it goes | Who owns it |
|---|---|---|
| Gemini API key | Stored locally in your Chrome profile (`chrome.storage.sync`) | You |
| Notion integration token | Stored locally in your Chrome profile (`chrome.storage.sync`) | You |
| Notion database ID | Stored locally in your Chrome profile (`chrome.storage.sync`) | You |
| Highlighted word + surrounding sentence | Sent to Google Gemini API to generate a definition | You / Google |
| Vocabulary entry (word, definition, example, tags) | Sent to Notion API to save into your database | You / Notion |

## What the developer does NOT do

- We do not run any servers or backend services.
- We do not receive, see, or store any of your data.
- We do not use analytics or tracking of any kind.
- We do not sell or share your data with any third party.

## Third-party services

This extension communicates with two external APIs on your behalf:

- **Google Gemini API** — to generate vocabulary definitions. Your use is subject to [Google's Privacy Policy](https://policies.google.com/privacy).
- **Notion API** — to save entries to your Notion database. Your use is subject to [Notion's Privacy Policy](https://www.notion.so/privacy).

Your API credentials are only ever sent directly to these services, never to the developer.

## Contact

If you have any questions, open an issue on the [GitHub repository](https://github.com/yourusername/vocab_to_notion).
