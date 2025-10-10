import React, { useState, useEffect } from 'react';
import { Activity, Users, Globe, Shield } from 'lucide-react';

const Dashboard = ({ profiles, proxies, darkMode }) => {
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    loadActivities();
  }, [profiles]); // Reload when profiles change

  const loadActivities = async () => {
    try {
      const recentActivities = await window.api.activity.getRecent(5);
      setActivities(recentActivities);
    } catch (error) {
      console.error('Error loading activities:', error);
    }
  };

  const activeProfiles = profiles.filter(p => p.status === 'active').length;
  const totalProxies = proxies.length;
  const untraceableProfiles = profiles.filter(p => p.untraceable).length;
  const protectionRate = profiles.length > 0 
    ? Math.round((untraceableProfiles / profiles.length) * 100) 
    : 100;

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return date.toLocaleDateString();
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'profile_created':
        return 'bg-green-400';
      case 'profile_edited':
        return 'bg-blue-400';
      case 'profile_deleted':
        return 'bg-red-400';
      default:
        return 'bg-zinc-400';
    }
  };

  const stats = [
    { label: 'Active Profiles', value: activeProfiles.toString(), icon: Users, color: 'text-blue-400' },
    { label: 'Proxies', value: totalProxies.toString(), icon: Globe, color: 'text-green-400' },
    { label: 'Total Profiles', value: profiles.length.toString(), icon: Activity, color: 'text-purple-400' },
    { label: 'Protected', value: `${protectionRate}%`, icon: Shield, color: 'text-emerald-400' },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold mb-2 tracking-tight">Dashboard</h1>
        <p className={`text-base ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>Overview of your undetectable sessions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`border rounded-xl p-6 transition-smooth card-hover ${
              darkMode 
                ? 'bg-zinc-950 border-zinc-800 hover:border-zinc-700' 
                : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <stat.icon className={`${stat.color}`} size={24} />
            </div>
            <div className="text-3xl font-semibold mb-1 tracking-tight">{stat.value}</div>
            <div className={`text-sm font-medium ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div className={`border rounded-xl p-6 ${darkMode ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
        <h2 className="text-xl font-semibold mb-4 tracking-tight">Recent Activity</h2>
        <div className="space-y-4">
          {activities.length === 0 ? (
            <div className={`text-center py-8 font-medium ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
              No activity yet. Create a profile to get started!
            </div>
          ) : (
            activities.map((activity) => (
              <div
                key={activity.id}
                className={`flex items-center justify-between py-3 border-b last:border-0 transition-smooth ${
                  darkMode ? 'border-zinc-800' : 'border-zinc-200'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-2 h-2 rounded-full ${getActivityIcon(activity.type)}`}></div>
                  <div>
                    <div className="text-sm font-medium">{activity.details}</div>
                    <div className={`text-xs font-medium ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
                      {formatTimestamp(activity.timestamp)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
