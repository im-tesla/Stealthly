import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Switch from '@radix-ui/react-switch';
import * as Select from '@radix-ui/react-select';
import { Plus, Play, Trash2, Edit, X, Shield, ChevronDown, Check, Cookie } from 'lucide-react';

const Profiles = ({ proxies, darkMode }) => {
  const [profiles, setProfiles] = useState([
    { id: 1, name: 'Profile 1', status: 'active', proxy: 'US Proxy 1', proxyId: 1, created: '2 days ago', untraceable: true },
    { id: 2, name: 'Profile 2', status: 'inactive', proxy: 'UK Proxy 1', proxyId: 2, created: '5 days ago', untraceable: true },
    { id: 3, name: 'Profile 3', status: 'active', proxy: 'DE Proxy 1', proxyId: 3, created: '1 week ago', untraceable: false },
  ]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [newProfile, setNewProfile] = useState({
    name: '',
    untraceable: true,
    proxyId: null,
  });

  const handleCreateProfile = () => {
    if (newProfile.name.trim()) {
      const selectedProxy = proxies.find(p => p.id === newProfile.proxyId);
      const profile = {
        id: profiles.length + 1,
        name: newProfile.name,
        status: 'inactive',
        proxy: selectedProxy ? selectedProxy.name : 'No Proxy',
        proxyId: newProfile.proxyId,
        created: 'Just now',
        untraceable: newProfile.untraceable,
      };
      setProfiles([...profiles, profile]);
      setNewProfile({
        name: '',
        untraceable: true,
        proxyId: null,
      });
      setIsDialogOpen(false);
    }
  };

  const handleEditProfile = (profile) => {
    setEditingProfile({
      ...profile,
      clearCookies: false,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateProfile = () => {
    if (editingProfile && editingProfile.name.trim()) {
      const selectedProxy = proxies.find(p => p.id === editingProfile.proxyId);
      const updatedProfiles = profiles.map(p => 
        p.id === editingProfile.id 
          ? {
              ...p,
              name: editingProfile.name,
              proxyId: editingProfile.proxyId,
              proxy: selectedProxy ? selectedProxy.name : 'No Proxy',
              untraceable: editingProfile.untraceable,
            }
          : p
      );
      setProfiles(updatedProfiles);
      
      // Handle clear cookies if selected
      if (editingProfile.clearCookies) {
        console.log(`Clearing cookies for profile: ${editingProfile.name}`);
        // Add actual cookie clearing logic here
      }
      
      setIsEditDialogOpen(false);
      setEditingProfile(null);
    }
  };

  const handleDeleteProfile = (profileId) => {
    setProfiles(profiles.filter(p => p.id !== profileId));
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-light mb-2">Profiles</h1>
          <p className={darkMode ? 'text-zinc-500' : 'text-zinc-600'}>Manage your browser profiles</p>
        </div>
        <Dialog.Root open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <Dialog.Trigger asChild>
            <button className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
              darkMode 
                ? 'bg-white text-black hover:bg-zinc-200' 
                : 'bg-black text-white hover:bg-zinc-800'
            }`}>
              <Plus size={18} />
              <span>New Profile</span>
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
            <Dialog.Content className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border rounded-xl p-6 w-[500px] shadow-2xl max-h-[90vh] overflow-y-auto ${
              darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-300'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <Dialog.Title className={`text-xl font-light ${darkMode ? 'text-white' : 'text-black'}`}>Create New Profile</Dialog.Title>
                <Dialog.Close asChild>
                  <button className={`transition-colors ${darkMode ? 'text-zinc-500 hover:text-white' : 'text-zinc-500 hover:text-black'}`}>
                    <X size={20} />
                  </button>
                </Dialog.Close>
              </div>
              <Dialog.Description className={`text-sm mb-6 ${darkMode ? 'text-zinc-500' : 'text-zinc-600'}`}>
                Configure your undetectable browser profile
              </Dialog.Description>
              
              <div className="space-y-6">
                {/* Untraceable Toggle */}
                <div className={`border rounded-lg p-4 ${darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Shield className={`${newProfile.untraceable ? 'text-green-400' : (darkMode ? 'text-zinc-600' : 'text-zinc-400')}`} size={20} />
                      <div>
                        <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-black'}`}>Untraceable Mode</div>
                        <div className={`text-xs ${darkMode ? 'text-zinc-500' : 'text-zinc-600'}`}>Maximum privacy protection</div>
                      </div>
                    </div>
                    <Switch.Root
                      checked={newProfile.untraceable}
                      onCheckedChange={(checked) => setNewProfile({ ...newProfile, untraceable: checked })}
                      className="w-11 h-6 bg-zinc-800 rounded-full relative data-[state=checked]:bg-green-400 transition-colors"
                    >
                      <Switch.Thumb className="block w-5 h-5 bg-white rounded-full transition-transform translate-x-0.5 data-[state=checked]:translate-x-5" />
                    </Switch.Root>
                  </div>
                </div>

                {/* Profile Name */}
                <div>
                  <label className={`block text-sm mb-2 ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>Profile Name *</label>
                  <input
                    type="text"
                    value={newProfile.name}
                    onChange={(e) => setNewProfile({ ...newProfile, name: e.target.value })}
                    placeholder="e.g., Work Profile, Shopping, Social Media"
                    className={`w-full border rounded-lg px-4 py-2.5 focus:outline-none transition-colors ${
                      darkMode 
                        ? 'bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-zinc-600' 
                        : 'bg-white border-zinc-300 text-black placeholder:text-zinc-400 focus:border-zinc-400'
                    }`}
                  />
                </div>

                {/* Proxy Section */}
                <div className={`border rounded-lg p-4 space-y-4 ${darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <label className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-black'}`}>Proxy Configuration</label>
                    <div className={`text-xs ${darkMode ? 'text-zinc-500' : 'text-zinc-600'}`}>(Optional)</div>
                  </div>

                  {/* Proxy Selection */}
                  <div>
                    <label className={`block text-sm mb-2 ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>Select Proxy</label>
                    <Select.Root 
                      value={newProfile.proxyId?.toString() || 'none'} 
                      onValueChange={(value) => setNewProfile({ ...newProfile, proxyId: value === 'none' ? null : parseInt(value) })}
                    >
                      <Select.Trigger className={`w-full border rounded-lg px-4 py-2.5 focus:outline-none transition-colors flex items-center justify-between ${
                        darkMode 
                          ? 'bg-zinc-900 border-zinc-800 text-white focus:border-zinc-600' 
                          : 'bg-white border-zinc-300 text-black focus:border-zinc-400'
                      }`}>
                        <Select.Value placeholder="No Proxy" />
                        <Select.Icon>
                          <ChevronDown size={16} className="text-zinc-500" />
                        </Select.Icon>
                      </Select.Trigger>
                      <Select.Portal>
                        <Select.Content className={`border rounded-lg shadow-2xl overflow-hidden z-50 ${
                          darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-300'
                        }`}>
                          <Select.Viewport className="p-1">
                            <Select.Item value="none" className={`px-4 py-2.5 cursor-pointer outline-none flex items-center justify-between rounded ${
                              darkMode ? 'text-white hover:bg-zinc-800' : 'text-black hover:bg-zinc-100'
                            }`}>
                              <Select.ItemText>No Proxy</Select.ItemText>
                              <Select.ItemIndicator>
                                <Check size={16} className="text-green-400" />
                              </Select.ItemIndicator>
                            </Select.Item>
                            {proxies.map((proxy) => (
                              <Select.Item 
                                key={proxy.id} 
                                value={proxy.id.toString()} 
                                className={`px-4 py-2.5 cursor-pointer outline-none rounded ${
                                  darkMode ? 'text-white hover:bg-zinc-800' : 'text-black hover:bg-zinc-100'
                                }`}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <div>
                                    <Select.ItemText>{proxy.name}</Select.ItemText>
                                    <div className={`text-xs ${darkMode ? 'text-zinc-500' : 'text-zinc-600'}`}>{proxy.host}:{proxy.port} • {proxy.type}</div>
                                  </div>
                                  <Select.ItemIndicator>
                                    <Check size={16} className="text-green-400" />
                                  </Select.ItemIndicator>
                                </div>
                              </Select.Item>
                            ))}
                          </Select.Viewport>
                        </Select.Content>
                      </Select.Portal>
                    </Select.Root>
                  </div>
                </div>

                {/* Create Button */}
                <button
                  onClick={handleCreateProfile}
                  disabled={!newProfile.name.trim()}
                  className={`w-full py-3 rounded-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                    darkMode 
                      ? 'bg-white text-black hover:bg-zinc-200' 
                      : 'bg-black text-white hover:bg-zinc-800'
                  }`}
                >
                  Create Profile
                </button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {profiles.map((profile) => (
          <div
            key={profile.id}
            className={`border rounded-xl p-6 transition-all ${
              darkMode 
                ? 'bg-zinc-950 border-zinc-800 hover:border-zinc-700' 
                : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="text-lg font-light">{profile.name}</h3>
                  {profile.untraceable && (
                    <Shield className="text-green-400" size={16} />
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      profile.status === 'active' ? 'bg-green-400' : (darkMode ? 'bg-zinc-600' : 'bg-zinc-400')
                    }`}
                  ></div>
                  <span className={`text-xs capitalize ${darkMode ? 'text-zinc-500' : 'text-zinc-600'}`}>{profile.status}</span>
                </div>
              </div>
            </div>
            <div className="space-y-2 mb-4 text-sm">
              <div className={`flex justify-between ${darkMode ? 'text-zinc-500' : 'text-zinc-600'}`}>
                <span>Proxy:</span>
                <span>{profile.proxy}</span>
              </div>
              <div className={`flex justify-between ${darkMode ? 'text-zinc-500' : 'text-zinc-600'}`}>
                <span>Created:</span>
                <span>{profile.created}</span>
              </div>
            </div>
            <div className="flex space-x-2">
              <button 
                onClick={() => console.log(`Launch profile: ${profile.name}`)}
                className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg transition-all ${
                  darkMode 
                    ? 'bg-zinc-800 hover:bg-zinc-700 text-white' 
                    : 'bg-zinc-200 hover:bg-zinc-300 text-black'
                }`}>
                <Play size={16} />
                <span>Launch</span>
              </button>
              <button 
                onClick={() => handleEditProfile(profile)}
                className={`p-2 rounded-lg transition-all ${
                  darkMode 
                    ? 'bg-zinc-800 hover:bg-zinc-700 text-white' 
                    : 'bg-zinc-200 hover:bg-zinc-300 text-black'
                }`}>
                <Edit size={16} />
              </button>
              <button 
                onClick={() => handleDeleteProfile(profile.id)}
                className={`p-2 rounded-lg transition-all ${
                  darkMode 
                    ? 'bg-zinc-800 hover:bg-red-900 text-white' 
                    : 'bg-zinc-200 hover:bg-red-100 text-red-600'
                }`}>
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Profile Dialog */}
      <Dialog.Root open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
          <Dialog.Content className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border rounded-xl p-6 w-[500px] shadow-2xl max-h-[90vh] overflow-y-auto ${
            darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-300'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className={`text-xl font-light ${darkMode ? 'text-white' : 'text-black'}`}>Edit Profile</Dialog.Title>
              <Dialog.Close asChild>
                <button className={`transition-colors ${darkMode ? 'text-zinc-500 hover:text-white' : 'text-zinc-500 hover:text-black'}`}>
                  <X size={20} />
                </button>
              </Dialog.Close>
            </div>
            <Dialog.Description className={`text-sm mb-6 ${darkMode ? 'text-zinc-500' : 'text-zinc-600'}`}>
              Update profile settings and configuration
            </Dialog.Description>
            
            {editingProfile && (
              <div className="space-y-6">
                {/* Untraceable Toggle */}
                <div className={`border rounded-lg p-4 ${darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Shield className={`${editingProfile.untraceable ? 'text-green-400' : (darkMode ? 'text-zinc-600' : 'text-zinc-400')}`} size={20} />
                      <div>
                        <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-black'}`}>Untraceable Mode</div>
                        <div className={`text-xs ${darkMode ? 'text-zinc-500' : 'text-zinc-600'}`}>Maximum privacy protection</div>
                      </div>
                    </div>
                    <Switch.Root
                      checked={editingProfile.untraceable}
                      onCheckedChange={(checked) => setEditingProfile({ ...editingProfile, untraceable: checked })}
                      className="w-11 h-6 bg-zinc-800 rounded-full relative data-[state=checked]:bg-green-400 transition-colors"
                    >
                      <Switch.Thumb className="block w-5 h-5 bg-white rounded-full transition-transform translate-x-0.5 data-[state=checked]:translate-x-5" />
                    </Switch.Root>
                  </div>
                </div>

                {/* Profile Name */}
                <div>
                  <label className={`block text-sm mb-2 ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>Profile Name *</label>
                  <input
                    type="text"
                    value={editingProfile.name}
                    onChange={(e) => setEditingProfile({ ...editingProfile, name: e.target.value })}
                    placeholder="Profile name"
                    className={`w-full border rounded-lg px-4 py-2.5 focus:outline-none transition-colors ${
                      darkMode 
                        ? 'bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-zinc-600' 
                        : 'bg-white border-zinc-300 text-black placeholder:text-zinc-400 focus:border-zinc-400'
                    }`}
                  />
                </div>

                {/* Proxy Selection */}
                <div className={`border rounded-lg p-4 space-y-4 ${darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <label className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-black'}`}>Proxy Configuration</label>
                  </div>

                  <div>
                    <label className={`block text-sm mb-2 ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>Select Proxy</label>
                    <Select.Root 
                      value={editingProfile.proxyId?.toString() || 'none'} 
                      onValueChange={(value) => setEditingProfile({ ...editingProfile, proxyId: value === 'none' ? null : parseInt(value) })}
                    >
                      <Select.Trigger className={`w-full border rounded-lg px-4 py-2.5 focus:outline-none transition-colors flex items-center justify-between ${
                        darkMode 
                          ? 'bg-zinc-900 border-zinc-800 text-white focus:border-zinc-600' 
                          : 'bg-white border-zinc-300 text-black focus:border-zinc-400'
                      }`}>
                        <Select.Value placeholder="No Proxy" />
                        <Select.Icon>
                          <ChevronDown size={16} className="text-zinc-500" />
                        </Select.Icon>
                      </Select.Trigger>
                      <Select.Portal>
                        <Select.Content className={`border rounded-lg shadow-2xl overflow-hidden z-50 ${
                          darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-300'
                        }`}>
                          <Select.Viewport className="p-1">
                            <Select.Item value="none" className={`px-4 py-2.5 cursor-pointer outline-none flex items-center justify-between rounded ${
                              darkMode ? 'text-white hover:bg-zinc-800' : 'text-black hover:bg-zinc-100'
                            }`}>
                              <Select.ItemText>No Proxy</Select.ItemText>
                              <Select.ItemIndicator>
                                <Check size={16} className="text-green-400" />
                              </Select.ItemIndicator>
                            </Select.Item>
                            {proxies.map((proxy) => (
                              <Select.Item 
                                key={proxy.id} 
                                value={proxy.id.toString()} 
                                className={`px-4 py-2.5 cursor-pointer outline-none rounded ${
                                  darkMode ? 'text-white hover:bg-zinc-800' : 'text-black hover:bg-zinc-100'
                                }`}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <div>
                                    <Select.ItemText>{proxy.name}</Select.ItemText>
                                    <div className={`text-xs ${darkMode ? 'text-zinc-500' : 'text-zinc-600'}`}>{proxy.host}:{proxy.port} • {proxy.type}</div>
                                  </div>
                                  <Select.ItemIndicator>
                                    <Check size={16} className="text-green-400" />
                                  </Select.ItemIndicator>
                                </div>
                              </Select.Item>
                            ))}
                          </Select.Viewport>
                        </Select.Content>
                      </Select.Portal>
                    </Select.Root>
                  </div>
                </div>

                {/* Clear Cookies Button */}
                <button
                  onClick={() => {
                    // Clear cookies logic here
                    console.log(`Clearing cookies for profile: ${editingProfile.name}`);
                  }}
                  className={`w-full border rounded-lg p-4 flex items-center space-x-3 transition-all ${
                    darkMode 
                      ? 'bg-zinc-950 border-zinc-800 hover:border-red-500 hover:bg-red-950/20' 
                      : 'bg-zinc-50 border-zinc-200 hover:border-red-500 hover:bg-red-50'
                  }`}
                >
                  <Cookie className={`${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`} size={20} />
                  <div className="flex-1 text-left">
                    <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-black'}`}>Clear Data</div>
                    <div className={`text-xs ${darkMode ? 'text-zinc-500' : 'text-zinc-600'}`}>Remove all stored cookies/data (0) for this profile</div>
                  </div>
                  <Trash2 className="text-red-500" size={16} />
                </button>

                {/* Update Button */}
                <button
                  onClick={handleUpdateProfile}
                  disabled={!editingProfile.name.trim()}
                  className={`w-full py-3 rounded-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                    darkMode 
                      ? 'bg-white text-black hover:bg-zinc-200' 
                      : 'bg-black text-white hover:bg-zinc-800'
                  }`}
                >
                  Update Profile
                </button>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
};

export default Profiles;
