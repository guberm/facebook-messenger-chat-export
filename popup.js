const status = document.getElementById('status');
const chatName = document.getElementById('chat-name');
const btnExport = document.getElementById('btn-export');
const btnScroll = document.getElementById('btn-scroll');
const btnStop = document.getElementById('btn-stop');
const format = document.getElementById('format');

function setStatus(msg, cls = '') {
  status.textContent = msg;
  status.className = 'status ' + cls;
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function sendMsg(action, extra = {}) {
  const tab = await getActiveTab();
  return new Promise(resolve => {
    chrome.tabs.sendMessage(tab.id, { action, ...extra }, resolve);
  });
}

// On open: ping content script and get chat info
(async () => {
  const tab = await getActiveTab();
  const isMessenger = tab.url.includes('messenger.com') || tab.url.includes('facebook.com/messages');
  if (!isMessenger) {
    setStatus('Open a Messenger chat first.', 'err');
    return;
  }

  try {
    const ping = await sendMsg('ping');
    if (!ping?.ok) throw new Error('no response');

    const info = await sendMsg('count');
    chatName.textContent = info.name || 'Unknown chat';
    setStatus(`${info.count} messages visible`, 'ok');
    btnExport.disabled = false;
    btnScroll.disabled = false;
  } catch (e) {
    setStatus('Could not connect. Refresh the page and try again.', 'err');
  }
})();

// Export visible
btnExport.addEventListener('click', async () => {
  btnExport.disabled = true;
  setStatus('Exporting...');
  try {
    const res = await sendMsg('export', { format: format.value });
    setStatus(`Downloaded ${res.count} messages`, 'ok');
  } catch (e) {
    setStatus('Export failed.', 'err');
  }
  btnExport.disabled = false;
});

// Scroll + export
btnScroll.addEventListener('click', async () => {
  btnScroll.style.display = 'none';
  btnStop.style.display = '';
  btnExport.disabled = true;
  setStatus('Scrolling to load history...');

  // Listen for scroll progress
  const listener = (msg) => {
    if (msg.action === 'scroll_progress') {
      setStatus('Scrolling... (loading older messages)');
    }
  };
  chrome.runtime.onMessage.addListener(listener);

  try {
    const res = await sendMsg('scroll_and_export', { format: format.value });
    setStatus(`Downloaded ${res?.count || '?'} messages`, 'ok');
  } catch (e) {
    setStatus('Done (or stopped).', 'ok');
  }

  chrome.runtime.onMessage.removeListener(listener);
  btnStop.style.display = 'none';
  btnScroll.style.display = '';
  btnExport.disabled = false;
});

// Stop scrolling
btnStop.addEventListener('click', async () => {
  await sendMsg('stop_scroll');
  btnStop.style.display = 'none';
  btnScroll.style.display = '';
  btnExport.disabled = false;
  setStatus('Stopped. Click "Export visible" to save loaded messages.', 'ok');
});
