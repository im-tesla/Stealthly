const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { registerIpcHandlers } = require('./ipcHandlers');
const { initDatabase } = require('./database');

if (!app.isPackaged) {
  try {
    require('electron-reloader')(module, {
      debug: true,
      watchRenderer: true
    });
  } catch {}
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 768,
    autoHideMenuBar: true,
    menuBarVisible: false,
    frame: true,
    titleBarOverlay: {
      color: '#000000',
      symbolColor: '#ffffff',
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '../../icons/favicon.ico'),
  });

  win.loadFile(path.join(__dirname, '../../dist/index.html'));
  if (!app.isPackaged) win.webContents.openDevTools();
}

app.whenReady().then(() => {
  initDatabase();
  registerIpcHandlers(ipcMain);
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
