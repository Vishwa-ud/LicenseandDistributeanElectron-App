const { ipcRenderer } = require('electron');

window.addEventListener('DOMContentLoaded', () => {
  const gate = document.getElementById('license-gate');
  const errorMessage = document.getElementById('error-message');

  gate.addEventListener('submit', async event => {
    event.preventDefault();

    const data = new FormData(gate);
    const key = data.get('key');

    ipcRenderer.send('GATE_SUBMIT', { key });
  });

  ipcRenderer.on('INVALID_KEY', () => {
    errorMessage.textContent = 'Please enter a valid license key.';
    errorMessage.style.display = 'block';
  });
});
