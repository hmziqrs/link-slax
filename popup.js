document.addEventListener('DOMContentLoaded', function () {
  const selectLinksButton = document.getElementById('selectLinks');
  const linkList = document.getElementById('linkList');

  if (selectLinksButton) {
    selectLinksButton.addEventListener('click', async () => {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      chrome.tabs.sendMessage(tab.id, { action: 'selectLinks' }, (response) => {
        if (response && response.links) {
          linkList.innerHTML = '';
          response.links.forEach((link) => {
            const li = document.createElement('li');
            li.textContent = link;
            linkList.appendChild(li);
          });
        }
      });
    });
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  const dirSelect = document.getElementById('dirSelect');
  const newDirInput = document.getElementById('newDirInput');
  const addDirBtn = document.getElementById('addDirBtn');
  const exportBtn = document.getElementById('exportBtn');
  const moreBtn = document.getElementById('moreBtn');
  const moreMenu = document.getElementById('moreMenu');
  const statusEl = document.getElementById('status');
  const countBadge = document.getElementById('countBadge');

  const get = (keys) =>
    new Promise((resolve) => chrome.storage.local.get(keys, resolve));
  const set = (obj) =>
    new Promise((resolve) => chrome.storage.local.set(obj, resolve));

  const setStatus = (msg) => {
    statusEl.textContent = msg || '';
    if (msg) {
      setTimeout(() => {
        if (statusEl.textContent === msg) statusEl.textContent = '';
      }, 1500);
    }
  };

  async function ensureInitialized() {
    const { dirs, selectedDir } = await get(['dirs', 'selectedDir']);
    if (!dirs || !selectedDir) {
      await set({ dirs: { default: [] }, selectedDir: 'default' });
      return { dirs: { default: [] }, selectedDir: 'default' };
    }
    return { dirs, selectedDir };
  }

  async function loadState() {
    const { dirs, selectedDir } = await get(['dirs', 'selectedDir']);
    return {
      dirs: dirs || { default: [] },
      selectedDir: selectedDir || 'default',
    };
  }

  function formatLinks(links, mode) {
    switch (mode) {
      case 'json':
        return JSON.stringify(links, null, 2);
      case 'comma':
        return links.join(', ');
      case 'newline':
      default:
        return links.join('\n');
    }
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      setStatus('Copied!');
    } catch (e) {
      setStatus('Copy failed');
    }
  }

  function render({ dirs, selectedDir }) {
    // populate select
    dirSelect.innerHTML = '';
    Object.keys(dirs)
      .sort()
      .forEach((name) => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        dirSelect.appendChild(opt);
      });
    dirSelect.value = selectedDir;

    const links = dirs[selectedDir] || [];
    countBadge.textContent = links.length ? `(${links.length})` : '';
  }

  // Init
  await ensureInitialized();
  let state = await loadState();
  render(state);

  // Events
  addDirBtn?.addEventListener('click', async () => {
    const name = (newDirInput.value || '').trim();
    if (!name) {
      setStatus('Enter a name');
      return;
    }
    state = await loadState();
    if (state.dirs[name]) {
      setStatus('Directory exists');
      return;
    }
    state.dirs[name] = [];
    state.selectedDir = name;
    await set({ dirs: state.dirs, selectedDir: state.selectedDir });
    newDirInput.value = '';
    setStatus('Directory created');
    state = await loadState();
    render(state);
  });

  newDirInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addDirBtn.click();
  });

  dirSelect?.addEventListener('change', async () => {
    const selected = dirSelect.value;
    await set({ selectedDir: selected });
    state = await loadState();
    render(state);
  });

  exportBtn?.addEventListener('click', async () => {
    state = await loadState();
    const links = state.dirs[state.selectedDir] || [];
    await copyText(formatLinks(links, 'newline'));
  });

  moreBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    moreMenu.classList.toggle('open');
  });

  moreMenu?.addEventListener('click', async (e) => {
    const btn = e.target.closest('button[data-mode]');
    if (!btn) return;
    const mode = btn.dataset.mode;
    state = await loadState();
    const links = state.dirs[state.selectedDir] || [];
    await copyText(formatLinks(links, mode));
    moreMenu.classList.remove('open');
  });

  document.addEventListener('click', (e) => {
    if (!moreMenu.contains(e.target) && e.target !== moreBtn) {
      moreMenu.classList.remove('open');
    }
  });

  chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area !== 'local') return;
    if (changes.dirs || changes.selectedDir) {
      state = await loadState();
      render(state);
    }
  });

});
