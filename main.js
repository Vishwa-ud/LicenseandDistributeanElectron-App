const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fetch = require('node-fetch');
const { autoUpdater } = require('electron-updater');

const isDev = process.env.NODE_ENV === 'development';

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
      nodeIntegration: true, // Enable Node.js integration
      contextIsolation: false, // Disable context isolation for easier integration
      preload: path.join(__dirname, 'gate.js'),
      devTools: isDev, // Enable dev tools based on the environment
    },
  });

  gateWindow.loadFile('gate.html');

  if (isDev) {
    gateWindow.webContents.openDevTools(); // Open dev tools in detached mode
  }

  ipcMain.on('GATE_SUBMIT', async (event, { key }) => {
    const code = await validateLicenseKey(key);

    switch (code) {
      case 'VALID':
      case 'EXPIRED':
        gateWindow.close();
        createWindow(key);
        break;
      default:
        event.reply('INVALID_KEY'); // Send a message back to the renderer process indicating an invalid key
        break;
    }
  });
}

function createWindow(key) {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      devTools: isDev, // Enable dev tools based on the environment
    },
  });

  mainWindow.loadFile('index.html');

  if (isDev) {
    mainWindow.webContents.openDevTools(); // Open dev tools in detached mode
  }

  if (!isDev) {
    autoUpdater.addAuthHeader(`License ${key}`);
    autoUpdater.checkForUpdatesAndNotify();
    setInterval(autoUpdater.checkForUpdatesAndNotify, 1000 * 60 * 60 * 3); // Check for updates every 3 hours
  }
}

app.whenReady().then(() => gateCreateWindowWithLicense(createWindow));

app.on('window-all-closed', () => app.quit());
