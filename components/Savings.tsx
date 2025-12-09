import React, { useState } from 'react';
import { ConfirmModal } from './ConfirmModal';
import { Investment, InvestmentType, Budget } from '../types';
import { Plus, TrendingUp, TrendingDown, DollarSign, PieChart, Target, Edit2, Trash2 } from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface SavingsProps {
  investments: Investment[];
  budgets: Budget[];
  onAddInvestment: (inv: Investment) => void;
  onEditInvestment: (inv: Investment) => void;
  onDeleteInvestment: (id: string) => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

export const Savings: React.FC<SavingsProps> = ({ investments, budgets, onAddInvestment, onEditInvestment, onDeleteInvestment }) => {
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

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingId) {
      // Edit mode
      const updatedInv: Investment = {
        id: editingId,
        name,
        type,
        investedAmount: parseFloat(invested),
        currentValue: parseFloat(current),
        quantity: quantity ? parseFloat(quantity) : undefined,
        date
      };
      onEditInvestment(updatedInv);
    } else {
      // Add mode
      const newInv: Investment = {
        id: `inv_${Date.now()}`,
        name,
        type,
        investedAmount: parseFloat(invested),
        currentValue: parseFloat(current),
        quantity: quantity ? parseFloat(quantity) : undefined,
        date
      };
      onAddInvestment(newInv);
    }

    setShowAddForm(false);
    setEditingId(null);
    setName('');
    setInvested('');
    setCurrent('');
    setQuantity('');
  };

  const handleEdit = (investment: Investment) => {
    setEditingId(investment.id);
    setName(investment.name);
    setType(investment.type);
    setInvested(investment.investedAmount.toString());
    setCurrent(investment.currentValue.toString());
    setQuantity(investment.quantity?.toString() || '');
    setDate(investment.date);
    setShowAddForm(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (deleteId) {
      onDeleteInvestment(deleteId);
      setDeleteId(null);
    }
  };

  const totalInvested = investments.reduce((sum, inv) => sum + inv.investedAmount, 0);
  const totalCurrent = investments.reduce((sum, inv) => sum + inv.currentValue, 0);
  const totalProfit = totalCurrent - totalInvested;
  const profitPercentage = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

  // Get savings target from budget
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Savings & Investments</h1>
          <p className="text-slate-500">Track your portfolio across stocks, funds, and more.</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} /> Add Investment
        </button>
      </div>

      {/* Monthly Savings Target Card (if set) */}
      {savingsTarget > 0 && (
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 rounded-xl shadow-md">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Target size={24} />
            </div>
            <div>
              <p className="text-white/80 text-sm">Monthly Savings Target</p>
              <h2 className="text-3xl font-bold">₹{savingsTarget.toLocaleString()}</h2>
            </div>
          </div>
          <div className="mt-3 bg-white/10 rounded-full h-2">
            <div
              className="h-2 rounded-full bg-white/60"
              style={{ width: `${Math.min(100, (totalCurrent / savingsTarget) * 100)}%` }}
            ></div>
          </div>
          <p className="text-xs text-white/70 mt-2">
            Current: ₹{totalCurrent.toLocaleString()} ({((totalCurrent / savingsTarget) * 100).toFixed(1)}% of target)
          </p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><DollarSign size={20} /></div>
            <p className="text-sm font-medium text-slate-500">Total Invested</p>
          </div>
          <h2 className="text-2xl font-bold text-slate-800">₹{totalInvested.toLocaleString()}</h2>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-50 text-green-600 rounded-lg"><TrendingUp size={20} /></div>
            <p className="text-sm font-medium text-slate-500">Current Value</p>
          </div>
          <h2 className="text-2xl font-bold text-slate-800">₹{totalCurrent.toLocaleString()}</h2>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg ${totalProfit >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
              {totalProfit >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
            </div>
            <p className="text-sm font-medium text-slate-500">Total Profit/Loss</p>
          </div>
          <div className="flex items-baseline gap-2">
            <h2 className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalProfit >= 0 ? '+' : ''}₹{Math.abs(totalProfit).toLocaleString()}
            </h2>
            <span className={`text-sm font-medium ${profitPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ({profitPercentage.toFixed(2)}%)
            </span>
          </div>
        </div>
      </div>

      {showAddForm && (
        <form onSubmit={handleAdd} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-top-4">
          <h3 className="font-semibold text-slate-800 mb-4">Add New Investment</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Name</label>
              <input type="text" placeholder="e.g. Apple Inc." value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Type</label>
              <select value={type} onChange={e => setType(e.target.value as InvestmentType)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                {Object.values(InvestmentType).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Invested Amount (₹)</label>
              <input type="number" value={invested} onChange={e => setInvested(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Current Value (₹)</label>
              <input type="number" value={current} onChange={e => setCurrent(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Quantity (Optional)</label>
              <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1 block">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" required />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Add</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">Portfolio Holdings</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-medium">
                <tr>
                  <th className="px-6 py-3 text-left">Name</th>
                  <th className="px-6 py-3 text-left">Type</th>
                  <th className="px-6 py-3 text-right">Invested</th>
                  <th className="px-6 py-3 text-right">Current</th>
                  <th className="px-6 py-3 text-right">P/L</th>
                  <th className="px-6 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {investments.map(inv => {
                  const profit = inv.currentValue - inv.investedAmount;
                  const pct = (profit / inv.investedAmount) * 100;
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3 font-medium text-slate-900">{inv.name}</td>
                      <td className="px-6 py-3"><span className="px-2 py-1 bg-slate-100 rounded text-xs">{inv.type}</span></td>
                      <td className="px-6 py-3 text-right">₹{inv.investedAmount.toLocaleString()}</td>
                      <td className="px-6 py-3 text-right">₹{inv.currentValue.toLocaleString()}</td>
                      <td className={`px-6 py-3 text-right font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {profit >= 0 ? '+' : ''}{pct.toFixed(2)}%
                      </td>
                      <td className="px-6 py-3 text-center">
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() => handleEdit(inv)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(inv.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {investments.length === 0 && <div className="p-8 text-center text-slate-400">No investments added yet.</div>}
          </div>
        </div>

        {/* Allocation Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col">
          <h3 className="font-semibold text-slate-800 mb-4">Asset Allocation</h3>
          <div className="flex-1 min-h-[250px]">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </RePieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">No data</div>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!deleteId}
        title="Delete Investment"
        message="Are you sure you want to delete this investment? This action cannot be undone."
        confirmText="Delete"
        isDestructive={true}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
};
