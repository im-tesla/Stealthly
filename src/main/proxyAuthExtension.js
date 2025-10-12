const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Generate a Chrome extension for proxy authentication
 * This extension will automatically handle proxy auth popups
 */
function generateProxyAuthExtension(proxy, profileId) {
  const extensionDir = path.join(os.homedir(), '.stealthy', 'extensions', `proxy_auth_${profileId}`);
  
  // Create extension directory
  if (!fs.existsSync(extensionDir)) {
    fs.mkdirSync(extensionDir, { recursive: true });
  }

  // Create manifest.json
  const manifest = {
    manifest_version: 3,
    name: 'Stealthy Proxy Authentication',
    version: '1.0.0',
    description: 'Handles proxy authentication automatically',
    permissions: [
      'webRequest',
      'webRequestAuthProvider'
    ],
    host_permissions: ['<all_urls>'],
    background: {
      service_worker: 'background.js'
    }
  };

  fs.writeFileSync(
    path.join(extensionDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  // Create background.js with credentials
  const backgroundJs = `
chrome.webRequest.onAuthRequired.addListener(
  (details, callbackFn) => {
    console.log('Proxy authentication required');
    callbackFn({
      authCredentials: {
        username: '${proxy.username.replace(/'/g, "\\'")}',
        password: '${proxy.password.replace(/'/g, "\\'")}'
      }
    });
  },
  { urls: ['<all_urls>'] },
  ['asyncBlocking']
);

console.log('Proxy authentication extension loaded');
`;

  fs.writeFileSync(
    path.join(extensionDir, 'background.js'),
    backgroundJs
  );

  return extensionDir;
}

/**
 * Clean up proxy auth extension for a profile
 */
function cleanupProxyAuthExtension(profileId) {
  try {
    const extensionDir = path.join(os.homedir(), '.stealthy', 'extensions', `proxy_auth_${profileId}`);
    if (fs.existsSync(extensionDir)) {
      fs.rmSync(extensionDir, { recursive: true, force: true });
      console.log(`Cleaned up proxy auth extension for profile ${profileId}`);
    }
  } catch (error) {
    console.error(`Error cleaning up proxy auth extension:`, error);
  }
}

module.exports = {
  generateProxyAuthExtension,
  cleanupProxyAuthExtension
};
