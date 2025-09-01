chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'toggle-turbo') return;
  try {
    const { turbo } = await chrome.storage.local.get(['turbo']);
    const nextTurbo = !turbo;
    await chrome.storage.local.set({ turbo: nextTurbo });
    // Optional: show a short-lived badge to hint state change
    try {
      await chrome.action.setBadgeBackgroundColor({ color: '#8b5cf6' });
      await chrome.action.setBadgeText({ text: nextTurbo ? '⚡' : '' });
      if (!nextTurbo) {
        // clear after a short delay for visual feedback
        setTimeout(() => chrome.action.setBadgeText({ text: '' }), 1200);
      }
    } catch (_) {
      // ignore if action API unavailable or fails
    }
  } catch (e) {
    // swallow errors to avoid crashing the service worker
  }
});
