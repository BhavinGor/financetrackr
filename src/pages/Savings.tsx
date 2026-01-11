import React, { useState } from 'react';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Investment, InvestmentType, Budget } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Plus, TrendingUp, TrendingDown, DollarSign, Target, Edit2, Trash2 } from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface SavingsPageProps {
    investments: Investment[];
    budgets: Budget[];
    onAddInvestment: (inv: Investment) => void;
    onEditInvestment: (inv: Investment) => void;
    onDeleteInvestment: (id: string) => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

export const SavingsPage = ({ investments, budgets, onAddInvestment, onEditInvestment, onDeleteInvestment }: SavingsPageProps) => {
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    // Form State
    const [name, setName] = useState('');
    const [type, setType] = useState<InvestmentType>(InvestmentType.INDIAN_STOCK);
    const [invested, setInvested] = useState('');
    const [current, setCurrent] = useState('');
    const [quantity, setQuantity] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    const handleAddSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const invData: Investment = {
            id: editingId || `inv_${Date.now()}`,
            name,
            type,
            investedAmount: parseFloat(invested),
            currentValue: parseFloat(current),
            quantity: quantity ? parseFloat(quantity) : undefined,
            date
        };

        if (editingId) {
            onEditInvestment(invData);
        } else {
            onAddInvestment(invData);
        }
        resetForm();
    };

    const resetForm = () => {
        setShowAddForm(false);
        setEditingId(null);
        setName('');
        setInvested('');
        setCurrent('');
        setQuantity('');
        setDate(new Date().toISOString().split('T')[0]);
    };

    const handleEditClick = (inv: Investment) => {
        setEditingId(inv.id);
        setName(inv.name);
        setType(inv.type);
        setInvested(inv.investedAmount.toString());
        setCurrent(inv.currentValue.toString());
        setQuantity(inv.quantity?.toString() || '');
        setDate(inv.date);
        setShowAddForm(true);
    };

    // Calculations
    const totalInvested = investments.reduce((sum, inv) => sum + inv.investedAmount, 0);
    const totalCurrent = investments.reduce((sum, inv) => sum + inv.currentValue, 0);
    const totalProfit = totalCurrent - totalInvested;
    const profitPercentage = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

    const savingsBudget = budgets.find(b => b.category === 'Savings');
    const savingsTarget = savingsBudget?.limit || 0;

    // Chart Data
    const typeDataMap = investments.reduce((acc, curr) => {
        acc[curr.type] = (acc[curr.type] || 0) + curr.currentValue;
        return acc;
    }, {} as Record<string, number>);

    const pieData = Object.keys(typeDataMap).map(key => ({
        name: key,
        value: typeDataMap[key]
    }));

    return (
        <div className="space-y-6 animate-in fade-in pb-10">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Savings & Investments</h1>
                    <p className="text-slate-500 mt-1">Track portfolio performance and goals.</p>
                </div>
                <Button onClick={() => setShowAddForm(true)} leftIcon={<Plus size={18} />}>
                    Add Investment
                </Button>
            </div>

            {/* Savings Goal Progress */}
            {savingsTarget > 0 && (
                <div className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white p-6 rounded-2xl shadow-lg shadow-indigo-200">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                            <Target size={24} className="text-white" />
                        </div>
                        <div>
                            <p className="text-indigo-100 text-sm font-medium">Monthly Savings Target</p>
                            <h2 className="text-3xl font-bold">₹{savingsTarget.toLocaleString()}</h2>
                        </div>
                    </div>
                    <div className="w-full bg-black/20 rounded-full h-3 mb-2">
                        <div
                            className="bg-white h-3 rounded-full transition-all duration-1000"
                            style={{ width: `${Math.min(100, (totalCurrent / savingsTarget) * 100)}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-xs text-indigo-100 font-medium">
                        <span>Current: ₹{totalCurrent.toLocaleString()}</span>
                        <span>{((totalCurrent / savingsTarget) * 100).toFixed(1)}% Achieved</span>
                    </div>
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><DollarSign size={20} /></div>
                            <p className="text-sm font-medium text-slate-500">Total Invested</p>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900">₹{totalInvested.toLocaleString()}</h3>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-green-50 text-green-600 rounded-lg"><TrendingUp size={20} /></div>
                            <p className="text-sm font-medium text-slate-500">Current Value</p>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900">₹{totalCurrent.toLocaleString()}</h3>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`p-2 rounded-lg ${totalProfit >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                {totalProfit >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                            </div>
                            <p className="text-sm font-medium text-slate-500">Total Profit/Loss</p>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <h3 className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {totalProfit >= 0 ? '+' : ''}₹{Math.abs(totalProfit).toLocaleString()}
                            </h3>
                            <span className={`text-sm font-medium ${profitPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ({profitPercentage.toFixed(2)}%)
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Holdings Table */}
                <Card className="lg:col-span-2">
                    <CardHeader><CardTitle>Portfolio Holdings</CardTitle></CardHeader>
                    <CardContent className="p-0 overflow-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-600 font-medium">
                                <tr>
                                    <th className="px-6 py-3">Name</th>
                                    <th className="px-6 py-3">Type</th>
                                    <th className="px-6 py-3 text-right">Invested</th>
                                    <th className="px-6 py-3 text-right">Current</th>
                                    <th className="px-6 py-3 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {investments.length === 0 ? (
                                    <tr><td colSpan={5} className="p-8 text-center text-slate-400">No investments found</td></tr>
                                ) : (
                                    investments.map(inv => (
                                        <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-3 font-medium text-slate-900">{inv.name}</td>
                                            <td className="px-6 py-3"><span className="px-2 py-1 bg-slate-100 rounded text-xs">{inv.type}</span></td>
                                            <td className="px-6 py-3 text-right">₹{inv.investedAmount.toLocaleString()}</td>
                                            <td className="px-6 py-3 text-right">₹{inv.currentValue.toLocaleString()}</td>
                                            <td className="px-6 py-3 text-center flex justify-center gap-1">
                                                <button onClick={() => handleEditClick(inv)} className="p-1.5 hover:bg-slate-100 rounded text-blue-600"><Edit2 size={14} /></button>
                                                <button onClick={() => setDeleteId(inv.id)} className="p-1.5 hover:bg-slate-100 rounded text-red-600"><Trash2 size={14} /></button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>

                {/* Allocation Chart */}
                <Card>
                    <CardHeader><CardTitle>Asset Allocation</CardTitle></CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <RePieChart>
                                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </RePieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Add Investment Modal */}
            <Modal isOpen={showAddForm} onClose={resetForm} title={editingId ? "Edit Investment" : "Add Investment"}>
                <form onSubmit={handleAddSubmit} className="space-y-4">
                    <Input label="Name" placeholder="e.g. Apple Inc." value={name} onChange={e => setName(e.target.value)} />
                    <Select label="Type" value={type} onChange={e => setType(e.target.value as InvestmentType)}>
                        {Object.values(InvestmentType).map(t => <option key={t} value={t}>{t}</option>)}
                    </Select>
                    <div className="flex gap-4">
                        <Input label="Invested Amount (₹)" type="number" containerClassName="flex-1" value={invested} onChange={e => setInvested(e.target.value)} />
                        <Input label="Current Value (₹)" type="number" containerClassName="flex-1" value={current} onChange={e => setCurrent(e.target.value)} />
                    </div>
                    <div className="flex gap-4">
                        <Input label="Quantity (Optional)" type="number" containerClassName="flex-1" value={quantity} onChange={e => setQuantity(e.target.value)} />
                        <Input label="Date" type="date" containerClassName="flex-1" value={date} onChange={e => setDate(e.target.value)} />
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <Button variant="secondary" onClick={resetForm}>Cancel</Button>
                        <Button type="submit" variant="primary">Save</Button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={() => {
                    if (deleteId) {
                        onDeleteInvestment(deleteId);
                        setDeleteId(null);
                    }
                }}
                title="Delete Investment"
                message="Are you sure you want to delete this investment? This action cannot be undone."
            />
        </div>
    );
};
