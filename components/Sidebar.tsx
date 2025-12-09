import React, { useEffect, useState } from 'react';
import { LayoutDashboard, CreditCard, Receipt, Car, LogOut, Wallet, PieChart, TrendingUp, User } from 'lucide-react';
import { ViewState } from '../types';
import { supabase } from '../services/supabase';

interface SidebarProps {
  currentView: ViewState;
  setCurrentView: (view: ViewState) => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView, onLogout }) => {
  const [userEmail, setUserEmail] = useState('User');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || '');
        setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || 'User');
      }
    };
    getUser();
  }, []);

  const navItems: { id: ViewState; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'transactions', label: 'Transactions', icon: <Receipt size={20} /> },
    { id: 'budget', label: 'Budgets', icon: <PieChart size={20} /> },
    { id: 'savings', label: 'Savings', icon: <TrendingUp size={20} /> },
    { id: 'accounts', label: 'Accounts', icon: <Wallet size={20} /> },
    { id: 'vehicles', label: 'Vehicles', icon: <Car size={20} /> },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 h-screen sticky top-0">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-xl">F</span>
        </div>
        <span className="text-xl font-bold text-slate-800">FinanceTrackr</span>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setCurrentView(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${currentView === item.id
                ? 'bg-blue-50 text-blue-700'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-200">
        <button
          onClick={() => setCurrentView('profile')}
          className={`flex items-center gap-3 px-4 py-3 w-full rounded-lg transition-colors mb-2 ${currentView === 'profile' ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
        >
          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-xs font-bold">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium text-slate-900 truncate">{userName}</p>
            <p className="text-xs text-slate-500 truncate">{userEmail}</p>
          </div>
        </button>

        <button
          onClick={onLogout}
          className="w-full mt-2 flex items-center gap-3 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </aside>
  );
};
