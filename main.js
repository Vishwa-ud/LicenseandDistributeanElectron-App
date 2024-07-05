require('dotenv').config();
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const { autoUpdater } = require('electron-updater');
const CryptoJS = require('crypto-js');

const isDev = process.env.NODE_ENV === 'development';
const configPath = path.join(__dirname, 'config.json');
const secretKey = process.env.SECRET_KEY;

if (!secretKey) {
  console.error('SECRET_KEY is not defined in the environment variables.');
  app.quit();
}

async function validateLicenseKey(key) {
  const validation = await fetch('https://api.keygen.sh/v1/accounts/18cbcbe1-3adf-4ef9-aac7-c310eca49517/licenses/actions/validate-key', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'accept': 'application/json',
    },
    body: JSON.stringify({
      meta: { key },
    }),
  });

  const { meta, errors } = await validation.json();
  if (errors) {
    return null;
  }

  return meta.code;
}

function encryptLicenseKey(key) {
  if (!secretKey) {
    throw new Error('Secret key is not defined.');
  }
  return CryptoJS.AES.encrypt(key, secretKey).toString();
}

function decryptLicenseKey(encryptedKey) {
  if (!secretKey) {
    throw new Error('Secret key is not defined.');
  }
  const bytes = CryptoJS.AES.decrypt(encryptedKey, secretKey);
  return bytes.toString(CryptoJS.enc.Utf8);
}

async function gateCreateWindowWithLicense(createWindow) {
  const gateWindow = new BrowserWindow({
    resizable: false,
    frame: false,
    width: 800,
    height: 500,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'gate.js'),
      devTools: isDev,
    },
  });

  gateWindow.loadFile('gate.html');

  if (isDev) {
    gateWindow.webContents.openDevTools();
  }

  ipcMain.on('GATE_SUBMIT', async (event, { key }) => {
    const code = await validateLicenseKey(key);

    switch (code) {
      case 'VALID':
      case 'EXPIRED':
        gateWindow.close();
        const encryptedKey = encryptLicenseKey(key);
        saveLicenseKey(encryptedKey); // Save encrypted license key to config.json
        createWindow(key);
        break;
      default:
        event.reply('INVALID_KEY');
        break;
    }
  });
}

function createWindow(key) {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      devTools: isDev,
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile('index.html');

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  if (!isDev) {
    autoUpdater.addAuthHeader(`License ${key}`);
    autoUpdater.checkForUpdatesAndNotify();
    setInterval(autoUpdater.checkForUpdatesAndNotify, 1000 * 60 * 60 * 3); // Check for updates every 3 hours
  }
}

// Function to save encrypted license key to config.json
function saveLicenseKey(encryptedKey) {
  const config = { licenseKey: encryptedKey };
  fs.writeFileSync(configPath, JSON.stringify(config));
}

// Function to read and decrypt license key from config.json
function readLicenseKey() {
  try {
    const data = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(data);
    if (config.licenseKey) {
      return decryptLicenseKey(config.licenseKey);
    } else {
      return null; // Return null if licenseKey is missing or undefined
    }
  } catch (err) {
    return null; // Return null if config.json doesn't exist or cannot be read
  }
}

// IPC handlers for reading, editing, and removing the license key
ipcMain.on('READ_LICENSE_KEY', (event) => {
  const licenseKey = readLicenseKey();
  event.reply('LICENSE_KEY', licenseKey);
});

ipcMain.on('EDIT_LICENSE_KEY', (event, { key }) => {
  const encryptedKey = encryptLicenseKey(key);
  saveLicenseKey(encryptedKey);
  event.reply('LICENSE_KEY_UPDATED');
});

ipcMain.on('REMOVE_LICENSE_KEY', (event) => {
  fs.writeFileSync(configPath, JSON.stringify({}));
  event.reply('LICENSE_KEY_REMOVED');
});

// App initialization
app.whenReady().then(() => {
  const savedLicenseKey = readLicenseKey();
  if (savedLicenseKey) {
    // Validate saved license key on app start
    validateLicenseKey(savedLicenseKey).then(code => {
      switch (code) {
        case 'VALID':
        case 'EXPIRED':
          createWindow(savedLicenseKey);
          break;
        default:
          gateCreateWindowWithLicense(createWindow);
          break;
      }
    });
  } else {
    gateCreateWindowWithLicense(createWindow);
  }
});

app.on('window-all-closed', () => app.quit());
