// spoofers/screen.js
// Screen fingerprinting protection - adds noise to screen properties
(function () {
  'use strict';

  const LOG_PREFIX = '[Screen Spoofer]';
  function log(...args) { console.log(LOG_PREFIX, ...args); }

  function getSessionSeed() {
    const ua = navigator.userAgent;
    return ua.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  }

  const sessionSeed = getSessionSeed();

  function seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  // Add small variations to screen properties
  const variations = {
    width: Math.floor(seededRandom(sessionSeed) * 10) - 5,
    height: Math.floor(seededRandom(sessionSeed + 1) * 10) - 5,
    availWidth: Math.floor(seededRandom(sessionSeed + 2) * 10) - 5,
    availHeight: Math.floor(seededRandom(sessionSeed + 3) * 10) - 5,
    colorDepth: [24, 24, 30, 32][Math.floor(seededRandom(sessionSeed + 4) * 4)],
    pixelDepth: [24, 24, 30, 32][Math.floor(seededRandom(sessionSeed + 5) * 4)]
  };

  log('Screen variations:', variations);

  try {
    const screenProps = ['width', 'height', 'availWidth', 'availHeight', 'colorDepth', 'pixelDepth'];
    
    screenProps.forEach(prop => {
      const descriptor = Object.getOwnPropertyDescriptor(Screen.prototype, prop) ||
                        Object.getOwnPropertyDescriptor(screen, prop);
      
      if (descriptor && descriptor.get) {
        const originalGetter = descriptor.get;
        
        Object.defineProperty(Screen.prototype, prop, {
          get: function() {
            const original = originalGetter.call(this);
            const variation = variations[prop];
            
            if (prop === 'colorDepth' || prop === 'pixelDepth') {
              return variation;
            }
            
            return original + (variation || 0);
          },
          enumerable: true,
          configurable: true
        });
      }
    });

    log('Successfully patched screen properties');
  } catch (e) {
    log('Failed to patch screen properties:', e);
  }

  log('Screen spoofer initialization complete!');
})();
