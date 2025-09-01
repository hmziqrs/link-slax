# Link Selector (Chrome Extension)

Collect links with Alt/Option-click, organize them into directories, and export in multiple formats.

## Features
- Alt/Option-click on any link to prevent navigation and save it to the selected directory.
- Visual feedback: purple outline on captured links.
- Directory management in popup: default directory + create new directories.
- Export formats: newline-separated, comma-separated, JSON array.
- Persists using `chrome.storage.local`.

## Repository Structure
- `manifest.json` — Extension manifest (MV3) with `activeTab` and `storage` permissions.
- `content.js` — In-page logic: Alt/Option-click capture, highlight, save to storage.
- `popup.html` — Popup UI for directory selection/creation and export controls.
- `popup.js` — Popup logic: rendering, storage sync, export actions.
- `plan.md` — Implementation plan and status.

## Requirements
- Google Chrome 88+ (Manifest V3 support)
- macOS/Windows/Linux

---

## Development / Debugging

### 1) Load the extension unpacked
1. Build step: none (plain JS/HTML/CSS). Ensure the following files exist in the project root:
   - `manifest.json`
   - `content.js`
   - `popup.html`
   - `popup.js`
2. Open Chrome → navigate to `chrome://extensions`.
3. Toggle on "Developer mode" (top-right).
4. Click "Load unpacked" and select the repository root directory.

Tip: After you edit files, click the reload icon on the extension card to pick up changes.

### 2) Test the core behavior
- Open any webpage with links.
- Hold Alt/Option and click a link.
  - Expected: Navigation is blocked, the link gets a purple outline, and the URL is saved.
- Open the extension popup (toolbar icon).
  - Select a directory or create one.
  - Click "Copy" for newline-separated export, or use the ⋮ menu for comma-separated or JSON array. Verify clipboard contents.

### 3) Debugging tools and tips
- __Extension errors__: `chrome://extensions` → enable "Errors" on the extension → view logs.
- __Content script logs__: Right-click the page → Inspect → Console.
- __Popup logs__: Open popup → Right-click inside popup → Inspect.
- __Storage state__: In the devtools console, inspect with `chrome.storage.local.get(null, console.log)`.
- __Reset storage__: Run `chrome.storage.local.clear()` from the page or popup devtools console.
- __Permissions__: Confirm `activeTab` and `storage` appear on the extension card and `manifest.json` is MV3.
- __Reloading__: After modifying files, reload the extension and refresh the target page.

### 4) Common gotchas
- Some sites intercept clicks aggressively; the content script uses capturing phase to improve reliability, but occasionally other site behaviors can still interfere.
- Links with unusual `href` values (e.g., `javascript:`) may resolve in unexpected ways; these are saved by their resolved `a.href`.
- Clipboard operations require a user gesture; the popup buttons satisfy this.

---

## Production Release (Packaging)

No build system is required. Prepare a clean ZIP of the extension files.

### 1) Update version
- Edit `manifest.json` and bump the `version` field (e.g., `1.0.1`).

### 2) Prepare files for packaging
Include only what the extension needs:
- `manifest.json`
- `content.js`
- `popup.html`
- `popup.js`
- Any icons if you add them (recommended for store listing and toolbar)

Exclude development files:
- `.git/`, `.github/`
- `README.md`, `plan.md` (optional for store, not required in package)
- Anything not referenced by the manifest

### 3) Create the ZIP archive
- On macOS/Linux: create a zip of the selected files at the repository root:
  - Select the files/folders and compress, or run a zip command ensuring paths are correct.
- Ensure the ZIP contains files at the root (not nested inside an extra folder).

### 4) Local validation
- In `chrome://extensions`, click "Pack extension" (optional) or test by removing your unpacked extension and using "Load unpacked" with a copy of the packaged set to ensure no missing files.

---

## Chrome Web Store Upload

### 1) Developer account
- Sign up at the Chrome Web Store Developer Dashboard and pay the one-time registration fee if not already done.

### 2) Create a new item
- Go to the Developer Dashboard → "Items" → "New Item".
- Upload your packaged ZIP.

### 3) Fill out store listing
- __Title__ and __Short description__.
- __Detailed description__: explain Alt/Option-click link capture, directories, and export options.
- __Screenshots__: At least one required; include popup screenshots and in-page purple border.
- __Promotional assets__: Optional but recommended.
- __Category__/__Language__ as appropriate.
- __Privacy__: Declare how you use `chrome.storage.local`; clarify that data stays on the device unless exported manually by the user.
- __Permissions__: `activeTab`, `storage` (aligns with `manifest.json`).

### 4) Policy & declarations
- Complete required declarations (data usage, permissions, privacy policy if applicable).
- Ensure the extension adheres to the Chrome Web Store policies (no prohibited behaviors, transparent functionality).

### 5) Submit for review
- Click "Submit for review".
- Reviews can take from hours to several days. Monitor status in the dashboard.

### 6) Post-approval
- The item will be available at a public URL. Share the link or set visibility to "Unlisted" if you prefer controlled distribution.

### 7) Publishing updates
- Increment the `version` in `manifest.json`.
- Rebuild the ZIP with updated files.
- Upload as a new package to the same item and submit for review.

---

## Troubleshooting
- __"Manifest is invalid"__ → Validate JSON and ensure `manifest_version` is `3`.
- __"Unrecognized permissions"__ → Verify `activeTab`/`storage` are spelled correctly and supported in MV3.
- __Nothing saves__ → Check content script is loaded on page (console logs) and that `chrome.storage.local` calls succeed; confirm permission exists.
- __No purple border__ → Confirm Alt/Option key press was detected and that the style tag is injected; inspect the link element for `.link-selector-selected`.
- __Clipboard failed__ → Ensure the action was triggered by a user gesture (button click) and the page isn't blocking clipboard access.

---

## Roadmap (Optional)
- Add icons and better visual styling.
- Directory management: rename/delete directories, remove individual links.
- Import/export all directories to/from a JSON file for backup.
- Highlight all saved links on the current page from the popup.
