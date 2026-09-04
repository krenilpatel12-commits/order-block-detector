import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Bookmark, Search, Bell, Settings, ShieldCheck } from 'lucide-react';

interface BottomNavProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onTabChange }) => {
  const { user, unreadCount } = useAuth();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#090d16]/95 backdrop-blur-lg border-t border-slate-800/80 px-2 py-1.5 flex items-center justify-around">
      {/* Dashboard */}
      <button
        onClick={() => onTabChange('dashboard')}
        className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition-all ${
          currentTab === 'dashboard' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <LayoutDashboard className="w-5 h-5 mb-0.5" />
        <span className="text-[10px]">Home</span>
      </button>

      {/* Watchlist */}
      <button
        onClick={() => onTabChange('watchlist')}
        className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition-all ${
          currentTab === 'watchlist' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Bookmark className="w-5 h-5 mb-0.5" />
        <span className="text-[10px]">Watchlist</span>
      </button>

      {/* Global Search */}
      <button
        onClick={() => onTabChange('search')}
        className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition-all ${
          currentTab === 'search' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Search className="w-5 h-5 mb-0.5" />
        <span className="text-[10px]">Search</span>
      </button>

      {/* Alerts */}
      <button
        onClick={() => onTabChange('notifications')}
        className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition-all relative ${
          currentTab === 'notifications' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Bell className="w-5 h-5 mb-0.5" />
        <span className="text-[10px]">Alerts</span>
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-2 w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
        )}
      </button>

      {/* Master Admin or Settings */}
      {user?.isOwner ? (
        <button
          onClick={() => onTabChange('admin')}
          className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition-all ${
            currentTab === 'admin' ? 'text-amber-400 font-bold' : 'text-amber-400/70 hover:text-amber-300'
          }`}
        >
          <ShieldCheck className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Admin</span>
        </button>
      ) : (
        <button
          onClick={() => onTabChange('settings')}
          className={`flex flex-col items-center py-1 px-2.5 rounded-xl transition-all ${
            currentTab === 'settings' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Settings className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">Settings</span>
        </button>
      )}
    </nav>
  );
};
