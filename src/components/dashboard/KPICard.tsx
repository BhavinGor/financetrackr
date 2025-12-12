import React from 'react';
import { Card, CardContent } from '../ui/Card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICardProps {
    title: string;
    value: number;
    icon: React.ReactNode;
    trend?: string;
    trendUp?: boolean;
    isCurrency?: boolean;
    subValue?: string;
    className?: string;
}

export const KPICard = ({ title, value, icon, trend, trendUp, isCurrency = true, subValue, className = '' }: KPICardProps) => {
    return (
        <Card className={`relative overflow-hidden ${className}`}>
            {/* Background decoration */}
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transform scale-150 rotate-12">
                {icon}
            </div>

            <CardContent className="p-5 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start mb-2">
                    <div className="p-2.5 bg-slate-50 rounded-xl text-primary-600 shadow-sm border border-slate-100">
                        {icon}
                    </div>
                    {trend && (
                        <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${trendUp ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                            }`}>
                            {trendUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {trend}
                        </div>
                    )}
                </div>

                <div>
                    <p className="text-sm font-medium text-slate-500 mb-0.5">{title}</p>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                            {isCurrency ? `₹${value.toLocaleString()}` : value}
                        </h3>
                        {subValue && (
                            <span className="text-xs text-slate-400 font-medium whitespace-nowrap">{subValue}</span>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
