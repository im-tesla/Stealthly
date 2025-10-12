const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { generateProxyAuthExtension, cleanupProxyAuthExtension } = require('./proxyAuthExtension');
const { generateWebRTCProtectionExtension, cleanupWebRTCProtectionExtension } = require('./webrtcProtection');

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
   * Find Brave executable path
   */
  getBravePath() {
    const platform = os.platform();
    
    if (platform === 'win32') {
      // In production, extraResources are in process.resourcesPath
      // In development, they're relative to the project root
      const { app } = require('electron');
      const isPackaged = app.isPackaged;
      
      const possiblePaths = [];
      
      // Check for portable version bundled with app first
      if (isPackaged) {
        // Production: extraResources are in app.getPath('exe')/../resources/
        possiblePaths.push(path.join(process.resourcesPath, 'browsers', 'brave-win64', 'brave.exe'));
      } else {
        // Development: relative to project root
        possiblePaths.push(path.join(__dirname, '..', '..', 'browsers', 'brave-win64', 'brave.exe'));
      }
      
      // Then check system installations as fallback
      possiblePaths.push(
        path.join(process.env.LOCALAPPDATA || '', 'BraveSoftware\\Brave-Browser\\Application\\brave.exe'),
        path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'BraveSoftware\\Brave-Browser\\Application\\brave.exe'),
        path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'BraveSoftware\\Brave-Browser\\Application\\brave.exe')
      );
      
      for (const bravePath of possiblePaths) {
        if (fs.existsSync(bravePath)) {
          console.log('Using Brave browser:', bravePath);
          return bravePath;
        }
      }
    }
    
    console.error('Brave browser not found! Please install Brave from https://brave.com');
    return null;
  }

  /**
   * Check if Brave is available
   */
  isBraveAvailable() {
    const bravePath = this.getBravePath();
    return bravePath !== null;
  }

  /**
   * Get profile data directory
   */
  getProfileDir(profileId) {
    return path.join(this.dataDir, `profile_${profileId}`);
  }

  /**
   * Build proxy configuration and return URL + optional extension
   */
  _buildProxyConfig(proxy, profileId) {
    const proxyType = proxy.type.toLowerCase();
    const hasAuth = proxy.username && proxy.password;
    
    // SOCKS proxies: Embed credentials in URL (extensions don't work)
    if (proxyType === 'socks5' || proxyType === 'socks') {
      const url = hasAuth
        ? `socks5://${encodeURIComponent(proxy.username)}:${encodeURIComponent(proxy.password)}@${proxy.host}:${proxy.port}`
        : `socks5://${proxy.host}:${proxy.port}`;
      
      console.log(`Using SOCKS5 proxy${hasAuth ? ' with authentication' : ''}: socks5://${hasAuth ? `${proxy.username}:***@` : ''}${proxy.host}:${proxy.port}`);
      return { url, extensionDir: null };
    }
    
    if (proxyType === 'socks4') {
      const url = hasAuth
        ? `socks4://${encodeURIComponent(proxy.username)}:${encodeURIComponent(proxy.password)}@${proxy.host}:${proxy.port}`
        : `socks4://${proxy.host}:${proxy.port}`;
      
      console.log(`Using SOCKS4 proxy${hasAuth ? ' with authentication' : ''}`);
      return { url, extensionDir: null };
    }
    
    // HTTP/HTTPS proxies: Use extension for authentication
    const protocol = proxyType === 'https' ? 'https' : 'http';
    const url = `${protocol}://${proxy.host}:${proxy.port}`;
    const extensionDir = hasAuth ? generateProxyAuthExtension(proxy, profileId) : null;
    
    console.log(`Using ${protocol.toUpperCase()} proxy${hasAuth ? ' with extension-based auth' : ''}: ${url}`);
    if (extensionDir) {
      console.log(`✓ Proxy authentication extension loaded`);
    }
    
    return { url, extensionDir };
  }

  /**
   * Build base browser arguments
   */
  _buildBrowserArgs(profileDir) {
    // Get system language (e.g., 'en-US', 'es-ES', 'de-DE')
    const systemLang = require('electron').app.getLocale() || 'en-US';

    return [
      `--user-data-dir=${profileDir}`,
      '--no-first-run',
      '--no-default-browser-check',
      `--lang=${systemLang}`,
      '--disable-sync',
      '--disable-background-networking',
      '--disable-default-apps',
      '--disable-component-update',
      '--disable-domain-reliability',
      '--disable-features=OptimizationHints,TranslateUI,InterestCohort',
      '--password-store=basic',
      `--window-position=${Math.floor(Math.random() * 100)},${Math.floor(Math.random() * 100)}`,
      '--window-size=1366,768',
      '--force-webrtc-ip-handling-policy=default_public_interface_only',
      '--enforce-webrtc-ip-permission-check',
      '--dns-prefetch-disable',
      '--no-referrers',
      '--safebrowsing-disable-auto-update',
      '--disable-breakpad',
      'https://demo.fingerprint.com/playground'
    ];
  }

  /**
   * Setup process event handlers
   */
  _setupProcessHandlers(browserProcess, profile, extensionDir, webrtcExtensionDir) {
    browserProcess.on('exit', (code) => {
      console.log(`Browser closed for profile: ${profile.name} (exit code: ${code})`);
      
      if (extensionDir) {
        cleanupProxyAuthExtension(profile.id);
      }
      
      if (webrtcExtensionDir) {
        cleanupWebRTCProtectionExtension(profile.id);
      }
      
      this.activeBrowsers.delete(profile.id);
      
      const db = require('./database');
      db.updateProfile(profile.id, { status: 'inactive' });
    });

    browserProcess.on('error', (err) => {
      console.error(`Browser process error for profile ${profile.name}:`, err);
      this.activeBrowsers.delete(profile.id);
    });
  }

  /**
   * Launch browser for a profile
   */
  async launchProfile(profile, proxy = null, userExtensions = []) {
    try {
      // Check if already running
      if (this.activeBrowsers.has(profile.id)) {
        const existing = this.activeBrowsers.get(profile.id);
        if (existing.process && !existing.process.killed) {
          console.log(`Browser already running for profile: ${profile.name}`);
          return { success: true, message: 'Browser already running', profileId: profile.id };
        }
        this.activeBrowsers.delete(profile.id);
      }

      // Prepare profile directory
      const profileDir = this.getProfileDir(profile.id);
      if (!fs.existsSync(profileDir)) {
        fs.mkdirSync(profileDir, { recursive: true });
      }

      // Build launch arguments
      const bravePath = this.getBravePath();
      const braveArgs = this._buildBrowserArgs(profileDir);
      let extensionDir = null;
      const extensionsToLoad = [];

      // Add Stealthy Fingerprint Protection extension (always first)
      const { app } = require('electron');
      const stealthyFingerprintExt = app.isPackaged
        ? path.join(process.resourcesPath, 'extension', 'stealthy_fingerprint')
        : path.join(__dirname, '..', '..', 'extension', 'stealthy_fingerprint');
      
      if (fs.existsSync(stealthyFingerprintExt)) {
        extensionsToLoad.push(stealthyFingerprintExt);
        console.log('✓ Stealthy Fingerprint Protection enabled');
      }

      // Add WebRTC leak protection extension
      const webrtcExtensionDir = generateWebRTCProtectionExtension(profile.id);
      extensionsToLoad.push(webrtcExtensionDir);
      console.log('✓ WebRTC leak protection enabled');

      // Add user extensions (all enabled extensions globally)
      if (userExtensions && userExtensions.length > 0) {
        console.log(`Loading ${userExtensions.length} user extension(s):`);
        for (const extension of userExtensions) {
          if (extension.path && fs.existsSync(extension.path)) {
            extensionsToLoad.push(extension.path);
            console.log(`  ✓ ${extension.name}`);
          } else {
            console.warn(`  ⚠ Extension path not found: ${extension.name} at ${extension.path}`);
          }
        }
      }

      // Add proxy configuration
      if (proxy) {
        const proxyConfig = this._buildProxyConfig(proxy, profile.id);
        braveArgs.push(`--proxy-server=${proxyConfig.url}`);
        extensionDir = proxyConfig.extensionDir;
        
        if (extensionDir) {
          extensionsToLoad.push(extensionDir);
        }
      }

      // Load all extensions
      if (extensionsToLoad.length > 0) {
        braveArgs.push(`--load-extension=${extensionsToLoad.join(',')}`);
      }

      // Launch browser
      console.log(`Launching Brave browser for profile: ${profile.name}`);
      console.log(`Launch args:`, braveArgs.join(' '));
      
      const browserProcess = spawn(bravePath, braveArgs, {
        detached: false,
        stdio: 'ignore'
      });

      // Setup event handlers
      this._setupProcessHandlers(browserProcess, profile, extensionDir, webrtcExtensionDir);

      // Store browser instance
      this.activeBrowsers.set(profile.id, { 
        process: browserProcess,
        profileDir,
        extensionDir,
        webrtcExtensionDir,
        startTime: new Date()
      });

      console.log(`✓ Brave browser launched successfully for profile: ${profile.name}`);
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
      const browserData = this.activeBrowsers.get(profileId);
      
      if (!browserData) {
        return { success: false, message: 'Browser not running for this profile' };
      }

      const { process: browserProcess, extensionDir, webrtcExtensionDir } = browserData;
      
      // Kill browser process
      if (browserProcess && !browserProcess.killed) {
        if (os.platform() === 'win32') {
          spawn('taskkill', ['/pid', browserProcess.pid, '/t', '/f']);
        } else {
          browserProcess.kill('SIGTERM');
        }
      }
      
      // Cleanup extensions if they exist
      if (extensionDir) {
        cleanupProxyAuthExtension(profileId);
      }
      
      if (webrtcExtensionDir) {
        cleanupWebRTCProtectionExtension(profileId);
      }
      
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
    const { process: browserProcess } = this.activeBrowsers.get(profileId);
    return browserProcess && !browserProcess.killed;
  }

  /**
   * Get active browser sessions
   */
  getActiveSessions() {
    const sessions = [];
    for (const [profileId, data] of this.activeBrowsers.entries()) {
      if (data.process && !data.process.killed) {
        sessions.push({
          profileId,
          isConnected: true,
          startTime: data.startTime
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
