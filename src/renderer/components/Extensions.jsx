import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { Plus, FolderOpen, MoreVertical, Trash2, Edit, X, Package } from 'lucide-react';

const Extensions = ({ extensions, setExtensions, darkMode }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [extensionToDelete, setExtensionToDelete] = useState(null);
  const [newExtension, setNewExtension] = useState({ 
    name: '', 
    path: '',
    description: '',
    version: '',
    manifestVersion: null,
    icons: null,
    iconDataUrl: null,
  });
  const [loadingManifest, setLoadingManifest] = useState(false);
  const [manifestError, setManifestError] = useState(null);

  const handleSelectFolder = async () => {
    // Electron dialog to select folder
    const input = document.createElement('input');
    input.type = 'file';
    input.webkitdirectory = true;
    input.directory = true;
    
    input.onchange = async (e) => {
      const files = e.target.files;
      if (files.length > 0) {
        // Get the directory path from the first file
        const fullPath = files[0].path;
        const dirPath = fullPath.substring(0, fullPath.lastIndexOf('\\') || fullPath.lastIndexOf('/'));
        setNewExtension({ ...newExtension, path: dirPath });
        
        // Automatically read manifest.json
        setLoadingManifest(true);
        setManifestError(null);
        
        try {
          const manifestData = await window.api.extensions.readManifest(dirPath);
          
          if (manifestData.success) {
            setNewExtension({
              name: manifestData.name,
              path: dirPath,
              description: manifestData.description,
              version: manifestData.version,
              manifestVersion: manifestData.manifestVersion,
              icons: manifestData.icons,
              iconDataUrl: manifestData.iconDataUrl,
            });
            setManifestError(null);
          } else {
            setManifestError(manifestData.error);
          }
        } catch (error) {
          setManifestError('Failed to read manifest.json');
          console.error('Error reading manifest:', error);
        } finally {
          setLoadingManifest(false);
        }
      }
    };
    
    input.click();
  };

  const handleCreateExtension = async () => {
    if (newExtension.name && newExtension.path) {
      const extensionData = {
        name: newExtension.name,
        path: newExtension.path,
        description: newExtension.description || '',
        version: newExtension.version || '1.0',
        manifestVersion: newExtension.manifestVersion,
        icons: newExtension.icons,
        iconDataUrl: newExtension.iconDataUrl,
        enabled: true,
      };
      
      const createdExtension = await window.api.extensions.create(extensionData);
      if (createdExtension) {
        setExtensions([...extensions, createdExtension]);
        setNewExtension({ name: '', path: '', description: '', version: '', manifestVersion: null, icons: null, iconDataUrl: null });
        setManifestError(null);
        setIsDialogOpen(false);
      }
    }
  };

  const handleDeleteExtension = async (id) => {
    const result = await window.api.extensions.delete(id);
    if (result.success) {
      setExtensions(extensions.filter(e => e.id !== id));
    }
    setDeleteDialogOpen(false);
    setExtensionToDelete(null);
  };

  const confirmDelete = (extension) => {
    setExtensionToDelete(extension);
    setDeleteDialogOpen(true);
  };

  const toggleExtension = async (extension) => {
    const updated = await window.api.extensions.update(extension.id, { enabled: !extension.enabled });
    if (updated) {
      setExtensions(extensions.map(e => e.id === extension.id ? updated : e));
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold mb-2 tracking-tight">Extensions</h1>
          <p className={`text-base font-medium ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>Manage Chrome extensions for your profiles</p>
        </div>
        <Dialog.Root open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <Dialog.Trigger asChild>
            <button className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
              darkMode 
                ? 'bg-zinc-700 text-white hover:bg-zinc-600' 
                : 'bg-zinc-800 text-white hover:bg-zinc-700'
            }`}>
              <Plus size={18} />
              <span>Add Extension</span>
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
            <Dialog.Content className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border rounded-xl p-6 w-[500px] shadow-2xl ${
              darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-300'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <Dialog.Title className={`text-xl font-semibold tracking-tight ${darkMode ? 'text-white' : 'text-black'}`}>Add Extension</Dialog.Title>
                <Dialog.Close asChild>
                  <button className={`transition-colors ${darkMode ? 'text-zinc-500 hover:text-white' : 'text-zinc-500 hover:text-black'}`}>
                    <X size={20} />
                  </button>
                </Dialog.Close>
              </div>
              <Dialog.Description className={`text-sm mb-6 ${darkMode ? 'text-zinc-500' : 'text-zinc-600'}`}>
                Select an unpacked extension folder - manifest.json will be read automatically
              </Dialog.Description>
              <div className="space-y-5">
                {/* Extension Path First */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>Extension Folder *</label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newExtension.path}
                      readOnly
                      placeholder="Select folder to auto-read manifest.json"
                      className={`flex-1 border rounded-lg px-4 py-2.5 text-sm transition-colors focus:outline-none cursor-pointer ${
                        darkMode 
                          ? 'bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600' 
                          : 'bg-white border-zinc-300 text-black placeholder:text-zinc-400'
                      }`}
                      onClick={handleSelectFolder}
                    />
                    <button
                      onClick={handleSelectFolder}
                      disabled={loadingManifest}
                      className={`px-4 py-2.5 rounded-lg border transition-all flex items-center space-x-2 ${
                        loadingManifest
                          ? 'opacity-50 cursor-not-allowed'
                          : darkMode 
                            ? 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-800' 
                            : 'bg-white border-zinc-300 text-zinc-700 hover:bg-zinc-50'
                      }`}
                    >
                      <FolderOpen size={18} />
                      <span>{loadingManifest ? 'Reading...' : 'Browse'}</span>
                    </button>
                  </div>
                  {manifestError && (
                    <p className="text-xs mt-2 text-red-500 flex items-center space-x-1">
                      <span>⚠</span>
                      <span>{manifestError}</span>
                    </p>
                  )}
                  {!manifestError && newExtension.path && (
                    <p className="text-xs mt-2 text-green-500 flex items-center space-x-1">
                      <span>✓</span>
                      <span>Manifest loaded successfully</span>
                    </p>
                  )}
                </div>

                {/* Auto-filled fields */}
                {newExtension.path && (
                  <>
                    {/* Extension Preview Card */}
                    <div className={`border rounded-lg p-4 flex items-center space-x-3 ${
                      darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
                    }`}>
                      <div className={`p-2 rounded-lg flex items-center justify-center w-12 h-12 ${
                        darkMode ? 'bg-zinc-900' : 'bg-zinc-100'
                      }`}>
                        {newExtension.iconDataUrl ? (
                          <img 
                            src={newExtension.iconDataUrl} 
                            alt="Extension icon"
                            className="w-8 h-8 object-contain"
                          />
                        ) : (
                          <Package size={20} className={darkMode ? 'text-zinc-400' : 'text-zinc-600'} />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-black'}`}>
                          {newExtension.name || 'Extension Name'}
                        </div>
                        {newExtension.version && (
                          <div className={`text-xs ${darkMode ? 'text-zinc-500' : 'text-zinc-600'}`}>
                            Version {newExtension.version}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>Extension Name</label>
                      <input
                        type="text"
                        value={newExtension.name}
                        onChange={(e) => setNewExtension({ ...newExtension, name: e.target.value })}
                        placeholder="Extension name from manifest"
                        className={`w-full border rounded-lg px-4 py-2.5 transition-colors focus:outline-none ${
                          darkMode 
                            ? 'bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-zinc-600' 
                            : 'bg-white border-zinc-300 text-black placeholder:text-zinc-400 focus:border-zinc-400'
                        }`}
                      />
                    </div>

                    {newExtension.version && (
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>Version</label>
                        <input
                          type="text"
                          value={newExtension.version}
                          readOnly
                          className={`w-full border rounded-lg px-4 py-2.5 transition-colors ${
                            darkMode 
                              ? 'bg-zinc-900 border-zinc-800 text-zinc-400' 
                              : 'bg-zinc-50 border-zinc-300 text-zinc-600'
                          }`}
                        />
                      </div>
                    )}

                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-zinc-300' : 'text-zinc-700'}`}>Description</label>
                      <textarea
                        value={newExtension.description}
                        onChange={(e) => setNewExtension({ ...newExtension, description: e.target.value })}
                        placeholder="Description from manifest"
                        rows={3}
                        className={`w-full border rounded-lg px-4 py-2.5 transition-colors focus:outline-none resize-none ${
                          darkMode 
                            ? 'bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-zinc-600' 
                            : 'bg-white border-zinc-300 text-black placeholder:text-zinc-400 focus:border-zinc-400'
                        }`}
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <Dialog.Close asChild>
                  <button className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    darkMode 
                      ? 'bg-zinc-800 text-white hover:bg-zinc-700' 
                      : 'bg-zinc-200 text-black hover:bg-zinc-300'
                  }`}>
                    Cancel
                  </button>
                </Dialog.Close>
                <button
                  onClick={handleCreateExtension}
                  disabled={!newExtension.name || !newExtension.path}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    !newExtension.name || !newExtension.path
                      ? 'bg-zinc-600 text-zinc-400 cursor-not-allowed'
                      : darkMode
                        ? 'bg-white text-black hover:bg-zinc-200'
                        : 'bg-black text-white hover:bg-zinc-800'
                  }`}
                >
                  Add Extension
                </button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>

      {/* Extensions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {extensions.length === 0 ? (
          <div className={`col-span-full text-center py-16 border-2 border-dashed rounded-xl ${
            darkMode ? 'border-zinc-800 text-zinc-600' : 'border-zinc-300 text-zinc-400'
          }`}>
            <Package size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No extensions yet</p>
            <p className="text-sm">Add your first Chrome extension to get started</p>
          </div>
        ) : (
          extensions.map((extension) => (
            <div
              key={extension.id}
              className={`border rounded-xl p-5 transition-all ${
                darkMode 
                  ? 'bg-zinc-900 border-zinc-800 hover:border-zinc-700' 
                  : 'bg-white border-zinc-300 hover:border-zinc-400'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg flex items-center justify-center w-12 h-12 ${darkMode ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
                    {extension.iconDataUrl ? (
                      <img 
                        src={extension.iconDataUrl} 
                        alt={extension.name}
                        className="w-8 h-8 object-contain"
                      />
                    ) : (
                      <Package size={20} className={darkMode ? 'text-zinc-400' : 'text-zinc-600'} />
                    )}
                  </div>
                  <div>
                    <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-black'}`}>
                      {extension.name}
                      {extension.version && (
                        <span className={`ml-2 text-xs font-normal ${darkMode ? 'text-zinc-500' : 'text-zinc-600'}`}>
                          v{extension.version}
                        </span>
                      )}
                    </h3>
                    <button
                      onClick={() => toggleExtension(extension)}
                      className={`text-xs font-medium px-2 py-0.5 rounded mt-1 ${
                        extension.enabled
                          ? darkMode
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-green-100 text-green-700'
                          : darkMode
                            ? 'bg-zinc-800 text-zinc-500'
                            : 'bg-zinc-200 text-zinc-600'
                      }`}
                    >
                      {extension.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => confirmDelete(extension)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    darkMode 
                      ? 'hover:bg-zinc-800 text-zinc-500 hover:text-red-400' 
                      : 'hover:bg-zinc-100 text-zinc-400 hover:text-red-600'
                  }`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              
              {extension.description && (
                <p className={`text-sm mb-3 ${darkMode ? 'text-zinc-500' : 'text-zinc-600'}`}>
                  {extension.description}
                </p>
              )}
              
              <div className={`text-xs font-mono p-2 rounded-lg ${
                darkMode ? 'bg-zinc-950 text-zinc-600' : 'bg-zinc-100 text-zinc-500'
              }`}>
                <div className="truncate" title={extension.path}>
                  {extension.path}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog.Root open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm" />
          <AlertDialog.Content className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border rounded-xl p-6 w-[400px] shadow-2xl ${
            darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-300'
          }`}>
            <AlertDialog.Title className={`text-xl font-semibold mb-2 ${darkMode ? 'text-white' : 'text-black'}`}>
              Delete Extension
            </AlertDialog.Title>
            <AlertDialog.Description className={`text-sm mb-6 ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
              Are you sure you want to delete "{extensionToDelete?.name}"? This will remove it from all profiles using it.
            </AlertDialog.Description>
            <div className="flex justify-end space-x-3">
              <AlertDialog.Cancel asChild>
                <button className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  darkMode 
                    ? 'bg-zinc-800 text-white hover:bg-zinc-700' 
                    : 'bg-zinc-200 text-black hover:bg-zinc-300'
                }`}>
                  Cancel
                </button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <button
                  onClick={() => handleDeleteExtension(extensionToDelete?.id)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
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

export default Extensions;
