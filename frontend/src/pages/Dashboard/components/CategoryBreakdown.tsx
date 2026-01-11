import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';

interface CategoryBreakdownProps {
    data: any[];
    title?: string;
    totalExpense: number;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

export const CategoryBreakdown = ({ data, title = "Spending Breakdown", totalExpense }: CategoryBreakdownProps) => {
    return (
        <Card className="h-full flex flex-col shadow-sm">
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-[300px] relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={90}
                            paddingAngle={4}
                            dataKey="value"
                            cornerRadius={6}
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="transparent" />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px -5px rgba(0,0,0,0.1)' }}
                            formatter={(value: number) => `₹${value.toLocaleString()}`}
                        />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                </ResponsiveContainer>

                {/* Center Text */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[calc(50%+1rem)] text-center pointer-events-none">
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Total</p>
                    <p className="text-xl font-bold text-slate-800">₹{(totalExpense / 1000).toFixed(1)}k</p>
                </div>
            </CardContent>
        </Card>
    );
};
