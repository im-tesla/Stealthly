import React, { useState, useEffect } from 'react';
import * as Switch from '@radix-ui/react-switch';
import { Database, Bell, Palette } from 'lucide-react';

const Settings = ({ darkMode, setDarkMode }) => {
  const [settings, setSettings] = useState({
    autoLaunch: false,
    notifications: true,
    autoUpdate: true,
  });
  const [loading, setLoading] = useState(true);

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
        <h1 className="text-3xl font-light mb-2">Settings</h1>
        <p className={`${darkMode ? 'text-zinc-500' : 'text-zinc-600'}`}>Configure your Stealthy application</p>
      </div>

      <div className="space-y-8">
        {settingGroups.map((group) => (
          <div key={group.title} className={`border rounded-xl p-6 ${darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
            <div className="flex items-center space-x-3 mb-6">
              <group.icon className={`${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`} size={20} />
              <h2 className="text-xl font-light">{group.title}</h2>
            </div>
            <div className="space-y-4">
              {group.settings.map((setting) => (
                <div
                  key={setting.key}
                  className={`flex items-center justify-between py-4 border-b last:border-0 ${darkMode ? 'border-zinc-800' : 'border-zinc-200'}`}
                >
                  <div className="flex-1">
                    <div className="text-sm mb-1">{setting.label}</div>
                    <div className={`text-xs ${darkMode ? 'text-zinc-500' : 'text-zinc-600'}`}>{setting.description}</div>
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

        <div className={`border rounded-xl p-6 ${darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
          <h2 className="text-xl font-light mb-4">About</h2>
          <div className="space-y-2 text-sm">
            <div className={`flex justify-between ${darkMode ? 'text-zinc-500' : 'text-zinc-600'}`}>
              <span>Version:</span>
              <span className={darkMode ? 'text-white' : 'text-black'}>0.1.0001</span>
            </div>
            <div className={`flex justify-between ${darkMode ? 'text-zinc-500' : 'text-zinc-600'}`}>
              <span>Build:</span>
              <span className={darkMode ? 'text-white' : 'text-black'}>Development</span>
            </div>
            <div className={`flex justify-between ${darkMode ? 'text-zinc-500' : 'text-zinc-600'}`}>
              <span>License:</span>
              <span className={darkMode ? 'text-white' : 'text-black'}>MIT</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
