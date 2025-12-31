import React from 'react';
import {
    LayoutDashboard,
    ReceiptIndianRupee,
    WalletCards,
    Car,
    PiggyBank,
    Target,
    LogOut,
    Settings,
    ChevronRight
} from 'lucide-react';
import { ViewState } from '../../types';

interface SidebarProps {
    currentView: ViewState;
    onViewChange: (view: ViewState) => void;
    onLogout: () => void;
    isOpen?: boolean;
}

export const Sidebar = ({ currentView, onViewChange, onLogout, isOpen = true }: SidebarProps) => {

    const menuItems: { id: ViewState; label: string; icon: React.ReactNode }[] = [
        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
        { id: 'transactions', label: 'Transactions', icon: <ReceiptIndianRupee size={20} /> },
        { id: 'accounts', label: 'Accounts', icon: <WalletCards size={20} /> },
        { id: 'budget', label: 'Budget', icon: <PiggyBank size={20} /> },
        { id: 'savings', label: 'Savings & Goals', icon: <Target size={20} /> },
        { id: 'vehicles', label: 'Vehicles', icon: <Car size={20} /> },
    ];

    return (
        <div className={`
      fixed md:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 
      transform transition-transform duration-300 ease-in-out flex flex-col
      ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
    `}>
            {/* Logo Area */}
            <div className="h-16 flex items-center px-6 border-b border-slate-100">
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white mr-3 shadow-md shadow-primary-200">
                    <ReceiptIndianRupee size={18} strokeWidth={2.5} />
                </div>
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
                    Finance<span className="text-primary-600">Trackr</span>
                </span>
            </div>

            {/* Navigation */}
            <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
                <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Main Menu</p>

                {menuItems.map((item) => {
                    const isActive = currentView === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => onViewChange(item.id)}
                            className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative
                ${isActive
                                    ? 'bg-primary-50 text-primary-700'
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }
              `}
                        >
                            <span className={`transition-colors ${isActive ? 'text-primary-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
                                {item.icon}
                            </span>
                            <span>{item.label}</span>

                            {isActive && (
                                <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-primary-600 shadow-[0_0_8px_rgba(37,99,235,0.5)]" />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-slate-100 space-y-1">
                <button
                    onClick={() => onViewChange('profile')}
                    className={`
            w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
            ${currentView === 'profile' ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-50'}
          `}
                >
                    <Settings size={20} className="text-slate-400" />
                    <span>Settings</span>
                </button>

                <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-all"
                >
                    <LogOut size={20} className="opacity-70" />
                    <span>Logout</span>
                </button>
            </div>

            {/* User Profile Snippet */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                    BG
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">Bhavin Gor</p>
                    <p className="text-xs text-slate-500 truncate">bhavin@example.com</p>
                </div>
            </div>
        </div>
    );
};
