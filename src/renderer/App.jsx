import React, { useState, useEffect } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { LayoutDashboard, User, Globe, Settings } from 'lucide-react';
import Dashboard from './components/Dashboard';
import Profiles from './components/Profiles';
import Proxies from './components/Proxies';
import SettingsPage from './components/Settings';

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(false);
  const [proxies, setProxies] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load data from backend on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [proxiesData, profilesData, settingsData] = await Promise.all([
        window.api.proxies.getAll(),
        window.api.profiles.getAll(),
        window.api.settings.get()
      ]);
      setProxies(proxiesData || []);
      setProfiles(profilesData || []);
      
      // Load dark mode from settings
      if (settingsData && typeof settingsData.darkMode === 'boolean') {
        setDarkMode(settingsData.darkMode);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const reloadProfiles = async () => {
    try {
      const profilesData = await window.api.profiles.getAll();
      setProfiles(profilesData || []);
    } catch (error) {
      console.error('Error reloading profiles:', error);
    }
  };

  const handleDarkModeToggle = async (newDarkMode) => {
    setDarkMode(newDarkMode);
    
    try {
      // Load current settings
      const currentSettings = await window.api.settings.get();
      // Update with new dark mode value
      await window.api.settings.update({
        ...currentSettings,
        darkMode: newDarkMode
      });
    } catch (error) {
      console.error('Error saving dark mode:', error);
      // Revert on error
      setDarkMode(!newDarkMode);
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, component: Dashboard },
    { id: 'profiles', label: 'Profiles', icon: User, component: Profiles },
    { id: 'proxies', label: 'Proxies', icon: Globe, component: Proxies },
    { id: 'settings', label: 'Settings', icon: Settings, component: SettingsPage },
  ];

  if (loading) {
    return (
      <div className={`h-screen w-screen flex items-center justify-center ${darkMode ? 'bg-black text-white' : 'bg-white text-black'}`}>
        <div className="text-center">
          <div className="text-4xl mb-4" style={{ fontFamily: "'Leckerli One', cursive" }}>S</div>
          <div className={`text-sm ${darkMode ? 'text-zinc-500' : 'text-zinc-600'}`}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen w-screen flex overflow-hidden ${darkMode ? 'bg-black text-white' : 'bg-white text-black'}`}>
      <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="flex w-full">
        {/* Sidebar */}
        <Tabs.List className={`w-20 border-r flex flex-col items-center py-6 space-y-2 ${darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-100 border-zinc-300'}`}>
          <div className={`mb-2 text-2xl font-normal ${darkMode ? 'text-white' : 'text-black'}`} style={{ fontFamily: "'Leckerli One', cursive" }}>S</div>
          {tabs.map((tab) => (
            <Tabs.Trigger
              key={tab.id}
              value={tab.id}
              className={`w-14 h-14 flex items-center justify-center rounded-lg transition-smooth ${
                darkMode 
                  ? 'hover:bg-zinc-800 data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-500' 
                  : 'hover:bg-zinc-200 data-[state=active]:bg-zinc-200 data-[state=active]:text-black text-zinc-500'
              }`}
            >
              <tab.icon size={24} />
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {tabs.map((tab) => (
            <Tabs.Content key={tab.id} value={tab.id} className="flex-1 overflow-auto animate-fade-in">
              {tab.id === 'profiles' ? (
                <Profiles 
                  profiles={profiles} 
                  setProfiles={setProfiles}
                  proxies={proxies} 
                  darkMode={darkMode} 
                />
              ) : tab.id === 'proxies' ? (
                <Proxies 
                  proxies={proxies} 
                  setProxies={setProxies}
                  reloadProfiles={reloadProfiles}
                  darkMode={darkMode} 
                />
              ) : tab.id === 'settings' ? (
                <SettingsPage darkMode={darkMode} setDarkMode={handleDarkModeToggle} />
              ) : (
                <tab.component profiles={profiles} proxies={proxies} darkMode={darkMode} />
              )}
            </Tabs.Content>
          ))}
        </div>
      </Tabs.Root>
    </div>
  );
};

export default App;
