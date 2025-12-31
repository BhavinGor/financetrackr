import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';

interface IncomeExpenseChartProps {
    data: any[];
    title?: string;
}

export const IncomeExpenseChart = ({ data, title = "Income vs Expenses" }: IncomeExpenseChartProps) => {
    return (
        <Card className="col-span-1 lg:col-span-2 shadow-sm">
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} barGap={8} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                            tickFormatter={(val) => `₹${val / 1000}k`}
                        />
                        <Tooltip
                            cursor={{ fill: '#f8fafc' }}
                            contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px -5px rgba(0,0,0,0.1)' }}
                            itemStyle={{ fontWeight: 600 }}
                            formatter={(value: number) => [`₹${value.toLocaleString()}`, '']}
                        />
                        <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                        <Bar dataKey="income" name="Income" fill="#10b981" radius={[6, 6, 0, 0]} barSize={20} />
                        <Bar dataKey="expense" name="Expense" fill="#f43f5e" radius={[6, 6, 0, 0]} barSize={20} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
};
