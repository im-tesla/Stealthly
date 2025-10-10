import React from 'react';
import { Activity, Users, Globe, Shield } from 'lucide-react';

const Dashboard = ({ profiles, proxies, darkMode }) => {
  const activeProfiles = profiles.filter(p => p.status === 'active').length;
  const totalProxies = proxies.length;
  const untraceableProfiles = profiles.filter(p => p.untraceable).length;
  const protectionRate = profiles.length > 0 
    ? Math.round((untraceableProfiles / profiles.length) * 100) 
    : 100;

  const stats = [
    { label: 'Active Profiles', value: activeProfiles.toString(), icon: Users, color: 'text-blue-400' },
    { label: 'Proxies', value: totalProxies.toString(), icon: Globe, color: 'text-green-400' },
    { label: 'Total Profiles', value: profiles.length.toString(), icon: Activity, color: 'text-purple-400' },
    { label: 'Protected', value: `${protectionRate}%`, icon: Shield, color: 'text-emerald-400' },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-light mb-2">Dashboard</h1>
        <p className={darkMode ? 'text-zinc-500' : 'text-zinc-600'}>Overview of your undetectable browser sessions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`border rounded-xl p-6 transition-all ${
              darkMode 
                ? 'bg-zinc-950 border-zinc-800 hover:border-zinc-700' 
                : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <stat.icon className={`${stat.color}`} size={24} />
            </div>
            <div className="text-3xl font-light mb-1">{stat.value}</div>
            <div className={`text-sm ${darkMode ? 'text-zinc-500' : 'text-zinc-600'}`}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div className={`border rounded-xl p-6 ${darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
        <h2 className="text-xl font-light mb-4">Recent Activity</h2>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`flex items-center justify-between py-3 border-b last:border-0 ${
                darkMode ? 'border-zinc-800' : 'border-zinc-200'
              }`}
            >
              <div className="flex items-center space-x-4">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <div>
                  <div className="text-sm">Profile {i} - Session Started</div>
                  <div className={`text-xs ${darkMode ? 'text-zinc-500' : 'text-zinc-600'}`}>{i} minutes ago</div>
                </div>
              </div>
              <div className={`text-xs ${darkMode ? 'text-zinc-500' : 'text-zinc-600'}`}>IP: 192.168.1.{i}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
