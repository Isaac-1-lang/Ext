const STATE_KEY = 'ciphera_enabled_hosts';

async function getState() {
  const { [STATE_KEY]: state } = await chrome.storage.local.get(STATE_KEY);
  return state || {};
}

async function setHostState(host, enabled) {
  const state = await getState();
  state[host] = { enabled, updatedAt: Date.now() };
  await chrome.storage.local.set({ [STATE_KEY]: state });
}

chrome.runtime.onInstalled.addListener(() => {
  // Initialize storage
  chrome.storage.local.set({ [STATE_KEY]: {} });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === 'CIPHERA_SET_HOST_STATE') {
    setHostState(message.host, message.enabled).then(() => sendResponse({ ok: true }));
    return true;
  }
  if (message?.type === 'CIPHERA_GET_HOST_STATE') {
    getState().then((state) => sendResponse({ state }));
    return true;
  }
  if (message?.type === 'CIPHERA_OPEN_URL' && message.url) {
    chrome.tabs.create({ url: message.url });
    sendResponse({ ok: true });
    return true;
  }
});


