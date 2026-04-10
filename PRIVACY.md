# Privacy Policy

**Last updated: April 10, 2026**

**Facebook Messenger Chat Export** is a Chrome browser extension that lets you save your Messenger conversations to your own device. This policy explains what data the extension accesses and how it is handled.

## What data the extension accesses

The extension reads the text content of chat messages displayed in your browser on **messenger.com** and **facebook.com/messages**. When you choose HTML export, it also fetches photo images already loaded by your browser from Facebook's CDN in order to embed them in the exported file.

## What we do NOT do

- We do **not** collect, transmit, or store any of your data on any server.
- We do **not** send your messages, metadata, or any personal information to any third party.
- We do **not** use analytics, tracking pixels, or cookies.
- We do **not** access any data beyond what is visible on the Messenger page you have open.

## Where your data goes

All processing happens entirely within your browser. The exported file is saved directly to your device using the browser's built-in download mechanism. No data ever leaves your computer through this extension.

## Permissions explained

| Permission | Why it's needed |
|---|---|
| `activeTab` | To identify the Messenger tab you have open |
| `scripting` | To run the export script on the Messenger page |
| `downloads` | To save the exported file to your device |
| `host_permissions` (messenger.com, facebook.com) | To allow the content script to read the chat messages displayed in your browser |

## Remote code

The extension does not load or execute any remote code. All JavaScript is bundled within the extension package. No `eval()` or external script loading is used.

## Changes to this policy

If this policy changes, the updated version will be published at this URL. Continued use of the extension after changes constitutes acceptance of the updated policy.

## Contact

Questions or concerns: [michael@guber.dev](mailto:michael@guber.dev)
