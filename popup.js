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
  const themeToggle = document.getElementById('themeToggle');
  const turboToggle = document.getElementById('turboToggle');
  const altToggle = document.getElementById('altToggle');

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

  // Inline SVG icons (Lucide)
  const ICONS = {
    copy: `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
      </svg>
    `,
    trash: `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 11v6" />
        <path d="M14 11v6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
        <path d="M3 6h18" />
        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </svg>
    `,
    x: `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </svg>
    `,
    sun: `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2" />
        <path d="M12 20v2" />
        <path d="m4.93 4.93 1.41 1.41" />
        <path d="m17.66 17.66 1.41 1.41" />
        <path d="M2 12h2" />
        <path d="M20 12h2" />
        <path d="m6.34 17.66-1.41 1.41" />
        <path d="m19.07 4.93-1.41 1.41" />
      </svg>
    `,
    moon: `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401" />
      </svg>
    `,
    keyboard: `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 8h.01" />
        <path d="M12 12h.01" />
        <path d="M14 8h.01" />
        <path d="M16 12h.01" />
        <path d="M18 8h.01" />
        <path d="M6 8h.01" />
        <path d="M7 16h10" />
        <path d="M8 12h.01" />
        <rect width="20" height="16" x="2" y="4" rx="2" />
      </svg>
    `,
    zap: `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
      </svg>
    `,
  };

  function setTheme(mode, persist = true) {
    document.body.classList.toggle('dark', mode === 'dark');
    if (themeToggle) themeToggle.innerHTML = mode === 'dark' ? ICONS.sun : ICONS.moon;
    if (persist) set({ theme: mode });
  }

  async function applySavedTheme() {
    const { theme } = await get(['theme']);
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const mode = theme || (prefersDark ? 'dark' : 'light');
    setTheme(mode, false);
  }

  function updateCaptureToggles(turboOn, altOn) {
    if (turboToggle) {
      turboToggle.classList.toggle('toggle-on', !!turboOn);
      turboToggle.setAttribute('aria-pressed', (!!turboOn).toString());
      turboToggle.title = `Turbo ${turboOn ? 'On' : 'Off'}`;
    }
    if (altToggle) {
      altToggle.classList.toggle('toggle-on', !!altOn);
      altToggle.setAttribute('aria-pressed', (!!altOn).toString());
      altToggle.title = `Alt-capture ${altOn ? 'On' : 'Off'}`;
    }
  }

  async function applyCaptureTogglesFromStorage() {
    const { turbo, altCapture } = await get(['turbo', 'altCapture']);
    const turboOn = !!turbo; // default false
    const altOn = altCapture !== false; // default true
    updateCaptureToggles(turboOn, altOn);
  }

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

  function deduplicateLinks(dirs) {
    const cleaned = {};
    for (const [name, links] of Object.entries(dirs)) {
      cleaned[name] = [...new Set(links)]; // Remove duplicates using Set
    }
    return cleaned;
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
      expBtn.innerHTML = ICONS.copy;
      expBtn.dataset.action = 'export';
      // per-item delete
      const delBtn = document.createElement('button');
      delBtn.className = 'icon-btn';
      delBtn.title = name === 'default' ? 'Default cannot be deleted' : 'Delete directory';
      delBtn.innerHTML = ICONS.trash;
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
      const removeBtn = document.createElement('button');
      removeBtn.className = 'icon-btn link-remove';
      removeBtn.title = 'Remove link';
      removeBtn.innerHTML = ICONS.x;
      removeBtn.dataset.url = url;
      const a = document.createElement('a');
      a.href = url;
      a.textContent = url;
      a.target = '_blank';
      item.appendChild(removeBtn);
      item.appendChild(a);
      linkList.appendChild(item);
    });
  }

  // Init
  await ensureInitialized();
  await applySavedTheme();
  await applyCaptureTogglesFromStorage();
  let state = await loadState();
  
  // Clean up any duplicates on load
  const cleanedDirs = deduplicateLinks(state.dirs);
  if (JSON.stringify(cleanedDirs) !== JSON.stringify(state.dirs)) {
    await set({ dirs: cleanedDirs });
    state.dirs = cleanedDirs;
  }
  
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

  themeToggle?.addEventListener('click', async () => {
    const isDark = document.body.classList.contains('dark');
    const next = isDark ? 'light' : 'dark';
    setTheme(next, true);
  });

  altToggle?.addEventListener('click', async () => {
    const { turbo, altCapture } = await get(['turbo', 'altCapture']);
    const nextAlt = !(altCapture !== false);
    await set({ altCapture: nextAlt });
    updateCaptureToggles(!!turbo, nextAlt);
    setStatus(`Alt-capture: ${nextAlt ? 'On' : 'Off'}`);
  });

  turboToggle?.addEventListener('click', async () => {
    const { turbo, altCapture } = await get(['turbo', 'altCapture']);
    const nextTurbo = !turbo;
    await set({ turbo: nextTurbo });
    updateCaptureToggles(nextTurbo, altCapture !== false);
    setStatus(`Turbo: ${nextTurbo ? 'On' : 'Off'}`);
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

  // Per-link remove
  linkList.addEventListener('click', async (e) => {
    const btn = e.target.closest('.link-remove');
    if (!btn) return;
    state = await loadState();
    const name = state.selectedDir;
    const url = btn.dataset.url;
    const list = state.dirs[name] || [];
    const idx = list.indexOf(url);
    if (idx > -1) list.splice(idx, 1);
    await set({ dirs: state.dirs });
    state = await loadState();
    render(state);
    setStatus('Removed');
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
      // Deduplicate on storage changes too
      const cleanedDirs = deduplicateLinks(state.dirs);
      if (JSON.stringify(cleanedDirs) !== JSON.stringify(state.dirs)) {
        await set({ dirs: cleanedDirs });
        state.dirs = cleanedDirs;
      }
      render(state);
    }
    if (changes.turbo || changes.altCapture) {
      const { turbo, altCapture } = await get(['turbo', 'altCapture']);
      updateCaptureToggles(!!turbo, altCapture !== false);
    }
    if (changes.theme) {
      setTheme(changes.theme.newValue, false);
    }
  });

});
