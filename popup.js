document.addEventListener('DOMContentLoaded', function() {
  const selectLinksButton = document.getElementById('selectLinks');
  const linkList = document.getElementById('linkList');

  selectLinksButton.addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { action: 'selectLinks' }, (response) => {
      if (response && response.links) {
        linkList.innerHTML = '';
        response.links.forEach(link => {
          const li = document.createElement('li');
          li.textContent = link;
          linkList.appendChild(li);
        });
      }
    });
  });
});