const { chromium } = require('patchright');
const path = require('path');
const fs = require('fs');
const os = require('os');

class BrowserManager {
  constructor() {
    this.activeBrowsers = new Map(); // profileId -> browser instance
    this.dataDir = path.join(os.homedir(), '.stealthy', 'profiles');
    
    // Ensure profiles directory exists
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  /**
   * Get profile data directory
   */
  getProfileDir(profileId) {
    return path.join(this.dataDir, `profile_${profileId}`);
  }

  /**
   * Launch browser for a profile
   */
  async launchProfile(profile, proxy = null) {
    try {
      // Check if browser is already running for this profile
      if (this.activeBrowsers.has(profile.id)) {
        const existing = this.activeBrowsers.get(profile.id);
        if (existing.isConnected()) {
          console.log(`Browser already running for profile: ${profile.name}`);
          return { success: true, message: 'Browser already running', profileId: profile.id };
        } else {
          // Clean up disconnected browser
          this.activeBrowsers.delete(profile.id);
        }
      }

      const profileDir = this.getProfileDir(profile.id);
      
      // Ensure profile directory exists
      if (!fs.existsSync(profileDir)) {
        fs.mkdirSync(profileDir, { recursive: true });
      }

      // Base context options
      const contextOptions = {
        channel: 'chrome',
        headless: false,
      };

      // Add proxy if configured
      if (proxy) {
        let proxyServer = `${proxy.type.toLowerCase()}://${proxy.host}:${proxy.port}`;
        
        contextOptions.proxy = {
          server: proxyServer
        };

        // Add authentication if provided
        if (proxy.username && proxy.password) {
          contextOptions.proxy.username = proxy.username;
          contextOptions.proxy.password = proxy.password;
        }

        console.log(`Using proxy: ${proxyServer} ${proxy.username ? '(authenticated)' : ''}`);
      }

      let context;

      console.log(`Launching profile: ${profile.name}`);
      // Launch with Patchright in stealth mode using persistent context
      context = await chromium.launchPersistentContext(profileDir, contextOptions);
  
      // Listen for context close event (manual or programmatic)
      context.on('close', () => {
        console.log(`Browser context closed for profile: ${profile.name}`);
        this.activeBrowsers.delete(profile.id);
        
        // Update profile status in database
        const db = require('./database');
        db.updateProfile(profile.id, { status: 'inactive' });
      });

      this.activeBrowsers.set(profile.id, { context });

      // Open new page
      const page = await context.newPage();
      await page.goto('https://fingerprint.com/demo/');

      console.log(`✓ Browser launched successfully for profile: ${profile.name}`);
      return { 
        success: true, 
        message: 'Browser launched successfully', 
        profileId: profile.id
      };

    } catch (error) {
      console.error(`Error launching browser for profile ${profile.name}:`, error);
      return { 
        success: false, 
        message: error.message || 'Failed to launch browser',
        error: error.toString()
      };
    }
  }

  /**
   * Close browser for a profile
   */
  async closeProfile(profileId) {
    try {
      if (!this.activeBrowsers.has(profileId)) {
        return { success: false, message: 'Browser not running for this profile' };
      }

      const { context } = this.activeBrowsers.get(profileId);
      
      await context.close();
      
      this.activeBrowsers.delete(profileId);
      
      console.log(`✓ Browser closed for profile ID: ${profileId}`);
      return { success: true, message: 'Browser closed successfully' };

    } catch (error) {
      console.error(`Error closing browser for profile ${profileId}:`, error);
      return { success: false, message: error.message || 'Failed to close browser' };
    }
  }

  /**
   * Check if a profile has an active browser
   */
  isProfileActive(profileId) {
    if (!this.activeBrowsers.has(profileId)) {
      return false;
    }
    const { context } = this.activeBrowsers.get(profileId);
    return context && !context._closed;
  }

  /**
   * Get active browser sessions
   */
  getActiveSessions() {
    const sessions = [];
    for (const [profileId, data] of this.activeBrowsers.entries()) {
      if (data.context && !data.context._closed) {
        sessions.push({
          profileId,
          isConnected: true
        });
      }
    }
    return sessions;
  }

  /**
   * Close all active browsers
   */
  async closeAll() {
    const promises = [];
    for (const profileId of this.activeBrowsers.keys()) {
      promises.push(this.closeProfile(profileId));
    }
    return await Promise.all(promises);
  }
}

module.exports = new BrowserManager();
