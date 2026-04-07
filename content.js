// Messenger Chat Export — content script v5

let isScrolling = false;

// ---- Find the chat container ----

function findChatContainer() {
  // role="log" is the message list in Messenger
  const log = document.querySelector('[role="log"]');
  if (log) return log;

  const pagelet = document.querySelector('[data-pagelet="MWMessageListScrollingArea"]');
  if (pagelet) return pagelet;

  const main = document.querySelector('[role="main"]');
  if (main) {
    const candidates = Array.from(main.querySelectorAll('div'))
      .filter(el => el.scrollHeight > 300 && el.clientHeight > 100)
      .sort((a, b) => b.querySelectorAll('[dir="auto"]').length - a.querySelectorAll('[dir="auto"]').length);
    if (candidates[0]) return candidates[0];
  }

  return document.querySelector('[role="main"]') || document.body;
}

// Find the actual scroll container — walk up from a real chat message leaf
function findMessageScrollable() {
  // Look for a leaf that has a "Message sent" accessibility label nearby
  // (sidebar previews don't have this, only actual chat messages do)
  const chatLeaf = Array.from(document.querySelectorAll('[dir="auto"]')).find(el => {
    if (el.querySelector('[dir="auto"]')) return false;
    const text = el.innerText?.trim();
    if (!text || text.length < 3 || text.length > 500) return false;
    if (el.closest('nav, header, aside, [role="navigation"]')) return false;
    let p = el.parentElement;
    for (let i = 0; i < 12; i++) {
      if (!p || p === document.body) break;
      if (p.querySelector('[aria-label*="Message sent"]')) return true;
      p = p.parentElement;
    }
    return false;
  });

  const startEl = chatLeaf || findChatContainer();

  // Pass 1: walk up looking for scrollTop > 0 (most reliable)
  let el = startEl;
  while (el && el !== document.documentElement) {
    if (el.scrollTop > 0) return el;
    el = el.parentElement;
  }

  // Pass 2: walk up looking for overflow:auto/scroll
  el = startEl;
  while (el && el !== document.documentElement) {
    const oy = window.getComputedStyle(el).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight) return el;
    el = el.parentElement;
  }

  return findChatContainer();
}

function getChatName() {
  const selectors = ['h1[dir="auto"]', '[role="main"] h1', '[role="main"] h2'];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) {
      const t = el.innerText?.trim();
      if (t && t.length < 80 && !['Notifications', 'Messenger', 'Chats'].includes(t)) return t;
    }
  }
  const m = location.pathname.match(/\/messages\/t\/([^/?]+)/);
  if (m) return decodeURIComponent(m[1]);
  return 'chat';
}

// ---- Extract messages ----

// Patterns that are UI chrome, not actual message content
const NOISE = [
  /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+\d+:\d+\s*(AM|PM)$/i,
  /^(Today|Yesterday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+at\s+\d/i,
  /^You replied to /i,
  /^You sent$/i,
  /^Enter,/i,
  /^Message sent /i,
  /^Seen$/i,
  /^Delivered$/i,
  /^\d+[smhd]$/, // time deltas like "7m", "2h"
  /^Active /i, // "Active now", "Active 21m ago"
  /^\w{3,9} \d{1,2}, \d{4},?\s+\d{1,2}:\d{2}/i, // "Feb 27, 2026, 12:56 PM"
  /^Messages and calls are secured/i, // E2E notice
  /^Conversation started/i,
];

function isNoise(text) {
  return NOISE.some(p => p.test(text));
}

function extractMessages() {
  const container = findChatContainer();
  if (!container) return [];

  const allEls = Array.from(container.querySelectorAll('[dir="auto"]'));

  const leafEls = allEls.filter(el => {
    if (el.querySelector('[dir="auto"]')) return false;
    const text = el.innerText?.trim();
    if (!text || text.length > 2000) return false;
    if (el.closest('nav, header, aside, [role="navigation"], [role="complementary"], [role="banner"]')) return false;
    return true;
  });

  // First pass: collect with raw sender/timestamp
  const raw = [];
  leafEls.forEach(el => {
    const text = el.innerText.trim();

    let sender = null;
    let timestamp = null;

    let probe = el.parentElement;
    for (let i = 0; i < 12; i++) {
      if (!probe || probe === document.body || probe === container) break;

      const tsEl = probe.querySelector('[aria-label*="Message sent"], [aria-label*="sent at"]');
      if (tsEl) {
        const label = tsEl.getAttribute('aria-label') || '';
        const clean = label.replace(/^Enter,\s*/, '');
        const match = clean.match(/[Mm]essage sent (.+?) by (.+)$/);
        if (match) {
          timestamp = match[1].trim();
          sender = match[2].trim();
          break;
        }
        timestamp = clean;
        break;
      }

      const abbr = probe.querySelector('abbr[title]');
      if (abbr) { timestamp = abbr.getAttribute('title'); break; }

      const ts = probe.querySelector('[aria-label*="AM"], [aria-label*="PM"]');
      if (ts) { timestamp = ts.getAttribute('aria-label'); break; }

      probe = probe.parentElement;
    }

    raw.push({ sender, timestamp, text });
  });

  // Second pass: filter noise, propagate sender/timestamp forward
  const messages = [];
  const chatName = getChatName();
  const seenTexts = new Set();
  let lastSender = null;
  let lastTimestamp = null;

  for (const item of raw) {
    if (item.sender) lastSender = item.sender;
    if (item.timestamp) lastTimestamp = item.timestamp;

    const text = item.text;
    if (seenTexts.has(text)) continue;
    if (isNoise(text)) continue;
    // Skip chat title appearing as a text node
    if (text === chatName) continue;
    // Skip lone sender name (e.g., "Ekateryna" or "You" standing alone)
    if (text === lastSender || text === 'You') continue;

    seenTexts.add(text);
    messages.push({
      sender: item.sender || lastSender,
      timestamp: item.timestamp || lastTimestamp,
      text,
    });
  }

  return messages;
}

// ---- Auto-scroll ----

async function scrollToTop(onProgress) {
  isScrolling = true;
  const scrollable = findMessageScrollable();

  let lastH = 0, stuck = 0;
  while (isScrolling) {
    scrollable.scrollTop = 0;
    scrollable.dispatchEvent(new Event('scroll', { bubbles: true }));
    await sleep(1500);
    const h = scrollable.scrollHeight;
    if (h === lastH) { stuck++; if (stuck >= 5) break; } else stuck = 0;
    lastH = h;
    if (onProgress) onProgress();
  }
  isScrolling = false;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ---- Download ----

function downloadJSON(messages, filename) {
  const name = getChatName();
  const blob = new Blob([JSON.stringify({
    conversation: name,
    exported_at: new Date().toISOString(),
    total: messages.length,
    messages,
  }, null, 2)], { type: 'application/json' });
  trigger(blob, filename + '.json');
}

function downloadText(messages, filename) {
  const lines = messages.map(m => {
    const ts = m.timestamp ? `[${m.timestamp}] ` : '';
    const from = m.sender ? `${m.sender}: ` : '';
    return `${ts}${from}${m.text}`;
  });
  const blob = new Blob([lines.join('\n\n')], { type: 'text/plain;charset=utf-8' });
  trigger(blob, filename + '.txt');
}

function trigger(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { try { document.body.removeChild(a); } catch(e){} URL.revokeObjectURL(url); }, 300);
}

// Parse Messenger relative timestamps into sortable ms values
function parseTimestamp(ts) {
  if (!ts) return 0;
  const now = new Date();
  const MONTHS = {
    january:0,february:1,march:2,april:3,may:4,june:5,
    july:6,august:7,september:8,october:9,november:10,december:11,
    jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11
  };
  const s = ts.toLowerCase().trim();
  const parseTime = (h, m, ampm) => {
    let hh = parseInt(h), mm = parseInt(m);
    if (ampm === 'pm' && hh < 12) hh += 12;
    if (ampm === 'am' && hh === 12) hh = 0;
    return [hh, mm];
  };
  // "yesterday at 4:11 PM"
  if (s.startsWith('yesterday')) {
    const d = new Date(now); d.setDate(d.getDate() - 1);
    const m = s.match(/(\d+):(\d+)\s*(am|pm)/);
    if (m) { const [hh, mm] = parseTime(m[1], m[2], m[3]); d.setHours(hh, mm, 0, 0); }
    return d.getTime();
  }
  // "today at 4:11 PM"
  if (s.startsWith('today')) {
    const d = new Date(now);
    const m = s.match(/(\d+):(\d+)\s*(am|pm)/);
    if (m) { const [hh, mm] = parseTime(m[1], m[2], m[3]); d.setHours(hh, mm, 0, 0); }
    return d.getTime();
  }
  // "february 27" or "march 20 at 1:16 pm"
  const m = s.match(/^([a-z]+)\s+(\d+)(?:,?\s+\d{4})?(?:\s+at\s+(\d+):(\d+)\s*(am|pm))?/);
  if (m && MONTHS[m[1]] !== undefined) {
    const d = new Date(now.getFullYear(), MONTHS[m[1]], parseInt(m[2]));
    if (m[3]) { const [hh, mm] = parseTime(m[3], m[4], m[5]); d.setHours(hh, mm, 0, 0); }
    return d.getTime();
  }
  return 0;
}

function slug(s) {
  return (s || 'chat').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 40) || 'chat';
}

// ---- Message listener ----

chrome.runtime.onMessage.addListener((msg, _sender, respond) => {

  if (msg.action === 'ping') {
    respond({ ok: true });
    return;
  }

  if (msg.action === 'count') {
    const msgs = extractMessages();
    respond({ count: msgs.length, name: getChatName() });
    return;
  }

  if (msg.action === 'debug') {
    const container = findChatContainer();
    const scrollable = findMessageScrollable();
    respond({
      containerTag: container?.tagName,
      containerOverflowY: window.getComputedStyle(container).overflowY,
      containerScrollH: container?.scrollHeight,
      scrollableTag: scrollable?.tagName,
      scrollableRole: scrollable?.getAttribute('role'),
      scrollableOverflowY: window.getComputedStyle(scrollable).overflowY,
      scrollableScrollTop: scrollable?.scrollTop,
      scrollableScrollH: scrollable?.scrollHeight,
      scrollableClientH: scrollable?.clientHeight,
      sameElement: container === scrollable,
      dirAutoCount: container?.querySelectorAll('[dir="auto"]').length,
      name: getChatName(),
    });
    return;
  }

  if (msg.action === 'test_scroll') {
    (async () => {
      const scrollable = findMessageScrollable();
      const before = { scrollTop: scrollable.scrollTop, scrollH: scrollable.scrollHeight };
      scrollable.scrollTop = 0;
      scrollable.dispatchEvent(new Event('scroll', { bubbles: true }));
      await new Promise(r => setTimeout(r, 2000));
      respond({
        element: scrollable.tagName + '[role=' + scrollable.getAttribute('role') + ']',
        overflowY: window.getComputedStyle(scrollable).overflowY,
        before,
        after: { scrollTop: scrollable.scrollTop, scrollH: scrollable.scrollHeight },
        loaded: scrollable.scrollHeight !== before.scrollH,
      });
    })();
    return true;
  }

  if (msg.action === 'export') {
    const msgs = extractMessages()
      .sort((a, b) => parseTimestamp(a.timestamp) - parseTimestamp(b.timestamp));
    const fn = slug(getChatName()) + '-' + new Date().toISOString().slice(0, 10);
    if (msg.format === 'json') downloadJSON(msgs, fn);
    else downloadText(msgs, fn);
    respond({ count: msgs.length });
    return;
  }

  if (msg.action === 'scroll_and_export') {
    (async () => {
      isScrolling = true;
      const scrollable = findMessageScrollable();
      // Collect messages incrementally — Messenger removes old DOM nodes as you scroll
      const collected = new Map(); // key = sender+timestamp+text
      const addMessages = () => {
        extractMessages().forEach(m => {
          const key = (m.sender || '') + '|' + (m.timestamp || '') + '|' + m.text;
          if (!collected.has(key)) collected.set(key, m);
        });
      };

      let lastH = 0, stuck = 0;
      while (isScrolling) {
        addMessages();
        try { chrome.runtime.sendMessage({ action: 'scroll_progress' }); } catch(e) {}
        scrollable.scrollTop = 0;
        scrollable.dispatchEvent(new Event('scroll', { bubbles: true }));
        await sleep(1500);
        const h = scrollable.scrollHeight;
        if (h === lastH) { stuck++; if (stuck >= 5) break; } else stuck = 0;
        lastH = h;
      }
      addMessages(); // final capture
      isScrolling = false;

      const msgs = Array.from(collected.values())
        .sort((a, b) => parseTimestamp(a.timestamp) - parseTimestamp(b.timestamp));
      const fn = slug(getChatName()) + '-full-' + new Date().toISOString().slice(0, 10);
      if (msg.format === 'json') downloadJSON(msgs, fn);
      else downloadText(msgs, fn);
      respond({ count: msgs.length });
    })();
    return true;
  }

  if (msg.action === 'stop_scroll') {
    isScrolling = false;
    respond({ ok: true });
    return;
  }

  return true;
});
