chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'selectLinks') {
    const links = Array.from(document.querySelectorAll('a[href]')).map(link => link.href);
    sendResponse({ links: links });
  }
});