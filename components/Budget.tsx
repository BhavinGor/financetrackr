import React, { useState } from 'react';
import { Budget as BudgetType, Category, Transaction, TransactionType } from '../types';
import { Plus, Trash2, Edit2, AlertCircle, CheckCircle, PieChart } from 'lucide-react';

interface BudgetProps {
  budgets: BudgetType[];
  transactions: Transaction[];
  onUpdateBudgets: (budgets: BudgetType[]) => void;
}

export const Budget: React.FC<BudgetProps> = ({ budgets, transactions, onUpdateBudgets }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempBudgets, setTempBudgets] = useState<BudgetType[]>(budgets);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);

  // Calculate actual spending per category for the current month
  const currentMonth = new Date().toISOString().slice(0, 7);
  const spendingMap = transactions
    .filter(t => t.date.startsWith(currentMonth) && t.type === TransactionType.EXPENSE)
    .reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
      return acc;
    }, {} as Record<string, number>);

  const handleSave = () => {
    onUpdateBudgets(tempBudgets);
    setIsEditing(false);
    setShowAddCategory(false);
  };

  const handleBudgetChange = (category: string, amount: string) => {
    const val = parseFloat(amount) || 0;
    const exists = tempBudgets.find(b => b.category === category);
    if (exists) {
      setTempBudgets(prev => prev.map(b => b.category === category ? { ...b, limit: val } : b));
    } else {
      setTempBudgets(prev => [...prev, { category, limit: val }]);
    }
  };

  const handleAddCustomCategory = () => {
    if (newCategoryName && !tempBudgets.find(b => b.category === newCategoryName)) {
      setTempBudgets(prev => [...prev, { category: newCategoryName, limit: 0 }]);
      setNewCategoryName('');
      setShowAddCategory(false);
    }
  };

  const totalBudget = tempBudgets.reduce((sum, b) => sum + b.limit, 0);
  const totalSpent = Object.values(spendingMap).reduce((sum, v) => sum + v, 0);

  // Standard Categories + any custom ones currently in budgets
  const displayedCategories = Array.from(new Set([
    ...Object.values(Category).filter(c => c !== Category.SALARY && c !== Category.FREELANCE),
    ...tempBudgets.map(b => b.category)
  ]));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Monthly Budget</h1>
          <p className="text-slate-500">Plan your spending limits for {new Date().toLocaleString('default', { month: 'long' })}.</p>
        </div>
        <button
          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${isEditing ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
        >
          {isEditing ? <CheckCircle size={18} /> : <Edit2 size={18} />}
          {isEditing ? 'Save Changes' : 'Edit Budgets'}
        </button>
      </div>

      {/* Overview Card */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-6 rounded-xl shadow-md">
        <div className="flex justify-between items-end mb-4">
          <div>
            <p className="text-slate-400 text-sm mb-1">Total Budget</p>
            <h2 className="text-3xl font-bold">₹{totalBudget.toLocaleString()}</h2>
          </div>
          <div className="text-right">
            <p className="text-slate-400 text-sm mb-1">Total Spent</p>
            <h2 className={`text-2xl font-bold ${totalSpent > totalBudget ? 'text-red-400' : 'text-green-400'}`}>
              ₹{totalSpent.toLocaleString()}
            </h2>
          </div>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${totalSpent > totalBudget ? 'bg-red-500' : 'bg-green-500'}`}
            style={{ width: `${Math.min(100, (totalSpent / totalBudget) * 100)}%` }}
          ></div>
        </div>
        <div className="mt-2 text-right text-xs text-slate-400">
          {((totalSpent / totalBudget) * 100).toFixed(1)}% Used
        </div>
      </div>

      {/* Add Custom Category Form (Only in Edit Mode) */}
      {isEditing && (
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center gap-4">
          {!showAddCategory ? (
            <button onClick={() => setShowAddCategory(true)} className="flex items-center gap-2 text-blue-600 font-medium">
              <Plus size={18} /> Add Custom Category
            </button>
          ) : (
            <div className="flex items-center gap-2 w-full">
              <input
                type="text"
                placeholder="Category Name"
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                className="px-3 py-1.5 border rounded-lg text-sm flex-1 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button onClick={handleAddCustomCategory} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm">Add</button>
              <button onClick={() => setShowAddCategory(false)} className="px-3 py-1.5 text-slate-500 text-sm">Cancel</button>
            </div>
          )}
        </div>
      )}

      {/* Budget Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {displayedCategories.map(cat => {
          const budgetItem = tempBudgets.find(b => b.category === cat);
          const limit = budgetItem?.limit || 0;
          const spent = spendingMap[cat] || 0;
          const percentage = limit > 0 ? (spent / limit) * 100 : 0;
          const isOver = spent > limit && limit > 0;

          if (!isEditing && limit === 0 && spent === 0) return null;

          return (
            <div key={cat} className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isOver ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                    {isOver ? <AlertCircle size={20} /> : <PieChart size={20} />}
                  </div>
                  <h3 className="font-semibold text-slate-800">{cat}</h3>
                </div>
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-sm">₹</span>
                    <input
                      type="number"
                      value={limit}
                      onChange={(e) => handleBudgetChange(cat, e.target.value)}
                      className="w-24 px-2 py-1 border border-slate-200 rounded text-right focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                ) : (
                  <span className="font-medium text-slate-600">₹{limit.toLocaleString()}</span>
                )}
              </div>

              <div className="mb-1 flex justify-between text-xs text-slate-500">
                <span>Spent: ₹{spent.toLocaleString()}</span>
                <span>{limit > 0 ? `${percentage.toFixed(0)}%` : 'No Limit'}</span>
              </div>

              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${isOver ? 'bg-red-500' : (percentage > 80 ? 'bg-orange-400' : 'bg-blue-500')}`}
                  style={{ width: `${Math.min(100, percentage)}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
