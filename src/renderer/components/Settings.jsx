import React, { useState, useEffect } from 'react';
import * as Switch from '@radix-ui/react-switch';
import { Database, Bell, Palette, Download, Upload } from 'lucide-react';

const Settings = ({ darkMode, setDarkMode }) => {
  const [settings, setSettings] = useState({
    autoLaunch: false,
    notifications: true,
    autoUpdate: true,
  });
  const [loading, setLoading] = useState(true);
  const [exportStatus, setExportStatus] = useState('');
  const [importStatus, setImportStatus] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedSettings = await window.api.settings.get();
      if (savedSettings) {
        setSettings(savedSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSetting = async (key) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
    
    try {
      await window.api.settings.update(newSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
      // Revert on error
      setSettings(settings);
    }
  };

  const handleExport = async () => {
    try {
      setExportStatus('Exporting...');
      const result = await window.api.data.export();
      
      if (result.success) {
        // The data is now encrypted, save it as text (not JSON object)
        const dataBlob = new Blob([result.data], { type: 'text/plain' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `stealthy-backup-${new Date().toISOString().split('T')[0]}.encrypted`;
        link.click();
        URL.revokeObjectURL(url);
        setExportStatus('Exported successfully!');
        setTimeout(() => setExportStatus(''), 3000);
      } else {
        setExportStatus('Export failed!');
        setTimeout(() => setExportStatus(''), 3000);
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      setExportStatus('Export failed!');
      setTimeout(() => setExportStatus(''), 3000);
    }
  };

  const handleImport = async () => {
    try {
      setImportStatus('');
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.encrypted,.json'; // Accept both encrypted and old JSON format
      
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
          setImportStatus('Importing...');
          const text = await file.text();
          
          // Pass the raw text (encrypted or JSON) to the import function
          const result = await window.api.data.import(text);
          
          if (result.success) {
            setImportStatus('Import successful! Reloading...');
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          } else {
            setImportStatus(`Import failed: ${result.error}`);
            setTimeout(() => setImportStatus(''), 3000);
          }
        } catch (error) {
          console.error('Error importing data:', error);
          setImportStatus('Import failed! Invalid file format.');
          setTimeout(() => setImportStatus(''), 3000);
        }
      };
      
      input.click();
    } catch (error) {
      console.error('Error opening file:', error);
      setImportStatus('Import failed!');
      setTimeout(() => setImportStatus(''), 3000);
    }
  };

  const settingGroups = [
    {
      title: 'Application',
      icon: Database,
      settings: [
        { key: 'autoLaunch', label: 'Launch on Startup', description: 'Start Stealthy when system boots' },
        { key: 'notifications', label: 'Notifications', description: 'Show desktop notifications' },
      ],
    },
    {
      title: 'Appearance',
      icon: Palette,
      settings: [
        { key: 'darkMode', label: 'Dark Mode', description: 'Use dark theme (recommended)' },
      ],
    },
  ];

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className={`text-sm ${darkMode ? 'text-zinc-500' : 'text-zinc-600'}`}>Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold mb-2 tracking-tight">Settings</h1>
        <p className={`text-base font-medium ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>Configure your Stealthy application</p>
      </div>

      <div className="space-y-8">
        {settingGroups.map((group) => (
          <div key={group.title} className={`border rounded-xl p-6 ${darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
            <div className="flex items-center space-x-3 mb-6">
              <group.icon className={`${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`} size={20} />
              <h2 className="text-xl font-semibold tracking-tight">{group.title}</h2>
            </div>
            <div className="space-y-4">
              {group.settings.map((setting) => (
                <div
                  key={setting.key}
                  className={`flex items-center justify-between py-4 border-b last:border-0 ${darkMode ? 'border-zinc-800' : 'border-zinc-200'}`}
                >
                  <div className="flex-1">
                    <div className="text-sm font-semibold mb-1">{setting.label}</div>
                    <div className={`text-xs font-medium ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>{setting.description}</div>
                  </div>
                  <Switch.Root
                    checked={setting.key === 'darkMode' ? darkMode : settings[setting.key]}
                    onCheckedChange={() => setting.key === 'darkMode' ? setDarkMode(!darkMode) : toggleSetting(setting.key)}
                    className={`w-11 h-6 rounded-full relative transition-colors ${
                      darkMode 
                        ? 'bg-zinc-800 data-[state=checked]:bg-white' 
                        : 'bg-zinc-300 data-[state=checked]:bg-black'
                    }`}
                  >
                    <Switch.Thumb className={`block w-5 h-5 rounded-full transition-transform translate-x-0.5 data-[state=checked]:translate-x-5 ${
                      darkMode 
                        ? 'bg-zinc-400 data-[state=checked]:bg-black' 
                        : 'bg-white data-[state=checked]:bg-white'
                    }`} />
                  </Switch.Root>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Data Management Section */}
        <div className={`border rounded-xl p-6 ${darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
          <div className="flex items-center space-x-3 mb-6">
            <Database className={`${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`} size={20} />
            <h2 className="text-xl font-semibold tracking-tight">Data Management</h2>
          </div>
          <div className="space-y-4">
            <div>
              <p className={`text-sm font-medium mb-4 ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
                Export and import your profiles, proxies, and settings. All data is encrypted for security.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleExport}
                  className={`flex items-center justify-center space-x-2 py-3 rounded-lg font-medium transition-all ${
                    darkMode 
                      ? 'bg-zinc-800 hover:bg-zinc-700 text-white' 
                      : 'bg-zinc-200 hover:bg-zinc-300 text-black'
                  }`}
                >
                  <Download size={18} />
                  <span>Export Data</span>
                </button>
                <button
                  onClick={handleImport}
                  className={`flex items-center justify-center space-x-2 py-3 rounded-lg font-medium transition-all ${
                    darkMode 
                      ? 'bg-zinc-800 hover:bg-zinc-700 text-white' 
                      : 'bg-zinc-200 hover:bg-zinc-300 text-black'
                  }`}
                >
                  <Upload size={18} />
                  <span>Import Data</span>
                </button>
              </div>
              {exportStatus && (
                <div className={`mt-3 text-sm text-center ${exportStatus.includes('success') ? 'text-green-400' : 'text-red-400'}`}>
                  {exportStatus}
                </div>
              )}
              {importStatus && (
                <div className={`mt-3 text-sm text-center ${importStatus.includes('success') ? 'text-green-400' : 'text-red-400'}`}>
                  {importStatus}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={`border rounded-xl p-6 ${darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
          <h2 className="text-xl font-semibold mb-4 tracking-tight">About</h2>
          <div className="space-y-2 text-sm font-medium">
            <div className={`flex justify-between ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
              <span>Version:</span>
              <span className={`font-semibold ${darkMode ? 'text-white' : 'text-black'}`}>0.1.0001</span>
            </div>
            <div className={`flex justify-between ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
              <span>Build:</span>
              <span className={`font-semibold ${darkMode ? 'text-white' : 'text-black'}`}>Development</span>
            </div>
            <div className={`flex justify-between ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
              <span>License:</span>
              <span className={`font-semibold ${darkMode ? 'text-white' : 'text-black'}`}>MIT</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
