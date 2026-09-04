import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Activity,
  Bell,
  Search,
  Bookmark,
  ShieldCheck,
  LogOut,
  User as UserIcon,
  RotateCw,
  Share2
} from 'lucide-react';
import { ShareModal } from './ShareModal';

interface NavbarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onTabChange, onOpenAuth }) => {
  const { user, logout, unreadCount } = useAuth();
  const [isRotating, setIsRotating] = useState<boolean>(false);
  const [isShareOpen, setIsShareOpen] = useState<boolean>(false);

  const handleReload = () => {
    setIsRotating(true);
    setTimeout(() => {
      window.location.reload();
    }, 350);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#090d16]/90 backdrop-blur-md border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div
            className="flex items-center gap-3 cursor-pointer select-none"
            onClick={() => onTabChange('dashboard')}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-sky-500 flex items-center justify-center shadow-lg shadow-emerald-900/30">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-slate-300">
                  ORDER BLOCK DETECTOR
                </span>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider hidden sm:inline-block">
                  FREE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden sm:block">
                India's #1 NSE & BSE Order Block Tracker
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => onTabChange('dashboard')}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'dashboard'
                  ? 'bg-slate-800 text-emerald-400 font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => onTabChange('watchlist')}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                currentTab === 'watchlist'
                  ? 'bg-slate-800 text-emerald-400 font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Bookmark className="w-4 h-4" />
              <span>Watchlist</span>
            </button>
            <button
              onClick={() => onTabChange('search')}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                currentTab === 'search'
                  ? 'bg-slate-800 text-emerald-400 font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Explore</span>
            </button>
            <button
              onClick={() => onTabChange('notifications')}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all relative flex items-center gap-1.5 ${
                currentTab === 'notifications'
                  ? 'bg-slate-800 text-emerald-400 font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>Alerts</span>
              {unreadCount > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full animate-pulse">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            {user?.isOwner && (
              <button
                onClick={() => onTabChange('admin')}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                  currentTab === 'admin'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-amber-400/80 hover:text-amber-300 hover:bg-amber-500/10'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Master Admin</span>
              </button>
            )}
          </nav>

          {/* Right Action Icons & User Profile */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Global Reload Button (Visible on all pages & screen sizes) */}
            <button
              onClick={handleReload}
              disabled={isRotating}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-emerald-400 border border-slate-700/60 transition-all text-xs font-semibold group shadow-sm active:scale-95"
              title="Reload & Refresh Market Data"
              aria-label="Reload Page"
            >
              <RotateCw className={`w-3.5 h-3.5 text-emerald-400 transition-transform ${isRotating ? 'animate-spin' : 'group-hover:rotate-180 duration-500'}`} />
              <span className="hidden sm:inline">Reload</span>
            </button>

            {/* Global Share App Button */}
            <button
              onClick={() => setIsShareOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600/20 to-teal-600/20 hover:from-emerald-600/30 hover:to-teal-600/30 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 transition-all text-xs font-semibold shadow-sm active:scale-95"
              title="Share Application Link"
              aria-label="Share Application"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Share</span>
            </button>

            {/* Alerts Bell for Mobile */}
            <button
              onClick={() => onTabChange('notifications')}
              className="relative p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors md:hidden"
              aria-label="View notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-[#090d16]"></span>
              )}
            </button>

            {user ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onTabChange('settings')}
                  className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-200 text-xs sm:text-sm font-medium border border-slate-700/50 transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:inline-block max-w-[120px] truncate">{user.name}</span>
                </button>
                <button
                  onClick={logout}
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors hidden sm:flex"
                  title="Log Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs sm:text-sm font-bold shadow-lg shadow-emerald-900/30 transition-all flex items-center gap-1.5"
              >
                <UserIcon className="w-4 h-4" />
                <span>Sign In / Join</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Share Modal Dialog */}
      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
      />
    </header>
  );
};
