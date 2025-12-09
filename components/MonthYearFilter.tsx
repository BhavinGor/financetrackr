import React from 'react';
import { Calendar } from 'lucide-react';

export interface DateFilter {
    month: number; // 1-12
    year: number;
}

interface MonthYearFilterProps {
    value: DateFilter | null;
    onChange: (filter: DateFilter | null) => void;
    showAllOption?: boolean;
}

export const MonthYearFilter: React.FC<MonthYearFilterProps> = ({ value, onChange, showAllOption = true }) => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    // Generate last 12 months
    const monthOptions: DateFilter[] = [];
    for (let i = 0; i < 12; i++) {
        const date = new Date(currentYear, currentMonth - 1 - i, 1);
        monthOptions.push({
            month: date.getMonth() + 1,
            year: date.getFullYear()
        });
    }

    const formatMonth = (filter: DateFilter) => {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${monthNames[filter.month - 1]} ${filter.year}`;
    };

    const handleQuickFilter = (type: 'thisMonth' | 'lastMonth' | 'thisYear' | 'all') => {
        switch (type) {
            case 'thisMonth':
                onChange({ month: currentMonth, year: currentYear });
                break;
            case 'lastMonth': {
                const lastMonth = new Date(currentYear, currentMonth - 2, 1);
                onChange({ month: lastMonth.getMonth() + 1, year: lastMonth.getFullYear() });
                break;
            }
            case 'thisYear':
                onChange({ month: 1, year: currentYear }); // Jan of current year
                break;
            case 'all':
                onChange(null);
                break;
        }
    };

    const isActive = (filter: DateFilter | null) => {
        if (!value && !filter) return true;
        if (!value || !filter) return false;
        return value.month === filter.month && value.year === filter.year;
    };

    return (
        <div className="flex items-center gap-2">
            <Calendar size={18} className="text-slate-400" />

            {/* Quick Filters */}
            <div className="flex gap-1">
                {showAllOption && (
                    <button
                        onClick={() => handleQuickFilter('all')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${!value ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                    >
                        All Time
                    </button>
                )}
                <button
                    onClick={() => handleQuickFilter('thisMonth')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${isActive({ month: currentMonth, year: currentYear })
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                >
                    This Month
                </button>
                <button
                    onClick={() => handleQuickFilter('lastMonth')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${value && value.month === new Date(currentYear, currentMonth - 2, 1).getMonth() + 1
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                >
                    Last Month
                </button>
            </div>

            {/* Dropdown */}
            <select
                value={value ? `${value.year}-${value.month}` : ''}
                onChange={(e) => {
                    if (!e.target.value) {
                        onChange(null);
                    } else {
                        const [year, month] = e.target.value.split('-').map(Number);
                        onChange({ month, year });
                    }
                }}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
                {showAllOption && <option value="">All Time</option>}
                {monthOptions.map((filter) => (
                    <option key={`${filter.year}-${filter.month}`} value={`${filter.year}-${filter.month}`}>
                        {formatMonth(filter)}
                    </option>
                ))}
            </select>
        </div>
    );
};
