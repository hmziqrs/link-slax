(function () {
  const STYLE_ID = 'link-selector-style';

  function ensureStyle() {
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = `.link-selector-selected { outline: 2px solid purple; outline-offset: 2px; border-radius: 2px; }`;
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
    const { dirs, selectedDir } = await get(['dirs', 'selectedDir']);
    if (!dirs || !selectedDir) {
      const init = { dirs: { default: [] }, selectedDir: 'default' };
      await set(init);
      return init;
    }
    return { dirs, selectedDir };
  }

  async function onAltClick(e) {
    if (!e.altKey) return;
    const a = e.target && e.target.closest && e.target.closest('a[href]');
    if (!a) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    ensureStyle();
    a.classList.add('link-selector-selected');

    let { dirs, selectedDir } = await ensureInitialized();
    const href = a.href;
    const list = dirs[selectedDir] || (dirs[selectedDir] = []);
    if (!list.includes(href)) list.push(href);
    await set({ dirs });
  }

  document.addEventListener('click', onAltClick, true);
})();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'selectLinks') {
    const links = Array.from(document.querySelectorAll('a[href]')).map(
      (link) => link.href
    );
    sendResponse({ links: links });
  }
});
