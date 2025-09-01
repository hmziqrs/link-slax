# Plan: Alt/Option-Click Link Collector + Directory Management + Export

## Goals
- __Alt/Option-click on a link__: prevent navigation and add the link URL to the currently selected directory.
- __Purple border__ on selected links in-page so the user sees what was captured.
- __Directory system__: one default dir named `default`. User can create additional directories.
- __Exports__: quick copy (newline-separated) and more options via a kebab menu: JSON array and comma-separated.
- __Persistence__: chrome.storage.local maintains all dirs and the selected dir.

## Current State (repo)
- `manifest.json` — MV3 with permissions: `activeTab`, `storage`; action popup set to `popup.html`; content script `content.js` on `<all_urls>`.
- `content.js` — includes Alt/Option-click capture that prevents navigation, adds purple border, and saves the link to the selected directory (deduped). Keeps the legacy `selectLinks` responder.
- `popup.html` / `popup.js` — directory selector and creation UI; export button (newline) and kebab menu with JSON/CSV/newline; persists to `chrome.storage.local` and reacts to storage changes.

## High-Level Behavior
- __In-page__: User holds Alt/Option and clicks a link. We stop the default open, add purple border, save URL into selected directory (deduped).
- __Popup__: User manages directories (select current, create new). Export button copies newline-separated. Kebab menu offers JSON array and comma-separated formats.
- __Default directory__: If storage is empty, initialize `{ default: [] }` and set `selectedDir = 'default'`.

## Permissions
Status: storage permission has been added to `manifest.json`.
Update `manifest.json` to include `storage` permission (already applied):
```json
{
  "manifest_version": 3,
  "name": "Link Selector",
  "version": "1.0",
  "description": "A Chrome extension to select and manage links on web pages.",
  "permissions": [
    "activeTab",
    "storage"
  ],
  {{ ... }}
}
```

## Data Model (chrome.storage.local)
- Key: `dirs`: object map of directoryName -> array of link URLs
- Key: `selectedDir`: string

Example:
```json
{
  "dirs": {
    "default": ["https://example.com/article", "https://news.site/story"]
  },
  "selectedDir": "default"
}
```

Initialization rule: if either `dirs` or `selectedDir` missing, set to the default values.

## User Flows
- __Add link__: Alt/Option-click a link → prevent navigation → style with purple border → save URL to `dirs[selectedDir]` (dedupe) → persist.
- __Create directory__: In popup, user types a name → click Add → create empty array if not existing → set `selectedDir` to new dir → persist.
- __Switch directory__: Select from dropdown → update `selectedDir` in storage.
- __Export__: Click export icon to copy newline-separated. Kebab menu opens more choices: JSON array and comma-separated.

## Implementation Status
- [x] Add `storage` permission to `manifest.json`.
- [x] Initialize storage schema (`dirs`, `selectedDir`) with default directory.
- [x] Content script: Alt/Option-click handler (prevent open, purple border, save link, dedupe).
- [x] Popup UI: directory selector and creation controls.
- [x] Popup exports: newline, comma-separated, JSON array; clipboard copy with feedback.
- [x] React to `chrome.storage` changes to refresh popup state.
- [ ] QA pass across multiple sites; finalize polish.

## Implementation Steps
1) __Manifest__ (`manifest.json`)
   - Add `"storage"` to `permissions`.

2) __Content script__ (`content.js`)
   - Add a capturing `click` listener to intercept before page scripts: `document.addEventListener('click', handler, true)`.
   - In `handler(e)`:
     - If `!e.altKey`, return.
     - Find anchor: `const a = e.target.closest('a[href]')`; if none, return.
     - `e.preventDefault(); e.stopImmediatePropagation();`
     - Add CSS class (e.g., `link-selector-selected`) to `a` to show purple border.
     - Read `dirs` and `selectedDir` from storage (ensure initialized). Add `a.href` if not already present. Save back to storage.
   - Ensure a style tag is present once per page:
     ```css
     .link-selector-selected { outline: 2px solid purple; outline-offset: 2px; border-radius: 2px; }
     ```
   - Keep the existing `onMessage` listener for `selectLinks` (optional legacy feature).

3) __Popup UI__ (`popup.html`)
   - Replace current body with:
     - Title, current directory selector `<select id="dirSelect">`.
     - New directory input + button (`#newDirInput`, `#addDirBtn`).
     - Export row:
       - Export icon button (`#exportBtn`) → copies newline-separated links of the selected dir.
       - Kebab menu button (`#moreBtn`) → toggles a small menu (`#moreMenu`) with:
         - Export as JSON array
         - Export comma-separated
         - Export newline-separated (same as main button)
     - (Optional) Show a small link count for the selected dir.

4) __Popup logic__ (`popup.js`)
   - On `DOMContentLoaded`:
     - Ensure initialization if storage is empty.
     - Load `dirs` and `selectedDir` and render UI.
     - Wire listeners:
       - Change of `#dirSelect` → persist `selectedDir`.
       - Click `#addDirBtn` → add trimmed name if non-empty and not duplicate → set selected → persist and re-render.
       - Click `#exportBtn` → copy newline-separated.
       - Click kebab `#moreBtn` → toggle `#moreMenu`.
       - Click menu items → format links accordingly and copy.
   - Listen to `chrome.storage.onChanged` to refresh UI if storage changes externally (e.g., from content script adding links).
   - Formatters:
     - Newline: `links.join('\n')`
     - Comma: `links.join(', ')`
     - JSON array: `JSON.stringify(links, null, 2)`
   - Copy: `navigator.clipboard.writeText(text)`; show ephemeral feedback (e.g., small status text).

## Detailed Design Notes
- __Dedupe__: Before saving `href`, check `array.includes(href)`.
- __URL normalization__: Use `a.href` (absolute URL) rather than `a.getAttribute('href')`.
- __Event capture__: Use capturing phase to reliably intercept site handlers. Consider also `mousedown` if needed, but `click` is typically sufficient.
- __Styling__: Use a single injected `<style>` tag identified by id to avoid duplicates.
- __Initialization__: A utility `ensureInitialized()` used by both popup and content reads storage; if missing, sets `{ dirs: { default: [] }, selectedDir: 'default' }`.
- __Error handling__: Guard against storage failures and clipboard errors; show simple messages in popup.

## Example Snippets (for clarity)
- __Content click handler skeleton__:
```js
function ensureStyle() {
  const id = 'link-selector-style';
  if (!document.getElementById(id)) {
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `.link-selector-selected { outline: 2px solid purple; outline-offset: 2px; border-radius: 2px; }`;
    document.documentElement.appendChild(style);
  }
}

async function ensureInitialized() {
  const { dirs, selectedDir } = await chrome.storage.local.get(['dirs', 'selectedDir']);
  if (!dirs || !selectedDir) {
    await chrome.storage.local.set({ dirs: { default: [] }, selectedDir: 'default' });
    return { dirs: { default: [] }, selectedDir: 'default' };
  }
  return { dirs, selectedDir };
}

function onAltClick(e) {
  if (!e.altKey) return;
  const a = e.target && e.target.closest && e.target.closest('a[href]');
  if (!a) return;
  e.preventDefault();
  e.stopImmediatePropagation();
  ensureStyle();
  a.classList.add('link-selector-selected');
  chrome.storage.local.get(['dirs', 'selectedDir'], async (res) => {
    let { dirs, selectedDir } = res;
    if (!dirs || !selectedDir) ({ dirs, selectedDir } = await ensureInitialized());
    const href = a.href;
    const arr = dirs[selectedDir] || (dirs[selectedDir] = []);
    if (!arr.includes(href)) arr.push(href);
    chrome.storage.local.set({ dirs });
  });
}

document.addEventListener('click', onAltClick, true);
```

- __Popup export helpers__:
```js
function formatLinks(links, mode) {
  switch (mode) {
    case 'json': return JSON.stringify(links, null, 2);
    case 'comma': return links.join(', ');
    case 'newline':
    default: return links.join('\n');
  }
}
```

## Edge Cases & Considerations
- Alt/Option key varies by OS naming but maps to `event.altKey` consistently.
- Some sites stop propagation aggressively; capturing listener with `true` increases reliability.
- Links without `href` (or `javascript:`) will still be added using `a.href`, which resolves to current page for empty `href`; optionally skip those if desired.
- Duplicate dirs: prevent creation; surface a small error message.
- Popup clipboard requires user gesture; our button clicks satisfy that.

## Testing Plan
- __Alt-click__: Test on common sites (news, blogs, search results). Ensure navigation blocked and link saved + purple border.
- __Dedupe__: Alt-click same link twice → no duplicates.
- __Initialization__: Fresh install → default dir present and selected.
- __Directory management__: Create new dir; switch back and forth; persistence after popup close and browser restart.
- __Export__: Verify outputs for newline, comma, and JSON array; confirm clipboard contents.
- __Storage change propagation__: Alt-click adds link; open popup and see counts/exports updated (either immediately or on open).

## Milestones
- M1: Manifest + storage schema + initialization in popup. [Done]
- M2: Content script alt-click handler + purple border + save. [Done]
- M3: Popup UI: dir select + new dir. [Done]
- M4: Export button + kebab options. [Done]
- M5: QA + minor polish. [Pending]

## Future Enhancements (post-MVP)
- Rename/delete directories; delete individual links.
- Show the list of links for selected dir inside the popup with per-link remove/copy.
- Badge text with current dir initials.
- Option to highlight all saved links on the current page.
- Import/export all dirs to JSON file.
