(function () {
  const STYLE_ID = 'link-selector-style';
  const BANNER_ID = 'link-selector-turbo-banner';

  let turboEnabled = false;
  let altCaptureEnabled = true;

  function ensureStyle() {
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = `
        .link-selector-selected { outline: 2px solid purple; outline-offset: 2px; border-radius: 2px; }
        #${BANNER_ID} {
          position: fixed;
          right: 12px;
          bottom: 12px;
          z-index: 2147483647;
          background: rgba(139, 92, 246, 0.95);
          color: white;
          padding: 8px 10px;
          border-radius: 9999px;
          font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
          font-size: 12px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.25);
          display: flex;
          align-items: center;
          gap: 6px;
          pointer-events: none;
        }
        #${BANNER_ID} svg { width: 14px; height: 14px; }
      `;
      document.documentElement.appendChild(style);
    }
  }

  function get(keys) {
    return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
  }

  function set(obj) {
    return new Promise((resolve) => chrome.storage.local.set(obj, resolve));
  }

  async function ensureInitialized() {
    const { dirs, selectedDir, turbo, altCapture } = await get([
      'dirs',
      'selectedDir',
      'turbo',
      'altCapture',
    ]);
    const updates = {};
    let resultDirs = dirs;
    let resultSelected = selectedDir;
    if (!resultDirs || !resultSelected) {
      resultDirs = { default: [] };
      resultSelected = 'default';
      updates.dirs = resultDirs;
      updates.selectedDir = resultSelected;
    }
    if (typeof turbo === 'undefined') updates.turbo = false;
    if (typeof altCapture === 'undefined') updates.altCapture = true;
    if (Object.keys(updates).length) await set(updates);
    turboEnabled = typeof turbo === 'boolean' ? turbo : false;
    altCaptureEnabled = typeof altCapture === 'boolean' ? altCapture : true;
    return { dirs: resultDirs, selectedDir: resultSelected };
  }

  function ensureBanner() {
    let el = document.getElementById(BANNER_ID);
    if (!el) {
      el = document.createElement('div');
      el.id = BANNER_ID;
      el.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>
        <span>Turbo capture: ON</span>
      `;
      document.documentElement.appendChild(el);
    }
    return el;
  }

  function showBanner() {
    ensureStyle();
    const el = ensureBanner();
    el.style.display = 'flex';
  }

  function hideBanner() {
    const el = document.getElementById(BANNER_ID);
    if (el) el.style.display = 'none';
  }

  async function onClick(e) {
    // Ignore clicks on our banner
    if (e.target && e.target.closest && e.target.closest(`#${BANNER_ID}`)) return;

    const a = e.target && e.target.closest && e.target.closest('a[href]');
    if (!a) return;

    const isSelected = a.classList.contains('link-selector-selected');
    const captureByTurbo = turboEnabled;
    const captureByAlt = altCaptureEnabled && e.altKey;
    const shouldHandle = isSelected || captureByTurbo || captureByAlt;
    if (!shouldHandle) return;

    // Block navigation immediately
    e.preventDefault();
    e.stopImmediatePropagation();

    ensureStyle();
    let { dirs, selectedDir } = await ensureInitialized();
    const href = a.href;
    const list = dirs[selectedDir] || (dirs[selectedDir] = []);
    const idx = list.indexOf(href);
    if (idx !== -1) {
      // Remove
      list.splice(idx, 1);
      a.classList.remove('link-selector-selected');
    } else {
      // Add
      list.push(href);
      a.classList.add('link-selector-selected');
    }
    await set({ dirs });
  }

  // Use window capture for earliest interception
  function preBlock(e) {
    if (e.target && e.target.closest && e.target.closest(`#${BANNER_ID}`)) return;
    const a = e.target && e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    const isSelected = a.classList.contains('link-selector-selected');
    const captureByTurbo = turboEnabled;
    const captureByAlt = altCaptureEnabled && e.altKey;
    if (isSelected || captureByTurbo || captureByAlt) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }

  window.addEventListener('pointerdown', preBlock, true);
  window.addEventListener('mousedown', preBlock, true);
  window.addEventListener('click', onClick, true);
  window.addEventListener('auxclick', onClick, true);

  // Initialize settings and banner
  (async () => {
    await ensureInitialized();
    if (turboEnabled) showBanner();
  })();

  // React to storage changes for turbo/alt toggles
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes.turbo) {
      turboEnabled = !!changes.turbo.newValue;
      if (turboEnabled) showBanner();
      else hideBanner();
    }
    if (changes.altCapture) {
      altCaptureEnabled = !!changes.altCapture.newValue;
    }
  });
})();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'selectLinks') {
    const links = Array.from(document.querySelectorAll('a[href]')).map(
      (link) => link.href
    );
    sendResponse({ links: links });
  }
});
