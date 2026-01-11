import React from 'react';

interface Tab {
    id: string;
    label: string;
    count?: number;
}

interface TabsProps {
    tabs: Tab[];
    activeTab: string;
    onChange: (id: string) => void;
    className?: string;
}

export const Tabs = ({ tabs, activeTab, onChange, className = '' }: TabsProps) => {
    return (
        <div className={`flex gap-1 border-b border-slate-200 ${className}`}>
            {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                    <button
                        key={tab.id}
                        onClick={() => onChange(tab.id)}
                        className={`
              relative px-4 py-3 text-sm font-medium transition-colors flex items-center gap-2
              ${isActive
                                ? 'text-primary-600'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                            }
            `}
                    >
                        {tab.label}
                        {tab.count !== undefined && (
                            <span className={`
                text-xs px-1.5 rounded-full
                ${isActive ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-600'}
              `}>
                                {tab.count}
                            </span>
                        )}
                        {isActive && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-t-full" />
                        )}
                    </button>
                );
            })}
        </div>
    );
};
