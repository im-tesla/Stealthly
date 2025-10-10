import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { Plus, MoreVertical, Trash2, Edit, X, CheckCircle, XCircle } from 'lucide-react';

const Proxies = ({ proxies, setProxies, reloadProfiles, darkMode }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newProxy, setNewProxy] = useState({ name: '', address: '', type: 'SOCKS5' });

  const handleCreateProxy = async () => {
    if (newProxy.name && newProxy.address) {
      const [host, port] = newProxy.address.split(':');
      if (host && port) {
        const proxyData = {
          name: newProxy.name,
          host: host.trim(),
          port: port.trim(),
          type: newProxy.type,
          status: 'active',
        };
        
        const createdProxy = await window.api.proxies.create(proxyData);
        if (createdProxy) {
          setProxies([...proxies, createdProxy]);
          setNewProxy({ name: '', address: '', type: 'SOCKS5' });
          setIsDialogOpen(false);
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
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-light mb-2">Proxies</h1>
          <p className={darkMode ? 'text-zinc-500' : 'text-zinc-600'}>Manage your proxy servers</p>
        </div>
        <Dialog.Root open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <Dialog.Trigger asChild>
            <button className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
              darkMode 
                ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
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
                <Dialog.Title className={`text-xl font-light ${darkMode ? 'text-white' : 'text-black'}`}>Add New Proxy</Dialog.Title>
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
                  <label className={`block text-sm mb-2 ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>Proxy Name *</label>
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
                  <label className={`block text-sm mb-2 ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>IP:Port *</label>
                  <input
                    type="text"
                    value={newProxy.address}
                    onChange={(e) => setNewProxy({ ...newProxy, address: e.target.value })}
                    placeholder="123.45.67.89:8080"
                    className={`w-full border rounded-lg px-4 py-2.5 font-mono transition-colors focus:outline-none ${
                      darkMode 
                        ? 'bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-zinc-600' 
                        : 'bg-white border-zinc-300 text-black placeholder:text-zinc-400 focus:border-zinc-400'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-sm mb-3 ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>Proxy Type</label>
                  <ToggleGroup.Root
                    type="single"
                    value={newProxy.type}
                    onValueChange={(value) => value && setNewProxy({ ...newProxy, type: value })}
                    className={`inline-flex border rounded-lg p-1 w-full ${
                      darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-100 border-zinc-300'
                    }`}
                  >
                    <ToggleGroup.Item
                      value="SOCKS5"
                      className={`flex-1 px-4 py-2 text-sm rounded-md transition-all ${
                        darkMode 
                          ? 'text-zinc-400 data-[state=on]:bg-white data-[state=on]:text-black hover:text-white' 
                          : 'text-zinc-600 data-[state=on]:bg-black data-[state=on]:text-white hover:text-black'
                      }`}
                    >
                      SOCKS5
                    </ToggleGroup.Item>
                    <ToggleGroup.Item
                      value="HTTPS"
                      className={`flex-1 px-4 py-2 text-sm rounded-md transition-all ${
                        darkMode 
                          ? 'text-zinc-400 data-[state=on]:bg-white data-[state=on]:text-black hover:text-white' 
                          : 'text-zinc-600 data-[state=on]:bg-black data-[state=on]:text-white hover:text-black'
                      }`}
                    >
                      HTTPS
                    </ToggleGroup.Item>
                    <ToggleGroup.Item
                      value="HTTP"
                      className={`flex-1 px-4 py-2 text-sm rounded-md transition-all ${
                        darkMode 
                          ? 'text-zinc-400 data-[state=on]:bg-white data-[state=on]:text-black hover:text-white' 
                          : 'text-zinc-600 data-[state=on]:bg-black data-[state=on]:text-white hover:text-black'
                      }`}
                    >
                      HTTP
                    </ToggleGroup.Item>
                  </ToggleGroup.Root>
                </div>

                <button
                  onClick={handleCreateProxy}
                  disabled={!newProxy.name || !newProxy.address}
                  className={`w-full py-3 rounded-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                    darkMode 
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  Add Proxy
                </button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>

      <div className="space-y-4">
        {proxies.map((proxy) => (
          <div
            key={proxy.id}
            className={`border rounded-xl p-6 transition-all ${
              darkMode 
                ? 'bg-zinc-950 border-zinc-800 hover:border-zinc-700' 
                : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-3">
                  {proxy.status === 'active' ? (
                    <CheckCircle className="text-green-400" size={20} />
                  ) : (
                    <XCircle className={darkMode ? 'text-zinc-600' : 'text-zinc-400'} size={20} />
                  )}
                  <div>
                    <h3 className="text-lg font-light">{proxy.name}</h3>
                    <p className={`text-sm ${darkMode ? 'text-zinc-500' : 'text-zinc-600'}`}>{proxy.host}:{proxy.port}</p>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs ${
                  darkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-200 text-zinc-600'
                }`}>
                  {proxy.type}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button className={`p-2 rounded-lg transition-all ${
                  darkMode 
                    ? 'text-zinc-500 hover:text-white hover:bg-zinc-800' 
                    : 'text-zinc-500 hover:text-black hover:bg-zinc-200'
                }`}>
                  <Edit size={18} />
                </button>
                <button 
                  onClick={() => handleDeleteProxy(proxy.id)}
                  className={`p-2 rounded-lg transition-all ${
                    darkMode 
                      ? 'text-zinc-500 hover:text-red-400 hover:bg-zinc-800' 
                      : 'text-zinc-500 hover:text-red-600 hover:bg-red-50'
                  }`}>
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Proxies;
