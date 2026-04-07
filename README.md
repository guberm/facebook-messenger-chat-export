# Messenger Chat Export

A Chrome extension to export Facebook Messenger chat history to JSON or plain text.

## Features

- **Export visible** — exports all messages currently loaded in the chat
- **Scroll all + export** — auto-scrolls to the top loading full history, then exports
- Exports to JSON (structured) or plain text
- Captures sender names and timestamps
- Works on `messenger.com` and `facebook.com/messages`

## Installation

1. Clone or download this repo
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** and select the folder
5. Open a Messenger chat and click the extension icon

## Usage

1. Open a conversation in Messenger (messenger.com or facebook.com/messages)
2. Click the extension icon in the toolbar
3. Choose format: **JSON** or **Plain text**
4. **Export visible** — grabs what's loaded right now
5. **Scroll all + export** — scrolls to the beginning of the chat first (may take a while for long chats), then exports everything

> Tip: for "Scroll all + export" to work, scroll the chat to the bottom first so the most recent messages are visible.

## Output format

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
      "text": "Hello"
    }
  ]
}
```

### Plain text
```
[February 27] You: Hello

[February 27] Them: Hi there
```

## Notes

- End-to-end encrypted chats on mobile are accessible via Messenger on desktop
- Photos, stickers, and reactions are not captured — text messages only
- Works with Facebook's virtual scroll list (incrementally captures messages as it scrolls)
