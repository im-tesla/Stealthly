const { chromium } = require('patchright');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { app } = require('electron');
const { generateWebRTCProtectionExtension, cleanupWebRTCProtectionExtension } = require('./webrtcProtection');

class BrowserManager {
  constructor() {
    this.activeBrowsers = new Map(); // profileId -> { context, page, webrtcExtensionDir, startTime }
    this.dataDir = path.join(os.homedir(), '.stealthy', 'profiles');
    
    // Ensure profiles directory exists
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  /**
   * Get bundled Chrome executable path
   * In development: browsers/chrome-win/chrome.exe
   * In production: resources/browsers/chrome-win/chrome.exe
   */
  _getChromePath() {
    const isDev = !app.isPackaged;
    
    if (isDev) {
      // Development: Use browsers folder in project root
      return path.join(process.cwd(), 'browsers', 'chrome-win', 'chrome.exe');
    } else {
      // Production: Use bundled browsers in resources
      return path.join(process.resourcesPath, 'browsers', 'chrome-win', 'chrome.exe');
    }
  }

  /**
   * Get profile data directory
   */
  getProfileDir(profileId) {
    return path.join(this.dataDir, `profile_${profileId}`);
  }

  /**
   * Check if bundled browser is available
   */
  isBrowserAvailable() {
    const chromePath = this._getChromePath();
    return fs.existsSync(chromePath);
  }

  /**
   * Build proxy configuration for Patchright
   * Supports HTTP/HTTPS proxies with native authentication
   */
  _buildProxyConfig(proxy) {
    const proxyType = proxy.type.toLowerCase();
    const hasAuth = proxy.username && proxy.password;
    
    // Only HTTP/HTTPS proxies are supported
    if (proxyType !== 'http' && proxyType !== 'https') {
      throw new Error(`Unsupported proxy type: ${proxy.type}. Only HTTP and HTTPS proxies are supported.`);
    }
    
    // HTTP/HTTPS proxies: Native authentication support! 🎉
    const protocol = proxyType === 'https' ? 'https' : 'http';
    const server = `${protocol}://${proxy.host}:${proxy.port}`;
    console.log(`Using ${protocol.toUpperCase()} proxy${hasAuth ? ' with native authentication' : ''}: ${server}`);
    
    return {
      server,
      username: hasAuth ? proxy.username : undefined,
      password: hasAuth ? proxy.password : undefined
    };
  }

  /**
   * Generate consistent viewport for a profile
   * Each profile gets a unique viewport based on its viewportSeed, ensuring consistency across launches
   * When profile data is cleared, the viewportSeed is regenerated, giving a new viewport
   */
  _generateViewport(viewportSeed) {
    // Common screen resolutions with their ratios
    const screenSizes = [
      // 16:9 aspect ratio (most common)
      { width: 1920, height: 1080, name: 'Full HD' },
      { width: 1600, height: 900, name: 'HD+' },
      { width: 1366, height: 768, name: 'HD' },
      { width: 1280, height: 720, name: 'HD Ready' },
      
      // 16:10 aspect ratio
      { width: 1920, height: 1200, name: 'WUXGA' },
      { width: 1680, height: 1050, name: 'WSXGA+' },
      { width: 1440, height: 900, name: 'WXGA+' },
      { width: 2560, height: 1600, name: 'WQXGA' },
      
      // 4:3 aspect ratio (older monitors)
      { width: 1024, height: 768, name: 'XGA' },
      { width: 1280, height: 1024, name: 'SXGA' },
      
      // Laptop sizes
      { width: 1536, height: 864, name: 'Laptop HD+' },
      { width: 1400, height: 1050, name: 'SXGA+' },
    ];

    // Use viewportSeed for consistent random selection
    const seed = viewportSeed || Date.now(); // Fallback for old profiles without viewportSeed
    const sizeIndex = seed % screenSizes.length;
    const baseSize = screenSizes[sizeIndex];
    
    // Add small random variations (±0-20px) for uniqueness, but keep it deterministic per seed
    const widthVariation = (seed * 7) % 21; // 0-20
    const heightVariation = (seed * 11) % 21; // 0-20

    return {
      width: baseSize.width + widthVariation,
      height: baseSize.height + heightVariation,
      name: baseSize.name
    };
  }

  /**
   * Build launch arguments for Patchright context
   */
  _buildLaunchArgs(profile) {
    // Generate unique but consistent viewport for this profile using its viewportSeed
    const viewport = this._generateViewport(profile.viewportSeed || profile.id);
    console.log(`Viewport for ${profile.name}: ${viewport.width}x${viewport.height} (${viewport.name})`);

    return {
      viewport: {
        width: viewport.width,
        height: viewport.height
      },
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-sync',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-component-update',
        '--disable-domain-reliability',
        '--disable-features=OptimizationHints,TranslateUI,InterestCohort',
        '--password-store=basic',
        `--window-position=${Math.floor(Math.random() * 100)},${Math.floor(Math.random() * 100)}`,
        '--dns-prefetch-disable',
        '--no-referrers',
        '--safebrowsing-disable-auto-update',
        '--disable-breakpad'
      ]
    };
  }

  /**
   * Launch browser for a profile
   */
  async launchProfile(profile, proxy = null, userExtensions = []) {
    try {
      // Check if already running
      if (this.activeBrowsers.has(profile.id)) {
        const existing = this.activeBrowsers.get(profile.id);
        if (existing.context && existing.context.pages) {
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

      // Build launch configuration
      const launchConfig = this._buildLaunchArgs(profile);
      const extensionsToLoad = [];

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
      let proxyConfig = null;
      if (proxy) {
        proxyConfig = this._buildProxyConfig(proxy);
      }

      // Prepare launch options
      const launchOptions = {
        headless: false,
        executablePath: this._getChromePath(), // Use bundled Chrome
        viewport: launchConfig.viewport,
        args: [
          ...launchConfig.args,
          ...(extensionsToLoad.length > 0 ? [`--load-extension=${extensionsToLoad.join(',')}`] : [])
        ]
      };

      // Add proxy if configured (native support in Patchright!)
      if (proxyConfig) {
        launchOptions.proxy = proxyConfig;
      }

      // Launch browser with persistent context
      console.log(`Launching browser for profile: ${profile.name}`);
      console.log(`Profile directory: ${profileDir}`);
      
      const context = await chromium.launchPersistentContext(profileDir, launchOptions);

      // Get or create a page
      const pages = context.pages();
      const page = pages.length > 0 ? pages[0] : await context.newPage();

      // Navigate to startup URL if specified
      if (profile.startupUrl && profile.startupUrl !== 'about:blank') {
        try {
          await page.goto(profile.startupUrl);
        } catch (navError) {
          console.warn(`Could not navigate to startup URL: ${navError.message}`);
        }
      }

      // Setup cleanup handlers
      context.on('close', () => {
        console.log(`Browser context closed for profile: ${profile.name}`);
        
        if (webrtcExtensionDir) {
          cleanupWebRTCProtectionExtension(profile.id);
        }
        
        this.activeBrowsers.delete(profile.id);
        
        const db = require('./database');
        db.updateProfile(profile.id, { status: 'inactive' });
      });

      // Store browser instance
      this.activeBrowsers.set(profile.id, { 
        context,
        page,
        profileDir,
        webrtcExtensionDir,
        startTime: new Date()
      });

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
      const browserData = this.activeBrowsers.get(profileId);
      
      if (!browserData) {
        return { success: false, message: 'Browser not running for this profile' };
      }

      const { context, webrtcExtensionDir } = browserData;
      
      // Close browser context
      if (context) {
        await context.close();
      }
      
      // Cleanup extensions if they exist
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
    const { context } = this.activeBrowsers.get(profileId);
    return context && context.pages;
  }

  /**
   * Get active browser sessions
   */
  getActiveSessions() {
    const sessions = [];
    for (const [profileId, data] of this.activeBrowsers.entries()) {
      if (data.context && data.context.pages) {
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
