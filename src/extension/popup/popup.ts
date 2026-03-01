const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;
const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
const statusEl = document.getElementById('status') as HTMLDivElement;

function showStatus(connected: boolean) {
  statusEl.innerHTML = connected
    ? '<div class="status connected"><span class="dot green"></span>API ключ сохранён</div>'
    : '<div class="status disconnected"><span class="dot red"></span>API ключ не задан</div>';
}

chrome.storage.local.get(['geminiApiKey'], (result: Record<string, string>) => {
  if (result.geminiApiKey) {
    apiKeyInput.value = result.geminiApiKey as string;
    showStatus(true);
  } else {
    showStatus(false);
  }
  saveBtn.disabled = false;
});

apiKeyInput.addEventListener('input', () => {
  saveBtn.disabled = false;
});

saveBtn.addEventListener('click', () => {
  const key = apiKeyInput.value.trim();
  if (!key) {
    chrome.storage.local.remove('geminiApiKey', () => showStatus(false));
    return;
  }
  chrome.storage.local.set({ geminiApiKey: key }, () => {
    showStatus(true);
    saveBtn.textContent = 'Сохранено ✓';
    setTimeout(() => { saveBtn.textContent = 'Сохранить'; }, 1500);
  });
});
