const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Profiles API
  profiles: {
    getAll: () => ipcRenderer.invoke('profiles:getAll'),
    get: (id) => ipcRenderer.invoke('profiles:get', id),
    create: (profileData) => ipcRenderer.invoke('profiles:create', profileData),
    update: (id, updates) => ipcRenderer.invoke('profiles:update', id, updates),
    delete: (id) => ipcRenderer.invoke('profiles:delete', id),
    duplicate: (id, newProfileData) => ipcRenderer.invoke('profiles:duplicate', id, newProfileData),
    clearCookies: (id) => ipcRenderer.invoke('profiles:clearCookies', id),
    reorder: (newOrderArray) => ipcRenderer.invoke('profiles:reorder', newOrderArray),
    launch: (profileId) => ipcRenderer.invoke('profiles:launch', profileId),
    close: (profileId) => ipcRenderer.invoke('profiles:close', profileId),
    getActiveSessions: () => ipcRenderer.invoke('profiles:getActiveSessions'),
  },
  // Proxies API
  proxies: {
    getAll: () => ipcRenderer.invoke('proxies:getAll'),
    get: (id) => ipcRenderer.invoke('proxies:get', id),
    create: (proxyData) => ipcRenderer.invoke('proxies:create', proxyData),
    update: (id, updates) => ipcRenderer.invoke('proxies:update', id, updates),
    delete: (id) => ipcRenderer.invoke('proxies:delete', id),
    check: (proxy) => ipcRenderer.invoke('proxies:check', proxy),
  },
  // Extensions API
  extensions: {
    getAll: () => ipcRenderer.invoke('extensions:getAll'),
    get: (id) => ipcRenderer.invoke('extensions:get', id),
    create: (extensionData) => ipcRenderer.invoke('extensions:create', extensionData),
    readManifest: (extensionPath) => ipcRenderer.invoke('extensions:readManifest', extensionPath),
    update: (id, updates) => ipcRenderer.invoke('extensions:update', id, updates),
    delete: (id) => ipcRenderer.invoke('extensions:delete', id),
  },
  // Settings API
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (settings) => ipcRenderer.invoke('settings:update', settings),
  },
  // Import/Export API
  data: {
    export: () => ipcRenderer.invoke('data:export'),
    import: (data) => ipcRenderer.invoke('data:import', data),
  },
  // Activity API
  activity: {
    getRecent: (limit) => ipcRenderer.invoke('activity:getRecent', limit),
  },
  // App Info API
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
  },
});
