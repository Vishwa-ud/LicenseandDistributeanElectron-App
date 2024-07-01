const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
  // Fetch and display the license key when the page loads
  ipcRenderer.send('READ_LICENSE_KEY');

  ipcRenderer.on('LICENSE_KEY', (event, licenseKey) => {
    const editKeyInput = document.getElementById('edit-key');
    editKeyInput.value = licenseKey || '';
    document.getElementById('license-key-display').textContent = licenseKey ? `Current License Key: ${licenseKey}` : 'No license key found.';
  });

  // Update license key form submission handling
  document.getElementById('edit-license-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const key = document.getElementById('edit-key').value;
    ipcRenderer.send('EDIT_LICENSE_KEY', { key });
  });

  // Remove license key button handling
  document.getElementById('remove-license').addEventListener('click', () => {
    ipcRenderer.send('REMOVE_LICENSE_KEY');
  });

  // Handling messages after actions
  ipcRenderer.on('LICENSE_KEY_UPDATED', () => {
    document.getElementById('message').textContent = 'License key updated successfully.';
    // Re-fetch and display the updated license key after update
    ipcRenderer.send('READ_LICENSE_KEY');
  });

  ipcRenderer.on('LICENSE_KEY_REMOVED', () => {
    document.getElementById('message').textContent = 'License key removed successfully.';
    document.getElementById('license-key-display').textContent = 'No license key found.';
    document.getElementById('edit-key').value = ''; // Clear the input field after removal
  });

  ipcRenderer.on('INVALID_KEY', () => {
    document.getElementById('message').textContent = 'Please enter a valid license key.';
  });
});
