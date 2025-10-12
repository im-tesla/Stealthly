// spoofers/audio.js
// Audio fingerprinting protection - adds noise to OfflineAudioContext rendering
// Prevents audio fingerprinting while maintaining audio functionality
(function () {
  'use strict';

  // Logging helper
  const LOG_PREFIX = '[Audio Spoofer]';
  function log(...args) {
    console.log(LOG_PREFIX, ...args);
  }
  function warn(...args) {
    console.warn(LOG_PREFIX, ...args);
  }
  function info(...args) {
    console.info(LOG_PREFIX, ...args);
  }

  // Keep track of patched contexts using WeakSet (no trace on the object itself)
  const patchedContexts = new WeakSet();
  let contextCounter = 0;

  // Generate consistent but slightly different noise for each session
  function getSessionSeed() {
    const ua = navigator.userAgent;
    const seed = ua.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return seed;
  }

  const sessionSeed = getSessionSeed();
  log('Initialized with session seed:', sessionSeed);

  // Pseudo-random number generator with seed (for consistency within session)
  function seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  // Generate deterministic but unique noise value based on index and session
  function generateNoise(index, sessionSeed) {
    // Very small noise (0.0001 to 0.0003) to avoid breaking audio but change fingerprint
    const baseNoise = 0.0001;
    const noiseRange = 0.0002;
    const random = seededRandom(sessionSeed + index);
    return baseNoise + (random * noiseRange);
  }

  // Make functions appear native
  function makeNative(func, name) {
    try {
      Object.defineProperty(func, 'toString', {
        value: function() {
          return `function ${name}() { [native code] }`;
        },
        configurable: false,
        writable: false,
        enumerable: false
      });
      
      Object.defineProperty(func, 'toLocaleString', {
        value: function() {
          return `function ${name}() { [native code] }`;
        },
        configurable: false,
        writable: false,
        enumerable: false
      });
      
      Object.defineProperty(func, 'name', {
        value: name,
        configurable: false,
        writable: false,
        enumerable: false
      });
    } catch (e) {
      // Silently fail
    }
  }

  // Patch OfflineAudioContext
  function patchOfflineAudioContext() {
    const OriginalOfflineAudioContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    
    if (!OriginalOfflineAudioContext) {
      warn('OfflineAudioContext not available in this browser');
      return;
    }
    
    log('Found OfflineAudioContext, preparing to patch...');

    // Check if already patched
    const patchedSymbol = Symbol.for('__audio_context_patched__');
    if (window[patchedSymbol]) {
      log('OfflineAudioContext already patched');
      return;
    }
    
    log('Patching OfflineAudioContext...');
    
    // Mark as patched
    Object.defineProperty(window, patchedSymbol, {
      value: true,
      writable: false,
      enumerable: false,
      configurable: false
    });

    // Create wrapper constructor
    function PatchedOfflineAudioContext(...args) {
      const contextId = ++contextCounter;
      log(`Creating new OfflineAudioContext #${contextId} with args:`, args);
      
      const context = new OriginalOfflineAudioContext(...args);
      
      // Don't patch twice
      if (patchedContexts.has(context)) {
        log(`Context #${contextId} already patched`);
        return context;
      }
      
      patchedContexts.add(context);
      log(`Context #${contextId}: Patching methods...`);
      
      // Store original methods
      const originalStartRendering = context.startRendering.bind(context);
      const originalCreateDynamicsCompressor = context.createDynamicsCompressor.bind(context);
      
      // Override startRendering to add noise to the output
      context.startRendering = function() {
        log(`Context #${contextId}: startRendering called`);
        const renderPromise = originalStartRendering();
        
        // Wrap the promise to modify the buffer
        return renderPromise.then((buffer) => {
          log(`Context #${contextId}: Rendering complete, adding noise to buffer...`);
          log(`  Buffer info: ${buffer.numberOfChannels} channel(s), ${buffer.length} samples, ${buffer.sampleRate}Hz`);
          
          try {
            let totalNoiseAdded = 0;
            
            // Add subtle noise to all channels
            for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
              const channelData = buffer.getChannelData(channel);
              
              // Only modify the fingerprinting range (typically sampled around 4500-5000)
              // This is where audio fingerprints typically hash the data
              const startIdx = Math.floor(channelData.length * 0.9); // Last 10% of buffer
              
              log(`  Channel ${channel}: Adding noise from index ${startIdx} to ${channelData.length}`);
              
              for (let i = startIdx; i < channelData.length; i++) {
                const noise = generateNoise(i, sessionSeed);
                // Add noise proportional to signal strength
                const noiseFactor = Math.abs(channelData[i]) > 0.0001 ? noise : noise * 0.1;
                const actualNoise = (Math.random() > 0.5 ? noiseFactor : -noiseFactor);
                channelData[i] += actualNoise;
                totalNoiseAdded += Math.abs(actualNoise);
              }
            }
            
            const avgNoise = totalNoiseAdded / (buffer.numberOfChannels * (buffer.length - Math.floor(buffer.length * 0.9)));
            info(`Context #${contextId}: Added average noise of ${avgNoise.toExponential(2)} per sample`);
          } catch (e) {
            warn(`Context #${contextId}: Failed to add noise to buffer`, e);
            // If we can't modify, return original
          }
          
          log(`Context #${contextId}: Returning modified buffer`);
          return buffer;
        }).catch(err => {
          warn(`Context #${contextId}: Rendering failed`, err);
          throw err;
        });
      };
      
      // Override createDynamicsCompressor to add slight variations
      context.createDynamicsCompressor = function() {
        log(`Context #${contextId}: createDynamicsCompressor called`);
        const compressor = originalCreateDynamicsCompressor();
        
        // Store originals
        const origThreshold = Object.getOwnPropertyDescriptor(
          compressor.threshold.__proto__, 'value'
        ) || { get: () => compressor.threshold.value };
        
        const origKnee = Object.getOwnPropertyDescriptor(
          compressor.knee.__proto__, 'value'
        ) || { get: () => compressor.knee.value };
        
        const origRatio = Object.getOwnPropertyDescriptor(
          compressor.ratio.__proto__, 'value'
        ) || { get: () => compressor.ratio.value };
        
        // Add tiny variations to compressor parameters (within audible tolerance)
        // This changes the audio fingerprint without being noticeable
        try {
          const thresholdVariation = seededRandom(sessionSeed + 1) * 0.1 - 0.05; // ±0.05
          const kneeVariation = seededRandom(sessionSeed + 2) * 0.2 - 0.1; // ±0.1
          const ratioVariation = seededRandom(sessionSeed + 3) * 0.01 - 0.005; // ±0.005
          
          log(`  Compressor variations: threshold=${thresholdVariation.toFixed(4)}, knee=${kneeVariation.toFixed(4)}, ratio=${ratioVariation.toFixed(4)}`);
          
          // Intercept threshold setter
          const originalThresholdSetter = Object.getOwnPropertyDescriptor(
            compressor.threshold.__proto__, 'value'
          )?.set;
          
          if (originalThresholdSetter) {
            Object.defineProperty(compressor.threshold, 'value', {
              get: function() {
                return origThreshold.get ? origThreshold.get.call(this) : this._value;
              },
              set: function(val) {
                const adjusted = val + thresholdVariation;
                info(`  Setting threshold: ${val} → ${adjusted} (variation: ${thresholdVariation.toFixed(4)})`);
                if (originalThresholdSetter) {
                  originalThresholdSetter.call(this, adjusted);
                } else {
                  this._value = adjusted;
                }
              },
              enumerable: true,
              configurable: true
            });
            log('  Successfully patched dynamics compressor threshold');
          }
        } catch (e) {
          warn(`Context #${contextId}: Failed to patch compressor`, e);
          // Silently fail if we can't modify compressor
        }
        
        return compressor;
      };
      
      // Make patched methods look native
      makeNative(context.startRendering, 'startRendering');
      makeNative(context.createDynamicsCompressor, 'createDynamicsCompressor');
      
      log(`Context #${contextId}: Patching complete`);
      
      return context;
    }

    // Copy static properties
    Object.setPrototypeOf(PatchedOfflineAudioContext, OriginalOfflineAudioContext);
    PatchedOfflineAudioContext.prototype = OriginalOfflineAudioContext.prototype;
    
    // Make the constructor look native
    makeNative(PatchedOfflineAudioContext, 'OfflineAudioContext');

    // Replace global constructors
    try {
      Object.defineProperty(window, 'OfflineAudioContext', {
        value: PatchedOfflineAudioContext,
        writable: true,
        configurable: true,
        enumerable: false
      });
      log('Successfully replaced window.OfflineAudioContext');
    } catch (e) {
      warn('Failed to defineProperty OfflineAudioContext, using fallback', e);
      window.OfflineAudioContext = PatchedOfflineAudioContext;
    }

    try {
      Object.defineProperty(window, 'webkitOfflineAudioContext', {
        value: PatchedOfflineAudioContext,
        writable: true,
        configurable: true,
        enumerable: false
      });
      log('Successfully replaced window.webkitOfflineAudioContext');
    } catch (e) {
      warn('Failed to defineProperty webkitOfflineAudioContext, using fallback', e);
      window.webkitOfflineAudioContext = PatchedOfflineAudioContext;
    }
    
    log('OfflineAudioContext patching complete!');
  }

  // Apply patches immediately
  try {
    log('Initializing audio spoofer...');
    patchOfflineAudioContext();
    log('Audio spoofer initialization complete!');
  } catch (e) {
    warn('Audio spoofer initialization failed', e);
  }
})();
