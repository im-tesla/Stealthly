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
  getAllExtensions,
  getExtension,
  createExtension,
  updateExtension,
  deleteExtension,
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
    try {
      // Check if browser is active for this profile
      if (browserManager.isProfileActive(id)) {
        // Close the browser first
        await browserManager.closeProfile(id);
        // Wait a bit for the browser to fully close
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Clear the profile data
      return clearProfileCookies(id);
    } catch (error) {
      console.error('Error clearing cookies:', error);
      return { success: false, message: error.message };
    }
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

      // Get all enabled extensions
      const allExtensions = getAllExtensions();
      const enabledExtensions = allExtensions.filter(ext => ext.enabled);

      // Launch browser with profile, proxy, and extensions
      const result = await browserManager.launchProfile(profile, proxy, enabledExtensions);
      
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

  ipcMain.handle('proxies:check', async (event, proxy) => {
    const net = require('net');
    
    return new Promise((resolve) => {
      const timeout = 5000; // 5 second timeout
      const socket = new net.Socket();
      
      const timer = setTimeout(() => {
        socket.destroy();
        resolve({ success: false, status: 'timeout' });
      }, timeout);
      
      socket.on('connect', () => {
        clearTimeout(timer);
        socket.destroy();
        resolve({ success: true, status: 'active' });
      });
      
      socket.on('error', (err) => {
        clearTimeout(timer);
        socket.destroy();
        resolve({ success: false, status: 'error', error: err.message });
      });
      
      socket.connect(parseInt(proxy.port), proxy.host);
    });
  });

  // ========== EXTENSIONS ==========
  ipcMain.handle('extensions:getAll', async () => {
    return getAllExtensions();
  });

  ipcMain.handle('extensions:get', async (event, id) => {
    return getExtension(id);
  });

  ipcMain.handle('extensions:create', async (event, extensionData) => {
    return createExtension(extensionData);
  });

  ipcMain.handle('extensions:readManifest', async (event, extensionPath) => {
    try {
      const path = require('path');
      const manifestPath = path.join(extensionPath, 'manifest.json');
      const fs = require('fs');
      
      if (!fs.existsSync(manifestPath)) {
        return { success: false, error: 'manifest.json not found in the selected folder' };
      }

      const manifestContent = fs.readFileSync(manifestPath, 'utf8');
      const manifest = JSON.parse(manifestContent);
      
      // Find the best icon (prefer largest size)
      let iconPath = null;
      if (manifest.icons) {
        const iconSizes = Object.keys(manifest.icons).map(Number).sort((a, b) => b - a);
        const largestIconSize = iconSizes[0];
        if (largestIconSize) {
          const iconFile = manifest.icons[largestIconSize];
          const fullIconPath = path.join(extensionPath, iconFile);
          
          // Convert icon to base64 data URL
          if (fs.existsSync(fullIconPath)) {
            const iconBuffer = fs.readFileSync(fullIconPath);
            const iconExt = path.extname(iconFile).toLowerCase();
            const mimeType = iconExt === '.png' ? 'image/png' : iconExt === '.jpg' || iconExt === '.jpeg' ? 'image/jpeg' : 'image/png';
            iconPath = `data:${mimeType};base64,${iconBuffer.toString('base64')}`;
          }
        }
      }
      
      // Extract relevant info
      return {
        success: true,
        name: manifest.name || 'Unknown Extension',
        version: manifest.version || '1.0',
        description: manifest.description || '',
        manifestVersion: manifest.manifest_version,
        icons: manifest.icons || null,
        iconDataUrl: iconPath,
      };
    } catch (error) {
      console.error('Error reading manifest:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('extensions:update', async (event, id, updates) => {
    return updateExtension(id, updates);
  });

  ipcMain.handle('extensions:delete', async (event, id) => {
    return deleteExtension(id);
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

  // ========== APP INFO ==========
  ipcMain.handle('app:getVersion', async () => {
    const packageJson = require('../../package.json');
    return packageJson.version;
  });
}

module.exports = { registerIpcHandlers };