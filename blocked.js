// blocked.js
// Handles the blocked page UI and whitelist functionality

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const blockedUrl = urlParams.get('url');
  const offendingChar = urlParams.get('char');
  const script = urlParams.get('script');

  // Display blocked URL
  document.getElementById('blocked-url').textContent = blockedUrl || 'Unknown';

  // Display offending character details
  if (offendingChar) {
    document.getElementById('offending-char').textContent = offendingChar;
    document.getElementById('codepoint').textContent = `U+${offendingChar.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`;
    document.getElementById('script').textContent = script || 'Unknown';
  }

  // Allow button
  document.getElementById('allow-btn').addEventListener('click', async () => {
    if (blockedUrl) {
      const hostname = decodeHostname(blockedUrl);
      if (hostname) {
        // Add to whitelist
        const result = await browser.storage.local.get('whitelist');
        const whitelist = new Set(result.whitelist || []);
        whitelist.add(hostname);
        await browser.storage.local.set({ whitelist: Array.from(whitelist) });

        // Redirect to original URL
        window.location.href = blockedUrl;
      }
    }
  });

  // Back button
  document.getElementById('back-btn').addEventListener('click', () => {
    window.history.back();
  });
});