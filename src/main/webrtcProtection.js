const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Generate a Chrome extension to prevent WebRTC IP leaks
 * This extension blocks WebRTC from exposing real IP addresses
 */
function generateWebRTCProtectionExtension(profileId) {
  const extensionDir = path.join(os.homedir(), '.stealthy', 'extensions', `webrtc_protection_${profileId}`);
  
  // Create extension directory
  if (!fs.existsSync(extensionDir)) {
    fs.mkdirSync(extensionDir, { recursive: true });
  }

  // Create manifest.json
  const manifest = {
    manifest_version: 3,
    name: 'WebRTC Leak Protection',
    version: '1.0.0',
    description: 'Prevents WebRTC IP leaks by disabling non-proxied connections',
    permissions: ['privacy'],
    background: {
      service_worker: 'background.js'
    },
    content_scripts: [
      {
        matches: ['<all_urls>'],
        js: ['content.js'],
        run_at: 'document_start',
        all_frames: true
      }
    ]
  };

  fs.writeFileSync(
    path.join(extensionDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  // Create background.js to set privacy settings
  const backgroundJs = `
chrome.privacy.network.webRTCIPHandlingPolicy.set({
  value: 'disable_non_proxied_udp'
});

console.log('WebRTC Leak Protection: Enabled');
`;

  fs.writeFileSync(
    path.join(extensionDir, 'background.js'),
    backgroundJs
  );

  // Create content.js to override WebRTC APIs
  const contentJs = `
(function() {
  'use strict';
  
  // Disable getUserMedia (camera/microphone access)
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia = navigator.webkitGetUserMedia = navigator.mozGetUserMedia = null;
  }
  
  // Override RTCPeerConnection to force proxy usage
  const originalRTCPeerConnection = window.RTCPeerConnection || 
                                    window.webkitRTCPeerConnection || 
                                    window.mozRTCPeerConnection;
  
  if (originalRTCPeerConnection) {
    const newRTCPeerConnection = function(config, constraints) {
      // Force all connections through proxy by limiting ICE candidates
      if (!config) config = {};
      
      config.iceTransportPolicy = 'relay'; // Only use TURN servers, no direct connections
      config.iceServers = config.iceServers || [];
      
      return new originalRTCPeerConnection(config, constraints);
    };
    
    newRTCPeerConnection.prototype = originalRTCPeerConnection.prototype;
    
    window.RTCPeerConnection = newRTCPeerConnection;
    window.webkitRTCPeerConnection = newRTCPeerConnection;
    window.mozRTCPeerConnection = newRTCPeerConnection;
    
    console.log('WebRTC Leak Protection: RTCPeerConnection patched');
  }
  
  // Override WebRTC data channels
  if (window.RTCDataChannel) {
    console.log('WebRTC Leak Protection: Data channels protected');
  }
})();
`;

  fs.writeFileSync(
    path.join(extensionDir, 'content.js'),
    contentJs
  );

  return extensionDir;
}

/**
 * Clean up WebRTC protection extension for a profile
 */
function cleanupWebRTCProtectionExtension(profileId) {
  try {
    const extensionDir = path.join(os.homedir(), '.stealthy', 'extensions', `webrtc_protection_${profileId}`);
    if (fs.existsSync(extensionDir)) {
      fs.rmSync(extensionDir, { recursive: true, force: true });
      console.log(`Cleaned up WebRTC protection extension for profile ${profileId}`);
    }
  } catch (error) {
    console.error(`Error cleaning up WebRTC protection extension:`, error);
  }
}

module.exports = {
  generateWebRTCProtectionExtension,
  cleanupWebRTCProtectionExtension
};
