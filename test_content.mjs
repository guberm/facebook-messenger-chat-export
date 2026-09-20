import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context = {
  chrome: { runtime: { onMessage: { addListener() {} } } },
  Node: { TEXT_NODE: 3, ELEMENT_NODE: 1 },
};

const body = {};
const messages = [
  ['May 1, 2026, 1:00 PM', 'same text'],
  ['May 2, 2026, 1:00 PM', 'same text'],
];
const leaves = messages.map(([timestamp, text]) => {
  const bubble = {
    parentElement: body,
    querySelector(selector) {
      if (selector.includes('aria-label')) {
        return { getAttribute: () => `Message sent ${timestamp} by Alice` };
      }
      return null;
    },
    querySelectorAll: () => [],
  };
  return {
    parentElement: bubble,
    childNodes: [{ nodeType: 3, textContent: text }],
    querySelector: () => null,
    closest: () => null,
  };
});
const container = {
  querySelectorAll: () => leaves,
};
context.document = {
  body,
  querySelector: selector => selector === '[role="log"]' ? container : null,
};
context.location = { pathname: '/messages/t/chat' };
vm.createContext(context);
vm.runInContext(
  `${readFileSync(new URL('./content.js', import.meta.url), 'utf8')}\n` +
    'this.testApi = { extractMessages, parseTimestamp };',
  context,
);

const { extractMessages, parseTimestamp } = context.testApi;

assert.ok(
  parseTimestamp('At May 6, 2026, 11:09 AM') <
    parseTimestamp('At May 7, 2026, 1:19 PM'),
  'full Messenger timestamps should sort chronologically',
);

assert.equal(
  extractMessages().length,
  2,
  'messages with identical text on different dates should both be exported',
);
