import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Plus, MoreVertical, Trash2, Edit, X, CheckCircle, XCircle, RefreshCw, Copy } from 'lucide-react';

const Proxies = ({ proxies, setProxies, profiles, reloadProfiles, darkMode }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [proxyToDelete, setProxyToDelete] = useState(null);
  const [editingProxy, setEditingProxy] = useState(null);
  const [checkingProxies, setCheckingProxies] = useState(new Set());
  const [newProxy, setNewProxy] = useState({ 
    name: '', 
    address: '', 
    type: 'HTTP',
    username: '',
    password: ''
  });
  const [editProxy, setEditProxy] = useState({ 
    name: '', 
    address: '', 
    type: 'HTTP',
    username: '',
    password: ''
  });

  // Check all proxies on mount
  useEffect(() => {
    checkAllProxies();
  }, []);

  // Count how many profiles are using each proxy
  const getProxyUsageCount = (proxyId) => {
    if (!profiles) {
      console.log('Profiles not available in Proxies component');
      return 0;
    }
    const count = profiles.filter(profile => profile.proxyId === proxyId).length;
    console.log(`Proxy ${proxyId} usage count:`, count, 'from profiles:', profiles.length);
    return count;
  };

  // Get profiles using this proxy
  const getProfilesUsingProxy = (proxyId) => {
    if (!profiles) return [];
    return profiles.filter(profile => profile.proxyId === proxyId);
  };

  const checkProxy = async (proxy) => {
    setCheckingProxies(prev => new Set(prev).add(proxy.id));
    
    try {
      const result = await window.api.proxies.check(proxy);
      const newStatus = result.success ? 'active' : 'error';
      
      // Update proxy status in database
      await window.api.proxies.update(proxy.id, { status: newStatus });
      
      // Update local state
      setProxies(prevProxies => 
        prevProxies.map(p => p.id === proxy.id ? { ...p, status: newStatus } : p)
      );
    } catch (error) {
      console.error('Error checking proxy:', error);
      await window.api.proxies.update(proxy.id, { status: 'error' });
      setProxies(prevProxies => 
        prevProxies.map(p => p.id === proxy.id ? { ...p, status: 'error' } : p)
      );
    } finally {
      setCheckingProxies(prev => {
        const newSet = new Set(prev);
        newSet.delete(proxy.id);
        return newSet;
      });
    }
  };

  const checkAllProxies = async () => {
    for (const proxy of proxies) {
      await checkProxy(proxy);
    }
  };

  const handleCreateProxy = async () => {
    if (newProxy.name && newProxy.address) {
      const [host, port] = newProxy.address.split(':');
      if (host && port) {
        const proxyData = {
          name: newProxy.name,
          host: host.trim(),
          port: port.trim(),
          type: newProxy.type,
          username: newProxy.username || null,
          password: newProxy.password || null,
          status: 'active',
        };
        
        const createdProxy = await window.api.proxies.create(proxyData);
        if (createdProxy) {
          setProxies([...proxies, createdProxy]);
          setNewProxy({ name: '', address: '', type: 'HTTP', username: '', password: '' });
          setIsDialogOpen(false);
          
          // Check the newly created proxy
          setTimeout(() => checkProxy(createdProxy), 500);
        }
      }
    }
  };

  const handleDeleteProxy = async (id) => {
    const result = await window.api.proxies.delete(id);
    if (result.success) {
      setProxies(proxies.filter(p => p.id !== id));
      // Reload profiles to update any that were using this proxy
      if (reloadProfiles) {
        await reloadProfiles();
      }
    }
    setDeleteDialogOpen(false);
    setProxyToDelete(null);
  };

  const confirmDelete = (proxy) => {
    setProxyToDelete(proxy);
    setDeleteDialogOpen(true);
  };

  const handleEditProxy = (proxy) => {
    setEditingProxy(proxy);
    setEditProxy({
      name: proxy.name,
      address: `${proxy.host}:${proxy.port}`,
      type: proxy.type,
      username: proxy.username || '',
      password: proxy.password || ''
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateProxy = async () => {
    if (editProxy.name && editProxy.address && editingProxy) {
      const [host, port] = editProxy.address.split(':');
      if (host && port) {
        const proxyData = {
          name: editProxy.name,
          host: host.trim(),
          port: port.trim(),
          type: editProxy.type,
          username: editProxy.username || null,
          password: editProxy.password || null,
        };
        
        const updatedProxy = await window.api.proxies.update(editingProxy.id, proxyData);
        if (updatedProxy) {
          setProxies(proxies.map(p => p.id === editingProxy.id ? updatedProxy : p));
          setEditProxy({ name: '', address: '', type: 'HTTP', username: '', password: '' });
          setEditingProxy(null);
          setIsEditDialogOpen(false);
          
          // Check the updated proxy
          setTimeout(() => checkProxy(updatedProxy), 500);
        }
      }
    }
  };

  const handleDuplicateProxy = (proxy) => {
    setNewProxy({
      name: `${proxy.name} (Copy)`,
      address: `${proxy.host}:${proxy.port}`,
      type: proxy.type,
      username: proxy.username || '',
      password: proxy.password || ''
    });
    setIsDialogOpen(true);
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold mb-2 tracking-tight">Proxies</h1>
          <p className={`text-base font-medium ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>Manage your proxy servers</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={checkAllProxies}
            disabled={checkingProxies.size > 0}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
              checkingProxies.size > 0
                ? 'opacity-50 cursor-not-allowed'
                : ''
            } ${
              darkMode 
                ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700' 
                : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 border border-zinc-300'
            }`}>
            <RefreshCw size={18} className={checkingProxies.size > 0 ? 'animate-spin' : ''} />
            <span>Check All</span>
          </button>
          <Dialog.Root open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <Dialog.Trigger asChild>
              <button className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
                darkMode 
                  ? 'bg-zinc-700 text-white hover:bg-zinc-600' 
                  : 'bg-zinc-800 text-white hover:bg-zinc-700'
              }`}>
                <Plus size={18} />
                <span>Add Proxy</span>
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
            <Dialog.Content className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border rounded-xl p-6 w-[400px] shadow-2xl ${
              darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-300'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <Dialog.Title className={`text-xl font-semibold tracking-tight ${darkMode ? 'text-white' : 'text-black'}`}>Add New Proxy</Dialog.Title>
                <Dialog.Close asChild>
                  <button className={`transition-colors ${darkMode ? 'text-zinc-500 hover:text-white' : 'text-zinc-500 hover:text-black'}`}>
                    <X size={20} />
                  </button>
                </Dialog.Close>
              </div>
              <Dialog.Description className={`text-sm mb-6 ${darkMode ? 'text-zinc-500' : 'text-zinc-600'}`}>
                Add a new proxy server to your collection
              </Dialog.Description>
              <div className="space-y-5">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>Proxy Name *</label>
                  <input
                    type="text"
                    value={newProxy.name}
                    onChange={(e) => setNewProxy({ ...newProxy, name: e.target.value })}
                    placeholder="US Proxy 1"
                    className={`w-full border rounded-lg px-4 py-2.5 transition-colors focus:outline-none ${
                      darkMode 
                        ? 'bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-zinc-600' 
                        : 'bg-white border-zinc-300 text-black placeholder:text-zinc-400 focus:border-zinc-400'
                    }`}
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>IP:Port *</label>
                  <input
                    type="text"
                    value={newProxy.address}
                    onChange={(e) => setNewProxy({ ...newProxy, address: e.target.value })}
                    placeholder="123.45.67.89:8080"
                    className={`w-full border rounded-lg px-4 py-2.5 transition-colors focus:outline-none ${
                      darkMode 
                        ? 'bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-zinc-600' 
                        : 'bg-white border-zinc-300 text-black placeholder:text-zinc-400 focus:border-zinc-400'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-3 ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>Proxy Type</label>
                  <ToggleGroup.Root
                    type="single"
                    value={newProxy.type}
                    onValueChange={(value) => value && setNewProxy({ ...newProxy, type: value })}
                    className={`inline-flex border rounded-lg p-1 w-full ${
                      darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-100 border-zinc-300'
                    }`}
                  >
                    <ToggleGroup.Item
                      value="HTTP"
                      className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                        darkMode 
                          ? 'text-zinc-400 data-[state=on]:bg-white data-[state=on]:text-black hover:text-white' 
                          : 'text-zinc-600 data-[state=on]:bg-black data-[state=on]:text-white hover:text-black'
                      }`}
                    >
                      HTTP
                    </ToggleGroup.Item>
                    <ToggleGroup.Item
                      value="HTTPS"
                      className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                        darkMode 
                          ? 'text-zinc-400 data-[state=on]:bg-white data-[state=on]:text-black hover:text-white' 
                          : 'text-zinc-600 data-[state=on]:bg-black data-[state=on]:text-white hover:text-black'
                      }`}
                    >
                      HTTPS
                    </ToggleGroup.Item>
                  </ToggleGroup.Root>
                </div>

                <div className={`border-t pt-4 ${darkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
                    Authentication (Optional)
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <input
                        type="text"
                        value={newProxy.username}
                        onChange={(e) => setNewProxy({ ...newProxy, username: e.target.value })}
                        placeholder="Username"
                        className={`w-full border rounded-lg px-4 py-2.5 transition-colors focus:outline-none ${
                          darkMode 
                            ? 'bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-zinc-600' 
                            : 'bg-white border-zinc-300 text-black placeholder:text-zinc-400 focus:border-zinc-400'
                        }`}
                      />
                    </div>
                    <div>
                      <input
                        type="password"
                        value={newProxy.password}
                        onChange={(e) => setNewProxy({ ...newProxy, password: e.target.value })}
                        placeholder="Password"
                        className={`w-full border rounded-lg px-4 py-2.5 transition-colors focus:outline-none ${
                          darkMode 
                            ? 'bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-zinc-600' 
                            : 'bg-white border-zinc-300 text-black placeholder:text-zinc-400 focus:border-zinc-400'
                        }`}
                      />
                    </div>
                  </div>
                  <p className={`text-xs mt-2 ${darkMode ? 'text-zinc-600' : 'text-zinc-500'}`}>
                    Leave empty if your proxy doesn't require authentication
                  </p>
                </div>

                <button
                  onClick={handleCreateProxy}
                  disabled={!newProxy.name || !newProxy.address}
                  className={`w-full py-3 rounded-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                    darkMode 
                      ? 'bg-zinc-700 text-white hover:bg-zinc-600' 
                      : 'bg-zinc-800 text-white hover:bg-zinc-700'
                  }`}
                >
                  Add Proxy
                </button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
        </div>
      </div>

      {/* Edit Proxy Dialog */}
      <Dialog.Root open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
          <Dialog.Content className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border rounded-xl p-6 w-[400px] shadow-2xl ${
            darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-300'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className={`text-xl font-semibold tracking-tight ${darkMode ? 'text-white' : 'text-black'}`}>Edit Proxy</Dialog.Title>
              <Dialog.Close asChild>
                <button className={`transition-colors ${darkMode ? 'text-zinc-500 hover:text-white' : 'text-zinc-500 hover:text-black'}`}>
                  <X size={20} />
                </button>
              </Dialog.Close>
            </div>
            <Dialog.Description className={`text-sm mb-6 ${darkMode ? 'text-zinc-500' : 'text-zinc-600'}`}>
              Update the proxy server configuration
            </Dialog.Description>
            <div className="space-y-5">
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>Proxy Name *</label>
                <input
                  type="text"
                  value={editProxy.name}
                  onChange={(e) => setEditProxy({ ...editProxy, name: e.target.value })}
                  placeholder="US Proxy 1"
                  className={`w-full border rounded-lg px-4 py-2.5 transition-colors focus:outline-none ${
                    darkMode 
                      ? 'bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-zinc-600' 
                      : 'bg-white border-zinc-300 text-black placeholder:text-zinc-400 focus:border-zinc-400'
                  }`}
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>IP:Port *</label>
                <input
                  type="text"
                  value={editProxy.address}
                  onChange={(e) => setEditProxy({ ...editProxy, address: e.target.value })}
                  placeholder="123.45.67.89:8080"
                  className={`w-full border rounded-lg px-4 py-2.5 transition-colors focus:outline-none ${
                    darkMode 
                      ? 'bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-zinc-600' 
                      : 'bg-white border-zinc-300 text-black placeholder:text-zinc-400 focus:border-zinc-400'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-3 ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>Proxy Type</label>
                <ToggleGroup.Root
                  type="single"
                  value={editProxy.type}
                  onValueChange={(value) => value && setEditProxy({ ...editProxy, type: value })}
                  className={`inline-flex border rounded-lg p-1 w-full ${
                    darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-100 border-zinc-300'
                  }`}
                >
                  <ToggleGroup.Item
                    value="HTTP"
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                      darkMode 
                        ? 'text-zinc-400 data-[state=on]:bg-white data-[state=on]:text-black hover:text-white' 
                        : 'text-zinc-600 data-[state=on]:bg-black data-[state=on]:text-white hover:text-black'
                    }`}
                  >
                    HTTP
                  </ToggleGroup.Item>
                  <ToggleGroup.Item
                    value="HTTPS"
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${
                      darkMode 
                        ? 'text-zinc-400 data-[state=on]:bg-white data-[state=on]:text-black hover:text-white' 
                        : 'text-zinc-600 data-[state=on]:bg-black data-[state=on]:text-white hover:text-black'
                    }`}
                  >
                    HTTPS
                  </ToggleGroup.Item>
                </ToggleGroup.Root>
              </div>

              <div className={`border-t pt-4 ${darkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
                  Authentication (Optional)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="text"
                      value={editProxy.username}
                      onChange={(e) => setEditProxy({ ...editProxy, username: e.target.value })}
                      placeholder="Username"
                      className={`w-full border rounded-lg px-4 py-2.5 transition-colors focus:outline-none ${
                        darkMode 
                          ? 'bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-zinc-600' 
                          : 'bg-white border-zinc-300 text-black placeholder:text-zinc-400 focus:border-zinc-400'
                      }`}
                    />
                  </div>
                  <div>
                    <input
                      type="password"
                      value={editProxy.password}
                      onChange={(e) => setEditProxy({ ...editProxy, password: e.target.value })}
                      placeholder="Password"
                      className={`w-full border rounded-lg px-4 py-2.5 transition-colors focus:outline-none ${
                        darkMode 
                          ? 'bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-zinc-600' 
                          : 'bg-white border-zinc-300 text-black placeholder:text-zinc-400 focus:border-zinc-400'
                      }`}
                    />
                  </div>
                </div>
                <p className={`text-xs mt-2 ${darkMode ? 'text-zinc-600' : 'text-zinc-500'}`}>
                  Leave empty if your proxy doesn't require authentication
                </p>
              </div>

              <button
                onClick={handleUpdateProxy}
                disabled={!editProxy.name || !editProxy.address}
                className={`w-full py-3 rounded-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                  darkMode 
                    ? 'bg-zinc-700 text-white hover:bg-zinc-600' 
                    : 'bg-zinc-800 text-white hover:bg-zinc-700'
                }`}
              >
                Update Proxy
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <div className="space-y-4">
        {proxies.map((proxy) => (
          <div
            key={proxy.id}
            className={`border rounded-xl p-6 transition-smooth card-hover ${
              darkMode 
                ? 'bg-zinc-950 border-zinc-800 hover:border-zinc-700' 
                : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-3">
                  {checkingProxies.has(proxy.id) ? (
                    <RefreshCw className="text-blue-400 animate-spin" size={20} />
                  ) : proxy.status === 'active' ? (
                    <CheckCircle className="text-green-400" size={20} />
                  ) : (
                    <XCircle className="text-red-400" size={20} />
                  )}
                  <div>
                    <h3 className="text-lg font-light">{proxy.name}</h3>
                    <p className={`text-sm ${darkMode ? 'text-zinc-500' : 'text-zinc-600'}`}>
                      {proxy.host}:{proxy.port}
                      {proxy.username && (
                        <span className={`ml-2 text-xs ${darkMode ? 'text-zinc-600' : 'text-zinc-500'}`}>
                          • Auth: {proxy.username}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`px-3 py-1 rounded-full text-xs ${
                    darkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-200 text-zinc-600'
                  }`}>
                    {proxy.type}
                  </div>
                  {(() => {
                    const usageCount = getProxyUsageCount(proxy.id);
                    const profilesUsing = getProfilesUsingProxy(proxy.id);
                    return (
                      <div 
                        className={`px-3 py-1 rounded-full text-xs flex items-center space-x-1 cursor-help ${
                          usageCount > 0 
                            ? darkMode 
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' 
                              : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                            : darkMode 
                              ? 'bg-zinc-800 text-zinc-500' 
                              : 'bg-zinc-100 text-zinc-500'
                        }`}
                        title={usageCount > 0 ? `Used by: ${profilesUsing.map(p => p.name).join(', ')}` : 'Not used by any profile'}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                          <circle cx="9" cy="7" r="4"></circle>
                          <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                        <span>{usageCount} {usageCount === 1 ? 'profile' : 'profiles'}</span>
                      </div>
                    );
                  })()}
                  {proxy.username && (
                    <div className={`px-3 py-1 rounded-full text-xs flex items-center space-x-1 ${
                      darkMode ? 'bg-blue-950 text-blue-400 border border-blue-900' : 'bg-blue-50 text-blue-600 border border-blue-200'
                    }`}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                      </svg>
                      <span>Auth</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => checkProxy(proxy)}
                  disabled={checkingProxies.has(proxy.id)}
                  className={`p-2 rounded-lg transition-smooth ${
                    checkingProxies.has(proxy.id)
                      ? 'opacity-50 cursor-not-allowed'
                      : darkMode 
                        ? 'text-zinc-500 hover:text-blue-400 hover:bg-zinc-800' 
                        : 'text-zinc-500 hover:text-blue-600 hover:bg-blue-50'
                  }`}>
                  <RefreshCw size={18} />
                </button>
                
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button className={`p-2 rounded-lg transition-smooth ${
                      darkMode 
                        ? 'text-zinc-500 hover:text-white hover:bg-zinc-800' 
                        : 'text-zinc-500 hover:text-black hover:bg-zinc-100'
                    }`}>
                      <MoreVertical size={18} />
                    </button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content 
                      className={`min-w-[180px] rounded-lg p-1 shadow-xl border ${
                        darkMode 
                          ? 'bg-zinc-900 border-zinc-800' 
                          : 'bg-white border-zinc-200'
                      }`}
                      sideOffset={5}
                    >
                      <DropdownMenu.Item
                        onClick={() => handleEditProxy(proxy)}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-md cursor-pointer transition-colors ${
                          darkMode 
                            ? 'text-zinc-300 hover:bg-zinc-800' 
                            : 'text-zinc-700 hover:bg-zinc-100'
                        }`}
                      >
                        <Edit size={16} />
                        <span>Edit</span>
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        onClick={() => handleDuplicateProxy(proxy)}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-md cursor-pointer transition-colors ${
                          darkMode 
                            ? 'text-zinc-300 hover:bg-zinc-800' 
                            : 'text-zinc-700 hover:bg-zinc-100'
                        }`}
                      >
                        <Copy size={16} />
                        <span>Duplicate</span>
                      </DropdownMenu.Item>
                      <DropdownMenu.Separator className={`h-px my-1 ${darkMode ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
                      <DropdownMenu.Item
                        onClick={() => confirmDelete(proxy)}
                        className="flex items-center space-x-2 px-3 py-2 rounded-md cursor-pointer transition-colors text-red-500 hover:bg-red-950"
                      >
                        <Trash2 size={16} />
                        <span>Delete</span>
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog.Root open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
          <AlertDialog.Content className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border rounded-xl p-6 w-[400px] shadow-2xl ${
            darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-300'
          }`}>
            <AlertDialog.Title className={`text-xl font-light mb-2 ${darkMode ? 'text-white' : 'text-black'}`}>
              Delete Proxy
            </AlertDialog.Title>
            <AlertDialog.Description className={`text-sm mb-6 ${darkMode ? 'text-zinc-500' : 'text-zinc-600'}`}>
              Are you sure you want to delete "{proxyToDelete?.name}"? All profiles using this proxy will be set to "No Proxy". This action cannot be undone.
            </AlertDialog.Description>
            <div className="flex space-x-3 justify-end">
              <AlertDialog.Cancel asChild>
                <button className={`px-4 py-2 rounded-lg transition-all ${
                  darkMode 
                    ? 'bg-zinc-800 hover:bg-zinc-700 text-white' 
                    : 'bg-zinc-200 hover:bg-zinc-300 text-black'
                }`}>
                  Cancel
                </button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <button 
                  onClick={() => handleDeleteProxy(proxyToDelete?.id)}
                  className="px-4 py-2 rounded-lg transition-all bg-red-600 hover:bg-red-700 text-white"
                >
                  Delete
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
};

export default Proxies;
