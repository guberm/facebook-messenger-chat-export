# Messenger Chat Export

A Chrome extension to export Facebook Messenger chat history to JSON, plain text, or self-contained HTML with embedded images.

## Features

- **Export visible** — exports all messages currently loaded in the chat
- **Scroll all + export** — auto-scrolls to the top loading full history, then exports
- Three export formats: **JSON**, **Plain text**, **HTML with images**
- HTML export embeds all photos inline (base64) — fully self-contained, no internet needed to view
- Captures sender names, timestamps, and emoji
- Works on `messenger.com` and `facebook.com/messages`

## Installation

1. Clone or download this repo
2. Open `icons/generate.html` in Chrome and click **Generate & Download PNGs** — move the 4 downloaded files into the `icons/` folder
3. Go to `chrome://extensions`, enable **Developer mode** (top right)
4. Click **Load unpacked** and select the folder
5. Open a Messenger chat and click the extension icon

## Usage

1. Open a conversation in Messenger
2. Click the extension icon in the toolbar
3. Choose format: **JSON**, **Plain text**, or **HTML (with images)**
4. **Export visible** — grabs what's loaded right now
5. **Scroll all + export** — scrolls to the beginning first (may take a while for long chats), then exports everything

> Tip: for "Scroll all + export", scroll the chat to the bottom first so the most recent messages are visible before starting.

## Output formats

### JSON
```json
{
  "conversation": "Name",
  "exported_at": "2026-04-07T15:00:00.000Z",
  "total": 248,
  "messages": [
    {
      "sender": "You",
      "timestamp": "February 27",
      "text": "Hello 👋",
      "images": []
    }
  ]
}
```

### Plain text
```
[February 27] You: Hello 👋

[February 27] Them: Hi there
```

### HTML
A single `.html` file styled like Messenger with blue/white chat bubbles. Shared photos are fetched and embedded as base64 — the file is fully self-contained and viewable offline.

## Notes

- Works with Facebook's virtual scroll list (incrementally captures messages as it scrolls)
- Emoji in messages are preserved (rendered as `<img alt="😊">` by Messenger, captured via alt text)
- Messages from the conversation sidebar preview are automatically filtered out

## Privacy

This extension does not collect or transmit any data. See [PRIVACY.md](PRIVACY.md) for full details.
