import React, { useState } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { LayoutDashboard, User, Globe, Settings } from 'lucide-react';
import Dashboard from './components/Dashboard';
import Profiles from './components/Profiles';
import Proxies from './components/Proxies';
import SettingsPage from './components/Settings';

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(true);
  const [proxies, setProxies] = useState([
    { id: 1, name: 'US Proxy 1', host: '123.45.67.89', port: '8080', type: 'HTTP', status: 'active' },
    { id: 2, name: 'UK Proxy 1', host: '98.76.54.32', port: '8080', type: 'HTTPS', status: 'active' },
    { id: 3, name: 'DE Proxy 1', host: '11.22.33.44', port: '3128', type: 'SOCKS5', status: 'inactive' },
  ]);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, component: Dashboard },
    { id: 'profiles', label: 'Profiles', icon: User, component: Profiles },
    { id: 'proxies', label: 'Proxies', icon: Globe, component: Proxies },
    { id: 'settings', label: 'Settings', icon: Settings, component: SettingsPage },
  ];

  return (
    <div className={`h-screen w-screen flex overflow-hidden ${darkMode ? 'bg-black text-white' : 'bg-white text-black'}`}>
      <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="flex w-full">
        {/* Sidebar */}
        <Tabs.List className={`w-20 border-r flex flex-col items-center py-6 space-y-2 ${darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-100 border-zinc-300'}`}>
          <div className={`mb-8 text-2xl font-bold ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>S</div>
          {tabs.map((tab) => (
            <Tabs.Trigger
              key={tab.id}
              value={tab.id}
              className={`w-14 h-14 flex items-center justify-center rounded-lg transition-all ${
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
            <Tabs.Content key={tab.id} value={tab.id} className="flex-1 overflow-auto">
              {tab.id === 'profiles' ? (
                <Profiles proxies={proxies} darkMode={darkMode} />
              ) : tab.id === 'proxies' ? (
                <Proxies proxies={proxies} setProxies={setProxies} darkMode={darkMode} />
              ) : tab.id === 'settings' ? (
                <SettingsPage darkMode={darkMode} setDarkMode={setDarkMode} />
              ) : (
                <tab.component darkMode={darkMode} />
              )}
            </Tabs.Content>
          ))}
        </div>
      </Tabs.Root>
    </div>
  );
};

export default App;
