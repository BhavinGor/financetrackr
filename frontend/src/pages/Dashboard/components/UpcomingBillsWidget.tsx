import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Calendar, CheckCircle2 } from 'lucide-react';

// Mock data removed. In a real application, this would calculate upcoming recurring transactions 
// or bills based on historical patterns.
const UPCOMING_BILLS: any[] = [];

export const UpcomingBillsWidget = () => {
    return (
        <Card className="shadow-sm h-full">
            <CardHeader>
                <CardTitle>Upcoming Bills</CardTitle>
            </CardHeader>
            <CardContent>
                {UPCOMING_BILLS.length > 0 ? (
                    <div className="space-y-4">
                        {UPCOMING_BILLS.map((bill) => (
                            <div key={bill.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                                <div className={`
                  w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                  ${bill.status === 'due' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}
                `}>
                                    <Calendar size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-semibold text-slate-900 truncate">{bill.name}</h4>
                                    <p className={`text-xs font-medium ${bill.status === 'due' ? 'text-red-500' : 'text-slate-500'}`}>
                                        {bill.date}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-slate-900">₹{bill.amount}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-40 text-center">
                        <div className="w-12 h-12 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-3">
                            <CheckCircle2 size={24} />
                        </div>
                        <p className="text-slate-800 font-medium">No bills due</p>
                        <p className="text-slate-400 text-xs mt-1">Upcoming bills and subscriptions will appear here.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
