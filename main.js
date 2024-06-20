const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const { autoUpdater } = require('electron-updater');

const isDev = process.env.NODE_ENV === 'development';
const configPath = path.join(__dirname, 'config.json');

async function validateLicenseKey(key) {
  const validation = await fetch('https://api.keygen.sh/v1/accounts/6e1546e6-e5c9-475a-86ad-5e748c6a3b31/licenses/actions/validate-key', {
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

async function gateCreateWindowWithLicense(createWindow) {
  const gateWindow = new BrowserWindow({
    resizable: false,
    frame: false,
    width: 420,
    height: 200,
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
        saveLicenseKey(key); // Save valid license key to config.json
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

// Function to save license key to config.json
function saveLicenseKey(key) {
  const config = { licenseKey: key };
  fs.writeFileSync(configPath, JSON.stringify(config));
}

// Function to read license key from config.json
function readLicenseKey() {
  try {
    const data = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(data);
    return config.licenseKey || null; // Return null if licenseKey is missing or undefined
  } catch (err) {
    return null; // Return null if config.json doesn't exist or cannot be read
  }
}

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
