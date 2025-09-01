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
  const dirList = document.getElementById('dirList');
  const linkList = document.getElementById('linkList');
  const currentDirLabel = document.getElementById('currentDirLabel');
  const newDirInput = document.getElementById('newDirInput');
  const addDirBtn = document.getElementById('addDirBtn');
  const exportBtn = document.getElementById('exportBtn');
  const clearBtn = document.getElementById('clearBtn');
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
    // Render directories list
    dirList.innerHTML = '';
    const names = Object.keys(dirs).sort((a, b) => a.localeCompare(b));
    names.forEach((name) => {
      const li = document.createElement('li');
      li.className = 'dir-item' + (name === selectedDir ? ' active' : '');
      li.dataset.name = name;

      const left = document.createElement('div');
      left.className = 'dir-left';
      const title = document.createElement('div');
      title.className = 'dir-name';
      title.textContent = name;
      const count = document.createElement('div');
      count.className = 'dir-count';
      count.textContent = `(${(dirs[name] || []).length})`;
      left.appendChild(title);
      left.appendChild(count);

      const actions = document.createElement('div');
      actions.className = 'dir-actions';
      // per-item export (newline)
      const expBtn = document.createElement('button');
      expBtn.className = 'icon-btn';
      expBtn.title = 'Copy newline-separated';
      expBtn.textContent = 'Copy';
      expBtn.dataset.action = 'export';
      // per-item delete
      const delBtn = document.createElement('button');
      delBtn.className = 'icon-btn';
      delBtn.title = name === 'default' ? 'Default cannot be deleted' : 'Delete directory';
      delBtn.textContent = 'Delete';
      delBtn.dataset.action = 'delete';
      if (name === 'default') delBtn.disabled = true;
      actions.appendChild(expBtn);
      actions.appendChild(delBtn);

      li.appendChild(left);
      li.appendChild(actions);
      dirList.appendChild(li);
    });

    // Header and count
    currentDirLabel.textContent = selectedDir;
    const links = dirs[selectedDir] || [];
    countBadge.textContent = links.length ? `(${links.length})` : '';

    // Render links list for selected dir
    linkList.innerHTML = '';
    links.forEach((url) => {
      const item = document.createElement('li');
      item.className = 'link-item';
      const a = document.createElement('a');
      a.href = url;
      a.textContent = url;
      a.target = '_blank';
      item.appendChild(a);
      linkList.appendChild(item);
    });
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

  // Directory list interactions (select, per-item export/delete)
  dirList.addEventListener('click', async (e) => {
    const item = e.target.closest('.dir-item');
    if (!item) return;
    const name = item.dataset.name;

    // Action buttons
    const actionBtn = e.target.closest('button.icon-btn');
    if (actionBtn) {
      const action = actionBtn.dataset.action;
      state = await loadState();
      if (action === 'export') {
        const links = state.dirs[name] || [];
        await copyText(formatLinks(links, 'newline'));
        return;
      }
      if (action === 'delete') {
        if (name === 'default') return; // safety
        const ok = confirm(`Delete directory "${name}"? This cannot be undone.`);
        if (!ok) return;
        delete state.dirs[name];
        // if deleting selected, fall back to default or first available
        if (state.selectedDir === name) {
          state.selectedDir = state.dirs['default'] ? 'default' : Object.keys(state.dirs)[0] || 'default';
          if (!state.dirs[state.selectedDir]) state.dirs[state.selectedDir] = [];
        }
        await set({ dirs: state.dirs, selectedDir: state.selectedDir });
        state = await loadState();
        render(state);
        return;
      }
      return;
    }

    // Selecting a directory (click on row)
    await set({ selectedDir: name });
    state = await loadState();
    render(state);
  });

  exportBtn?.addEventListener('click', async () => {
    state = await loadState();
    const links = state.dirs[state.selectedDir] || [];
    await copyText(formatLinks(links, 'newline'));
  });

  clearBtn?.addEventListener('click', async () => {
    state = await loadState();
    const name = state.selectedDir;
    if (!name) return;
    const ok = confirm(`Clear all links in "${name}"?`);
    if (!ok) return;
    state.dirs[name] = [];
    await set({ dirs: state.dirs });
    state = await loadState();
    render(state);
    setStatus('Cleared');
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
