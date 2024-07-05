const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
  // Fetch and display the license key when the page loads
  ipcRenderer.send('READ_LICENSE_KEY');

  ipcRenderer.on('LICENSE_KEY', (event, licenseKey) => {
    const editKeyInput = document.getElementById('edit-key');
    const licenseKeyDisplay = document.getElementById('license-key-display');
    if (editKeyInput && licenseKeyDisplay) {
      editKeyInput.value = licenseKey || '';
      licenseKeyDisplay.textContent = licenseKey ? `Current License Key: ${licenseKey}` : 'No license key found.';
    }
  });

  // Update license key form submission handling
  const editLicenseForm = document.getElementById('edit-license-form');
  if (editLicenseForm) {
    editLicenseForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const key = document.getElementById('edit-key').value;
      ipcRenderer.send('EDIT_LICENSE_KEY', { key });
    });
  }

  // Remove license key button handling
  const removeLicenseButton = document.getElementById('remove-license');
  if (removeLicenseButton) {
    removeLicenseButton.addEventListener('click', () => {
      ipcRenderer.send('REMOVE_LICENSE_KEY');
    });
  }

  // Handling messages after actions
  ipcRenderer.on('LICENSE_KEY_UPDATED', () => {
    const messageDiv = document.getElementById('message');
    if (messageDiv) {
      messageDiv.textContent = 'License key updated successfully.';
    }
    // Re-fetch and display the updated license key after update
    ipcRenderer.send('READ_LICENSE_KEY');
  });

  ipcRenderer.on('LICENSE_KEY_REMOVED', () => {
    const messageDiv = document.getElementById('message');
    const licenseKeyDisplay = document.getElementById('license-key-display');
    const editKeyInput = document.getElementById('edit-key');
    if (messageDiv) {
      messageDiv.textContent = 'License key removed successfully.';
    }
    if (licenseKeyDisplay) {
      licenseKeyDisplay.textContent = 'No license key found.';
    }
    if (editKeyInput) {
      editKeyInput.value = ''; // Clear the input field after removal
    }
  });

  ipcRenderer.on('INVALID_KEY', () => {
    const messageDiv = document.getElementById('message');
    if (messageDiv) {
      messageDiv.textContent = 'Please enter a valid license key.';
    }
  });
});
