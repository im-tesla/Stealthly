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
  // Determine icon path based on environment
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'icons', 'icon.ico')
    : path.join(__dirname, '..', '..', 'icons', 'icon.ico');

  const win = new BrowserWindow({
    width: 1300,
    height: 900,
    minWidth: 1300,
    minHeight: 900,
    resizable: true,
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
    icon: iconPath,
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
