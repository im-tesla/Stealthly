import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import * as Switch from '@radix-ui/react-switch';
import * as Select from '@radix-ui/react-select';
import * as Checkbox from '@radix-ui/react-checkbox';
import { Plus, Play, Trash2, Edit, X, Shield, ChevronDown, Check, Cookie, Square, Copy, GripVertical, Key, Eye, EyeOff, Upload, AlertCircle } from 'lucide-react';

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
  const [draggedProfile, setDraggedProfile] = useState(null);
  const [dragOverProfile, setDragOverProfile] = useState(null);
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
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [editingPassword, setEditingPassword] = useState(null);
  const [newPassword, setNewPassword] = useState({
    url: '',
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [bulkImportDialogOpen, setBulkImportDialogOpen] = useState(false);
  const [bulkImportUrl, setBulkImportUrl] = useState('');
  const [bulkImportLoading, setBulkImportLoading] = useState(false);
  const [bulkImportError, setBulkImportError] = useState('');
  const [bulkImportSuccess, setBulkImportSuccess] = useState('');
  const [assignProxies, setAssignProxies] = useState(false);
  const [stopIfNoFreeProxy, setStopIfNoFreeProxy] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedProfiles, setSelectedProfiles] = useState(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  // Helper function to normalize URLs - adds https:// if no protocol is specified
  const normalizeUrl = (url) => {
    if (!url || url.trim() === '' || url === 'about:blank') {
      return url;
    }
    
    const trimmedUrl = url.trim();
    
    // If it already has a protocol, return as-is
    if (trimmedUrl.match(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//)) {
      return trimmedUrl;
    }
    
    // Add https:// prefix
    return `https://${trimmedUrl}`;
  };

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
        startupUrl: normalizeUrl(newProfile.startupUrl.trim()) || 'about:blank',
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
      passwords: profile.passwords || [] // Initialize passwords array
    });
    setIsEditDialogOpen(true);
  };

  const handleAddPassword = () => {
    setEditingPassword(null);
    setNewPassword({ url: '', username: '', password: '' });
    setShowPassword(false);
    setPasswordDialogOpen(true);
  };

  const handleEditPassword = (password, index) => {
    setEditingPassword({ ...password, index });
    setNewPassword({ url: password.url, username: password.username, password: password.password });
    setShowPassword(false);
    setPasswordDialogOpen(true);
  };

  const handleSavePassword = () => {
    if (!newPassword.url.trim() || !newPassword.username.trim() || !newPassword.password.trim()) {
      return; // Validation
    }

    const passwords = editingProfile.passwords || [];
    
    if (editingPassword !== null && editingPassword.index !== undefined) {
      // Update existing password
      passwords[editingPassword.index] = {
        url: newPassword.url.trim(),
        username: newPassword.username.trim(),
        password: newPassword.password.trim()
      };
    } else {
      // Add new password
      passwords.push({
        url: newPassword.url.trim(),
        username: newPassword.username.trim(),
        password: newPassword.password.trim()
      });
    }

    setEditingProfile({ ...editingProfile, passwords });
    setPasswordDialogOpen(false);
    setEditingPassword(null);
    setNewPassword({ url: '', username: '', password: '' });
  };

  const handleDeletePassword = (index) => {
    const passwords = [...(editingProfile.passwords || [])];
    passwords.splice(index, 1);
    setEditingProfile({ ...editingProfile, passwords });
  };

  const handleBulkImport = async () => {
    if (!bulkImportUrl.trim()) {
      setBulkImportError('Please enter a URL');
      return;
    }

    setBulkImportLoading(true);
    setBulkImportError('');

    try {
      // Fetch JSON from URL
      const response = await fetch(bulkImportUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Validate data format
      if (!Array.isArray(data)) {
        throw new Error('Invalid format: Expected an array of profiles');
      }

      // Validate each profile
      for (const item of data) {
        if (!item.name || !item.name.trim()) {
          throw new Error('Invalid profile format: Each profile must have a name');
        }
      }

      // Calculate proxy usage
      const proxyUsage = {};
      if (assignProxies && proxies.length > 0) {
        // Initialize usage count for all proxies
        proxies.forEach(proxy => {
          proxyUsage[proxy.id] = 0;
        });

        // Count current usage
        profiles.forEach(profile => {
          if (profile.proxyId && proxyUsage[profile.proxyId] !== undefined) {
            proxyUsage[profile.proxyId]++;
          }
        });
      }

      // Function to get next available proxy
      const getNextProxy = () => {
        if (!assignProxies || proxies.length === 0) {
          return null;
        }

        // Find proxies with 0 uses
        const unusedProxies = proxies.filter(proxy => proxyUsage[proxy.id] === 0);
        
        if (unusedProxies.length > 0) {
          // Pick random unused proxy
          const randomProxy = unusedProxies[Math.floor(Math.random() * unusedProxies.length)];
          proxyUsage[randomProxy.id]++;
          return randomProxy.id;
        }

        // If stopIfNoFreeProxy is enabled and no unused proxies, return null
        if (stopIfNoFreeProxy) {
          return null;
        }

        // Find proxy with least uses
        let leastUsedProxy = proxies[0];
        let minUses = proxyUsage[leastUsedProxy.id];

        for (const proxy of proxies) {
          if (proxyUsage[proxy.id] < minUses) {
            minUses = proxyUsage[proxy.id];
            leastUsedProxy = proxy;
          }
        }

        proxyUsage[leastUsedProxy.id]++;
        return leastUsedProxy.id;
      };

      // Import profiles
      let importedCount = 0;
      let stoppedDueToNoProxy = false;

      for (const item of data) {
        // Check if we should stop due to no free proxy
        if (assignProxies && stopIfNoFreeProxy) {
          const hasUnusedProxy = proxies.some(proxy => proxyUsage[proxy.id] === 0);
          if (!hasUnusedProxy) {
            stoppedDueToNoProxy = true;
            break;
          }
        }

        const proxyId = getNextProxy();

        // If stopIfNoFreeProxy is enabled and we couldn't get a proxy, stop
        if (assignProxies && stopIfNoFreeProxy && proxyId === null) {
          stoppedDueToNoProxy = true;
          break;
        }

        const profileData = {
          name: item.name,
          proxyId: proxyId,
          startupUrl: item.website ? normalizeUrl(item.website) : 'about:blank',
          status: 'inactive',
          passwords: (item.email || item.password || item.website) ? [
            {
              url: item.website ? normalizeUrl(item.website) : '',
              username: item.email || '',
              password: item.password || ''
            }
          ] : []
        };

        const createdProfile = await window.api.profiles.create(profileData);
        if (createdProfile) {
          setProfiles(prevProfiles => [...prevProfiles, createdProfile]);
          importedCount++;
        }
      }

      // Show success message
      let message = `Successfully imported ${importedCount} profile(s)`;
      if (stoppedDueToNoProxy) {
        message += `. Stopped early: No free proxies available (${data.length - importedCount} profiles not imported)`;
      }

      setBulkImportSuccess(message);
      setBulkImportUrl('');

      // Auto-close success message after 5 seconds
      setTimeout(() => {
        setBulkImportSuccess('');
        setBulkImportDialogOpen(false);
        setAssignProxies(false);
        setStopIfNoFreeProxy(false);
      }, 5000);

    } catch (error) {
      console.error('Bulk import error:', error);
      setBulkImportError(error.message || 'Failed to import profiles');
    } finally {
      setBulkImportLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (editingProfile && editingProfile.name.trim()) {
      const updates = {
        name: editingProfile.name,
        proxyId: editingProfile.proxyId,
        startupUrl: normalizeUrl(editingProfile.startupUrl?.trim()) || 'about:blank',
        passwords: editingProfile.passwords || [] // Save passwords
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

  const toggleProfileSelection = (profileId) => {
    const newSelection = new Set(selectedProfiles);
    if (newSelection.has(profileId)) {
      newSelection.delete(profileId);
    } else {
      newSelection.add(profileId);
    }
    setSelectedProfiles(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedProfiles.size === profiles.length) {
      setSelectedProfiles(new Set());
    } else {
      setSelectedProfiles(new Set(profiles.map(p => p.id)));
    }
  };

  const handleBulkDelete = async () => {
    const profilesToDelete = Array.from(selectedProfiles);
    
    for (const profileId of profilesToDelete) {
      // Check if profile is currently active and close it first
      const profile = profiles.find(p => p.id === profileId);
      if (profile && profile.status === 'active') {
        await window.api.profiles.close(profileId);
      }
      
      await window.api.profiles.delete(profileId);
    }
    
    setProfiles(profiles.filter(p => !selectedProfiles.has(p.id)));
    setSelectedProfiles(new Set());
    setSelectionMode(false);
    setBulkDeleteDialogOpen(false);
  };

  const cancelSelectionMode = () => {
    setSelectionMode(false);
    setSelectedProfiles(new Set());
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
        startupUrl: normalizeUrl(duplicateProfile.startupUrl.trim()) || 'about:blank',
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

  // Sort profiles by order field (fallback to creation time if no order)
  const sortedProfiles = [...profiles].sort((a, b) => {
    const orderA = a.order || 0;
    const orderB = b.order || 0;
    if (orderA !== orderB) return orderA - orderB;
    return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
  });

  // Drag and drop handlers
  const handleDragStart = (e, profile) => {
    setDraggedProfile(profile);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, profile) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverProfile(profile);
  };

  const handleDragLeave = () => {
    setDragOverProfile(null);
  };

  const handleDrop = async (e, targetProfile) => {
    e.preventDefault();
    
    if (!draggedProfile || draggedProfile.id === targetProfile.id) {
      setDraggedProfile(null);
      setDragOverProfile(null);
      return;
    }

    // Create new order based on drag and drop
    const newProfiles = [...sortedProfiles];
    const draggedIndex = newProfiles.findIndex(p => p.id === draggedProfile.id);
    const targetIndex = newProfiles.findIndex(p => p.id === targetProfile.id);

    // Remove dragged profile and insert at target position
    const [movedProfile] = newProfiles.splice(draggedIndex, 1);
    newProfiles.splice(targetIndex, 0, movedProfile);

    // Update local state immediately for smooth UX
    setProfiles(newProfiles);

    // Send new order to backend
    const newOrderArray = newProfiles.map(p => p.id);
    try {
      const result = await window.api.profiles.reorder(newOrderArray);
      if (result.success) {
        // Refresh profiles to get updated order from backend
        const updatedProfiles = await window.api.profiles.getAll();
        setProfiles(updatedProfiles);
      }
    } catch (error) {
      console.error('Failed to reorder profiles:', error);
      // Revert to original order on error
      const originalProfiles = await window.api.profiles.getAll();
      setProfiles(originalProfiles);
    }

    setDraggedProfile(null);
    setDragOverProfile(null);
  };

  const handleDragEnd = () => {
    setDraggedProfile(null);
    setDragOverProfile(null);
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold mb-2 tracking-tight">Profiles</h1>
          <p className={`text-base font-medium ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
            {selectionMode 
              ? `${selectedProfiles.size} selected` 
              : 'Manage your browser profiles • Drag & drop to reorder'
            }
          </p>
        </div>
        <div className="flex space-x-3">
          {selectionMode ? (
            <>
              <button 
                onClick={toggleSelectAll}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  darkMode 
                    ? 'bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700' 
                    : 'bg-zinc-200 text-black hover:bg-zinc-300 border border-zinc-300'
                }`}
              >
                <Check size={18} />
                <span>{selectedProfiles.size === profiles.length ? 'Deselect All' : 'Select All'}</span>
              </button>
              <button 
                onClick={() => setBulkDeleteDialogOpen(true)}
                disabled={selectedProfiles.size === 0}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  darkMode 
                    ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50 border border-red-900/30' 
                    : 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-300'
                }`}
              >
                <Trash2 size={18} />
                <span>Delete Selected ({selectedProfiles.size})</span>
              </button>
              <button 
                onClick={cancelSelectionMode}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  darkMode 
                    ? 'bg-zinc-700 text-white hover:bg-zinc-600' 
                    : 'bg-zinc-800 text-white hover:bg-zinc-700'
                }`}
              >
                <X size={18} />
                <span>Cancel</span>
              </button>
            </>
          ) : (
            <>
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

        {/* Bulk Import Button */}
        <button 
          onClick={() => setBulkImportDialogOpen(true)}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
            darkMode 
              ? 'bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700' 
              : 'bg-zinc-200 text-black hover:bg-zinc-300 border border-zinc-300'
          }`}
        >
          <Upload size={18} />
          <span>Bulk Import</span>
        </button>

        {/* Select Profiles Button */}
        {profiles.length > 0 && (
          <button 
            onClick={() => setSelectionMode(true)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
              darkMode 
                ? 'bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700' 
                : 'bg-zinc-200 text-black hover:bg-zinc-300 border border-zinc-300'
            }`}
          >
            <Check size={18} />
            <span>Select</span>
          </button>
        )}
      </>
      )}
      </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedProfiles.map((profile) => (
          <div
            key={profile.id}
            draggable={!selectionMode}
            onDragStart={(e) => !selectionMode && handleDragStart(e, profile)}
            onDragOver={(e) => !selectionMode && handleDragOver(e, profile)}
            onDragLeave={!selectionMode ? handleDragLeave : undefined}
            onDrop={(e) => !selectionMode && handleDrop(e, profile)}
            onDragEnd={!selectionMode ? handleDragEnd : undefined}
            onClick={() => selectionMode && toggleProfileSelection(profile.id)}
            className={`border rounded-xl p-6 transition-smooth ${!selectionMode ? 'cursor-move' : 'cursor-pointer'} select-none flex flex-col ${
              draggedProfile?.id === profile.id ? 'opacity-50' : ''
            } ${
              selectionMode && selectedProfiles.has(profile.id)
                ? darkMode
                  ? 'border-blue-500 bg-blue-950/30'
                  : 'border-blue-500 bg-blue-50'
                : dragOverProfile?.id === profile.id && draggedProfile?.id !== profile.id 
                ? darkMode 
                  ? 'border-blue-400 bg-blue-900/20' 
                  : 'border-blue-400 bg-blue-50'
                : darkMode 
                  ? 'bg-zinc-950 border-zinc-800 hover:border-zinc-700' 
                  : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300'
            }`}
          >
            {/* Selection Checkbox */}
            {selectionMode && (
              <div className="mb-3">
                <Checkbox.Root
                  checked={selectedProfiles.has(profile.id)}
                  onCheckedChange={() => toggleProfileSelection(profile.id)}
                  className={`w-5 h-5 rounded border flex items-center justify-center ${
                    darkMode 
                      ? 'bg-zinc-900 border-zinc-700 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-500' 
                      : 'bg-white border-zinc-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-500'
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox.Indicator>
                    <Check size={14} className="text-white" />
                  </Checkbox.Indicator>
                </Checkbox.Root>
              </div>
            )}

            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 
                    className="text-lg font-light truncate max-w-full" 
                    title={profile.name}
                  >
                    {profile.name}
                  </h3>
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
              <div className={`p-1 cursor-grab active:cursor-grabbing opacity-40 hover:opacity-70 transition-opacity flex-shrink-0 ${
                darkMode ? 'text-zinc-500' : 'text-zinc-400'
              }`}>
                <GripVertical size={18} />
              </div>
            </div>
            <div className="space-y-2 mb-4 text-sm">
              <div className={`flex justify-between ${darkMode ? 'text-zinc-500' : 'text-zinc-600'}`}>
                <span>Proxy:</span>
                <span className="truncate ml-2 max-w-[120px]" title={getProxyName(profile.proxyId)}>
                  {getProxyName(profile.proxyId)}
                </span>
              </div>
              <div className={`flex justify-between ${darkMode ? 'text-zinc-500' : 'text-zinc-600'}`}>
                <span>Start URL:</span>
                <span className="truncate ml-2 max-w-[120px]" title={profile.startupUrl || 'about:blank'}>
                  {profile.startupUrl && profile.startupUrl !== 'about:blank' 
                    ? (() => {
                        try {
                          return new URL(profile.startupUrl).hostname;
                        } catch {
                          // If URL parsing fails, just show the raw value
                          return profile.startupUrl;
                        }
                      })()
                    : 'about:blank'}
                </span>
              </div>
              <div className={`flex justify-between ${darkMode ? 'text-zinc-500' : 'text-zinc-600'}`}>
                <span>Created:</span>
                <span className="truncate ml-2 max-w-[120px]" title={formatDate(profile.createdAt)}>
                  {formatDate(profile.createdAt)}
                </span>
              </div>
            </div>
            {!selectionMode && (
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
            )}
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

                {/* Password Manager Section */}
                <div className={`border rounded-lg p-4 space-y-4 ${darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className={`text-sm font-medium flex items-center gap-2 ${darkMode ? 'text-white' : 'text-black'}`}>
                        <Key size={16} />
                        Password Manager
                      </label>
                      <p className={`text-xs mt-1 ${darkMode ? 'text-zinc-500' : 'text-zinc-600'}`}>
                        Auto-fill login credentials for websites
                      </p>
                    </div>
                    <button
                      onClick={handleAddPassword}
                      className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        darkMode 
                          ? 'bg-zinc-800 text-white hover:bg-zinc-700' 
                          : 'bg-zinc-200 text-black hover:bg-zinc-300'
                      }`}
                    >
                      <Plus size={14} />
                      <span>Add</span>
                    </button>
                  </div>
                  
                  {/* Password List */}
                  {editingProfile.passwords && editingProfile.passwords.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {editingProfile.passwords.map((pwd, index) => (
                        <div 
                          key={index}
                          className={`border rounded-lg p-3 flex items-center justify-between ${
                            darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-300'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-medium truncate ${darkMode ? 'text-white' : 'text-black'}`}>
                              {pwd.url}
                            </div>
                            <div className={`text-xs truncate ${darkMode ? 'text-zinc-500' : 'text-zinc-600'}`}>
                              {pwd.username}
                            </div>
                          </div>
                          <div className="flex items-center space-x-1 ml-2">
                            <button
                              onClick={() => handleEditPassword(pwd, index)}
                              className={`p-1.5 rounded transition-all ${
                                darkMode 
                                  ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white' 
                                  : 'hover:bg-zinc-200 text-zinc-600 hover:text-black'
                              }`}
                              title="Edit password"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => handleDeletePassword(index)}
                              className={`p-1.5 rounded transition-all ${
                                darkMode 
                                  ? 'hover:bg-red-950 text-zinc-400 hover:text-red-400' 
                                  : 'hover:bg-red-100 text-zinc-600 hover:text-red-600'
                              }`}
                              title="Delete password"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={`text-center py-4 text-xs ${darkMode ? 'text-zinc-600' : 'text-zinc-500'}`}>
                      No saved passwords. Click "Add" to save login credentials.
                    </div>
                  )}
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

      {/* Password Add/Edit Dialog */}
      <Dialog.Root open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
          <Dialog.Content className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border rounded-xl p-6 w-[450px] shadow-2xl ${
            darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-300'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className={`text-xl font-semibold tracking-tight ${darkMode ? 'text-white' : 'text-black'}`}>
                {editingPassword ? 'Edit Password' : 'Add Password'}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className={`transition-colors ${darkMode ? 'text-zinc-500 hover:text-white' : 'text-zinc-500 hover:text-black'}`}>
                  <X size={20} />
                </button>
              </Dialog.Close>
            </div>
            <Dialog.Description className={`text-sm font-medium mb-6 ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Store login credentials for automatic form filling
            </Dialog.Description>

            <div className="space-y-4">
              {/* Website URL */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
                  Website URL *
                </label>
                <input
                  type="url"
                  value={newPassword.url}
                  onChange={(e) => setNewPassword({ ...newPassword, url: e.target.value })}
                  placeholder="https://example.com"
                  className={`w-full border rounded-lg px-4 py-2.5 focus:outline-none transition-colors ${
                    darkMode 
                      ? 'bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-zinc-600' 
                      : 'bg-white border-zinc-300 text-black placeholder:text-zinc-400 focus:border-zinc-400'
                  }`}
                />
                <p className={`text-xs mt-1.5 ${darkMode ? 'text-zinc-500' : 'text-zinc-600'}`}>
                  The website where this login is used
                </p>
              </div>

              {/* Username */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
                  Username / Email *
                </label>
                <input
                  type="text"
                  value={newPassword.username}
                  onChange={(e) => setNewPassword({ ...newPassword, username: e.target.value })}
                  placeholder="username@example.com"
                  className={`w-full border rounded-lg px-4 py-2.5 focus:outline-none transition-colors ${
                    darkMode 
                      ? 'bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-zinc-600' 
                      : 'bg-white border-zinc-300 text-black placeholder:text-zinc-400 focus:border-zinc-400'
                  }`}
                />
              </div>

              {/* Password */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword.password}
                    onChange={(e) => setNewPassword({ ...newPassword, password: e.target.value })}
                    placeholder="••••••••"
                    className={`w-full border rounded-lg px-4 py-2.5 pr-10 focus:outline-none transition-colors ${
                      darkMode 
                        ? 'bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-zinc-600' 
                        : 'bg-white border-zinc-300 text-black placeholder:text-zinc-400 focus:border-zinc-400'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 ${darkMode ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-600 hover:text-zinc-800'}`}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Info Alert */}
              <div className={`border rounded-lg p-3 ${darkMode ? 'bg-blue-950/20 border-blue-900/30' : 'bg-blue-50 border-blue-200'}`}>
                <div className={`text-xs ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                  <strong>Note:</strong> Passwords are stored locally and will be auto-filled when visiting the specified website.
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setPasswordDialogOpen(false);
                    setEditingPassword(null);
                    setNewPassword({ url: '', username: '', password: '' });
                  }}
                  className={`flex-1 py-2.5 rounded-lg font-medium transition-all ${
                    darkMode 
                      ? 'bg-zinc-800 hover:bg-zinc-700 text-white' 
                      : 'bg-zinc-200 hover:bg-zinc-300 text-black'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePassword}
                  disabled={!newPassword.url.trim() || !newPassword.username.trim() || !newPassword.password.trim()}
                  className={`flex-1 py-2.5 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    darkMode 
                      ? 'bg-zinc-700 text-white hover:bg-zinc-600' 
                      : 'bg-zinc-800 text-white hover:bg-zinc-700'
                  }`}
                >
                  {editingPassword ? 'Update' : 'Save'}
                </button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Bulk Import Dialog */}
      <Dialog.Root open={bulkImportDialogOpen} onOpenChange={setBulkImportDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
          <Dialog.Content className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border rounded-xl p-6 w-[550px] shadow-2xl max-h-[90vh] overflow-y-auto ${
            darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-300'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className={`text-xl font-semibold tracking-tight ${darkMode ? 'text-white' : 'text-black'}`}>
                Bulk Import Profiles
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className={`transition-colors ${darkMode ? 'text-zinc-500 hover:text-white' : 'text-zinc-500 hover:text-black'}`}>
                  <X size={20} />
                </button>
              </Dialog.Close>
            </div>
            <Dialog.Description className={`text-sm font-medium mb-6 ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Import multiple profiles from a JSON URL
            </Dialog.Description>

            <div className="space-y-4">
              {/* URL Input */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
                  JSON URL *
                </label>
                <input
                  type="url"
                  value={bulkImportUrl}
                  onChange={(e) => {
                    setBulkImportUrl(e.target.value);
                    setBulkImportError('');
                    setBulkImportSuccess('');
                  }}
                  placeholder="https://example.com/profiles.json"
                  className={`w-full border rounded-lg px-4 py-2.5 focus:outline-none transition-colors ${
                    darkMode 
                      ? 'bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-zinc-600' 
                      : 'bg-white border-zinc-300 text-black placeholder:text-zinc-400 focus:border-zinc-400'
                  }`}
                />
              </div>

              {/* Proxy Assignment Options */}
              <div className={`border rounded-lg p-4 space-y-3 ${darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox.Root
                      checked={assignProxies}
                      onCheckedChange={(checked) => setAssignProxies(checked)}
                      className={`w-5 h-5 rounded border flex items-center justify-center ${
                        darkMode 
                          ? 'bg-zinc-900 border-zinc-700 data-[state=checked]:bg-zinc-700 data-[state=checked]:border-zinc-600' 
                          : 'bg-white border-zinc-300 data-[state=checked]:bg-zinc-800 data-[state=checked]:border-zinc-700'
                      }`}
                    >
                      <Checkbox.Indicator>
                        <Check size={14} className="text-white" />
                      </Checkbox.Indicator>
                    </Checkbox.Root>
                    <label className={`text-sm font-medium cursor-pointer ${darkMode ? 'text-white' : 'text-black'}`}>
                      Auto-assign proxies
                    </label>
                  </div>
                  <span className={`text-xs ${darkMode ? 'text-zinc-500' : 'text-zinc-600'}`}>
                    {proxies.length} available
                  </span>
                </div>
                <p className={`text-xs ${darkMode ? 'text-zinc-500' : 'text-zinc-600'}`}>
                  Automatically assign proxies to imported profiles (unused first, then least used)
                </p>

                {/* Stop if no free proxy option */}
                {assignProxies && (
                  <div className="flex items-center space-x-2 pt-2 border-t border-zinc-700">
                    <Checkbox.Root
                      checked={stopIfNoFreeProxy}
                      onCheckedChange={(checked) => setStopIfNoFreeProxy(checked)}
                      className={`w-5 h-5 rounded border flex items-center justify-center ${
                        darkMode 
                          ? 'bg-zinc-900 border-zinc-700 data-[state=checked]:bg-zinc-700 data-[state=checked]:border-zinc-600' 
                          : 'bg-white border-zinc-300 data-[state=checked]:bg-zinc-800 data-[state=checked]:border-zinc-700'
                      }`}
                    >
                      <Checkbox.Indicator>
                        <Check size={14} className="text-white" />
                      </Checkbox.Indicator>
                    </Checkbox.Root>
                    <label className={`text-sm cursor-pointer ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>
                      Stop importing if no unused proxies available
                    </label>
                  </div>
                )}
              </div>

              {/* Format Example */}
              <div className={`border rounded-lg p-4 ${darkMode ? 'bg-blue-950/20 border-blue-900/30' : 'bg-blue-50 border-blue-200'}`}>
                <div className={`text-xs ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                  <strong>JSON Format:</strong> Only <code>name</code> is required
                  <pre className="mt-2 overflow-x-auto">
{`[
  {
    "name": "Profile Name",
    "email": "user@example.com",
    "password": "password123",
    "website": "example.com"
  }
]`}
                  </pre>
                  <p className="mt-2"><strong>Note:</strong> email, password, and website are optional</p>
                </div>
              </div>

              {/* Error Message */}
              {bulkImportError && (
                <div className={`border rounded-lg p-3 flex items-start space-x-2 ${darkMode ? 'bg-red-950/20 border-red-900/30' : 'bg-red-50 border-red-200'}`}>
                  <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <div className={`text-xs ${darkMode ? 'text-red-300' : 'text-red-800'}`}>
                    {bulkImportError}
                  </div>
                </div>
              )}

              {/* Success Message */}
              {bulkImportSuccess && (
                <div className={`border rounded-lg p-3 flex items-start space-x-2 ${darkMode ? 'bg-green-950/20 border-green-900/30' : 'bg-green-50 border-green-200'}`}>
                  <Check size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                  <div className={`text-xs ${darkMode ? 'text-green-300' : 'text-green-800'}`}>
                    {bulkImportSuccess}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setBulkImportDialogOpen(false);
                    setBulkImportUrl('');
                    setBulkImportError('');
                    setBulkImportSuccess('');
                    setAssignProxies(false);
                    setStopIfNoFreeProxy(false);
                  }}
                  disabled={bulkImportLoading}
                  className={`flex-1 py-2.5 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    darkMode 
                      ? 'bg-zinc-800 hover:bg-zinc-700 text-white' 
                      : 'bg-zinc-200 hover:bg-zinc-300 text-black'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkImport}
                  disabled={!bulkImportUrl.trim() || bulkImportLoading}
                  className={`flex-1 py-2.5 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    darkMode 
                      ? 'bg-zinc-700 text-white hover:bg-zinc-600' 
                      : 'bg-zinc-800 text-white hover:bg-zinc-700'
                  }`}
                >
                  {bulkImportLoading ? 'Importing...' : 'Import Profiles'}
                </button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog.Root open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
          <AlertDialog.Content className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border rounded-xl p-6 w-[450px] shadow-2xl ${
            darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-300'
          }`}>
            <AlertDialog.Title className={`text-xl font-semibold mb-2 tracking-tight ${darkMode ? 'text-white' : 'text-black'}`}>
              Delete {selectedProfiles.size} Profile{selectedProfiles.size !== 1 ? 's' : ''}
            </AlertDialog.Title>
            <AlertDialog.Description className={`text-sm font-medium mb-6 ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Are you sure you want to delete {selectedProfiles.size} selected profile{selectedProfiles.size !== 1 ? 's' : ''}? This action cannot be undone.
            </AlertDialog.Description>
            
            {/* Show list of profiles to be deleted */}
            <div className={`max-h-48 overflow-y-auto mb-6 border rounded-lg ${darkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>
              {Array.from(selectedProfiles).map(profileId => {
                const profile = profiles.find(p => p.id === profileId);
                return profile ? (
                  <div 
                    key={profileId}
                    className={`px-4 py-2 border-b last:border-b-0 ${darkMode ? 'border-zinc-800' : 'border-zinc-200'}`}
                  >
                    <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-black'}`}>
                      {profile.name}
                    </div>
                    {profile.status === 'active' && (
                      <div className="text-xs text-yellow-500 mt-1">
                        ⚠️ Active - will be stopped before deletion
                      </div>
                    )}
                  </div>
                ) : null;
              })}
            </div>

            <div className="flex space-x-3 justify-end">
              <AlertDialog.Cancel asChild>
                <button className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  darkMode 
                    ? 'bg-zinc-800 hover:bg-zinc-700 text-white' 
                    : 'bg-zinc-200 hover:bg-zinc-300 text-black'
                }`}>
                  Cancel
                </button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <button 
                  onClick={handleBulkDelete}
                  className="px-4 py-2 rounded-lg font-medium transition-all bg-red-600 hover:bg-red-700 text-white"
                >
                  Delete {selectedProfiles.size} Profile{selectedProfiles.size !== 1 ? 's' : ''}
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
};

export default Profiles;
