// Lightweight prompt UI
function ensurePrompt(host, onChoose) {
  if (document.getElementById('ciphera-prompt')) return;
  const container = document.createElement('div');
  container.id = 'ciphera-prompt';
  container.style.cssText = `
    position: fixed; z-index: 2147483647; right: 16px; top: 16px;
    background: #0f172a; color: #fff; padding: 12px 14px; border-radius: 10px;
    box-shadow: 0 10px 20px rgba(0,0,0,.25); font-family: system-ui, sans-serif;
    display: flex; gap: 10px; align-items: center;
  `;
  container.innerHTML = `
    <span>Enable Ciphera protection on <b>${host}</b>?</span>
    <button id="ciphera-enable" style="background:#16a34a;color:#fff;border:0;border-radius:8px;padding:6px 10px;cursor:pointer">Enable</button>
    <button id="ciphera-disable" style="background:#374151;color:#fff;border:0;border-radius:8px;padding:6px 10px;cursor:pointer">Disable</button>
  `;
  document.body.appendChild(container);
  container.querySelector('#ciphera-enable').onclick = () => onChoose(true, container);
  container.querySelector('#ciphera-disable').onclick = () => onChoose(false, container);
}

async function fetchProviders() {
  try {
    const res = await fetch(chrome.runtime.getURL('providers.json'));
    return (await res.json()).aiProviders || [];
  } catch {
    return [];
  }
}

function getHost() {
  try { return location.hostname.replace(/^www\./, ''); } catch { return ''; }
}

async function getState() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'CIPHERA_GET_HOST_STATE' }, (resp) => resolve(resp?.state || {}));
  });
}

async function setHostState(host, enabled) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'CIPHERA_SET_HOST_STATE', host, enabled }, () => resolve());
  });
}

async function getConfig() {
  const defaults = {
    apiBase: 'http://localhost:3560/api',
    appUrl: 'http://localhost:8080'
  };
  try {
    const { ciphera_api_base, ciphera_app_url } = await chrome.storage.local.get(['ciphera_api_base', 'ciphera_app_url']);
    return {
      apiBase: ciphera_api_base || defaults.apiBase,
      appUrl: ciphera_app_url || defaults.appUrl
    };
  } catch {
    return defaults;
  }
}

async function pingBackend(apiBase) {
  try {
    const res = await fetch(apiBase.replace(/\/$/, '') + '/auth/profile', { credentials: 'include' });
    return res.ok;
  } catch {
    return false;
  }
}

(async function init() {
  const host = getHost();
  if (!host) return;
  const cfg = await getConfig();
  const providers = await fetchProviders();
  const isAISite = providers.some((p) => host.endsWith(p));
  if (!isAISite) return;

  const state = await getState();
  const hostState = state[host];
  if (hostState) return; // already chosen

  ensurePrompt(host, async (enabled, el) => {
    await setHostState(host, enabled);
    el.remove();
    if (enabled) {
      const ok = await pingBackend(cfg.apiBase);
      if (!ok) {
        chrome.runtime.sendMessage({ type: 'CIPHERA_OPEN_URL', url: cfg.appUrl });
      } else {
        console.info('Ciphera enabled on', host);
      }
    } else {
      console.info('Ciphera disabled on', host);
    }
  });
})();


