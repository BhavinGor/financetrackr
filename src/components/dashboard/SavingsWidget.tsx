import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Plus, Target } from 'lucide-react';
import { Button } from '../ui/Button';

// Mock data removed.
const SAVINGS_GOALS: any[] = [];

export const SavingsWidget = () => {
    return (
        <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Savings Goals</CardTitle>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full" leftIcon={<Plus size={18} />}>
                </Button>
            </CardHeader>
            <CardContent className="space-y-5">
                {SAVINGS_GOALS.length > 0 ? SAVINGS_GOALS.map((goal) => {
                    const percentage = Math.round((goal.current / goal.target) * 100);
                    return (
                        <div key={goal.id}>
                            <div className="flex justify-between items-end mb-1.5">
                                <span className="text-sm font-medium text-slate-700">{goal.name}</span>
                                <span className="text-xs text-slate-500 font-medium">{percentage}%</span>
                            </div>
                            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full ${goal.color} transition-all duration-1000 ease-out`}
                                    style={{ width: `${percentage}%` }}
                                />
                            </div>
                            <div className="flex justify-between mt-1">
                                <span className="text-xs text-slate-400">₹{goal.current.toLocaleString()}</span>
                                <span className="text-xs text-slate-400">Target: ₹{goal.target.toLocaleString()}</span>
                            </div>
                        </div>
                    );
                }) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400">
                        <Target size={32} className="mb-2 opacity-50" />
                        <p className="text-sm">No savings goals yet</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
