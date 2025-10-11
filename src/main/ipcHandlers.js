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
  exportAllData,
  importAllData,
  getRecentActivity,
} = require('./database');

const browserManager = require('./browserManager');

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

  // ========== BROWSER LAUNCHING ==========
  ipcMain.handle('profiles:launch', async (event, profileId) => {
    try {
      const profile = getProfile(profileId);
      if (!profile) {
        return { success: false, message: 'Profile not found' };
      }

      // Get proxy if configured
      let proxy = null;
      if (profile.proxyId) {
        proxy = getProxy(profile.proxyId);
      }

      // Launch browser
      const result = await browserManager.launchProfile(profile, proxy);
      
      // Update profile status
      if (result.success) {
        updateProfile(profileId, { status: 'active' });
      }

      return result;
    } catch (error) {
      console.error('Error in profiles:launch:', error);
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle('profiles:close', async (event, profileId) => {
    try {
      const result = await browserManager.closeProfile(profileId);
      
      // Update profile status
      if (result.success) {
        updateProfile(profileId, { status: 'inactive' });
      }

      return result;
    } catch (error) {
      console.error('Error in profiles:close:', error);
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle('profiles:getActiveSessions', async () => {
    return browserManager.getActiveSessions();
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

  // ========== IMPORT/EXPORT ==========
  ipcMain.handle('data:export', async () => {
    return exportAllData();
  });

  ipcMain.handle('data:import', async (event, importData) => {
    return importAllData(importData);
  });

  // ========== ACTIVITY ==========
  ipcMain.handle('activity:getRecent', async (event, limit) => {
    return getRecentActivity(limit);
  });
}

module.exports = { registerIpcHandlers };