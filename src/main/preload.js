const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Profiles API
  profiles: {
    getAll: () => ipcRenderer.invoke('profiles:getAll'),
    get: (id) => ipcRenderer.invoke('profiles:get', id),
    create: (profileData) => ipcRenderer.invoke('profiles:create', profileData),
    update: (id, updates) => ipcRenderer.invoke('profiles:update', id, updates),
    delete: (id) => ipcRenderer.invoke('profiles:delete', id),
    clearCookies: (id) => ipcRenderer.invoke('profiles:clearCookies', id),
  },
  // Proxies API
  proxies: {
    getAll: () => ipcRenderer.invoke('proxies:getAll'),
    get: (id) => ipcRenderer.invoke('proxies:get', id),
    create: (proxyData) => ipcRenderer.invoke('proxies:create', proxyData),
    update: (id, updates) => ipcRenderer.invoke('proxies:update', id, updates),
    delete: (id) => ipcRenderer.invoke('proxies:delete', id),
  },
  // Settings API
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (settings) => ipcRenderer.invoke('settings:update', settings),
  },
});
