// options.js
// Handles the options page UI for managing whitelist and additional scripts

let whitelist = [];
let additionalScripts = new Set();

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  setupEventListeners();
});

async function loadSettings() {
  const result = await browser.storage.local.get(['whitelist', 'additionalScripts']);
  whitelist = result.whitelist || [];
  additionalScripts = new Set(result.additionalScripts || []);
  renderWhitelist();
  renderAdditionalScripts();
}

function renderWhitelist() {
  const container = document.getElementById('whitelist');
  container.innerHTML = '';

  if (whitelist.length === 0) {
    container.innerHTML = '<p>No whitelisted domains.</p>';
    return;
  }

  whitelist.forEach(domain => {
    const item = document.createElement('div');
    item.className = 'whitelist-item';
    item.innerHTML = `
      <span>${domain}</span>
      <button class="remove-btn" data-domain="${domain}">Remove</button>
    `;
    container.appendChild(item);
  });

  // Add event listeners to remove buttons
  document.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const domain = e.target.dataset.domain;
      removeFromWhitelist(domain);
    });
  });
}

function renderAdditionalScripts() {
  const container = document.getElementById('additional-scripts');
  container.innerHTML = '';

  if (additionalScripts.size === 0) {
    container.innerHTML = '<p>No additional scripts.</p>';
    return;
  }

  additionalScripts.forEach(script => {
    const tag = document.createElement('span');
    tag.className = 'script-tag';
    tag.innerHTML = `${script} <span class="remove" data-script="${script}">×</span>`;
    container.appendChild(tag);
  });

  // Add event listeners to remove script tags
  document.querySelectorAll('.script-tag .remove').forEach(span => {
    span.addEventListener('click', (e) => {
      const script = e.target.dataset.script;
      removeAdditionalScript(script);
    });
  });
}

async function removeFromWhitelist(domain) {
  whitelist = whitelist.filter(d => d !== domain);
  await browser.storage.local.set({ whitelist });
  renderWhitelist();
}

async function removeAdditionalScript(script) {
  additionalScripts.delete(script);
  await browser.storage.local.set({ additionalScripts: Array.from(additionalScripts) });
  renderAdditionalScripts();
}

function setupEventListeners() {
  document.getElementById('add-script-btn').addEventListener('click', () => {
    const select = document.getElementById('language-select');
    const locale = select.value;
    if (locale) {
      const scripts = getScriptsForLocale(locale);
      scripts.forEach(script => additionalScripts.add(script));
      browser.storage.local.set({ additionalScripts: Array.from(additionalScripts) });
      renderAdditionalScripts();
      select.value = '';
    }
  });
}