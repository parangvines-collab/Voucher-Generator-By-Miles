import React, { useState, useEffect } from 'react';
import { AuthScreen } from './components/AuthScreen';
import { DashboardScreen } from './components/DashboardScreen';
import { AdminManagerScreen } from './components/AdminManagerScreen';
import { ActivitiesScreen } from './components/ActivitiesScreen';
import { ActivityLogger } from './utils/activityDB';
import { supabase } from './supabaseClient';
import { 
  Ticket, History, Users2, LogOut, ShieldAlert,
  SlidersHorizontal, HeartHandshake, Laptop, Network
} from 'lucide-react';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState('');
  const [activeTab, setActiveTab] = useState<'vouchers' | 'activities' | 'admin'>('vouchers');

  // Load balance and session variables to ensure correct mounting
  const [userBalance, setUserBalance] = useState<number | null>(null);

  useEffect(() => {
    // Check if user session already exists
    const authenticated = sessionStorage.getItem('authenticated') === 'true';
    const username = sessionStorage.getItem('username') || '';

    if (authenticated && username) {
      setIsAuthenticated(true);
      setCurrentUser(username);
      loadUserBalance(username);
    }

    // Double-check base databases exist
    if (!localStorage.getItem('users')) {
      localStorage.setItem('users', JSON.stringify({}));
    }
    if (!localStorage.getItem('adminPassword') || localStorage.getItem('adminPassword') === 'admin123' || localStorage.getItem('adminPassword') === 'admin') {
      localStorage.setItem('adminPassword', 'Anonymous#8856'); // Default master password
    }
    if (!localStorage.getItem('promoPrice')) {
      localStorage.setItem('promoPrice', '30');
    }
    if (!localStorage.getItem('portalKeyPrice')) {
      localStorage.setItem('portalKeyPrice', '50');
    }
  }, []);

  const loadUserBalance = (user: string) => {
    if (user === 'admin') {
      setUserBalance(99999);
      return;
    }
    const users = JSON.parse(localStorage.getItem('users') || '{}');
    if (users[user]) {
      setUserBalance(users[user].balance || 0);
    } else {
      setUserBalance(0);
    }
  };

  const handleLoginSuccess = (user: string) => {
    setIsAuthenticated(true);
    setCurrentUser(user);
    loadUserBalance(user);
    setActiveTab('vouchers');
  };

  const handleLogout = async () => {
    ActivityLogger.logActivity('user_logout', 'User logged out', { username: currentUser });
    if (currentUser !== 'admin') {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        // ignore signout errors
      }
    }
    sessionStorage.removeItem('authenticated');
    sessionStorage.removeItem('username');
    setIsAuthenticated(false);
    setCurrentUser('');
    setUserBalance(null);
  };

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-[#070b13] flex flex-col justify-between font-sans">
        {/* Top visual graphic line */}
        <div className="w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500" />
        
        <AuthScreen onLoginSuccess={handleLoginSuccess} />
        
        {/* Humble, clean footer */}
        <footer className="py-6 text-center text-xs text-slate-600 border-t border-slate-900 bg-slate-950/20">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
            <span>© 2026 Routerboard Systems Inc. All Rights Reserved.</span>
            <div className="flex gap-4">
              <span className="text-slate-700">Offline Voucher Pool</span>
              <span className="text-slate-700">Device activation center</span>
            </div>
          </div>
        </footer>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b13] text-slate-100 font-sans flex flex-col justify-between">
      {/* Top visual graphic line */}
      <div className="w-full h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500" />

      <div>
        {/* Navigation Header */}
        <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              
              {/* Left Brand Area */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gradient-to-tr from-blue-600 to-indigo-650 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/15 border border-blue-400/20">
                  <Network className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                    MikroTik Voucher Center
                  </h1>
                  <span className="block text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
                    Portal Generator Panel
                  </span>
                </div>
              </div>

              {/* Sub tabs controls */}
              <nav className="hidden md:flex items-center gap-1">
                <button
                  onClick={() => setActiveTab('vouchers')}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs leading-none transition-all flex items-center gap-1.5 ${activeTab === 'vouchers' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/10' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/45'}`}
                >
                  <Ticket className="w-4 h-4" />
                  Generator
                </button>
                
                {currentUser === 'admin' && (
                  <>
                    <button
                      onClick={() => setActiveTab('admin')}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs leading-none transition-all flex items-center gap-1.5 ${activeTab === 'admin' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/45'}`}
                    >
                      <Users2 className="w-4 h-4" />
                      Account Manager
                    </button>
                    <button
                      onClick={() => setActiveTab('activities')}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs leading-none transition-all flex items-center gap-1.5 ${activeTab === 'activities' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/45'}`}
                    >
                      <History className="w-4 h-4" />
                      Activity Log
                    </button>
                  </>
                )}
              </nav>

              {/* Right Profile / Session Controls */}
              <div className="flex items-center gap-4">
                <div className="text-right flex flex-col justify-center">
                  <span className="block text-xs font-bold text-slate-250">
                    {currentUser}
                  </span>
                  {currentUser !== 'admin' && userBalance !== null && (
                    <span className="block text-[10px] text-emerald-400 font-mono tracking-tight font-semibold mt-0.5">
                      PHP {userBalance} Pesos
                    </span>
                  )}
                  {currentUser === 'admin' && (
                    <span className="block text-[9px] text-indigo-400 font-bold uppercase tracking-widest mt-0.5">
                      Master Root
                    </span>
                  )}
                </div>

                <button
                  onClick={handleLogout}
                  className="p-2 sm:px-3 sm:py-1.5 bg-slate-800 hover:bg-rose-950/20 border border-slate-750 hover:border-rose-500/10 text-slate-300 hover:text-rose-400 rounded-xl transition-all focus:outline-none flex items-center gap-1.5 text-xs font-medium"
                  title="Logout operator session"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>

            </div>

            {/* Mobile Navigation bar */}
            <div className="md:hidden flex justify-around border-t border-slate-800/40 py-2.5">
              <button
                onClick={() => setActiveTab('vouchers')}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold flex items-center gap-1 ${activeTab === 'vouchers' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
              >
                <Ticket className="w-3.5 h-3.5" />
                Vouchers
              </button>

              {currentUser === 'admin' && (
                <>
                  <button
                    onClick={() => setActiveTab('admin')}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold flex items-center gap-1 ${activeTab === 'admin' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
                  >
                    <Users2 className="w-3.5 h-3.5" />
                    Accounts
                  </button>
                  <button
                    onClick={() => setActiveTab('activities')}
                    className={`py-1.5 px-3 rounded-lg text-xs font-bold flex items-center gap-1 ${activeTab === 'activities' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
                  >
                    <History className="w-3.5 h-3.5" />
                    Logs
                  </button>
                </>
              )}
            </div>

          </div>
        </header>

        {/* Content Body Area */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Welcome Intro Widget */}
          <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">
                {activeTab === 'vouchers' ? 'Hotspot Voucher Station' : activeTab === 'admin' ? 'Operator Management Port' : 'System Diagnostic Logs'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {activeTab === 'vouchers' ? 'Produce high-quality offline network vouchers' : activeTab === 'admin' ? 'Edit operator expiration times, loads, and global token prices' : 'Browse active login histories and tickets activities catalog'}
              </p>
            </div>
            {/* Quick stats on operators */}
            <div className="text-xs text-slate-500 font-medium">
               Session status: <strong className="text-emerald-400 font-bold uppercase">Online</strong>
            </div>
          </div>

          {/* Core Navigation Views */}
          {activeTab === 'vouchers' && (
            <DashboardScreen currentUser={currentUser} onUpdateBalance={() => loadUserBalance(currentUser)} />
          )}

          {activeTab === 'admin' && currentUser === 'admin' && (
            <AdminManagerScreen />
          )}

          {activeTab === 'activities' && currentUser === 'admin' && (
            <ActivitiesScreen />
          )}

        </main>
      </div>

      {/* Elegant, clean footer wrapper */}
      <footer className="border-t border-slate-900 bg-slate-950/30 py-6 text-xs text-slate-500 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-400">RouterOS Portal v4.1</span>
            <span className="text-slate-600">|</span>
            <span>Self-Service Operator Tool</span>
          </div>
          <div className="flex gap-4">
            <span className="hover:text-slate-400 transition-colors">Offline Sandbox Mode</span>
            <span className="hover:text-slate-400 transition-colors">Manual Verification Queue</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
