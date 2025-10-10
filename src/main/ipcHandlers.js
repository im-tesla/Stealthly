const {
  getAllProfiles,
  getProfile,
  createProfile,
  updateProfile,
  deleteProfile,
  clearProfileCookies,
  getAllProxies,
  getProxy,
  createProxy,
  updateProxy,
  deleteProxy,
  getSettings,
  updateSettings,
} = require('./database');

function registerIpcHandlers(ipcMain) {
  // ========== PROFILES ==========
  ipcMain.handle('profiles:getAll', async () => {
    return getAllProfiles();
  });

  ipcMain.handle('profiles:get', async (event, id) => {
    return getProfile(id);
  });

  ipcMain.handle('profiles:create', async (event, profileData) => {
    return createProfile(profileData);
  });

  ipcMain.handle('profiles:update', async (event, id, updates) => {
    return updateProfile(id, updates);
  });

  ipcMain.handle('profiles:delete', async (event, id) => {
    return deleteProfile(id);
  });

  ipcMain.handle('profiles:clearCookies', async (event, id) => {
    return clearProfileCookies(id);
  });

  // ========== PROXIES ==========
  ipcMain.handle('proxies:getAll', async () => {
    return getAllProxies();
  });

  ipcMain.handle('proxies:get', async (event, id) => {
    return getProxy(id);
  });

  ipcMain.handle('proxies:create', async (event, proxyData) => {
    return createProxy(proxyData);
  });

  ipcMain.handle('proxies:update', async (event, id, updates) => {
    return updateProxy(id, updates);
  });

  ipcMain.handle('proxies:delete', async (event, id) => {
    return deleteProxy(id);
  });

  // ========== SETTINGS ==========
  ipcMain.handle('settings:get', async () => {
    return getSettings();
  });

  ipcMain.handle('settings:update', async (event, settings) => {
    return updateSettings(settings);
  });
}

module.exports = { registerIpcHandlers };
