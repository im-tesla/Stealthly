import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import * as Switch from '@radix-ui/react-switch';
import * as Select from '@radix-ui/react-select';
import { Plus, Play, Trash2, Edit, X, Shield, ChevronDown, Check, Cookie, Square, Copy } from 'lucide-react';

const Profiles = ({ profiles, setProfiles, proxies, extensions, darkMode }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clearDataDialogOpen, setClearDataDialogOpen] = useState(false);
  const [clearDataConfirmation, setClearDataConfirmation] = useState('');
  const [profileToClear, setProfileToClear] = useState(null);
  const [profileToDelete, setProfileToDelete] = useState(null);
  const [profileToDuplicate, setProfileToDuplicate] = useState(null);
  const [editingProfile, setEditingProfile] = useState(null);
  const [launchingProfile, setLaunchingProfile] = useState(null);
  const [newProfile, setNewProfile] = useState({
    name: '',
    proxyId: null,
    startupUrl: '',
  });
  const [duplicateProfile, setDuplicateProfile] = useState({
    name: '',
    proxyId: null,
    startupUrl: '',
  });

  // Sync active sessions with profile statuses
  useEffect(() => {
    const syncActiveSessions = async () => {
      const sessions = await window.api.profiles.getActiveSessions();
      const activeProfileIds = sessions.map(s => s.profileId);
      
      setProfiles(prevProfiles => 
        prevProfiles.map(p => ({
          ...p,
          status: activeProfileIds.includes(p.id) ? 'active' : 'inactive'
        }))
      );
    };

    syncActiveSessions();
    
    // Sync every 2 seconds
    const interval = setInterval(syncActiveSessions, 2000);
    
    return () => clearInterval(interval);
  }, []);

  const handleCreateProfile = async () => {
    if (newProfile.name.trim()) {
      const profileData = {
        name: newProfile.name,
        proxyId: newProfile.proxyId,
        startupUrl: newProfile.startupUrl.trim() || 'about:blank',
        status: 'inactive',
      };
      
      const createdProfile = await window.api.profiles.create(profileData);
      if (createdProfile) {
        setProfiles([...profiles, createdProfile]);
        setNewProfile({
          name: '',
          proxyId: null,
          startupUrl: '',
        });
        setIsDialogOpen(false);
      }
    }
  };

  const handleEditProfile = (profile) => {
    setEditingProfile({
      ...profile,
      clearCookies: false,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateProfile = async () => {
    if (editingProfile && editingProfile.name.trim()) {
      const updates = {
        name: editingProfile.name,
        proxyId: editingProfile.proxyId,
        startupUrl: editingProfile.startupUrl?.trim() || 'about:blank',
      };
      
      const updatedProfile = await window.api.profiles.update(editingProfile.id, updates);
      if (updatedProfile) {
        setProfiles(profiles.map(p => p.id === editingProfile.id ? updatedProfile : p));
        
        // Handle clear cookies if selected
        if (editingProfile.clearCookies) {
          await window.api.profiles.clearCookies(editingProfile.id);
        }
        
        setIsEditDialogOpen(false);
        setEditingProfile(null);
      }
    }
  };

  const handleDeleteProfile = async (profileId) => {
    const result = await window.api.profiles.delete(profileId);
    if (result.success) {
      setProfiles(profiles.filter(p => p.id !== profileId));
    }
    setDeleteDialogOpen(false);
    setProfileToDelete(null);
  };

  const confirmDelete = (profile) => {
    setProfileToDelete(profile);
    setDeleteDialogOpen(true);
  };

  const confirmClearData = (profile) => {
    setProfileToClear(profile);
    setClearDataConfirmation('');
    setClearDataDialogOpen(true);
  };

  const handleDuplicateProfile = (profile) => {
    setProfileToDuplicate(profile);
    setDuplicateProfile({
      name: `${profile.name} (Copy)`,
      proxyId: profile.proxyId,
      startupUrl: profile.startupUrl || '',
    });
    setIsDuplicateDialogOpen(true);
  };

  const handleCreateDuplicate = async () => {
    if (duplicateProfile.name.trim() && profileToDuplicate) {
      const newProfileData = {
        name: duplicateProfile.name,
        proxyId: duplicateProfile.proxyId,
        startupUrl: duplicateProfile.startupUrl.trim() || 'about:blank',
      };
      
      const createdProfile = await window.api.profiles.duplicate(profileToDuplicate.id, newProfileData);
      if (createdProfile) {
        setProfiles([...profiles, createdProfile]);
        setIsDuplicateDialogOpen(false);
        setProfileToDuplicate(null);
        setDuplicateProfile({
          name: '',
          proxyId: null,
          startupUrl: '',
        });
      }
    }
  };

  const handleClearData = async () => {
    if (clearDataConfirmation.toLowerCase() === 'clear' && profileToClear) {
      await window.api.profiles.clearCookies(profileToClear.id);
      console.log(`Cleared data for profile: ${profileToClear.name}`);
      setClearDataDialogOpen(false);
      setProfileToClear(null);
      setClearDataConfirmation('');
    }
  };

  const handleLaunchProfile = async (profile) => {
    try {
      setLaunchingProfile(profile.id);
      const result = await window.api.profiles.launch(profile.id);
      
      if (result.success) {
        // Update profile status locally
        setProfiles(prevProfiles => 
          prevProfiles.map(p => 
            p.id === profile.id ? { ...p, status: 'active' } : p
          )
        );
      }
    } catch (error) {
      console.error('Error launching profile:', error);
    } finally {
      setLaunchingProfile(null);
    }
  };

  const handleCloseProfile = async (profile) => {
    try {
      await window.api.profiles.close(profile.id);
      setProfiles(prevProfiles => 
        prevProfiles.map(p => 
          p.id === profile.id ? { ...p, status: 'inactive' } : p
        )
      );
    } catch (error) {
      console.error('Error closing profile:', error);
    }
  };

  const getProxyName = (proxyId) => {
    if (!proxyId) return 'No Proxy';
    const proxy = proxies.find(p => p.id === proxyId);
    return proxy ? proxy.name : 'Unknown Proxy';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now - date;
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return '1 day ago';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 14) return '1 week ago';
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold mb-2 tracking-tight">Profiles</h1>
          <p className={`text-base font-medium ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>Manage your browser profiles</p>
        </div>
        <Dialog.Root open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <Dialog.Trigger asChild>
            <button className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
              darkMode 
                ? 'bg-zinc-700 text-white hover:bg-zinc-600' 
                : 'bg-zinc-800 text-white hover:bg-zinc-700'
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
                <Dialog.Title className={`text-xl font-semibold tracking-tight ${darkMode ? 'text-white' : 'text-black'}`}>Create New Profile</Dialog.Title>
                <Dialog.Close asChild>
                  <button className={`transition-colors ${darkMode ? 'text-zinc-500 hover:text-white' : 'text-zinc-500 hover:text-black'}`}>
                    <X size={20} />
                  </button>
                </Dialog.Close>
              </div>
              <Dialog.Description className={`text-sm font-medium mb-6 ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
                Configure your browser profile with maximum privacy protection
              </Dialog.Description>
              
              <div className="space-y-6">
                {/* Profile Name */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>Profile Name *</label>
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

                {/* Startup URL */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
                    Startup URL <span className={`text-xs font-normal ${darkMode ? 'text-zinc-500' : 'text-zinc-600'}`}>(Optional)</span>
                  </label>
                  <input
                    type="url"
                    value={newProfile.startupUrl}
                    onChange={(e) => setNewProfile({ ...newProfile, startupUrl: e.target.value })}
                    placeholder="https://example.com or leave empty for default"
                    className={`w-full border rounded-lg px-4 py-2.5 focus:outline-none transition-colors ${
                      darkMode 
                        ? 'bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-zinc-600' 
                        : 'bg-white border-zinc-300 text-black placeholder:text-zinc-400 focus:border-zinc-400'
                    }`}
                  />
                  <p className={`text-xs mt-1.5 ${darkMode ? 'text-zinc-500' : 'text-zinc-600'}`}>
                    This URL will open automatically when launching the browser
                  </p>
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
                      ? 'bg-zinc-700 text-white hover:bg-zinc-600' 
                      : 'bg-zinc-800 text-white hover:bg-zinc-700'
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
            className={`border rounded-xl p-6 transition-smooth card-hover ${
              darkMode 
                ? 'bg-zinc-950 border-zinc-800 hover:border-zinc-700' 
                : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="text-lg font-light">{profile.name}</h3>
                </div>
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-2 h-2 rounded-full transition-smooth ${
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
                <span>{getProxyName(profile.proxyId)}</span>
              </div>
              <div className={`flex justify-between ${darkMode ? 'text-zinc-500' : 'text-zinc-600'}`}>
                <span>Start URL:</span>
                <span className="truncate ml-2 max-w-[180px]" title={profile.startupUrl || 'about:blank'}>
                  {profile.startupUrl && profile.startupUrl !== 'about:blank' 
                    ? new URL(profile.startupUrl).hostname 
                    : 'about:blank'}
                </span>
              </div>
              <div className={`flex justify-between ${darkMode ? 'text-zinc-500' : 'text-zinc-600'}`}>
                <span>Created:</span>
                <span>{formatDate(profile.createdAt)}</span>
              </div>
            </div>
            <div className="flex space-x-2">
              <button 
                onClick={() => profile.status === 'active' ? handleCloseProfile(profile) : handleLaunchProfile(profile)}
                disabled={launchingProfile === profile.id}
                className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg transition-smooth disabled:opacity-50 disabled:cursor-not-allowed ${
                  profile.status === 'active'
                    ? darkMode
                      ? 'bg-red-900/30 hover:bg-red-900/50 text-red-400'
                      : 'bg-red-100 hover:bg-red-200 text-red-700'
                    : darkMode 
                      ? 'bg-zinc-800 hover:bg-zinc-700 text-white' 
                      : 'bg-zinc-200 hover:bg-zinc-300 text-black'
                }`}>
                {launchingProfile === profile.id ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>Launching...</span>
                  </>
                ) : profile.status === 'active' ? (
                  <>
                    <Square size={16} />
                    <span>Stop</span>
                  </>
                ) : (
                  <>
                    <Play size={16} />
                    <span>Launch</span>
                  </>
                )}
              </button>
              <button 
                onClick={() => handleDuplicateProfile(profile)}
                title="Duplicate profile"
                className={`p-2 rounded-lg transition-smooth ${
                  darkMode 
                    ? 'bg-zinc-800 hover:bg-zinc-700 text-white' 
                    : 'bg-zinc-200 hover:bg-zinc-300 text-black'
                }`}>
                <Copy size={16} />
              </button>
              <button 
                onClick={() => handleEditProfile(profile)}
                title="Edit profile"
                className={`p-2 rounded-lg transition-smooth ${
                  darkMode 
                    ? 'bg-zinc-800 hover:bg-zinc-700 text-white' 
                    : 'bg-zinc-200 hover:bg-zinc-300 text-black'
                }`}>
                <Edit size={16} />
              </button>
              <button 
                onClick={() => confirmDelete(profile)}
                title="Delete profile"
                className={`p-2 rounded-lg transition-smooth ${
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

                {/* Startup URL */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
                    Startup URL <span className={`text-xs font-normal ${darkMode ? 'text-zinc-500' : 'text-zinc-600'}`}>(Optional)</span>
                  </label>
                  <input
                    type="url"
                    value={editingProfile.startupUrl || ''}
                    onChange={(e) => setEditingProfile({ ...editingProfile, startupUrl: e.target.value })}
                    placeholder="https://example.com or leave empty for default"
                    className={`w-full border rounded-lg px-4 py-2.5 focus:outline-none transition-colors ${
                      darkMode 
                        ? 'bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-zinc-600' 
                        : 'bg-white border-zinc-300 text-black placeholder:text-zinc-400 focus:border-zinc-400'
                    }`}
                  />
                  <p className={`text-xs mt-1.5 ${darkMode ? 'text-zinc-500' : 'text-zinc-600'}`}>
                    This URL will open automatically when launching the browser
                  </p>
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

                {/* Clear Data Button */}
                <button
                  onClick={() => confirmClearData(editingProfile)}
                  className={`w-full border rounded-lg p-4 flex items-center space-x-3 transition-all ${
                    darkMode 
                      ? 'bg-zinc-950 border-zinc-800 hover:border-red-500 hover:bg-red-950/20' 
                      : 'bg-zinc-50 border-zinc-200 hover:border-red-500 hover:bg-red-50'
                  }`}
                >
                  <Cookie className={`${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`} size={20} />
                  <div className="flex-1 text-left">
                    <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-black'}`}>Clear Data</div>
                    <div className={`text-xs ${darkMode ? 'text-zinc-500' : 'text-zinc-600'}`}>Remove all cookies, cache, and storage for this profile</div>
                  </div>
                  <Trash2 className="text-red-500" size={16} />
                </button>

                {/* Update Button */}
                <button
                  onClick={handleUpdateProfile}
                  disabled={!editingProfile.name.trim()}
                  className={`w-full py-3 rounded-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                    darkMode 
                      ? 'bg-zinc-700 text-white hover:bg-zinc-600' 
                      : 'bg-zinc-800 text-white hover:bg-zinc-700'
                  }`}
                >
                  Update Profile
                </button>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Duplicate Profile Dialog */}
      <Dialog.Root open={isDuplicateDialogOpen} onOpenChange={setIsDuplicateDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
          <Dialog.Content className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border rounded-xl p-6 w-[500px] shadow-2xl max-h-[90vh] overflow-y-auto ${
            darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-300'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className={`text-xl font-semibold tracking-tight ${darkMode ? 'text-white' : 'text-black'}`}>Duplicate Profile</Dialog.Title>
              <Dialog.Close asChild>
                <button className={`transition-colors ${darkMode ? 'text-zinc-500 hover:text-white' : 'text-zinc-500 hover:text-black'}`}>
                  <X size={20} />
                </button>
              </Dialog.Close>
            </div>
            <Dialog.Description className={`text-sm font-medium mb-6 ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Create a copy of "{profileToDuplicate?.name}" with new settings. User data will not be duplicated.
            </Dialog.Description>
            
            <div className="space-y-6">
              {/* Profile Name */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>Profile Name *</label>
                <input
                  type="text"
                  value={duplicateProfile.name}
                  onChange={(e) => setDuplicateProfile({ ...duplicateProfile, name: e.target.value })}
                  placeholder="e.g., Work Profile, Shopping, Social Media"
                  className={`w-full border rounded-lg px-4 py-2.5 focus:outline-none transition-colors ${
                    darkMode 
                      ? 'bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-zinc-600' 
                      : 'bg-white border-zinc-300 text-black placeholder:text-zinc-400 focus:border-zinc-400'
                  }`}
                />
              </div>

              {/* Startup URL */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
                  Startup URL <span className={`text-xs font-normal ${darkMode ? 'text-zinc-500' : 'text-zinc-600'}`}>(Optional)</span>
                </label>
                <input
                  type="url"
                  value={duplicateProfile.startupUrl}
                  onChange={(e) => setDuplicateProfile({ ...duplicateProfile, startupUrl: e.target.value })}
                  placeholder="https://example.com or leave empty for default"
                  className={`w-full border rounded-lg px-4 py-2.5 focus:outline-none transition-colors ${
                    darkMode 
                      ? 'bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-zinc-600' 
                      : 'bg-white border-zinc-300 text-black placeholder:text-zinc-400 focus:border-zinc-400'
                  }`}
                />
                <p className={`text-xs mt-1.5 ${darkMode ? 'text-zinc-500' : 'text-zinc-600'}`}>
                  This URL will open automatically when launching the browser
                </p>
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
                    value={duplicateProfile.proxyId?.toString() || 'none'} 
                    onValueChange={(value) => setDuplicateProfile({ ...duplicateProfile, proxyId: value === 'none' ? null : parseInt(value) })}
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

              {/* Info Box */}
              <div className={`border rounded-lg p-4 ${darkMode ? 'bg-blue-950/20 border-blue-900/30' : 'bg-blue-50 border-blue-200'}`}>
                <div className={`text-sm ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                  <strong>Note:</strong> Only the profile configuration will be duplicated. Browser history, cookies, and other user data will not be copied.
                </div>
              </div>

              {/* Create Button */}
              <button
                onClick={handleCreateDuplicate}
                disabled={!duplicateProfile.name.trim()}
                className={`w-full py-3 rounded-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                  darkMode 
                    ? 'bg-zinc-700 text-white hover:bg-zinc-600' 
                    : 'bg-zinc-800 text-white hover:bg-zinc-700'
                }`}
              >
                Duplicate Profile
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Delete Confirmation Dialog */}
      <AlertDialog.Root open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
          <AlertDialog.Content className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border rounded-xl p-6 w-[400px] shadow-2xl ${
            darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-300'
          }`}>
            <AlertDialog.Title className={`text-xl font-light mb-2 ${darkMode ? 'text-white' : 'text-black'}`}>
              Delete Profile
            </AlertDialog.Title>
            <AlertDialog.Description className={`text-sm mb-6 ${darkMode ? 'text-zinc-500' : 'text-zinc-600'}`}>
              Are you sure you want to delete "{profileToDelete?.name}"? This action cannot be undone.
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
                  onClick={() => handleDeleteProfile(profileToDelete?.id)}
                  className="px-4 py-2 rounded-lg transition-all bg-red-600 hover:bg-red-700 text-white"
                >
                  Delete
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>

      {/* Clear Data Confirmation Dialog */}
      <AlertDialog.Root open={clearDataDialogOpen} onOpenChange={setClearDataDialogOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
          <AlertDialog.Content className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border rounded-xl p-6 w-[450px] shadow-2xl ${
            darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-300'
          }`}>
            <AlertDialog.Title className={`text-xl font-semibold mb-2 tracking-tight ${darkMode ? 'text-white' : 'text-black'}`}>
              Clear Profile Data
            </AlertDialog.Title>
            <AlertDialog.Description className={`text-sm font-medium mb-4 ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
              This will permanently delete all cookies, cache, and storage data for "{profileToClear?.name}". This action cannot be undone.
            </AlertDialog.Description>
            
            <div className="mb-6">
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
                Type <span className="font-bold text-red-500">clear</span> to confirm:
              </label>
              <input
                type="text"
                value={clearDataConfirmation}
                onChange={(e) => setClearDataConfirmation(e.target.value)}
                placeholder="Type 'clear' here"
                className={`w-full border rounded-lg px-4 py-2.5 focus:outline-none transition-colors ${
                  darkMode 
                    ? 'bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-zinc-600' 
                    : 'bg-white border-zinc-300 text-black placeholder:text-zinc-400 focus:border-zinc-400'
                }`}
              />
            </div>

            <div className="flex space-x-3 justify-end">
              <AlertDialog.Cancel asChild>
                <button 
                  onClick={() => {
                    setClearDataDialogOpen(false);
                    setClearDataConfirmation('');
                    setProfileToClear(null);
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    darkMode 
                      ? 'bg-zinc-800 hover:bg-zinc-700 text-white' 
                      : 'bg-zinc-200 hover:bg-zinc-300 text-black'
                  }`}
                >
                  Cancel
                </button>
              </AlertDialog.Cancel>
              <button 
                onClick={handleClearData}
                disabled={clearDataConfirmation.toLowerCase() !== 'clear'}
                className="px-4 py-2 rounded-lg font-medium transition-all bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear Data
              </button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
};

export default Profiles;
