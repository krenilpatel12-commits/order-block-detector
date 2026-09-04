import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { AlertToastContainer } from './components/AlertToast';
import { AuthModal } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { StockAnalysisPage } from './pages/StockAnalysisPage';
import { WatchlistPage } from './pages/WatchlistPage';
import { SearchPage } from './pages/SearchPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { SettingsPage } from './pages/SettingsPage';
import { MasterAdminPage } from './pages/MasterAdminPage';

export const App: React.FC = () => {
  const { loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [selectedStock, setSelectedStock] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  const handleNavigateToStock = (symbol: string) => {
    setSelectedStock(symbol.toUpperCase());
    setCurrentTab('analysis');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTabChange = (tab: string) => {
    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090d16] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <h2 className="text-base font-extrabold text-white tracking-wider">ORDER BLOCK DETECTOR</h2>
        <p className="text-xs text-slate-400 mt-1">Connecting to global market data stream...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col pb-20 md:pb-8">
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        onTabChange={handleTabChange}
        onOpenAuth={() => setIsAuthModalOpen(true)}
      />

      {/* Floating Real-time In-App Alert Toasts */}
      <AlertToastContainer onNavigateToStock={handleNavigateToStock} />

      {/* Main Page Router */}
      <main className="flex-1">
        {currentTab === 'dashboard' && (
          <DashboardPage
            onNavigateToStock={handleNavigateToStock}
            onNavigateToTab={handleTabChange}
          />
        )}

        {currentTab === 'analysis' && selectedStock && (
          <StockAnalysisPage
            symbol={selectedStock}
            onBack={() => setCurrentTab('dashboard')}
          />
        )}

        {currentTab === 'watchlist' && (
          <WatchlistPage onNavigateToStock={handleNavigateToStock} />
        )}

        {currentTab === 'search' && (
          <SearchPage onNavigateToStock={handleNavigateToStock} />
        )}

        {currentTab === 'notifications' && (
          <NotificationsPage onNavigateToStock={handleNavigateToStock} />
        )}

        {currentTab === 'settings' && <SettingsPage />}

        {currentTab === 'admin' && (
          <MasterAdminPage onNavigateToStock={handleNavigateToStock} />
        )}
      </main>

      {/* Bottom Mobile Navigation */}
      <BottomNav currentTab={currentTab} onTabChange={handleTabChange} />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
};
