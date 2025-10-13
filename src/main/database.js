const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const crypto = require('crypto');

// Database file paths
const userDataPath = app.getPath('userData');
const profilesDbPath = path.join(userDataPath, 'profiles.json');
const proxiesDbPath = path.join(userDataPath, 'proxies.json');
const extensionsDbPath = path.join(userDataPath, 'extensions.json');
const settingsDbPath = path.join(userDataPath, 'settings.json');
const activityDbPath = path.join(userDataPath, 'activity.json');

// Encryption key (in production, this should be more secure)
const ENCRYPTION_KEY = crypto.scryptSync('stealthy-secret-key', 'salt', 32);
const IV_LENGTH = 16;

// Encrypt data
function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

// Decrypt data
function decrypt(text) {
  try {
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
}

// Initialize database files if they don't exist
function initDatabase() {
  if (!fs.existsSync(profilesDbPath)) {
    const encryptedProfiles = encrypt(JSON.stringify([]));
    fs.writeFileSync(profilesDbPath, JSON.stringify({ data: encryptedProfiles }, null, 2));
  }
  if (!fs.existsSync(proxiesDbPath)) {
    const encryptedProxies = encrypt(JSON.stringify([]));
    fs.writeFileSync(proxiesDbPath, JSON.stringify({ data: encryptedProxies }, null, 2));
  }
  if (!fs.existsSync(extensionsDbPath)) {
    const encryptedExtensions = encrypt(JSON.stringify([]));
    fs.writeFileSync(extensionsDbPath, JSON.stringify({ data: encryptedExtensions }, null, 2));
  }
  if (!fs.existsSync(settingsDbPath)) {
    const defaultSettings = {
      darkMode: true,
      autoLaunch: false,
      notifications: true,
      autoUpdate: true,
    };
    const encryptedSettings = encrypt(JSON.stringify(defaultSettings));
    fs.writeFileSync(settingsDbPath, JSON.stringify({ data: encryptedSettings }, null, 2));
  }
  if (!fs.existsSync(activityDbPath)) {
    const encryptedActivity = encrypt(JSON.stringify([]));
    fs.writeFileSync(activityDbPath, JSON.stringify({ data: encryptedActivity }, null, 2));
  }
}

// Read encrypted data from JSON file
function readData(filePath) {
  try {
    const fileData = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(fileData);
    
    // Check if data is encrypted (new format)
    if (parsed.data && typeof parsed.data === 'string') {
      const decryptedData = decrypt(parsed.data);
      return decryptedData ? JSON.parse(decryptedData) : [];
    }
    
    // Handle old unencrypted format (backward compatibility)
    if (Array.isArray(parsed)) {
      return parsed;
    }
    
    return [];
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return [];
  }
}

// Write encrypted data to JSON file
function writeData(filePath, data) {
  try {
    const encryptedData = encrypt(JSON.stringify(data));
    fs.writeFileSync(filePath, JSON.stringify({ data: encryptedData }, null, 2));
    return { success: true };
  } catch (error) {
    console.error(`Error writing to ${filePath}:`, error);
    return { success: false, error: error.message };
  }
}

// ========== PROFILES ==========

function getAllProfiles() {
  return readData(profilesDbPath);
}

function getProfile(id) {
  const profiles = readData(profilesDbPath);
  return profiles.find(p => p.id === id);
}

function createProfile(profileData) {
  const profiles = readData(profilesDbPath);
  const timestamp = Date.now();
  const newProfile = {
    id: timestamp,
    name: profileData.name,
    proxyId: profileData.proxyId || null,
    status: 'idle',
    createdAt: new Date().toISOString(),
    lastUsed: null,
    viewportSeed: timestamp, // Unique seed for viewport generation
    ...profileData
  };
  profiles.push(newProfile);
  const result = writeData(profilesDbPath, profiles);
  
  // Log activity
  if (result.success) {
    addActivity({
      type: 'profile_created',
      profileName: newProfile.name,
      details: `Profile "${newProfile.name}" created`
    });
  }
  
  return result.success ? newProfile : null;
}

function updateProfile(id, updates) {
  const profiles = readData(profilesDbPath);
  const index = profiles.findIndex(p => p.id === id);
  if (index === -1) return null;
  
  const oldProfile = profiles[index];
  profiles[index] = { ...profiles[index], ...updates, id };
  const result = writeData(profilesDbPath, profiles);
  
  // Log activity
  if (result.success) {
    addActivity({
      type: 'profile_edited',
      profileName: profiles[index].name,
      details: `Profile "${profiles[index].name}" updated`
    });
  }
  
  return result.success ? profiles[index] : null;
}

function deleteProfile(id) {
  const profiles = readData(profilesDbPath);
  const profile = profiles.find(p => p.id === id);
  const filtered = profiles.filter(p => p.id !== id);
  if (filtered.length === profiles.length) return { success: false, error: 'Profile not found' };
  
  // Delete profile from database
  const result = writeData(profilesDbPath, filtered);
  
  // Delete physical profile directory
  if (result.success) {
    try {
      const os = require('os');
      const profileDir = path.join(os.homedir(), '.stealthy', 'profiles', `profile_${id}`);
      
      if (fs.existsSync(profileDir)) {
        fs.rmSync(profileDir, { recursive: true, force: true });
        console.log(`✓ Deleted profile directory: ${profileDir}`);
      }
    } catch (error) {
      console.error(`Error deleting profile directory for profile ${id}:`, error);
      // Don't fail the whole operation if directory deletion fails
    }
  }
  
  // Log activity
  if (result.success && profile) {
    addActivity({
      type: 'profile_deleted',
      profileName: profile.name,
      details: `Profile "${profile.name}" deleted`
    });
  }
  
  return result;
}

function clearProfileCookies(id) {
  try {
    // Get profile directory path
    const os = require('os');
    const profileDir = path.join(os.homedir(), '.stealthy', 'profiles', `profile_${id}`);
    
    // Check if profile directory exists
    if (!fs.existsSync(profileDir)) {
      return { success: true, message: 'Profile data already clear' };
    }
    
    // Remove all files and subdirectories in profile directory
    // But keep the directory itself for next launch
    const files = fs.readdirSync(profileDir);
    
    for (const file of files) {
      const filePath = path.join(profileDir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        // Recursively delete directory
        fs.rmSync(filePath, { recursive: true, force: true });
      } else {
        // Delete file
        fs.unlinkSync(filePath);
      }
    }
    
    // Regenerate viewport seed so the profile gets a new viewport on next launch
    const profiles = readData(profilesDbPath);
    const profileIndex = profiles.findIndex(p => p.id === id);
    if (profileIndex !== -1) {
      profiles[profileIndex].viewportSeed = Date.now();
      writeData(profilesDbPath, profiles);
      console.log(`✓ Regenerated viewport seed for profile ${id}`);
    }
    
    console.log(`✓ Cleared all data for profile ${id}`);
    return { success: true, message: 'Profile data cleared successfully' };
  } catch (error) {
    console.error(`Error clearing data for profile ${id}:`, error);
    return { success: false, message: error.message || 'Failed to clear profile data' };
  }
}

function duplicateProfile(id, newProfileData) {
  const profiles = readData(profilesDbPath);
  const sourceProfile = profiles.find(p => p.id === id);
  
  if (!sourceProfile) {
    return { success: false, error: 'Source profile not found' };
  }
  
  // Create a new profile with data from source profile
  // NOTE: We do NOT copy the user directory - only the configuration
  const timestamp = Date.now();
  const duplicatedProfile = {
    id: timestamp,
    name: newProfileData.name,
    proxyId: newProfileData.proxyId !== undefined ? newProfileData.proxyId : sourceProfile.proxyId,
    startupUrl: newProfileData.startupUrl !== undefined ? newProfileData.startupUrl : sourceProfile.startupUrl,
    status: 'inactive',
    createdAt: new Date().toISOString(),
    lastUsed: null,
    viewportSeed: timestamp, // New unique viewport seed for duplicated profile
    // Copy any other custom properties from the source profile (except id, createdAt, lastUsed, status, viewportSeed)
    ...(Object.keys(sourceProfile).reduce((acc, key) => {
      if (!['id', 'name', 'proxyId', 'startupUrl', 'status', 'createdAt', 'lastUsed', 'viewportSeed'].includes(key)) {
        acc[key] = sourceProfile[key];
      }
      return acc;
    }, {}))
  };
  
  profiles.push(duplicatedProfile);
  const result = writeData(profilesDbPath, profiles);
  
  // Log activity
  if (result.success) {
    addActivity({
      type: 'profile_duplicated',
      profileName: duplicatedProfile.name,
      details: `Profile "${duplicatedProfile.name}" duplicated from "${sourceProfile.name}"`
    });
  }
  
  return result.success ? duplicatedProfile : null;
}

// ========== PROXIES ==========

function getAllProxies() {
  return readData(proxiesDbPath);
}

function getProxy(id) {
  const proxies = readData(proxiesDbPath);
  return proxies.find(p => p.id === id);
}

function createProxy(proxyData) {
  const proxies = readData(proxiesDbPath);
  const newProxy = {
    id: Date.now(),
    name: proxyData.name,
    host: proxyData.host,
    port: proxyData.port,
    type: proxyData.type || 'HTTP',
    username: proxyData.username || '',
    password: proxyData.password || '',
    status: 'inactive',
    createdAt: new Date().toISOString(),
    ...proxyData
  };
  proxies.push(newProxy);
  const result = writeData(proxiesDbPath, proxies);
  return result.success ? newProxy : null;
}

function updateProxy(id, updates) {
  const proxies = readData(proxiesDbPath);
  const index = proxies.findIndex(p => p.id === id);
  if (index === -1) return null;
  
  proxies[index] = { ...proxies[index], ...updates, id };
  const result = writeData(proxiesDbPath, proxies);
  return result.success ? proxies[index] : null;
}

function deleteProxy(id) {
  const proxies = readData(proxiesDbPath);
  const filtered = proxies.filter(p => p.id !== id);
  if (filtered.length === proxies.length) return { success: false, error: 'Proxy not found' };
  
  // Update all profiles using this proxy to have no proxy
  const profiles = readData(profilesDbPath);
  const updatedProfiles = profiles.map(profile => {
    if (profile.proxyId === id) {
      return { ...profile, proxyId: null };
    }
    return profile;
  });
  
  // Save updated profiles
  writeData(profilesDbPath, updatedProfiles);
  
  // Save updated proxies
  return writeData(proxiesDbPath, filtered);
}

// ========== EXTENSIONS ==========

function getAllExtensions() {
  return readData(extensionsDbPath);
}

function getExtension(id) {
  const extensions = readData(extensionsDbPath);
  return extensions.find(e => e.id === id);
}

function createExtension(extensionData) {
  const extensions = readData(extensionsDbPath);
  const newExtension = {
    id: Date.now(),
    name: extensionData.name,
    path: extensionData.path,
    description: extensionData.description || '',
    version: extensionData.version || '1.0',
    manifestVersion: extensionData.manifestVersion || null,
    icons: extensionData.icons || null,
    iconDataUrl: extensionData.iconDataUrl || null,
    enabled: true,
    createdAt: new Date().toISOString(),
    ...extensionData
  };
  extensions.push(newExtension);
  const result = writeData(extensionsDbPath, extensions);
  
  // Log activity
  if (result.success) {
    addActivity({
      type: 'extension_added',
      extensionName: newExtension.name,
      details: `Extension "${newExtension.name}" v${newExtension.version} added`
    });
  }
  
  return result.success ? newExtension : null;
}

function updateExtension(id, updates) {
  const extensions = readData(extensionsDbPath);
  const index = extensions.findIndex(e => e.id === id);
  if (index === -1) return null;
  
  extensions[index] = { ...extensions[index], ...updates, id };
  const result = writeData(extensionsDbPath, extensions);
  return result.success ? extensions[index] : null;
}

function deleteExtension(id) {
  const extensions = readData(extensionsDbPath);
  const extension = extensions.find(e => e.id === id);
  const filtered = extensions.filter(e => e.id !== id);
  if (filtered.length === extensions.length) return { success: false, error: 'Extension not found' };
  
  // Update all profiles using this extension to remove it
  const profiles = readData(profilesDbPath);
  const updatedProfiles = profiles.map(profile => {
    if (profile.extensionIds && profile.extensionIds.includes(id)) {
      return { ...profile, extensionIds: profile.extensionIds.filter(eid => eid !== id) };
    }
    return profile;
  });
  
  // Save updated profiles
  writeData(profilesDbPath, updatedProfiles);
  
  // Log activity
  if (extension) {
    addActivity({
      type: 'extension_deleted',
      extensionName: extension.name,
      details: `Extension "${extension.name}" deleted`
    });
  }
  
  // Save updated extensions
  return writeData(extensionsDbPath, filtered);
}

// ========== SETTINGS ==========

function getSettings() {
  try {
    const data = fs.readFileSync(settingsDbPath, 'utf8');
    const { data: encryptedData } = JSON.parse(data);
    const decryptedData = decrypt(encryptedData);
    return decryptedData ? JSON.parse(decryptedData) : null;
  } catch (error) {
    console.error('Error reading settings:', error);
    return null;
  }
}

function updateSettings(newSettings) {
  try {
    const encryptedSettings = encrypt(JSON.stringify(newSettings));
    fs.writeFileSync(settingsDbPath, JSON.stringify({ data: encryptedSettings }, null, 2));
    return { success: true, settings: newSettings };
  } catch (error) {
    console.error('Error updating settings:', error);
    return { success: false, error: error.message };
  }
}

// ========== IMPORT/EXPORT ==========

function exportAllData() {
  try {
    const profiles = getAllProfiles();
    const proxies = getAllProxies();
    const settings = getSettings();
    
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      profiles,
      proxies,
      settings
    };
    
    // Encrypt the entire export data
    const encryptedExport = encrypt(JSON.stringify(exportData));
    
    return { success: true, data: encryptedExport };
  } catch (error) {
    console.error('Error exporting data:', error);
    return { success: false, error: error.message };
  }
}

function importAllData(importData) {
  try {
    // Decrypt the imported data
    let decryptedData;
    try {
      // Try to decrypt (new format)
      decryptedData = decrypt(importData);
      if (!decryptedData) {
        throw new Error('Decryption failed');
      }
      decryptedData = JSON.parse(decryptedData);
    } catch (decryptError) {
      // If decryption fails, assume it's old unencrypted format
      console.log('Import data not encrypted, treating as legacy format');
      decryptedData = typeof importData === 'string' ? JSON.parse(importData) : importData;
    }
    
    // Validate import data
    if (!decryptedData || !decryptedData.profiles || !decryptedData.proxies || !decryptedData.settings) {
      return { success: false, error: 'Invalid import data format' };
    }
    
    // Import profiles
    const encryptedProfiles = encrypt(JSON.stringify(decryptedData.profiles));
    fs.writeFileSync(profilesDbPath, JSON.stringify({ data: encryptedProfiles }, null, 2));
    
    // Import proxies
    const encryptedProxies = encrypt(JSON.stringify(decryptedData.proxies));
    fs.writeFileSync(proxiesDbPath, JSON.stringify({ data: encryptedProxies }, null, 2));
    
    // Import settings
    const encryptedSettings = encrypt(JSON.stringify(decryptedData.settings));
    fs.writeFileSync(settingsDbPath, JSON.stringify({ data: encryptedSettings }, null, 2));
    
    return { success: true, message: 'Data imported successfully' };
  } catch (error) {
    console.error('Error importing data:', error);
    return { success: false, error: error.message };
  }
}

// Activity Management
function getRecentActivity(limit = 10) {
  try {
    const activities = readData(activityDbPath);
    // Sort by timestamp descending and limit
    return activities
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  } catch (error) {
    console.error('Error getting recent activity:', error);
    return [];
  }
}

function addActivity(activityData) {
  try {
    const activities = readData(activityDbPath);
    const newActivity = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      ...activityData
    };
    activities.push(newActivity);
    
    // Keep only last 100 activities to prevent file from growing too large
    const trimmedActivities = activities
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 100);
    
    writeData(activityDbPath, trimmedActivities);
    return newActivity;
  } catch (error) {
    console.error('Error adding activity:', error);
    return null;
  }
}

module.exports = {
  initDatabase,
  // Profiles
  getAllProfiles,
  getProfile,
  createProfile,
  updateProfile,
  deleteProfile,
  clearProfileCookies,
  duplicateProfile,
  // Proxies
  getAllProxies,
  getProxy,
  createProxy,
  updateProxy,
  deleteProxy,
  // Extensions
  getAllExtensions,
  getExtension,
  createExtension,
  updateExtension,
  deleteExtension,
  // Settings
  getSettings,
  updateSettings,
  // Import/Export
  exportAllData,
  importAllData,
  // Activity
  getRecentActivity,
  addActivity,
};
