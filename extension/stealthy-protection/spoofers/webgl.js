(function () {
  'use strict';

  // constants (numeric) for WEBGL_debug_renderer_info
  const UNMASKED_VENDOR_WEBGL_NUM = 0x9245;    // 37445
  const UNMASKED_RENDERER_WEBGL_NUM = 0x9246;  // 37446

  // Real-world vendor/renderer combinations
  const VENDOR_RENDERER_PAIRS = [
    // NVIDIA GPUs
    { vendor: "Google Inc. (NVIDIA)", renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Ti Direct3D11 vs_5_0 ps_5_0, D3D11)" },
    { vendor: "Google Inc. (NVIDIA)", renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 Direct3D11 vs_5_0 ps_5_0, D3D11)" },
    { vendor: "Google Inc. (NVIDIA)", renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 3080 Direct3D11 vs_5_0 ps_5_0, D3D11)" },
    { vendor: "Google Inc. (NVIDIA)", renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 Direct3D11 vs_5_0 ps_5_0, D3D11)" },
    { vendor: "Google Inc. (NVIDIA)", renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Direct3D11 vs_5_0 ps_5_0, D3D11)" },
    { vendor: "Google Inc. (NVIDIA)", renderer: "ANGLE (NVIDIA, NVIDIA GeForce RTX 4080 Direct3D11 vs_5_0 ps_5_0, D3D11)" },
    { vendor: "Google Inc. (NVIDIA)", renderer: "ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 Ti Direct3D11 vs_5_0 ps_5_0, D3D11)" },
    { vendor: "Google Inc. (NVIDIA)", renderer: "ANGLE (NVIDIA, NVIDIA GeForce GTX 1080 Ti Direct3D11 vs_5_0 ps_5_0, D3D11)" },
    
    // AMD GPUs
    { vendor: "Google Inc. (AMD)", renderer: "ANGLE (AMD, AMD Radeon RX 6700 XT Direct3D11 vs_5_0 ps_5_0, D3D11)" },
    { vendor: "Google Inc. (AMD)", renderer: "ANGLE (AMD, AMD Radeon RX 6800 Direct3D11 vs_5_0 ps_5_0, D3D11)" },
    { vendor: "Google Inc. (AMD)", renderer: "ANGLE (AMD, AMD Radeon RX 6900 XT Direct3D11 vs_5_0 ps_5_0, D3D11)" },
    { vendor: "Google Inc. (AMD)", renderer: "ANGLE (AMD, AMD Radeon RX 7900 XTX Direct3D11 vs_5_0 ps_5_0, D3D11)" },
    { vendor: "Google Inc. (AMD)", renderer: "ANGLE (AMD, AMD Radeon RX 580 Series Direct3D11 vs_5_0 ps_5_0, D3D11)" },
    
    // Intel GPUs
    { vendor: "Google Inc. (Intel)", renderer: "ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0, D3D11)" },
    { vendor: "Google Inc. (Intel)", renderer: "ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)" },
    { vendor: "Google Inc. (Intel)", renderer: "ANGLE (Intel, Intel(R) Arc(TM) A770 Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)" },
    { vendor: "Google Inc. (Intel)", renderer: "ANGLE (Intel, Intel(R) UHD Graphics 770 Direct3D11 vs_5_0 ps_5_0, D3D11)" },
  ];

  // Select a consistent vendor/renderer pair for this session
  // Use a deterministic seed based on user agent to maintain consistency
  function getConsistentPair() {
    // const seed = navigator.userAgent.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    // const index = seed % VENDOR_RENDERER_PAIRS.length;
    // return VENDOR_RENDERER_PAIRS[index];
    //lets random it for now
    const index = Math.floor(Math.random() * VENDOR_RENDERER_PAIRS.length);
    return VENDOR_RENDERER_PAIRS[index];
  }

  const selectedPair = getConsistentPair();
  const SPOOFED_VENDOR = selectedPair.vendor;
  const SPOOFED_RENDERER = selectedPair.renderer;

  // Logging helper
  const LOG_PREFIX = '[WebGL Spoofer]';
  function log(...args) {
    console.log(LOG_PREFIX, ...args);
  }
  function warn(...args) {
    console.warn(LOG_PREFIX, ...args);
  }
  function info(...args) {
    console.info(LOG_PREFIX, ...args);
  }

  // Log selected spoofed values
  log('Initialized with spoofed values:');
  log('  Vendor:', SPOOFED_VENDOR);
  log('  Renderer:', SPOOFED_RENDERER);

  // utility to try/set a property with fallback
  function safeDefine(obj, prop, descriptor) {
    try {
      Object.defineProperty(obj, prop, descriptor);
      return true;
    } catch (e) {
      return false;
    }
  }

  // Make functions appear native - more sophisticated approach
  function makeNative(func, name) {
    try {
      // Override toString to return native code string
      Object.defineProperty(func, 'toString', {
        value: function() {
          return `function ${name}() { [native code] }`;
        },
        configurable: false,
        writable: false,
        enumerable: false
      });
      
      // Also override toLocaleString
      Object.defineProperty(func, 'toLocaleString', {
        value: function() {
          return `function ${name}() { [native code] }`;
        },
        configurable: false,
        writable: false,
        enumerable: false
      });
      
      // Set correct function name
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

  // Keep track of patched contexts using WeakSet (no trace on the object itself)
  const patchedContexts = new WeakSet();
  let contextCounter = 0;

  // patch a single WebGL context `gl` (both WebGL1 & WebGL2)
  function patchContext(gl) {
    if (!gl || patchedContexts.has(gl)) return;
    
    // Mark as patched using WeakSet - no property on the object
    patchedContexts.add(gl);
    
    const contextId = ++contextCounter;
    log(`Patching WebGL context #${contextId}`);

    // store originals
    const origGetParameter = gl.getParameter;
    const origGetExtension = gl.getExtension ? gl.getExtension.bind(gl) : null;

    // override getExtension to return a fake debug-info extension object
    function fakeGetExtension(name) {
      try {
        if (!name) return origGetExtension ? origGetExtension(name) : null;

        // when page asks for WEBGL_debug_renderer_info give a fake object
        if (name === 'WEBGL_debug_renderer_info') {
          info(`Context #${contextId}: Intercepted getExtension('WEBGL_debug_renderer_info')`);
          // return an object with numeric constant properties
          return {
            UNMASKED_VENDOR_WEBGL: UNMASKED_VENDOR_WEBGL_NUM,
            UNMASKED_RENDERER_WEBGL: UNMASKED_RENDERER_WEBGL_NUM
          };
        }

        // otherwise forward
        return origGetExtension ? origGetExtension(name) : null;
      } catch (e) {
        try { return origGetExtension ? origGetExtension(name) : null; } catch (ee) { return null; }
      }
    }

    // override getParameter to intercept both numeric constants and extension constants
    function fakeGetParameter(param) {
      try {
        // If caller passed numeric constants directly
        if (param === UNMASKED_VENDOR_WEBGL_NUM) {
          info(`Context #${contextId}: Returning spoofed VENDOR:`, SPOOFED_VENDOR);
          return SPOOFED_VENDOR;
        }
        if (param === UNMASKED_RENDERER_WEBGL_NUM) {
          info(`Context #${contextId}: Returning spoofed RENDERER:`, SPOOFED_RENDERER);
          return SPOOFED_RENDERER;
        }

        // Some pages do ext = gl.getExtension(...); then gl.getParameter(ext.UNMASKED_VENDOR_WEBGL)
        // In that case param will be the numeric value we already handled above.
        // For completeness, forward for any other param.
        return origGetParameter.apply(this, arguments);
      } catch (e) {
        // fallback to original behavior
        return origGetParameter.apply(this, arguments);
      }
    }

    // attempt to set the patched functions on the context
    try {
      // bind the overrides as non-enumerable, configurable where possible
      safeDefine(gl, 'getExtension', {
        value: fakeGetExtension,
        writable: true,
        configurable: true,
        enumerable: false
      });

      safeDefine(gl, 'getParameter', {
        value: fakeGetParameter,
        writable: true,
        configurable: true,
        enumerable: false
      });

      // Make them look native
      makeNative(gl.getParameter, 'getParameter');
      makeNative(gl.getExtension, 'getExtension');
      
      log(`Context #${contextId}: Successfully patched getParameter and getExtension`);
    } catch (err) {
      warn(`Context #${contextId}: Failed to patch with defineProperty, using fallback`, err);
      // if defineProperty fails, attempt direct assignment as fallback
      try { gl.getExtension = fakeGetExtension; } catch (e) {}
      try { gl.getParameter = fakeGetParameter; } catch (e) {}
    }

    // Also patch getSupportedExtensions so pages relying on extension list don't detect absence
    try {
      const origGetSupported = gl.getSupportedExtensions ? gl.getSupportedExtensions.bind(gl) : null;
      if (origGetSupported) {
        function fakeGetSupportedExtensions() {
          try {
            const arr = origGetSupported();
            // ensure WEBGL_debug_renderer_info is present in the list (if not, add it)
            if (Array.isArray(arr)) {
              if (arr.indexOf && arr.indexOf('WEBGL_debug_renderer_info') === -1) {
                const copy = arr.slice();
                copy.push('WEBGL_debug_renderer_info');
                return copy;
              }
            }
            return arr;
          } catch (e) {
            return origGetSupported ? origGetSupported() : [];
          }
        }
        safeDefine(gl, 'getSupportedExtensions', { value: fakeGetSupportedExtensions, writable: true, configurable: true });
        makeNative(gl.getSupportedExtensions, 'getSupportedExtensions');
        log(`Context #${contextId}: Patched getSupportedExtensions`);
      }
    } catch (e) {
      warn(`Context #${contextId}: Failed to patch getSupportedExtensions`, e);
    }

    log(`Context #${contextId}: Patching complete`);
  }

  // Patch contexts already present on the page
  function patchExistingContexts() {
    try {
      const canvases = Array.from(document.getElementsByTagName('canvas') || []);
      log(`Scanning ${canvases.length} existing canvas element(s)`);
      
      canvases.forEach((c) => {
        try {
          // try common context types
          const ctxNames = ['webgl', 'webgl2', 'experimental-webgl'];
          ctxNames.forEach(name => {
            try {
              const ctx = c.getContext && c.getContext(name);
              if (ctx) patchContext(ctx);
            } catch (e) {}
          });
        } catch (e) {}
      });
    } catch (e) {
      warn('Failed to scan existing contexts', e);
    }
  }

  // Wrap HTMLCanvasElement.prototype.getContext so we can patch contexts at creation time
  (function wrapGetContext() {
    try {
      const proto = HTMLCanvasElement && HTMLCanvasElement.prototype;
      if (!proto) return;

      // Check if already patched using a hidden property
      const patchedSymbol = Symbol.for('__getContext_webgl_patched__');
      if (proto[patchedSymbol]) {
        log('HTMLCanvasElement.prototype.getContext already patched');
        return;
      }
      
      log('Patching HTMLCanvasElement.prototype.getContext');
      
      // Mark as patched using Symbol
      Object.defineProperty(proto, patchedSymbol, {
        value: true,
        writable: false,
        enumerable: false,
        configurable: false
      });

      const originalGetContext = proto.getContext;
      function patchedGetContext(type, attrs) {
        const ctx = originalGetContext.apply(this, arguments);
        try {
          if (ctx && (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl')) {
            log(`New ${type} context created, patching...`);
            patchContext(ctx);
          }
        } catch (e) {
          warn('Error in patchedGetContext', e);
        }
        return ctx;
      }

      try {
        Object.defineProperty(proto, 'getContext', {
          value: patchedGetContext,
          configurable: true,
          writable: true
        });
        
        // Make getContext look native too
        makeNative(proto.getContext, 'getContext');
        log('Successfully patched HTMLCanvasElement.prototype.getContext');
      } catch (e) {
        warn('Failed to defineProperty on getContext, using fallback', e);
        // fallback
        proto.getContext = patchedGetContext;
      }
    } catch (e) {
      warn('Failed to wrap getContext', e);
    }
  })();

  // Observe for new canvases being added
  const mo = new MutationObserver(() => {
    patchExistingContexts();
  });
  mo.observe(document, { childList: true, subtree: true });
  log('MutationObserver initialized to watch for new canvas elements');

  // Run initial patch (silently)
  try {
    log('Running initial context patching...');
    patchExistingContexts();
    
    // Also try to patch contexts reachable from any frames (best-effort)
    try {
      // On some pages WebGL contexts are created inside iframes; we cannot touch cross-origin frames.
      if (window.frames && window.frames.length) {
        log(`Found ${window.frames.length} iframe(s), attempting to patch...`);
        for (let i = 0; i < window.frames.length; i++) {
          try {
            const frame = window.frames[i];
            // only same-origin frames are accessible
            if (frame && frame.document) {
              const frameCanvas = frame.document && frame.document.getElementsByTagName ? frame.document.getElementsByTagName('canvas') : [];
              log(`  Frame ${i}: Found ${frameCanvas.length} canvas element(s)`);
              // attempt to get their contexts
              for (let j = 0; j < frameCanvas.length; j++) {
                try {
                  const c = frameCanvas[j];
                  ['webgl', 'webgl2', 'experimental-webgl'].forEach(name => {
                    try {
                      const ctx = c.getContext && c.getContext(name);
                      if (ctx) patchContext(ctx);
                    } catch (e) {}
                  });
                } catch (e) {}
              }
            }
          } catch (e) {
            // Cross-origin frame, skip
          }
        }
      }
    } catch (e) {
      warn('Failed to patch iframe contexts', e);
    }
    
    log('WebGL spoofer initialization complete!');
  } catch (e) {
    warn('Initialization failed', e);
  }
})();
