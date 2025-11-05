const crypto = require('crypto');

const DEFAULT_OPTIONS = {
  noiseAmplitude: 1.05,
  includeWebGL: true
};

function createFingerprintSeed() {
  return crypto.randomBytes(16).toString('hex');
}

function buildFingerprintProtectionScript(userOptions = {}) {
  const options = { ...DEFAULT_OPTIONS, ...userOptions };

  if (!options.seed) {
    throw new Error('Fingerprint protection requires a seed value.');
  }

  const script = `(() => {
    try {
      // DO NOT TOUCH navigator.webdriver!
      // Patchright + --disable-blink-features=AutomationControlled handles this natively
      // Any Object.defineProperty() is detected as tampering by creepjs
      
      const scope = typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : globalThis);
      if (!scope) {
        return;
      }
      
      if (scope.__stealthyCanvasShield__) {
        return;
      }
      
      Object.defineProperty(scope, '__stealthyCanvasShield__', {
        value: true,
        configurable: false,
        enumerable: false,
        writable: false
      });

    const seed = ${JSON.stringify(options.seed)};
    const noiseAmplitude = ${Number(options.noiseAmplitude).toFixed(2)};
    const includeWebGL = ${options.includeWebGL ? 'true' : 'false'};

    const canvasProto = scope.CanvasRenderingContext2D && scope.CanvasRenderingContext2D.prototype;
    const offscreenCanvasProto = scope.OffscreenCanvasRenderingContext2D && scope.OffscreenCanvasRenderingContext2D.prototype;
    const originalCanvasGetImageData = canvasProto ? canvasProto.getImageData : null;
    const originalOffscreenGetImageData = offscreenCanvasProto ? offscreenCanvasProto.getImageData : null;
    const context2dCtor = scope.CanvasRenderingContext2D;
    const offscreenContext2dCtor = scope.OffscreenCanvasRenderingContext2D;

      const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

      const cyrb53 = (str, seedValue = 0) => {
        let h1 = 0xdeadbeef ^ seedValue;
        let h2 = 0x41c6ce57 ^ seedValue;
        for (let i = 0, ch; i < str.length; i++) {
          ch = str.charCodeAt(i);
          h1 = Math.imul(h1 ^ ch, 2654435761);
          h2 = Math.imul(h2 ^ ch, 1597334677);
        }
        h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
        h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
        return 4294967296 * (2097151 & h2) + (h1 >>> 0);
      };

      const mulberry32 = (a) => {
        return () => {
          let t = a += 0x6d2b79f5;
          t = Math.imul(t ^ (t >>> 15), t | 1);
          t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
      };

  const nativeToString = Function.prototype.toString;
  const functionCache = new WeakMap();
  const debugRendererSymbol = Symbol('StealthyDebugRendererInfo');
  const textMetricsCache = new WeakMap();
  const audioGraphCache = new WeakMap();
  const offlineContextKeyCache = new WeakMap();
  const offlineCompleteListenerMap = new WeakMap();
  const onCompleteHandlerStore = new WeakMap();
  const audioBufferTouched = new WeakSet();
  const audioChannelDataCache = new WeakSet();
  const baseLatencyCache = new WeakMap();
  const outputLatencyCache = new WeakMap();
  const maxChannelCountCache = new WeakMap();

      const registerSignature = (fn, sourceFn) => {
        if (typeof fn !== 'function') {
          return;
        }
        try {
          // Store the original toString result
          const signature = sourceFn ? nativeToString.call(sourceFn) : nativeToString.call(fn);
          functionCache.set(fn, signature);
          
          // Override toString only on this specific function instance
          Object.defineProperty(fn, 'toString', {
            value: function() { return signature; },
            writable: true,
            configurable: true,
            enumerable: false
          });
        } catch (_) {
          // Ignore signature preservation failures
        }
      };

      const makeKey = (prefix, width, height, extra) => {
        const host = scope.location && scope.location.hostname ? scope.location.hostname : '';
        return [prefix, width, height, extra || '', seed, host].join('|');
      };

      const getContextIdentity = (target) => {
        if (!target || typeof target !== 'object') {
          return '';
        }
        const ctor = target.constructor;
        if (!ctor || typeof ctor !== 'function') {
          return '';
        }
        return ctor.name || '';
      };

      const getOfflineContextKey = (context) => {
        if (!context) {
          return makeKey('offlineAudioRender', 0, 0, 'missing');
        }
        if (offlineContextKeyCache.has(context)) {
          return offlineContextKeyCache.get(context);
        }
        const sampleRate = typeof context.sampleRate === 'number' ? context.sampleRate : 44100;
        const channels = typeof context.numberOfChannels === 'number' ? context.numberOfChannels : 2;
        const length = typeof context.length === 'number' ? context.length : Math.floor(sampleRate * 0.5);
        const key = makeKey('offlineAudioRender', sampleRate, channels, length);
        offlineContextKeyCache.set(context, key);
        return key;
      };

      const perturbAudioChannel = (channelData, key) => {
        if (!channelData || typeof channelData.length !== 'number') {
          return;
        }
        if (audioChannelDataCache.has(channelData)) {
          return;
        }
        const rng = mulberry32(cyrb53(key));
        const baseStride = 24 + Math.floor(rng() * 24);
        let index = Math.floor(rng() * Math.min(32, channelData.length || 0));
        const amplitude = 0.00008 + rng() * 0.00018;
        while (index < channelData.length) {
          const delta = (rng() - 0.5) * 2 * amplitude;
          channelData[index] = clamp(channelData[index] + delta, -1, 1);
          index += baseStride + Math.floor(rng() * 24);
        }
        audioChannelDataCache.add(channelData);
      };

      const perturbAudioBuffer = (buffer, contextKey) => {
        if (!buffer || audioBufferTouched.has(buffer)) {
          return buffer;
        }
        const channels = typeof buffer.numberOfChannels === 'number' ? buffer.numberOfChannels : 1;
        const sampleRate = typeof buffer.sampleRate === 'number' ? buffer.sampleRate : 44100;
        const length = typeof buffer.length === 'number' ? buffer.length : 0;
        for (let channel = 0; channel < channels; channel++) {
          try {
            const data = buffer.getChannelData(channel);
            const channelKey = [contextKey, channel, sampleRate, length].join('|');
            perturbAudioChannel(data, channelKey);
          } catch (_) {
            // Ignore channel perturbation errors
          }
        }
        audioBufferTouched.add(buffer);
        return buffer;
      };

      const getCompleteListenerRegistry = (context) => {
        let registry = offlineCompleteListenerMap.get(context);
        if (!registry) {
          registry = new WeakMap();
          offlineCompleteListenerMap.set(context, registry);
        }
        return registry;
      };

      const wrapCompleteHandler = (context, handler) => {
        if (typeof handler !== 'function') {
          return handler;
        }
        const wrapped = function(event) {
          try {
            if (event && event.renderedBuffer) {
              const key = getOfflineContextKey(context);
              perturbAudioBuffer(event.renderedBuffer, key);
            }
          } catch (_) {
            // Ignore audio completion perturbation failures
          }
          return handler.apply(this, arguments);
        };
        registerSignature(wrapped, handler);
        return wrapped;
      };

      const computeLatencyVariant = (context, value, label, cache) => {
        if (typeof value !== 'number' || !isFinite(value)) {
          return value;
        }
        if (cache.has(context)) {
          return cache.get(context);
        }
        const baseValue = value > 0 ? value : 0.0011;
        const key = makeKey(label, Math.round(baseValue * 1000), 0, getContextIdentity(context));
        const rng = mulberry32(cyrb53(key));
        const minDelta = 0.00045;
        const spread = Math.max(minDelta, baseValue * 0.08);
        const variant = Math.max(0, baseValue + (rng() - 0.5) * spread);
        cache.set(context, variant);
        return variant;
      };

      const computeMaxChannelCountVariant = (node, value) => {
        if (typeof value !== 'number' || !isFinite(value) || value <= 0) {
          return value;
        }
        if (maxChannelCountCache.has(node)) {
          return maxChannelCountCache.get(node);
        }
        const key = makeKey('audioMaxChannelCount', value, 0, getContextIdentity(node));
        const rng = mulberry32(cyrb53(key));
        const spread = Math.max(1, Math.round(value * 0.1));
        let variant = value + Math.round((rng() - 0.5) * spread);
        const lowerBound = Math.max(2, value - 2);
        const upperBound = value + 2;
        if (variant < lowerBound) {
          variant = lowerBound;
        }
        if (variant > upperBound) {
          variant = upperBound;
        }
        maxChannelCountCache.set(node, variant);
        return variant;
      };

      const mutateImageData = (imageData, key) => {
        if (!imageData || !imageData.data) {
          return imageData;
        }
        const data = imageData.data;
        const keyHash = cyrb53(key);
        const seedHash = cyrb53(seed);
        
        // Use hash to determine fixed coverage (not random)
        const coverage = 0.04 + ((keyHash % 100) / 100) * 0.03; // Fixed 4-7% based on key hash
        const amplitude = noiseAmplitude * (0.8 + ((seedHash % 100) / 100) * 0.4); // Fixed amplitude based on seed
        
        // Pattern offset from seed
        const patternOffset = seedHash % 7;
        
        // Create deterministic RNG from key
        const rng = mulberry32(keyHash);
        
        // Pre-generate random values for consistent results
        const randomValues = [];
        for (let i = 0; i < data.length / 4; i++) {
          randomValues.push(rng());
        }

        let pixelIndex = 0;
        for (let i = patternOffset * 4; i < data.length; i += 4) {
          const randomValue = randomValues[pixelIndex % randomValues.length];
          pixelIndex++;
          
          if (randomValue < coverage) {
            // Use deterministic offsets based on pixel position and key
            const positionHash = cyrb53(key + i.toString());
            const posRng = mulberry32(positionHash);
            
            const deltaR = (posRng() - 0.5) * amplitude * 2.2;
            const deltaG = (posRng() - 0.5) * amplitude * 2.0;
            const deltaB = (posRng() - 0.5) * amplitude * 1.8;
            
            let adjustmentR = Math.round(deltaR);
            let adjustmentG = Math.round(deltaG);
            let adjustmentB = Math.round(deltaB);
            
            if (adjustmentR === 0) adjustmentR = deltaR >= 0 ? 1 : -1;
            if (adjustmentG === 0) adjustmentG = deltaG >= 0 ? 1 : -1;
            if (adjustmentB === 0) adjustmentB = deltaB >= 0 ? 1 : -1;
            
            data[i] = clamp(data[i] + adjustmentR, 0, 255);
            data[i + 1] = clamp(data[i + 1] + adjustmentG, 0, 255);
            data[i + 2] = clamp(data[i + 2] + adjustmentB, 0, 255);
          }
        }
        return imageData;
      };

      const cloneCanvas = (source) => {
        if (!source || !source.width || !source.height) {
          return null;
        }
        if (source.width * source.height > 16777216) {
          return null;
        }

        let canvas = null;
        if (scope.OffscreenCanvas && source instanceof scope.OffscreenCanvas) {
          canvas = new scope.OffscreenCanvas(source.width, source.height);
        } else if (scope.document && typeof scope.document.createElement === 'function') {
          canvas = scope.document.createElement('canvas');
        } else if (scope.OffscreenCanvas) {
          canvas = new scope.OffscreenCanvas(source.width, source.height);
        }

        if (!canvas) {
          return null;
        }

        canvas.width = source.width;
        canvas.height = source.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return null;
        }

        try {
          ctx.drawImage(source, 0, 0);
        } catch (_) {
          return null;
        }

        return ctx;
      };

      const getNativeImageData = (ctx, width, height) => {
        if (!ctx) {
          return null;
        }
        try {
          if (originalCanvasGetImageData && context2dCtor && ctx instanceof context2dCtor) {
            return originalCanvasGetImageData.call(ctx, 0, 0, width, height);
          }
          if (originalOffscreenGetImageData && offscreenContext2dCtor && ctx instanceof offscreenContext2dCtor) {
            return originalOffscreenGetImageData.call(ctx, 0, 0, width, height);
          }
          if (typeof ctx.getImageData === 'function') {
            return ctx.getImageData(0, 0, width, height);
          }
        } catch (_) {
          return null;
        }
        return null;
      };

      const prepareMutatedCanvas = (canvasInstance, tag, extraKey) => {
        if (!canvasInstance) {
          return { canvas: canvasInstance, mutated: false };
        }
        try {
          const cloneContext = cloneCanvas(canvasInstance);
          if (!cloneContext) {
            return { canvas: canvasInstance, mutated: false };
          }
          const cloneCanvasRef = cloneContext.canvas || cloneContext;
          const width = canvasInstance.width || cloneCanvasRef.width;
          const height = canvasInstance.height || cloneCanvasRef.height;
          if (!width || !height) {
            return { canvas: canvasInstance, mutated: false };
          }
          const nativeImageData = getNativeImageData(cloneContext, width, height);
          if (!nativeImageData) {
            return { canvas: canvasInstance, mutated: false };
          }
          const key = makeKey(tag, width, height, extraKey || '');
          mutateImageData(nativeImageData, key);
          cloneContext.putImageData(nativeImageData, 0, 0);
          return { canvas: cloneCanvasRef, mutated: true };
        } catch (e) {
          return { canvas: canvasInstance, mutated: false };
        }
      };

      const withTextPerturbation = (ctx, tag, extraKey, drawFn) => {
        if (!ctx || typeof drawFn !== 'function' || typeof ctx.save !== 'function' || typeof ctx.restore !== 'function') {
          return drawFn();
        }

        const canvas = ctx.canvas;
        const width = canvas && canvas.width ? canvas.width : 0;
        const height = canvas && canvas.height ? canvas.height : 0;
        const key = makeKey(tag, width, height, extraKey);
        const rng = mulberry32(cyrb53(key));

        const shiftX = (rng() - 0.5) * 0.5;
        const shiftY = (rng() - 0.5) * 0.5;
        const skewX = (rng() - 0.5) * 0.0018;
        const scaleX = 1 + (rng() - 0.5) * 0.003;
        const scaleY = 1 + (rng() - 0.5) * 0.003;
        const rotation = (rng() - 0.5) * 0.002;

        ctx.save();
        let restored = false;
        try {
          ctx.transform(scaleX, skewX, 0, scaleY, shiftX, shiftY);
          if (Math.abs(rotation) > 0.0005) {
            ctx.rotate(rotation);
          }
          return drawFn();
        } catch (_) {
          try {
            ctx.restore();
            restored = true;
          } catch (_) {}
          return drawFn();
        } finally {
          if (!restored) {
            try {
              ctx.restore();
            } catch (_) {}
          }
        }
      };





      const patchCanvasPrototype = (CanvasPrototype) => {
        if (!CanvasPrototype) {
          return;
        }

        const originalToDataURL = CanvasPrototype.toDataURL;
        if (originalToDataURL && !originalToDataURL.__stealthyWrapped) {
          let toDataURLCallCount = 0;
          const wrappedToDataURL = function toDataURL(...args) {
            toDataURLCallCount++;
            const { canvas: target, mutated } = prepareMutatedCanvas(this, 'toDataURL', args[0] || '');
            if (!mutated) {
              } else {
              }
            const destination = target && typeof target.toDataURL === 'function' ? target : this;
            const result = originalToDataURL.apply(destination, args);
            return result;
          };

          Object.defineProperty(CanvasPrototype, 'toDataURL', {
            value: wrappedToDataURL,
            configurable: true,
            writable: true
          });
          wrappedToDataURL.__stealthyWrapped = true;
          registerSignature(wrappedToDataURL, originalToDataURL);
        }

        const originalToBlob = CanvasPrototype.toBlob;
        if (originalToBlob && !originalToBlob.__stealthyWrapped) {
          const wrappedToBlob = function toBlob(callback, ...rest) {
            const safeCallback = typeof callback === 'function' ? callback : () => {};
            const optionsOrType = rest[0];
            let mime = '';
            if (typeof optionsOrType === 'string') {
              mime = optionsOrType;
            } else if (optionsOrType && typeof optionsOrType === 'object' && optionsOrType.type) {
              mime = optionsOrType.type;
            }
            const { canvas: target, mutated } = prepareMutatedCanvas(this, 'toBlob', mime);
            if (!mutated) {
              } else {
              }
            const destination = target && typeof target.toBlob === 'function' ? target : this;
            const self = this;
            return originalToBlob.call(destination, function(blob) {
              return safeCallback.call(self, blob);
            }, ...rest);
          };

          Object.defineProperty(CanvasPrototype, 'toBlob', {
            value: wrappedToBlob,
            configurable: true,
            writable: true
          });
          registerSignature(wrappedToBlob, originalToBlob);
          Object.defineProperty(originalToBlob, '__stealthyWrapped', {
            value: true,
            enumerable: false
          });
        }
      };

      const patchContext2D = (ContextPrototype) => {
        if (!ContextPrototype) {
          return;
        }
        
        const originalGetImageData = ContextPrototype.getImageData;
        if (originalGetImageData && !originalGetImageData.__stealthyWrapped) {
          const wrappedGetImageData = function getImageData(...args) {
            const imageData = originalGetImageData.apply(this, args);
            try {
              if (imageData && imageData.data) {
                const canvas = this && this.canvas ? this.canvas : { width: imageData.width, height: imageData.height };
                mutateImageData(imageData, makeKey('getImageData', canvas.width, canvas.height, args.join('|')));
                }
            } catch (e) {
              }
            return imageData;
          };

          Object.defineProperty(ContextPrototype, 'getImageData', {
            value: wrappedGetImageData,
            configurable: true,
            writable: true
          });
          registerSignature(wrappedGetImageData, originalGetImageData);
          Object.defineProperty(originalGetImageData, '__stealthyWrapped', {
            value: true,
            enumerable: false
          });
        }
      };

      const patchTextDrawing = (ContextPrototype) => {
        if (!ContextPrototype) {
          return;
        }

        const originalFillText = ContextPrototype.fillText;
        if (originalFillText && !originalFillText.__stealthyWrapped) {
          const wrappedFillText = function fillText(text, x, y, maxWidth) {
            const fontSignature = this && typeof this.font === 'string' ? this.font : '';
            const extra = [fontSignature, text === undefined ? '' : String(text), maxWidth === undefined ? '' : String(maxWidth)].join('|');
            return withTextPerturbation(this, 'fillText', extra, () => originalFillText.call(this, text, x, y, maxWidth));
          };

          Object.defineProperty(ContextPrototype, 'fillText', {
            value: wrappedFillText,
            configurable: true,
            writable: true
          });
          registerSignature(wrappedFillText, originalFillText);
          Object.defineProperty(originalFillText, '__stealthyWrapped', {
            value: true,
            enumerable: false
          });
        }

        const originalStrokeText = ContextPrototype.strokeText;
        if (originalStrokeText && !originalStrokeText.__stealthyWrapped) {
          const wrappedStrokeText = function strokeText(text, x, y, maxWidth) {
            const fontSignature = this && typeof this.font === 'string' ? this.font : '';
            const extra = [fontSignature, text === undefined ? '' : String(text), maxWidth === undefined ? '' : String(maxWidth)].join('|');
            return withTextPerturbation(this, 'strokeText', extra, () => originalStrokeText.call(this, text, x, y, maxWidth));
          };

          Object.defineProperty(ContextPrototype, 'strokeText', {
            value: wrappedStrokeText,
            configurable: true,
            writable: true
          });
          registerSignature(wrappedStrokeText, originalStrokeText);
          Object.defineProperty(originalStrokeText, '__stealthyWrapped', {
            value: true,
            enumerable: false
          });
        }
      };

      // Also patch getContext to wrap toDataURL on individual canvas instances
      const patchGetContext = (CanvasPrototype) => {
        if (!CanvasPrototype) return;
        
        const originalGetContext = CanvasPrototype.getContext;
        if (originalGetContext && !originalGetContext.__stealthyWrapped) {
          const wrappedGetContext = function getContext(...args) {
            const ctx = originalGetContext.apply(this, args);
            
            // Wrap toDataURL on this specific canvas instance
            if (!this.__stealthyCanvasWrapped && this.toDataURL) {
              const canvas = this;
              const originalInstanceToDataURL = canvas.toDataURL;
              canvas.toDataURL = function(...args) {
                const { canvas: target, mutated } = prepareMutatedCanvas(canvas, 'toDataURL', args[0] || '');
                if (!mutated) {
                  } else {
                  }
                const destination = target && typeof target.toDataURL === 'function' ? target : canvas;
                return originalInstanceToDataURL.apply(destination, args);
              };
              this.__stealthyCanvasWrapped = true;
            }
            
            return ctx;
          };
          
          Object.defineProperty(CanvasPrototype, 'getContext', {
            value: wrappedGetContext,
            configurable: true,
            writable: true
          });
          wrappedGetContext.__stealthyWrapped = true;
          registerSignature(wrappedGetContext, originalGetContext);
        }
      };

      patchCanvasPrototype(scope.HTMLCanvasElement && scope.HTMLCanvasElement.prototype);
      patchGetContext(scope.HTMLCanvasElement && scope.HTMLCanvasElement.prototype);
      patchContext2D(scope.CanvasRenderingContext2D && scope.CanvasRenderingContext2D.prototype);
      patchContext2D(scope.OffscreenCanvasRenderingContext2D && scope.OffscreenCanvasRenderingContext2D.prototype);
    patchTextDrawing(scope.CanvasRenderingContext2D && scope.CanvasRenderingContext2D.prototype);
    patchTextDrawing(scope.OffscreenCanvasRenderingContext2D && scope.OffscreenCanvasRenderingContext2D.prototype);

      // CRITICAL: Intercept iframe contentDocument/contentWindow access
      if (scope.HTMLIFrameElement && scope.HTMLIFrameElement.prototype) {
        const originalContentDocumentGetter = Object.getOwnPropertyDescriptor(scope.HTMLIFrameElement.prototype, 'contentDocument')?.get;
        const originalContentWindowGetter = Object.getOwnPropertyDescriptor(scope.HTMLIFrameElement.prototype, 'contentWindow')?.get;
        
        if (originalContentDocumentGetter) {
          Object.defineProperty(scope.HTMLIFrameElement.prototype, 'contentDocument', {
            get: function() {
              const doc = originalContentDocumentGetter.call(this);
              if (doc && !doc.__stealthyPatched) {
                doc.__stealthyPatched = true;
                
                // Patch the iframe's document.createElement immediately
                if (doc.createElement && !doc.createElement.__stealthyWrapped) {
                  const originalIframeCreateElement = doc.createElement;
                  doc.createElement = function(tagName, options) {
                    const element = originalIframeCreateElement.call(this, tagName, options);
                    
                    if (tagName && tagName.toLowerCase() === 'canvas' && element.toDataURL) {
                      const canvas = element;
                      const originalToDataURL = canvas.toDataURL;
                      
                      canvas.toDataURL = function(...args) {
                        const { canvas: target, mutated } = prepareMutatedCanvas(canvas, 'toDataURL', args[0] || '');
                        if (!mutated) {
                          } else {
                          }
                        const destination = target && typeof target.toDataURL === 'function' ? target : canvas;
                        return originalToDataURL.apply(destination, args);
                      };
                      
                      const originalGetContext = canvas.getContext;
                      canvas.getContext = function(...args) {
                        const ctx = originalGetContext.apply(this, args);
                        
                        if (args[0] === '2d' && ctx && ctx.fillText && !ctx.__stealthyFillTextWrapped) {
                          const originalFillText = ctx.fillText;
                          ctx.fillText = function(...args) {
                            return originalFillText.apply(this, args);
                          };
                          ctx.__stealthyFillTextWrapped = true;
                        }
                        
                        return ctx;
                      };
                    }
                    
                    return element;
                  };
                  doc.createElement.__stealthyWrapped = true;
                }
              }
              return doc;
            },
            configurable: true
          });
        }
        
        if (originalContentWindowGetter) {
          Object.defineProperty(scope.HTMLIFrameElement.prototype, 'contentWindow', {
            get: function() {
              const win = originalContentWindowGetter.call(this);
              if (win && win.HTMLCanvasElement && !win.__stealthyPatched) {
                win.__stealthyPatched = true;
                
                // Patch the iframe window's HTMLCanvasElement.prototype
                if (win.HTMLCanvasElement.prototype) {
                  const iframeCanvasProto = win.HTMLCanvasElement.prototype;
                  const originalIframeToDataURL = iframeCanvasProto.toDataURL;
                  
                  if (originalIframeToDataURL && !originalIframeToDataURL.__stealthyWrapped) {
                    const wrappedIframeToDataURL = function toDataURL(...args) {
                      const { canvas: target, mutated } = prepareMutatedCanvas(this, 'toDataURL', args[0] || '');
                      if (mutated) {
                        }
                      const destination = target && typeof target.toDataURL === 'function' ? target : this;
                      return originalIframeToDataURL.apply(destination, args);
                    };
                    
                    Object.defineProperty(iframeCanvasProto, 'toDataURL', {
                      value: wrappedIframeToDataURL,
                      configurable: true,
                      writable: true
                    });
                    wrappedIframeToDataURL.__stealthyWrapped = true;
                  }
                }
              }
              return win;
            },
            configurable: true
          });
        }
      }

      // CRITICAL: Define iframe injection function BEFORE any async code
      const injectIntoExistingIframes = () => {
        if (!scope.document) return;
        const iframes = scope.document.querySelectorAll('iframe');
        iframes.forEach((iframe, idx) => {
          try {
            const iframeWindow = iframe.contentWindow;
            const iframeDoc = iframe.contentDocument || iframeWindow?.document;
            
            if (iframeDoc && iframeWindow) {
              // Patch iframe's HTMLCanvasElement.prototype
                if (iframeWindow.HTMLCanvasElement && iframeWindow.HTMLCanvasElement.prototype) {
                  const iframeCanvasProto = iframeWindow.HTMLCanvasElement.prototype;
                  const originalIframeToDataURL = iframeCanvasProto.toDataURL;
                  
                  if (originalIframeToDataURL && !originalIframeToDataURL.__stealthyWrapped) {
                    const wrappedIframeToDataURL = function toDataURL(...args) {
                      // Apply mutation using the same logic
                      const { canvas: target, mutated } = prepareMutatedCanvas(this, 'toDataURL', args[0] || '');
                      if (!mutated) {
                        } else {
                        }
                      const destination = target && typeof target.toDataURL === 'function' ? target : this;
                      const result = originalIframeToDataURL.apply(destination, args);
                      return result;
                    };
                    
                    Object.defineProperty(iframeCanvasProto, 'toDataURL', {
                      value: wrappedIframeToDataURL,
                      configurable: true,
                      writable: true
                    });
                    wrappedIframeToDataURL.__stealthyWrapped = true;
                  }
                }
                
                // Patch iframe's document.createElement
                if (iframeDoc.createElement) {
                  const originalIframeCreateElement = iframeDoc.createElement;
                  
                  if (!originalIframeCreateElement.__stealthyWrapped) {
                    iframeDoc.createElement = function(tagName, options) {
                      const element = originalIframeCreateElement.call(this, tagName, options);
                      
                      if (tagName && tagName.toLowerCase() === 'canvas' && element.toDataURL) {
                        const canvas = element;
                        const originalToDataURL = canvas.toDataURL;
                        
                        canvas.toDataURL = function(...args) {
                          const { canvas: target, mutated } = prepareMutatedCanvas(canvas, 'toDataURL', args[0] || '');
                          if (!mutated) {
                            } else {
                            }
                          const destination = target && typeof target.toDataURL === 'function' ? target : canvas;
                          const result = originalToDataURL.apply(destination, args);
                          return result;
                        };
                        
                        const originalGetContext = canvas.getContext;
                        canvas.getContext = function(...args) {
                          const ctx = originalGetContext.apply(this, args);
                          
                          if (args[0] === '2d' && ctx && ctx.fillText && !ctx.__stealthyFillTextWrapped) {
                            const originalFillText = ctx.fillText;
                            ctx.fillText = function(...args) {
                              return originalFillText.apply(this, args);
                            };
                            ctx.__stealthyFillTextWrapped = true;
                          }
                          
                          return ctx;
                        };
                      }
                      
                      return element;
                    };
                    
                    iframeDoc.createElement.__stealthyWrapped = true;
                  }
                }
              } else {
              }
            } catch (e) {
              }
          });
        };
      
      // CRITICAL: Call immediately - don't wait for ANY async code!
      injectIntoExistingIframes();
        
      // Check if there are already canvas elements on the page
      if (scope.document) {
        setTimeout(() => {
          const existingCanvases = scope.document.querySelectorAll('canvas');
          existingCanvases.forEach((canvas, i) => {
            });
        }, 100);
        
        // Try again multiple times with different delays to ensure we catch the iframe
        setTimeout(injectIntoExistingIframes, 10);
        setTimeout(injectIntoExistingIframes, 50);
        setTimeout(injectIntoExistingIframes, 100);
        setTimeout(injectIntoExistingIframes, 200);
        setTimeout(injectIntoExistingIframes, 500);
        
        // Check again after page is fully loaded
        setTimeout(() => {
          const canvases = scope.document.querySelectorAll('canvas');
          // Check if any scripts are creating canvases programmatically
          const iframes = scope.document.querySelectorAll('iframe');
          // Check iframes for canvas elements
          iframes.forEach((iframe, i) => {
            try {
              const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
              if (iframeDoc) {
                const iframeCanvases = iframeDoc.querySelectorAll('canvas');
                iframeCanvases.forEach((canvas, j) => {
                  });
              } else {
              }
            } catch (e) {
              }
          });
          
          // Check if there are any detached canvases (created but not added to DOM)
          // Force a test to see if our wrappers work
          try {
            const testCanvas = scope.document.createElement('canvas');
            testCanvas.width = 100;
            testCanvas.height = 100;
            const ctx = testCanvas.getContext('2d');
            ctx.fillText('test', 10, 10);
            const dataUrl = testCanvas.toDataURL();
            } catch (e) {
            }
        }, 3000);
      }

      // Wrap OffscreenCanvas if available
      if (scope.OffscreenCanvas) {
        const OriginalOffscreenCanvas = scope.OffscreenCanvas;
        scope.OffscreenCanvas = function OffscreenCanvas(width, height) {
          const canvas = new OriginalOffscreenCanvas(width, height);
          
          // Wrap convertToBlob on OffscreenCanvas
          if (canvas.convertToBlob) {
            const originalConvertToBlob = canvas.convertToBlob;
            canvas.convertToBlob = function(...args) {
              // OffscreenCanvas doesn't support our mutation technique well
              // Just log it for now
              return originalConvertToBlob.apply(this, args);
            };
          }
          
          return canvas;
        };
        scope.OffscreenCanvas.prototype = OriginalOffscreenCanvas.prototype;
      }

      // Wrap document.createElement to catch canvas creation
      if (scope.document && scope.document.createElement) {
        const originalCreateElement = scope.document.createElement;
        scope.document.createElement = function createElement(tagName, options) {
          const element = originalCreateElement.call(this, tagName, options);
          
          if (tagName && tagName.toLowerCase() === 'canvas' && element.toDataURL) {
            const canvas = element;
            
            // Immediately wrap toDataURL on creation
            const originalToDataURL = canvas.toDataURL;
            canvas.toDataURL = function(...args) {
              const { canvas: target, mutated } = prepareMutatedCanvas(canvas, 'toDataURL', args[0] || '');
              if (!mutated) {
                } else {
                }
              const destination = target && typeof target.toDataURL === 'function' ? target : canvas;
              return originalToDataURL.apply(destination, args);
            };
            
            // Also wrap getImageData when getContext is called
            const originalGetContext = canvas.getContext;
            canvas.getContext = function(...args) {
              const ctx = originalGetContext.apply(this, args);
              
              // Wrap getImageData if it's a 2D context
              if (args[0] === '2d' && ctx && ctx.getImageData && !ctx.__stealthyGetImageDataWrapped) {
                const originalGetImageData = ctx.getImageData;
                ctx.getImageData = function(...args) {
                  const imageData = originalGetImageData.apply(this, args);
                  try {
                    if (imageData && imageData.data) {
                      const c = this && this.canvas ? this.canvas : { width: imageData.width, height: imageData.height };
                      mutateImageData(imageData, makeKey('getImageData', c.width, c.height, args.join('|')));
                      }
                  } catch (e) {
                    }
                  return imageData;
                };
                ctx.__stealthyGetImageDataWrapped = true;
              }
              
              return ctx;
            };
          }
          
          return element;
        };
        registerSignature(scope.document.createElement, originalCreateElement);
      }

      // Add MutationObserver to watch for canvas AND iframe elements added to DOM
      if (scope.document && scope.MutationObserver) {
        const observer = new scope.MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeName === 'CANVAS') {
                // Wrap toDataURL on this canvas if not already wrapped
                if (node.toDataURL && !node.toDataURL.__stealthyWrapped) {
                  const originalToDataURL = node.toDataURL;
                  node.toDataURL = function(...args) {
                    return wrappedToDataURL.apply(this, args);
                  };
                  node.toDataURL.__stealthyWrapped = true;
                }
              } else if (node.nodeName === 'IFRAME') {
                
                // Inject our protection into the iframe when it loads
                const injectIntoIframe = () => {
                  try {
                    const iframeWindow = node.contentWindow;
                    const iframeDoc = node.contentDocument || iframeWindow?.document;
                    
                    if (iframeDoc && iframeWindow) {
                      // Re-run all our patching in the iframe context
                      const iframeScope = iframeWindow;
                      
                      // Patch the iframe's canvas APIs
                      if (iframeScope.HTMLCanvasElement && iframeScope.HTMLCanvasElement.prototype) {
                        patchCanvasPrototype(iframeScope.HTMLCanvasElement.prototype, iframeScope);
                        patchGetContext(iframeScope.HTMLCanvasElement.prototype);
                      }
                      
                      if (iframeScope.CanvasRenderingContext2D && iframeScope.CanvasRenderingContext2D.prototype) {
                        patchContext2D(iframeScope.CanvasRenderingContext2D.prototype);
                        patchTextDrawing(iframeScope.CanvasRenderingContext2D.prototype);
                      }
                      
                      // Patch iframe's document.createElement
                      if (iframeDoc.createElement) {
                        const originalIframeCreateElement = iframeDoc.createElement;
                        iframeDoc.createElement = function(tagName, options) {
                          const element = originalIframeCreateElement.call(this, tagName, options);
                          
                          if (tagName && tagName.toLowerCase() === 'canvas' && element.toDataURL) {
                            const canvas = element;
                            
                            const originalToDataURL = canvas.toDataURL;
                            canvas.toDataURL = function(...args) {
                              const result = wrappedToDataURL.apply(canvas, args);
                              return result;
                            };
                            
                            const originalGetContext = canvas.getContext;
                            canvas.getContext = function(...args) {
                              const ctx = originalGetContext.apply(this, args);
                              
                              if (args[0] === '2d' && ctx && ctx.getImageData && !ctx.__stealthyGetImageDataWrapped) {
                                const originalGetImageData = ctx.getImageData;
                                ctx.getImageData = function(...args) {
                                  const imageData = originalGetImageData.apply(this, args);
                                  try {
                                    if (imageData && imageData.data) {
                                      const c = this && this.canvas ? this.canvas : { width: imageData.width, height: imageData.height };
                                      mutateImageData(imageData, makeKey('getImageData', c.width, c.height, args.join('|')));
                                      }
                                  } catch (e) {
                                    }
                                  return imageData;
                                };
                                ctx.__stealthyGetImageDataWrapped = true;
                              }
                              
                              return ctx;
                            };
                          }
                          
                          return element;
                        };
                        registerSignature(iframeDoc.createElement, originalIframeCreateElement);
                      }
                    } else {
                    }
                  } catch (e) {
                    }
                };
                
                // Try to inject immediately
                injectIntoIframe();
                
                // Also try after load event
                node.addEventListener('load', () => {
                  injectIntoIframe();
                });
              }
            });
          });
        });
        
        // Start observing once document is ready
        if (scope.document.body) {
          observer.observe(scope.document.body, { childList: true, subtree: true });
          } else {
          scope.document.addEventListener('DOMContentLoaded', () => {
            if (scope.document.body) {
              observer.observe(scope.document.body, { childList: true, subtree: true });
              }
          });
        }
      }

      const patchOfflineAudioContext = () => {
        const OfflineAudioContextCtor = scope.OfflineAudioContext || scope.webkitOfflineAudioContext || scope.webkitOfflineAudioContext;
        const proto = OfflineAudioContextCtor && OfflineAudioContextCtor.prototype;
        if (!proto) {
          return;
        }

        const originalStartRendering = proto.startRendering;
        if (originalStartRendering && !originalStartRendering.__stealthyWrapped) {
          const wrappedStartRendering = function startRendering(...args) {
            let contextKey = null;
            try {
              contextKey = getOfflineContextKey(this);
              const rng = mulberry32(cyrb53(contextKey));
              if (!audioGraphCache.has(this)) {
                const osc = this.createOscillator();
                const gainNode = this.createGain();
                const biquad = this.createBiquadFilter();
                const analyser = this.createAnalyser();

                osc.type = 'triangle';
                osc.frequency.value = 130 + rng() * 340;

                gainNode.gain.value = 0.18 + rng() * 0.18;

                biquad.type = 'bandpass';
                biquad.frequency.value = 420 + rng() * 1200;
                biquad.Q.value = 0.9 + rng() * 5.2;

                osc.connect(gainNode);
                gainNode.connect(biquad);
                biquad.connect(analyser);
                analyser.connect(this.destination);

                osc.start(0);

                audioGraphCache.set(this, {
                  osc,
                  gainNode,
                  biquad,
                  analyser
                });
              }

              const graph = audioGraphCache.get(this);
              if (graph) {
                graph.osc.detune.value = (rng() - 0.5) * 42;
                graph.biquad.frequency.value = Math.max(220, graph.biquad.frequency.value * (0.992 + rng() * 0.018));
                graph.biquad.Q.value = Math.max(0.4, graph.biquad.Q.value + (rng() - 0.5) * 0.12);
                graph.gainNode.gain.value = clamp(graph.gainNode.gain.value + (rng() - 0.5) * 0.015, 0.05, 0.45);
              }
            } catch (_) {
              // Ignore audio seed preparation failures
            }

            const result = originalStartRendering.apply(this, args);
            if (result && typeof result.then === 'function') {
              return result.then((buffer) => {
                try {
                  perturbAudioBuffer(buffer, contextKey || getOfflineContextKey(this));
                } catch (_) {
                  // Ignore buffer perturbation errors
                }
                return buffer;
              });
            }
            try {
              const key = contextKey || getOfflineContextKey(this);
              if (result && typeof result === 'object' && 'renderedBuffer' in result) {
                perturbAudioBuffer(result.renderedBuffer, key);
              }
            } catch (_) {
              // Ignore sync perturbation failures
            }
            return result;
          };

          Object.defineProperty(proto, 'startRendering', {
            value: wrappedStartRendering,
            configurable: true,
            writable: true
          });
          registerSignature(wrappedStartRendering, originalStartRendering);
          Object.defineProperty(originalStartRendering, '__stealthyWrapped', {
            value: true,
            enumerable: false
          });
        }

        const originalAddEventListener = proto.addEventListener;
        if (originalAddEventListener && !originalAddEventListener.__stealthyWrapped) {
          const wrappedAddEventListener = function addEventListener(type, listener, options) {
            if (String(type || '').toLowerCase() === 'complete' && listener) {
              const registry = getCompleteListenerRegistry(this);
              let wrappedRecord = registry.get(listener);
              if (!wrappedRecord) {
                if (typeof listener === 'function') {
                  const wrapped = wrapCompleteHandler(this, listener);
                  wrappedRecord = { wrapped, original: listener };
                  registry.set(listener, wrappedRecord);
                } else if (typeof listener === 'object' && typeof listener.handleEvent === 'function') {
                  const wrappedHandler = wrapCompleteHandler(this, listener.handleEvent.bind(listener));
                  const proxyListener = {
                    handleEvent(event) {
                      return wrappedHandler(event);
                    }
                  };
                  registerSignature(proxyListener.handleEvent, listener.handleEvent);
                  wrappedRecord = { wrapped: proxyListener, original: listener };
                  registry.set(listener, wrappedRecord);
                }
              }
              if (wrappedRecord) {
                return originalAddEventListener.call(this, type, wrappedRecord.wrapped, options);
              }
            }
            return originalAddEventListener.apply(this, arguments);
          };

          Object.defineProperty(proto, 'addEventListener', {
            value: wrappedAddEventListener,
            configurable: true,
            writable: true
          });
          registerSignature(wrappedAddEventListener, originalAddEventListener);
          Object.defineProperty(originalAddEventListener, '__stealthyWrapped', {
            value: true,
            enumerable: false
          });
        }

        const originalRemoveEventListener = proto.removeEventListener;
        if (originalRemoveEventListener && !originalRemoveEventListener.__stealthyWrapped) {
          const wrappedRemoveEventListener = function removeEventListener(type, listener, options) {
            if (String(type || '').toLowerCase() === 'complete' && listener) {
              const registry = getCompleteListenerRegistry(this);
              const wrappedRecord = registry.get(listener);
              if (wrappedRecord) {
                registry.delete(listener);
                return originalRemoveEventListener.call(this, type, wrappedRecord.wrapped, options);
              }
            }
            return originalRemoveEventListener.apply(this, arguments);
          };

          Object.defineProperty(proto, 'removeEventListener', {
            value: wrappedRemoveEventListener,
            configurable: true,
            writable: true
          });
          registerSignature(wrappedRemoveEventListener, originalRemoveEventListener);
          Object.defineProperty(originalRemoveEventListener, '__stealthyWrapped', {
            value: true,
            enumerable: false
          });
        }

        const oncompleteDescriptor = Object.getOwnPropertyDescriptor(proto, 'oncomplete');
        if (oncompleteDescriptor && typeof oncompleteDescriptor.set === 'function' && !oncompleteDescriptor.set.__stealthyWrapped) {
          const originalGetter = oncompleteDescriptor.get;
          const originalSetter = oncompleteDescriptor.set;
          const wrappedGetter = function oncompleteGetter() {
            const stored = onCompleteHandlerStore.get(this);
            if (stored) {
              return stored.original;
            }
            return originalGetter ? originalGetter.call(this) : undefined;
          };
          const wrappedSetter = function oncompleteSetter(handler) {
            if (typeof handler !== 'function') {
              onCompleteHandlerStore.delete(this);
              if (typeof originalSetter === 'function') {
                return originalSetter.call(this, handler);
              }
              return undefined;
            }
            const wrapped = wrapCompleteHandler(this, handler);
            onCompleteHandlerStore.set(this, { original: handler, wrapped });
            if (typeof originalSetter === 'function') {
              return originalSetter.call(this, wrapped);
            }
            return undefined;
          };

          Object.defineProperty(proto, 'oncomplete', {
            configurable: oncompleteDescriptor.configurable !== false,
            enumerable: oncompleteDescriptor.enumerable === true,
            get: wrappedGetter,
            set: wrappedSetter
          });

          if (originalGetter) {
            registerSignature(wrappedGetter, originalGetter);
            Object.defineProperty(originalGetter, '__stealthyWrapped', {
              value: true,
              enumerable: false
            });
          }

          if (originalSetter) {
            registerSignature(wrappedSetter, originalSetter);
            Object.defineProperty(originalSetter, '__stealthyWrapped', {
              value: true,
              enumerable: false
            });
          }
        }

        const originalConstructor = OfflineAudioContextCtor;
        if (!originalConstructor.__stealthyWrapped) {
          const wrappedConstructor = new Proxy(originalConstructor, {
            construct(target, args, newTarget) {
              const instance = Reflect.construct(target, args, newTarget);
              try {
                audioGraphCache.set(instance, null);
                const contextKey = getOfflineContextKey(instance);
                offlineContextKeyCache.set(instance, contextKey);
              } catch (_) {
                // Ignore cache preparation failures
              }
              return instance;
            }
          });

          registerSignature(wrappedConstructor, originalConstructor);

          scope.OfflineAudioContext = wrappedConstructor;
          if ('webkitOfflineAudioContext' in scope) {
            scope.webkitOfflineAudioContext = wrappedConstructor;
          }

          Object.defineProperty(originalConstructor, '__stealthyWrapped', {
            value: true,
            enumerable: false
          });
        }
      };

        const patchAudioContextAttributes = () => {
          const audioContextProto = scope.AudioContext && scope.AudioContext.prototype;
          if (audioContextProto) {
            const baseLatencyDescriptor = Object.getOwnPropertyDescriptor(audioContextProto, 'baseLatency');
            if (baseLatencyDescriptor && typeof baseLatencyDescriptor.get === 'function' && !baseLatencyDescriptor.get.__stealthyWrapped) {
              const originalGet = baseLatencyDescriptor.get;
              const wrappedGet = function baseLatencyGetter() {
                const value = originalGet.call(this);
                try {
                  return computeLatencyVariant(this, value, 'audioBaseLatency', baseLatencyCache);
                } catch (_) {
                  return value;
                }
              };

              Object.defineProperty(audioContextProto, 'baseLatency', {
                configurable: baseLatencyDescriptor.configurable !== false,
                enumerable: baseLatencyDescriptor.enumerable === true,
                get: wrappedGet,
                set: baseLatencyDescriptor.set
              });

              registerSignature(wrappedGet, originalGet);
              Object.defineProperty(originalGet, '__stealthyWrapped', {
                value: true,
                enumerable: false
              });
            }

            const outputLatencyDescriptor = Object.getOwnPropertyDescriptor(audioContextProto, 'outputLatency');
            if (outputLatencyDescriptor && typeof outputLatencyDescriptor.get === 'function' && !outputLatencyDescriptor.get.__stealthyWrapped) {
              const originalGet = outputLatencyDescriptor.get;
              const wrappedGet = function outputLatencyGetter() {
                const value = originalGet.call(this);
                try {
                  return computeLatencyVariant(this, value, 'audioOutputLatency', outputLatencyCache);
                } catch (_) {
                  return value;
                }
              };

              Object.defineProperty(audioContextProto, 'outputLatency', {
                configurable: outputLatencyDescriptor.configurable !== false,
                enumerable: outputLatencyDescriptor.enumerable === true,
                get: wrappedGet,
                set: outputLatencyDescriptor.set
              });

              registerSignature(wrappedGet, originalGet);
              Object.defineProperty(originalGet, '__stealthyWrapped', {
                value: true,
                enumerable: false
              });
            }
          }

          const destinationProto = scope.AudioDestinationNode && scope.AudioDestinationNode.prototype;
          if (destinationProto) {
            const descriptor = Object.getOwnPropertyDescriptor(destinationProto, 'maxChannelCount');
            if (descriptor && typeof descriptor.get === 'function' && !descriptor.get.__stealthyWrapped) {
              const originalGet = descriptor.get;
              const wrappedGet = function maxChannelCountGetter() {
                const value = originalGet.call(this);
                try {
                  return computeMaxChannelCountVariant(this, value);
                } catch (_) {
                  return value;
                }
              };

              Object.defineProperty(destinationProto, 'maxChannelCount', {
                configurable: descriptor.configurable !== false,
                enumerable: descriptor.enumerable === true,
                get: wrappedGet,
                set: descriptor.set
              });

              registerSignature(wrappedGet, originalGet);
              Object.defineProperty(originalGet, '__stealthyWrapped', {
                value: true,
                enumerable: false
              });
            }
          }
        };

      patchOfflineAudioContext();
        patchAudioContextAttributes();

      const patchOffscreenCanvas = () => {
        const OffscreenCanvasConstructor = scope.OffscreenCanvas;
        if (!OffscreenCanvasConstructor || !OffscreenCanvasConstructor.prototype) {
          return;
        }

        const proto = OffscreenCanvasConstructor.prototype;

        const wrapMethod = (methodName, tag) => {
          const original = proto[methodName];
          if (!original || original.__stealthyWrapped) {
            return;
          }

          const wrapped = function wrappedMethod(...args) {
            let extra = '';
            if (typeof args[0] === 'string') {
              extra = args[0];
            } else if (args[0] && typeof args[0] === 'object' && args[0].type) {
              extra = args[0].type;
            }
            const { canvas: target } = prepareMutatedCanvas(this, tag, extra);
            const destination = target || this;
            return original.apply(destination, args);
          };

          Object.defineProperty(proto, methodName, {
            value: wrapped,
            configurable: true,
            writable: true
          });
          registerSignature(wrapped, original);
          Object.defineProperty(original, '__stealthyWrapped', {
            value: true,
            enumerable: false
          });
        };

        wrapMethod('toDataURL', 'offscreen-toDataURL');
        wrapMethod('toBlob', 'offscreen-toBlob');

        const originalConvertToBlob = proto.convertToBlob;
        if (originalConvertToBlob && !originalConvertToBlob.__stealthyWrapped) {
          const wrappedConvertToBlob = function convertToBlob(...args) {
            const options = args[0];
            const extra = options && typeof options === 'object' && options.type ? options.type : '';
            const { canvas: target } = prepareMutatedCanvas(this, 'offscreen-convertToBlob', extra);
            const destination = target || this;
            return originalConvertToBlob.apply(destination, args);
          };

          Object.defineProperty(proto, 'convertToBlob', {
            value: wrappedConvertToBlob,
            configurable: true,
            writable: true
          });
          registerSignature(wrappedConvertToBlob, originalConvertToBlob);
          Object.defineProperty(originalConvertToBlob, '__stealthyWrapped', {
            value: true,
            enumerable: false
          });
        }
      };

      patchOffscreenCanvas();

      const patchFontFingerprinting = () => {
        // Generate consistent random font list based on seed with much more variation
        const generateFontList = () => {
          // Expanded font list with more variety
          const allFonts = [
            'Andale Mono', 'Arial', 'Arial Black', 'Arial Hebrew', 'Arial MT', 
            'Arial Narrow', 'Arial Rounded MT Bold', 'Arial Unicode MS', 
            'Bitstream Vera Sans Mono', 'Book Antiqua', 'Bookman Old Style', 
            'Calibri', 'Cambria', 'Cambria Math', 'Century', 'Century Gothic', 
            'Century Schoolbook', 'Comic Sans', 'Comic Sans MS', 'Consolas', 
            'Courier', 'Courier New', 'Garamond', 'Geneva', 'Georgia', 
            'Helvetica', 'Helvetica Neue', 'Impact', 'Lucida Bright', 
            'Lucida Calligraphy', 'Lucida Console', 'Lucida Fax', 'LUCIDA GRANDE', 
            'Lucida Handwriting', 'Lucida Sans', 'Lucida Sans Typewriter', 
            'Lucida Sans Unicode', 'Microsoft Sans Serif', 'Monaco', 
            'Monotype Corsiva', 'MS Gothic', 'MS Outlook', 'MS PGothic', 
            'MS Reference Sans Serif', 'MS Sans Serif', 'MS Serif', 'Palatino', 
            'Palatino Linotype', 'Segoe Print', 'Segoe Script', 'Segoe UI', 
            'Segoe UI Light', 'Segoe UI Semibold', 'Segoe UI Symbol', 'Tahoma', 
            'Times', 'Times New Roman', 'Times New Roman PS', 'Trebuchet MS', 
            'Verdana', 'Wingdings', 'Wingdings 2', 'Wingdings 3',
            // Additional fonts for more variety
            'Agency FB', 'Algerian', 'Bauhaus 93', 'Bell MT', 'Berlin Sans FB',
            'Bernard MT Condensed', 'Bodoni MT', 'Bodoni MT Poster Compressed',
            'Bradley Hand ITC', 'Britannic Bold', 'Broadway', 'Brush Script MT',
            'Californian FB', 'Castellar', 'Centaur', 'Chiller', 'Colonna MT',
            'Cooper Black', 'Copperplate Gothic', 'Curlz MT', 'Edwardian Script ITC',
            'Elephant', 'Engravers MT', 'Eras Bold ITC', 'Felix Titling',
            'Footlight MT Light', 'Forte', 'Franklin Gothic', 'French Script MT',
            'Gabriola', 'Gigi', 'Gill Sans MT', 'Gloucester MT Extra Condensed',
            'Goudy Old Style', 'Goudy Stout', 'Haettenschweiler', 'Harlow Solid Italic',
            'Harrington', 'High Tower Text', 'Imprint MT Shadow', 'Informal Roman',
            'Jokerman', 'Juice ITC', 'Kristen ITC', 'Kunstler Script',
            'Magneto', 'Maiandra GD', 'Matura MT Script Capitals', 'Mistral',
            'Modern No. 20', 'Niagara Engraved', 'Old English Text MT', 'Onyx',
            'Papyrus', 'Parchment', 'Perpetua', 'Playbill', 'Poor Richard',
            'Ravie', 'Rockwell', 'Script MT Bold', 'Showcard Gothic', 'Snap ITC',
            'Stencil', 'Tw Cen MT', 'Viner Hand ITC', 'Vivaldi', 'Vladimir Script'
          ];
          
          const rng = mulberry32(cyrb53(seed + '|font-list'));
          
          // More realistic font count: 70-105 fonts (close to real browser ~91)
          const numFonts = 70 + Math.floor(rng() * 36);
          
          // Shuffle fonts array for randomized selection
          const shuffled = [...allFonts];
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          
          // Take first N fonts and sort them
          return shuffled.slice(0, numFonts).sort();
        };

        const spoofedFontList = generateFontList();

        // Helper to check if a font is in our spoofed list
        const isFontAvailable = (fontFamily) => {
          if (!fontFamily) return false;
          const cleanFont = fontFamily.toLowerCase().replace(/['"]/g, '').trim().split(',')[0].trim();
          return spoofedFontList.some(f => f.toLowerCase() === cleanFont);
        };

        // Intercept text measurement methods
        const patchTextMetrics = (ContextPrototype) => {
          if (!ContextPrototype) return;

          const originalMeasureText = ContextPrototype.measureText;
          if (originalMeasureText && !originalMeasureText.__stealthyFontWrapped) {
            const wrappedMeasureText = function measureText(text) {
              const metrics = originalMeasureText.call(this, text);
              
              if (textMetricsCache.has(metrics)) {
                return textMetricsCache.get(metrics);
              }

              // Extract font family from canvas font property (e.g., "12px Arial")
              const font = this && typeof this.font === 'string' ? this.font : '';
              let fontFamily = '';
              
              if (font) {
                // Try to extract quoted font name
                const quotedMatch = font.match(/['"](.*?)['"]/);
                if (quotedMatch) {
                  fontFamily = quotedMatch[1];
                } else {
                  // Extract last word (font family comes last)
                  const parts = font.split(/\s+/);
                  fontFamily = parts[parts.length - 1];
                }
              }
              
              const isAvailable = isFontAvailable(fontFamily);
              
              let spoofedMetrics;
              
              if (isAvailable) {
                // Font is available - add variations
                const key = makeKey('textMetrics', font, text || '', '');
                const rng = mulberry32(cyrb53(key));
                
                const widthVariation = (rng() - 0.5) * 2.0; // ±1.0px
                const heightVariation = (rng() - 0.5) * 1.1; // ±0.55px
                
                spoofedMetrics = {
                  width: metrics.width + widthVariation,
                  actualBoundingBoxAscent: metrics.actualBoundingBoxAscent + heightVariation * 0.5,
                  actualBoundingBoxDescent: metrics.actualBoundingBoxDescent + heightVariation * 0.3,
                  actualBoundingBoxLeft: metrics.actualBoundingBoxLeft + (rng() - 0.5) * 0.4,
                  actualBoundingBoxRight: metrics.actualBoundingBoxRight + widthVariation,
                  fontBoundingBoxAscent: metrics.fontBoundingBoxAscent + heightVariation,
                  fontBoundingBoxDescent: metrics.fontBoundingBoxDescent + heightVariation * 0.4,
                  alphabeticBaseline: metrics.alphabeticBaseline,
                  hangingBaseline: metrics.hangingBaseline,
                  ideographicBaseline: metrics.ideographicBaseline,
                  emHeightAscent: metrics.emHeightAscent,
                  emHeightDescent: metrics.emHeightDescent
                };
              } else {
                // Font NOT available - return consistent fallback metrics
                const textLength = (text || '').length;
                const fallbackKey = makeKey('textMetrics', 'fallback', String(textLength), '');
                const rng = mulberry32(cyrb53(fallbackKey));
                
                // Consistent fallback based on text length
                const fallbackWidth = textLength * (7 + rng() * 2); // ~7-9px per character
                
                spoofedMetrics = {
                  width: fallbackWidth,
                  actualBoundingBoxAscent: 10 + rng() * 2,
                  actualBoundingBoxDescent: 2 + rng() * 1,
                  actualBoundingBoxLeft: 0,
                  actualBoundingBoxRight: fallbackWidth,
                  fontBoundingBoxAscent: 11 + rng() * 2,
                  fontBoundingBoxDescent: 3 + rng() * 1,
                  alphabeticBaseline: 0,
                  hangingBaseline: metrics.hangingBaseline || 0,
                  ideographicBaseline: metrics.ideographicBaseline || 0,
                  emHeightAscent: metrics.emHeightAscent || 0,
                  emHeightDescent: metrics.emHeightDescent || 0
                };
              }
              
              textMetricsCache.set(metrics, spoofedMetrics);
              return spoofedMetrics;
            };

            Object.defineProperty(ContextPrototype, 'measureText', {
              value: wrappedMeasureText,
              configurable: true,
              writable: true
            });
            registerSignature(wrappedMeasureText, originalMeasureText);
            Object.defineProperty(originalMeasureText, '__stealthyFontWrapped', {
              value: true,
              enumerable: false
            });
          }
        };

        // Patch HTMLElement offsetWidth/offsetHeight for font detection
        const patchOffsetDimensions = () => {
          if (!scope.HTMLElement || !scope.HTMLElement.prototype) return;

          const proto = scope.HTMLElement.prototype;
          
          const offsetWidthDesc = Object.getOwnPropertyDescriptor(proto, 'offsetWidth');
          if (offsetWidthDesc && typeof offsetWidthDesc.get === 'function' && !offsetWidthDesc.get.__stealthyFontWrapped) {
            const originalGet = offsetWidthDesc.get;
            const wrappedGet = function offsetWidthGetter() {
              const value = originalGet.call(this);
              
              // Check if this is likely a font detection span
              if (this.style && this.style.fontFamily && this.textContent) {
                const fontFamily = this.style.fontFamily || '';
                const text = this.textContent || '';
                
                // If testing fonts, check if font is in our list
                if (text.length > 0 && text.length < 200) {
                  const isAvailable = isFontAvailable(fontFamily);
                  
                  if (isAvailable) {
                    // Font is available - add small variation
                    const key = makeKey('offsetWidth', fontFamily, text, this.style.fontSize || '');
                    const rng = mulberry32(cyrb53(key));
                    const variation = (rng() - 0.5) * 2.5; // ±1.25px
                    return value + variation;
                  } else {
                    // Font NOT available - return fallback font size (make it same as fallback)
                    // This makes unavailable fonts have identical measurements to the fallback
                    const fallbackKey = makeKey('offsetWidth', 'fallback', text, this.style.fontSize || '');
                    const fallbackRng = mulberry32(cyrb53(fallbackKey));
                    const baseValue = 50 + Math.floor(fallbackRng() * 20); // Consistent fallback size
                    return baseValue;
                  }
                }
              }
              
              return value;
            };

            Object.defineProperty(proto, 'offsetWidth', {
              configurable: offsetWidthDesc.configurable !== false,
              enumerable: offsetWidthDesc.enumerable === true,
              get: wrappedGet,
              set: offsetWidthDesc.set
            });
            registerSignature(wrappedGet, originalGet);
            Object.defineProperty(originalGet, '__stealthyFontWrapped', {
              value: true,
              enumerable: false
            });
          }

          const offsetHeightDesc = Object.getOwnPropertyDescriptor(proto, 'offsetHeight');
          if (offsetHeightDesc && typeof offsetHeightDesc.get === 'function' && !offsetHeightDesc.get.__stealthyFontWrapped) {
            const originalGet = offsetHeightDesc.get;
            const wrappedGet = function offsetHeightGetter() {
              const value = originalGet.call(this);
              
              if (this.style && this.style.fontFamily && this.textContent) {
                const fontFamily = this.style.fontFamily || '';
                const text = this.textContent || '';
                
                if (text.length > 0 && text.length < 200) {
                  const isAvailable = isFontAvailable(fontFamily);
                  
                  if (isAvailable) {
                    // Font is available - add small variation
                    const key = makeKey('offsetHeight', fontFamily, text, this.style.fontSize || '');
                    const rng = mulberry32(cyrb53(key));
                    const variation = (rng() - 0.5) * 2.0; // ±1.0px
                    return value + variation;
                  } else {
                    // Font NOT available - return fallback font size
                    const fallbackKey = makeKey('offsetHeight', 'fallback', text, this.style.fontSize || '');
                    const fallbackRng = mulberry32(cyrb53(fallbackKey));
                    const baseValue = 14 + Math.floor(fallbackRng() * 8); // Consistent fallback height
                    return baseValue;
                  }
                }
              }
              
              return value;
            };

            Object.defineProperty(proto, 'offsetHeight', {
              configurable: offsetHeightDesc.configurable !== false,
              enumerable: offsetHeightDesc.enumerable === true,
              get: wrappedGet,
              set: offsetHeightDesc.set
            });
            registerSignature(wrappedGet, originalGet);
            Object.defineProperty(originalGet, '__stealthyFontWrapped', {
              value: true,
              enumerable: false
            });
          }
        };

        // Patch FontFaceSet API (document.fonts)
        const patchFontFaceSet = () => {
          if (!scope.document || !scope.document.fonts) return;

          const fontsObj = scope.document.fonts;
          
          // Patch check method
          if (typeof fontsObj.check === 'function') {
            const originalCheck = fontsObj.check.bind(fontsObj);
            if (!originalCheck.__stealthyFontWrapped) {
              const wrappedCheck = function check(font, text) {
                // Extract font family from font string (e.g., "12px Arial", "bold 16px 'Comic Sans'")
                let fontFamily = '';
                const fontStr = String(font || '');
                
                // Try to extract quoted font name first
                const quotedMatch = fontStr.match(/['"](.*?)['"]/);
                if (quotedMatch) {
                  fontFamily = quotedMatch[1];
                } else {
                  // Extract last word after size (e.g., "12px Arial" -> "Arial")
                  const parts = fontStr.split(/\s+/);
                  fontFamily = parts[parts.length - 1];
                }
                
                // Clean up font family name
                fontFamily = fontFamily.trim().replace(/['"]/g, '');
                
                // Return true only for exact matches in our spoofed font list
                const isAvailable = spoofedFontList.some(f => 
                  f.toLowerCase() === fontFamily.toLowerCase()
                );
                
                return isAvailable;
              };

              try {
                Object.defineProperty(fontsObj, 'check', {
                  value: wrappedCheck,
                  configurable: true,
                  writable: true
                });
                registerSignature(wrappedCheck, originalCheck);
                Object.defineProperty(originalCheck, '__stealthyFontWrapped', {
                  value: true,
                  enumerable: false
                });
              } catch (_) {
                // Ignore if we can't patch
              }
            }
          }

          // Patch size property to return consistent value
          const sizeDesc = Object.getOwnPropertyDescriptor(fontsObj, 'size');
          if (sizeDesc && typeof sizeDesc.get === 'function' && !sizeDesc.get.__stealthyFontWrapped) {
            const originalGet = sizeDesc.get;
            const wrappedGet = function sizeGetter() {
              return spoofedFontList.length;
            };

            try {
              Object.defineProperty(fontsObj, 'size', {
                configurable: sizeDesc.configurable !== false,
                enumerable: sizeDesc.enumerable === true,
                get: wrappedGet,
                set: sizeDesc.set
              });
              registerSignature(wrappedGet, originalGet);
              Object.defineProperty(originalGet, '__stealthyFontWrapped', {
                value: true,
                enumerable: false
              });
            } catch (_) {
              // Ignore if we can't patch
            }
          }
        };

        // Apply all font fingerprinting patches
        patchTextMetrics(scope.CanvasRenderingContext2D && scope.CanvasRenderingContext2D.prototype);
        patchTextMetrics(scope.OffscreenCanvasRenderingContext2D && scope.OffscreenCanvasRenderingContext2D.prototype);
        patchOffsetDimensions();
        patchFontFaceSet();

        };

      patchFontFingerprinting();

      // Realistic Windows Chrome profiles
      const generateWindowsProfile = () => {
        const rng = mulberry32(cyrb53(seed + '|profile'));
        
        // Common Windows configurations that look natural together
        // Note: Screen resolution comes from actual browser viewport
        const profiles = [
          // Modern gaming/workstation PCs
          { cores: 8, memory: 16 },
          { cores: 12, memory: 16 },
          { cores: 16, memory: 32 },
          { cores: 6, memory: 16 },
          
          // Standard office/home PCs
          { cores: 4, memory: 8 },
          { cores: 4, memory: 16 },
          { cores: 6, memory: 8 },
          
          // Laptops
          { cores: 4, memory: 8 },
          { cores: 8, memory: 16 },
          { cores: 6, memory: 8 },
          
          // Budget systems
          { cores: 2, memory: 4 },
          { cores: 4, memory: 8 }
        ];
        
        return profiles[Math.floor(rng() * profiles.length)];
      };

      const windowsProfile = generateWindowsProfile();

      // Patch hardware concurrency (CPU cores) - Windows typical
      const patchHardwareConcurrency = () => {
        try {
          Object.defineProperty(scope.navigator, 'hardwareConcurrency', {
            get: () => windowsProfile.cores,
            configurable: true
          });
        } catch (_) {}
      };

      // Patch device memory - matched to hardware profile
      const patchDeviceMemory = () => {
        try {
          Object.defineProperty(scope.navigator, 'deviceMemory', {
            get: () => windowsProfile.memory,
            configurable: true
          });
        } catch (_) {}
      };

      // Patch screen properties - DON'T override, just ensure consistency
      // The actual screen size comes from the browser viewport set by Playwright
      const patchScreen = () => {
        try {
          // Don't override screen dimensions - they should match actual viewport
          // Only ensure colorDepth is realistic
          const colorDepth = 24; // Standard for Windows
          
          Object.defineProperties(scope.screen, {
            colorDepth: { get: () => colorDepth, configurable: true },
            pixelDepth: { get: () => colorDepth, configurable: true }
          });
        } catch (_) {}
      };

      // Don't patch timezone - keep system timezone (more realistic)
      // Fingerprint.com expects timezone to match IP location generally

      // Patch languages - keep simple and realistic for Windows
      const patchLanguages = () => {
        try {
          const rng = mulberry32(cyrb53(seed + '|languages'));
          
          // Most common Windows language configurations
          const languageSets = [
            ['en-US', 'en'],
            ['en-GB', 'en'],
            ['en-US'],
            ['en-GB']
          ];
          
          const languages = languageSets[Math.floor(rng() * languageSets.length)];
          
          Object.defineProperty(scope.navigator, 'languages', {
            get: () => languages,
            configurable: true
          });
          
          Object.defineProperty(scope.navigator, 'language', {
            get: () => languages[0],
            configurable: true
          });
        } catch (_) {}
      };

      // Patch platform - Always Win32 for Windows Chrome (even on 64-bit Windows)
      const patchPlatform = () => {
        try {
          Object.defineProperty(scope.navigator, 'platform', {
            get: () => 'Win32', // Chrome always reports Win32, even on 64-bit Windows
            configurable: true
          });
        } catch (_) {}
      };

      // Don't remove plugins - modern Chrome returns proper PluginArray
      // Removing them entirely looks suspicious
      const patchPlugins = () => {
        try {
          // Modern Chrome (120+) typically shows 3 PDF-related plugins
          const createPlugin = (name, description, filename) => {
            return {
              name,
              description,
              filename,
              length: 2,
              item: (index) => {
                if (index === 0) return { type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format' };
                if (index === 1) return { type: 'text/pdf', suffixes: 'pdf', description: 'Portable Document Format' };
                return null;
              },
              namedItem: (type) => {
                if (type === 'application/pdf') return { type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format' };
                if (type === 'text/pdf') return { type: 'text/pdf', suffixes: 'pdf', description: 'Portable Document Format' };
                return null;
              },
              [0]: { type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format', enabledPlugin: null },
              [1]: { type: 'text/pdf', suffixes: 'pdf', description: 'Portable Document Format', enabledPlugin: null }
            };
          };

          const plugins = [
            createPlugin('PDF Viewer', 'Portable Document Format', 'internal-pdf-viewer'),
            createPlugin('Chrome PDF Viewer', 'Portable Document Format', 'internal-pdf-viewer'),
            createPlugin('Chromium PDF Viewer', 'Portable Document Format', 'internal-pdf-viewer')
          ];

          // Make plugins link back to themselves
          plugins[0][0].enabledPlugin = plugins[0];
          plugins[0][1].enabledPlugin = plugins[0];
          plugins[1][0].enabledPlugin = plugins[1];
          plugins[1][1].enabledPlugin = plugins[1];
          plugins[2][0].enabledPlugin = plugins[2];
          plugins[2][1].enabledPlugin = plugins[2];

          const pluginArray = {
            length: 3,
            item: (index) => plugins[index] || null,
            namedItem: (name) => plugins.find(p => p.name === name) || null,
            refresh: () => {},
            [Symbol.iterator]: function* () {
              for (let i = 0; i < this.length; i++) {
                yield this[i];
              }
            },
            [0]: plugins[0],
            [1]: plugins[1],
            [2]: plugins[2]
          };

          Object.setPrototypeOf(pluginArray, PluginArray.prototype);

          Object.defineProperty(scope.navigator, 'plugins', {
            get: () => pluginArray,
            configurable: true
          });

          // MimeTypes array with PDF support
          const mimeTypes = [
            { type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format', enabledPlugin: plugins[0] },
            { type: 'text/pdf', suffixes: 'pdf', description: 'Portable Document Format', enabledPlugin: plugins[0] }
          ];

          const mimeTypeArray = {
            length: 2,
            item: (index) => mimeTypes[index] || null,
            namedItem: (type) => mimeTypes.find(m => m.type === type) || null,
            [Symbol.iterator]: function* () {
              for (let i = 0; i < this.length; i++) {
                yield this[i];
              }
            },
            [0]: mimeTypes[0],
            [1]: mimeTypes[1]
          };

          Object.setPrototypeOf(mimeTypeArray, MimeTypeArray.prototype);

          Object.defineProperty(scope.navigator, 'mimeTypes', {
            get: () => mimeTypeArray,
            configurable: true
          });
        } catch (_) {
          // Fallback - keep original values
        }
      };

      // Patch media devices - realistic Windows setup
      const patchMediaDevices = () => {
        try {
          if (!scope.navigator.mediaDevices) return;
          
          const originalEnumerateDevices = scope.navigator.mediaDevices.enumerateDevices;
          if (originalEnumerateDevices && !originalEnumerateDevices.__stealthyWrapped) {
            scope.navigator.mediaDevices.enumerateDevices = async function() {
              const rng = mulberry32(cyrb53(seed + '|media'));
              
              // Realistic Windows device enumeration (when permission not granted)
              return [
                {
                  deviceId: 'default',
                  kind: 'audioinput',
                  label: '',
                  groupId: 'default'
                },
                {
                  deviceId: 'communications',
                  kind: 'audioinput',
                  label: '',
                  groupId: 'communications'
                },
                {
                  deviceId: 'default',
                  kind: 'audiooutput',
                  label: '',
                  groupId: 'default'
                }
              ];
            };
            registerSignature(scope.navigator.mediaDevices.enumerateDevices, originalEnumerateDevices);
            Object.defineProperty(originalEnumerateDevices, '__stealthyWrapped', {
              value: true,
              enumerable: false
            });
          }
        } catch (_) {}
      };

      // Don't remove battery API - just leave it as-is
      // Removing APIs entirely can be a fingerprint signal

      // Patch touch support - most Windows desktops don't have touch
      const patchTouch = () => {
        try {
          const rng = mulberry32(cyrb53(seed + '|touch'));
          
          // 80% of Windows systems don't have touch, 20% do (laptops/2-in-1s)
          const maxTouchPoints = rng() > 0.8 ? 10 : 0;
          
          Object.defineProperty(scope.navigator, 'maxTouchPoints', {
            get: () => maxTouchPoints,
            configurable: true
          });
        } catch (_) {}
      };

      // Patch vendor and product - must match Chrome
      const patchVendor = () => {
        try {
          Object.defineProperty(scope.navigator, 'vendor', {
            get: () => 'Google Inc.',
            configurable: true
          });
        } catch (_) {}
      };

      // DO NOT patch navigator.webdriver - let Patchright handle it natively!
      // Any tampering is detected by creepjs as prototype lies

      // Patch Chrome runtime to prevent detection
      const patchChromeRuntime = () => {
        try {
          if (!scope.chrome) {
            scope.chrome = {
              runtime: {
                connect: null,
                sendMessage: null
              },
              loadTimes: function() {
                // Return realistic loadTimes data
                const now = Date.now();
                return {
                  requestTime: (now - 1000) / 1000,
                  startLoadTime: (now - 800) / 1000,
                  commitLoadTime: (now - 700) / 1000,
                  finishDocumentLoadTime: (now - 400) / 1000,
                  finishLoadTime: (now - 200) / 1000,
                  firstPaintTime: (now - 600) / 1000,
                  firstPaintAfterLoadTime: 0,
                  navigationType: 'Other',
                  wasFetchedViaSpdy: false,
                  wasNpnNegotiated: true,
                  npnNegotiatedProtocol: 'h2',
                  wasAlternateProtocolAvailable: false,
                  connectionInfo: 'h2'
                };
              },
              csi: function() {
                return {
                  pageT: Date.now(),
                  startE: Date.now() - 1000,
                  tran: 15
                };
              },
              app: {}
            };
          } else {
            if (!scope.chrome.runtime) {
              scope.chrome.runtime = {
                connect: null,
                sendMessage: null
              };
            }
            if (!scope.chrome.loadTimes) {
              scope.chrome.loadTimes = function() {
                const now = Date.now();
                return {
                  requestTime: (now - 1000) / 1000,
                  startLoadTime: (now - 800) / 1000,
                  commitLoadTime: (now - 700) / 1000,
                  finishDocumentLoadTime: (now - 400) / 1000,
                  finishLoadTime: (now - 200) / 1000,
                  firstPaintTime: (now - 600) / 1000,
                  firstPaintAfterLoadTime: 0,
                  navigationType: 'Other',
                  wasFetchedViaSpdy: false,
                  wasNpnNegotiated: true,
                  npnNegotiatedProtocol: 'h2',
                  wasAlternateProtocolAvailable: false,
                  connectionInfo: 'h2'
                };
              };
            }
            if (!scope.chrome.csi) {
              scope.chrome.csi = function() {
                return {
                  pageT: Date.now(),
                  startE: Date.now() - 1000,
                  tran: 15
                };
              };
            }
            if (!scope.chrome.app) {
              scope.chrome.app = {};
            }
          }
        } catch (_) {}
      };

      // Prevent iframe contentWindow proxy detection
      const patchIframeProxy = () => {
        try {
          // Override contentWindow and contentDocument getters to avoid proxy detection
          const iframeDesc = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow');
          if (iframeDesc && iframeDesc.get && !iframeDesc.get.__stealthyWrapped) {
            const originalGetter = iframeDesc.get;
            const wrappedGetter = function() {
              const win = originalGetter.call(this);
              // Ensure the returned window doesn't appear as a proxy
              return win;
            };
            Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
              get: wrappedGetter,
              set: iframeDesc.set,
              enumerable: iframeDesc.enumerable,
              configurable: true
            });
            Object.defineProperty(originalGetter, '__stealthyWrapped', { value: true, enumerable: false });
          }
        } catch (_) {}
      };

      // Patch Permissions API to avoid detection
      const patchPermissions = () => {
        try {
          if (!scope.navigator.permissions || !scope.navigator.permissions.query) return;
          
          const originalQuery = scope.navigator.permissions.query;
          if (!originalQuery.__stealthyWrapped) {
            scope.navigator.permissions.query = function(parameters) {
              // Return proper permission state
              return originalQuery.call(this, parameters);
            };
            registerSignature(scope.navigator.permissions.query, originalQuery);
            Object.defineProperty(originalQuery, '__stealthyWrapped', { value: true, enumerable: false });
          }
        } catch (_) {}
      };

      // Patch userAgentData to look more natural
      const patchUserAgentData = () => {
        try {
          if (!scope.navigator.userAgentData) return;
          
          const rng = mulberry32(cyrb53(seed + '|uadata'));
          
          // Common Windows 11 versions
          const winVersions = ['10.0.0', '13.0.0', '14.0.0', '15.0.0'];
          const platformVersion = winVersions[Math.floor(rng() * winVersions.length)];
          
          // Realistic brands list (matches actual Chrome)
          const brands = [
            { brand: 'Chromium', version: '141' },
            { brand: 'Google Chrome', version: '141' },
            { brand: 'Not)A;Brand', version: '99' }
          ];
          
          Object.defineProperty(scope.navigator.userAgentData, 'brands', {
            get: () => brands,
            configurable: true,
            enumerable: true
          });
          
          Object.defineProperty(scope.navigator.userAgentData, 'platform', {
            get: () => 'Windows',
            configurable: true,
            enumerable: true
          });
          
          if (scope.navigator.userAgentData.getHighEntropyValues) {
            const originalGetHighEntropy = scope.navigator.userAgentData.getHighEntropyValues;
            scope.navigator.userAgentData.getHighEntropyValues = async function(hints) {
              const values = await originalGetHighEntropy.call(this, hints);
              
              // Override with consistent values
              return {
                ...values,
                brands: brands,
                fullVersionList: brands,
                platform: 'Windows',
                platformVersion: platformVersion,
                architecture: 'x86',
                bitness: '64',
                model: '',
                uaFullVersion: '141.0.7390.37'
              };
            };
            registerSignature(scope.navigator.userAgentData.getHighEntropyValues, originalGetHighEntropy);
          }
        } catch (_) {}
      };

      // Ensure DoNotTrack is properly set
      const patchDoNotTrack = () => {
        try {
          // Most users don't have DNT enabled, randomly set it
          const rng = mulberry32(cyrb53(seed + '|dnt'));
          const dnt = rng() > 0.9 ? '1' : null; // 10% have DNT enabled
          
          Object.defineProperty(scope.navigator, 'doNotTrack', {
            get: () => dnt,
            configurable: true,
            enumerable: true
          });
        } catch (_) {}
      };

      // Apply all protections with realistic Windows Chrome data
      patchHardwareConcurrency();
      patchDeviceMemory();
      patchScreen();
      patchLanguages();
      patchPlatform();
      patchPlugins();
      patchMediaDevices();
      patchTouch();
      patchVendor();
      // DO NOT call patchWebDriver() - let Patchright handle it natively!
      patchChromeRuntime();
      patchIframeProxy();
      patchPermissions();
      patchUserAgentData();
      patchDoNotTrack();

      if (includeWebGL) {
        const chromeWindowsProfiles = [
          { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0)' },
          { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 Direct3D11 vs_5_0 ps_5_0)' },
          { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3080 Direct3D11 vs_5_0 ps_5_0)' },
          { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 SUPER Direct3D11 vs_5_0 ps_5_0)' },
          { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1650 Direct3D11 vs_5_0 ps_5_0)' },
          { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0)' },
          { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 770 Direct3D11 vs_5_0 ps_5_0)' },
          { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0)' },
          { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) HD Graphics 620 Direct3D11 vs_5_0 ps_5_0)' },
          { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 730 Direct3D11 vs_5_0 ps_5_0)' },
          { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 6600 XT Direct3D11 vs_5_0 ps_5_0)' },
          { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 6800 XT Direct3D11 vs_5_0 ps_5_0)' },
          { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 5700 XT Direct3D11 vs_5_0 ps_5_0)' },
          { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 580 Series Direct3D11 vs_5_0 ps_5_0)' },
          { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 5600 XT Direct3D11 vs_5_0 ps_5_0)' }
        ];

        const profileIndex = chromeWindowsProfiles.length > 0
          ? Math.floor(mulberry32(cyrb53(seed + '|webgl-profile'))() * chromeWindowsProfiles.length) % chromeWindowsProfiles.length
          : 0;
        const selectedProfile = chromeWindowsProfiles[Math.max(0, profileIndex)] || chromeWindowsProfiles[0];

        const patchWebGLPrototype = (Proto) => {
          if (!Proto) {
            return;
          }

          const originalGetParameter = Proto.getParameter;
          if (originalGetParameter && !originalGetParameter.__stealthyWrapped) {
            const wrappedGetParameter = function getParameter(parameter) {
              if (parameter === 37445) {
                return selectedProfile.vendor;
              }
              if (parameter === 37446) {
                return selectedProfile.renderer;
              }
              if (parameter === 7936) {
                return 'WebKit';
              }
              if (parameter === 7937) {
                return 'WebKit WebGL';
              }
              return originalGetParameter.call(this, parameter);
            };

            Object.defineProperty(Proto, 'getParameter', {
              value: wrappedGetParameter,
              configurable: true,
              writable: true
            });
            registerSignature(wrappedGetParameter, originalGetParameter);
            Object.defineProperty(originalGetParameter, '__stealthyWrapped', {
              value: true,
              enumerable: false
            });
          }

          const originalGetSupportedExtensions = Proto.getSupportedExtensions;
          if (originalGetSupportedExtensions && !originalGetSupportedExtensions.__stealthyWrapped) {
            const wrappedGetSupportedExtensions = function getSupportedExtensions() {
              const result = originalGetSupportedExtensions.call(this);
              if (!Array.isArray(result)) {
                return result;
              }
              const normalized = new Set(result);
              normalized.add('EXT_blend_minmax');
              normalized.add('EXT_color_buffer_half_float');
              return Array.from(normalized);
            };

            Object.defineProperty(Proto, 'getSupportedExtensions', {
              value: wrappedGetSupportedExtensions,
              configurable: true,
              writable: true
            });
            registerSignature(wrappedGetSupportedExtensions, originalGetSupportedExtensions);
            Object.defineProperty(originalGetSupportedExtensions, '__stealthyWrapped', {
              value: true,
              enumerable: false
            });
          }

          const originalGetExtension = Proto.getExtension;
          if (originalGetExtension && !originalGetExtension.__stealthyWrapped) {
            const wrappedGetExtension = function getExtension(name) {
              if (typeof name === 'string' && name.toLowerCase() === 'webgl_debug_renderer_info') {
                const existing = this && this[debugRendererSymbol];
                if (existing) {
                  return existing;
                }
                const obtained = originalGetExtension.call(this, name);
                if (obtained && typeof obtained === 'object') {
                  this[debugRendererSymbol] = obtained;
                  return obtained;
                }
                const shim = Object.freeze({
                  UNMASKED_VENDOR_WEBGL: 37445,
                  UNMASKED_RENDERER_WEBGL: 37446
                });
                if (this && typeof this === 'object') {
                  try {
                    Object.defineProperty(this, debugRendererSymbol, {
                      value: shim,
                      configurable: false,
                      enumerable: false,
                      writable: false
                    });
                  } catch (_) {
                    // fall back to simple assignment if defineProperty fails
                    this[debugRendererSymbol] = shim;
                  }
                }
                return shim;
              }
              return originalGetExtension.call(this, name);
            };

            Object.defineProperty(Proto, 'getExtension', {
              value: wrappedGetExtension,
              configurable: true,
              writable: true
            });
            registerSignature(wrappedGetExtension, originalGetExtension);
            Object.defineProperty(originalGetExtension, '__stealthyWrapped', {
              value: true,
              enumerable: false
            });
          }

          const originalReadPixels = Proto.readPixels;
          if (originalReadPixels && !originalReadPixels.__stealthyWrapped) {
            const wrappedReadPixels = function readPixels(...args) {
              const result = originalReadPixels.apply(this, args);
              try {
                const buffer = args[6];
                if (buffer && buffer.length) {
                  const width = args[2] || this.drawingBufferWidth || 0;
                  const height = args[3] || this.drawingBufferHeight || 0;
                  const key = makeKey('webgl-readPixels', width, height, this ? this.canvas || '' : '');
                  const rng = mulberry32(cyrb53(key));
                  for (let i = 0; i < buffer.length; i += 4) {
                    if (rng() < 0.06) {
                      const delta = (rng() - 0.5) * noiseAmplitude * 2;
                      const adjustment = delta >= 0 ? Math.floor(delta) : Math.ceil(delta);
                      buffer[i] = clamp(buffer[i] + adjustment, 0, 255);
                      buffer[i + 1] = clamp(buffer[i + 1] + adjustment, 0, 255);
                      buffer[i + 2] = clamp(buffer[i + 2] + adjustment, 0, 255);
                    }
                  }
                }
              } catch (_) {
                // Ignore buffer adjustments if they fail
              }
              return result;
            };

            Object.defineProperty(Proto, 'readPixels', {
              value: wrappedReadPixels,
              configurable: true,
              writable: true
            });
            registerSignature(wrappedReadPixels, originalReadPixels);
            Object.defineProperty(originalReadPixels, '__stealthyWrapped', {
              value: true,
              enumerable: false
            });
          }
        };

        patchWebGLPrototype(scope.WebGLRenderingContext && scope.WebGLRenderingContext.prototype);
        patchWebGLPrototype(scope.WebGL2RenderingContext && scope.WebGL2RenderingContext.prototype);
      }
    } catch (_) {
      // Swallow protection errors inside page context to avoid signaling our presence
    }
  })();`;

  return script;
}

async function enableFingerprintProtection(context, options = {}) {
  const script = buildFingerprintProtectionScript(options);
  await context.addInitScript(script);

  const primePage = async (page) => {
    try {
      await page.addInitScript(script);
    } catch (error) {
      // Silent fail
    }
  };

  await Promise.all(context.pages().map((page) => primePage(page)));

  context.on('page', (page) => {
    primePage(page);
  });
}

module.exports = {
  createFingerprintSeed,
  buildFingerprintProtectionScript,
  enableFingerprintProtection
};

