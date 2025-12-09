import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Wallet, Sparkles, Loader2, Mail, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { Account, Transaction, TransactionType, Category, Budget } from '../types';
import { getFinancialInsights } from '../services/bedrockService';
import { MonthYearFilter, DateFilter } from './MonthYearFilter';
import ReactMarkdown from 'react-markdown';

interface DashboardProps {
  accounts: Account[];
  transactions: Transaction[];
  budgets: Budget[];
  onSyncGmail: () => Promise<void>;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

export const Dashboard: React.FC<DashboardProps> = ({ accounts, transactions, budgets, onSyncGmail }) => {
  const [insight, setInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [syncingGmail, setSyncingGmail] = useState(false);
  const [gmailSynced, setGmailSynced] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter | null>(null);

  // Filter transactions by date
  const filterTransactionsByDate = (txs: Transaction[]) => {
    if (!dateFilter) return txs;
    return txs.filter(t => {
      const txDate = new Date(t.date);
      return txDate.getMonth() + 1 === dateFilter.month && txDate.getFullYear() === dateFilter.year;
    });
  };

  const filteredTransactions = filterTransactionsByDate(transactions);

  // Calculate totals from filtered data
  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const monthlyTransactions = filteredTransactions;

  const monthlyIncome = monthlyTransactions
    .filter(t => t.type === TransactionType.INCOME)
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyExpense = monthlyTransactions
    .filter(t => t.type === TransactionType.EXPENSE)
    .reduce((sum, t) => sum + t.amount, 0);

  // Calculate previous month data for trends
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const lastMonthStr = lastMonth.toISOString().slice(0, 7);

  const lastMonthTransactions = transactions.filter(t => t.date.startsWith(lastMonthStr));
  const lastMonthIncome = lastMonthTransactions
    .filter(t => t.type === TransactionType.INCOME)
    .reduce((sum, t) => sum + t.amount, 0);
  const lastMonthExpense = lastMonthTransactions
    .filter(t => t.type === TransactionType.EXPENSE)
    .reduce((sum, t) => sum + t.amount, 0);

  // Calculate percentage changes
  const incomeChange = lastMonthIncome >
    0 ? ((monthlyIncome - lastMonthIncome) / lastMonthIncome * 100).toFixed(1)
    : monthlyIncome > 0 ? '+100' : '0';
  const expenseChange = lastMonthExpense > 0
    ? ((monthlyExpense - lastMonthExpense) / lastMonthExpense * 100).toFixed(1)
    : monthlyExpense > 0 ? '+100' : '0';

  // For balance, show 0% if no accounts, otherwise show a generic positive indicator
  const balanceChange = totalBalance === 0 ? '0' : '+0.0';

  // Calculate Budget Left
  const totalBudgetLimit = budgets.reduce((sum, b) => sum + b.limit, 0);
  const budgetLeft = Math.max(0, totalBudgetLimit - monthlyExpense);
  const budgetProgress = totalBudgetLimit > 0 ? Math.round((budgetLeft / totalBudgetLimit) * 100) : 0;

  // Prepare chart data
  const categoryDataMap = monthlyTransactions
    .filter(t => t.type === TransactionType.EXPENSE)
    .reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
      return acc;
    }, {} as Record<string, number>);

  const pieData = Object.keys(categoryDataMap).map(cat => ({
    name: cat,
    value: categoryDataMap[cat]
  }));

  // Dynamic Chart Data
  const barData = (() => {
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthStr = d.toISOString().slice(0, 7); // YYYY-MM
      const monthName = d.toLocaleString('default', { month: 'short' });

      const income = transactions
        .filter(t => t.date.startsWith(monthStr) && t.type === TransactionType.INCOME)
        .reduce((sum, t) => sum + t.amount, 0);

      const expense = transactions
        .filter(t => t.date.startsWith(monthStr) && t.type === TransactionType.EXPENSE)
        .reduce((sum, t) => sum + t.amount, 0);

      last6Months.push({ name: monthName, income, expense });
    }
    return last6Months;
  })();

  const trendData = (() => {
    // Determine which month to show based on filter
    const displayDate = dateFilter
      ? new Date(dateFilter.year, dateFilter.month - 1, 1)
      : new Date();

    if (!dateFilter) {
      // All Time: Group by month instead of day
      const monthlyDataMap = transactions // Use all transactions for "All Time"
        .filter(t => t.type === TransactionType.EXPENSE)
        .reduce((acc, curr) => {
          const monthKey = curr.date.slice(0, 7); // YYYY-MM
          acc[monthKey] = (acc[monthKey] || 0) + curr.amount;
          return acc;
        }, {} as Record<string, number>);

      return Object.keys(monthlyDataMap).sort().map(monthKey => {
        const [year, month] = monthKey.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        return {
          day: date.toLocaleString('default', { month: 'short', year: 'numeric' }),
          spent: monthlyDataMap[monthKey]
        };
      });
    }

    // Specific month: Group by day
    const dailyDataMap = monthlyTransactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((acc, curr) => {
        const day = curr.date.slice(8, 10);
        acc[day] = (acc[day] || 0) + curr.amount;
        return acc;
      }, {} as Record<string, number>);

    return Object.keys(dailyDataMap).sort().map(day => ({
      day: `${displayDate.toLocaleString('default', { month: 'short' })} ${day}`,
      spent: dailyDataMap[day]
    }));
  })();

  // Get display month name for chart title
  const displayMonthName = dateFilter
    ? new Date(dateFilter.year, dateFilter.month - 1, 1).toLocaleString('default', { month: 'long' })
    : 'All Time';

  const handleGenerateInsight = async () => {
    setLoadingInsight(true);
    const result = await getFinancialInsights(transactions, totalBalance);
    setInsight(result);
    setLoadingInsight(false);
  };

  const handleGmailSync = async () => {
    setSyncingGmail(true);
    await onSyncGmail();
    setSyncingGmail(false);
    setGmailSynced(true);
    setTimeout(() => setGmailSynced(false), 3000);
  };

  // Helper to format dates for display
  const formatDateForDisplay = (dateStr: string): string => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('-');
      return `${day}-${month}-${year}`;
    }
    return dateStr;
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Financial Overview</h1>
          <p className="text-slate-500">Welcome back, here's what's happening with your money.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <MonthYearFilter value={dateFilter} onChange={setDateFilter} showAllOption={true} />
          <div className="flex gap-2">
            <button
              onClick={handleGmailSync}
              disabled={syncingGmail}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all border ${gmailSynced
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
            >
              {syncingGmail ? <Loader2 className="animate-spin" size={18} /> : gmailSynced ? <CheckCircle size={18} /> : <Mail size={18} />}
              {syncingGmail ? 'Syncing...' : gmailSynced ? 'Synced' : 'Sync Gmail'}
            </button>

            <button
              onClick={handleGenerateInsight}
              disabled={loadingInsight}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingInsight ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>Get AI Insights</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* AI Insight Box */}
      {insight && (
        <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-xl animate-fade-in">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="text-indigo-600" size={20} />
            <h3 className="font-semibold text-indigo-900">AI Financial Analysis</h3>
          </div>
          <div className="prose prose-indigo prose-sm max-w-none text-indigo-800">
            <ReactMarkdown>{insight}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Net Worth"
          value={totalBalance}
          icon={<Wallet className="text-blue-600" />}
          trend={`${balanceChange}%`}
          trendUp={parseFloat(balanceChange) >= 0}
        />
        <StatCard
          title="Monthly Income"
          value={monthlyIncome}
          icon={<TrendingUp className="text-green-600" />}
          trend={`${parseFloat(incomeChange) >= 0 ? '+' : ''}${incomeChange}%`}
          trendUp={parseFloat(incomeChange) >= 0}
        />
        <StatCard
          title="Monthly Expenses"
          value={monthlyExpense}
          icon={<TrendingDown className="text-red-600" />}
          trend={`${parseFloat(expenseChange) >= 0 ? '+' : ''}${expenseChange}%`}
          trendUp={parseFloat(expenseChange) < 0} // Good when expenses go down
        />
        <StatCard
          title="Budget Left"
          value={budgetLeft}
          subValue={`/ ₹${totalBudgetLimit.toLocaleString()}`}
          icon={<DollarSign className="text-orange-600" />}
          trend={`${budgetProgress}%`}
          trendUp={budgetProgress > 20}
          isCurrency={true}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Spending Trend (Line Chart) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Daily Spending Trend ({displayMonthName})</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(val) => `₹${val}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  formatter={(value: number) => [`₹${value}`, 'Spent']}
                />
                <Line type="monotone" dataKey="spent" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, fill: '#8b5cf6' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Upcoming Bills (Removed Static Data) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-center items-center text-center">
          <div className="p-4 bg-slate-50 rounded-full mb-3">
            <FileText className="text-slate-400" size={24} />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-1">No Upcoming Bills</h3>
          <p className="text-sm text-slate-500">Great job! You're all caught up.</p>
        </div>

        {/* Income vs Expense Bar Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Income vs Expenses (6 Months)</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} tickFormatter={(val) => `₹${val / 1000}k`} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [`₹${value.toLocaleString()}`, '']}
                />
                <Legend iconType="circle" />
                <Bar dataKey="income" name="Income" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={24} />
                <Bar dataKey="expense" name="Expense" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Spending Breakdown</h3>
          <div className="flex-1 min-h-[250px] relative">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
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
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">
                No expense data
              </div>
            )}
            {pieData.length > 0 && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                <p className="text-xs text-slate-400">Total</p>
                <p className="text-lg font-bold text-slate-800">₹{(monthlyExpense / 1000).toFixed(1)}k</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Transactions Snippet */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800">Recent Transactions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-medium">
              <tr>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Description</th>
                <th className="px-6 py-3">Source</th>
                <th className="px-6 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.slice(0, 5).map(tx => (
                <tr key={tx.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3">{formatDateForDisplay(tx.date)}</td>
                  <td className="px-6 py-3 font-medium text-slate-900">{tx.description}</td>
                  <td className="px-6 py-3">
                    {tx.source === 'gmail' && <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-red-50 text-red-600 rounded-full"><Mail size={10} /> Gmail</span>}
                    {tx.source === 'csv' && <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-green-50 text-green-600 rounded-full"><FileText size={10} /> CSV</span>}
                    {(!tx.source || tx.source === 'manual') && <span className="text-xs text-slate-400">Manual</span>}
                  </td>
                  <td className={`px-6 py-3 text-right font-semibold ${tx.type === TransactionType.INCOME ? 'text-green-600' : 'text-slate-900'}`}>
                    {tx.type === TransactionType.INCOME ? '+' : '-'}₹{tx.amount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{
  title: string;
  value: number;
  subValue?: string;
  icon: React.ReactNode;
  trend: string;
  trendUp: boolean;
  isCurrency?: boolean;
}> = ({ title, value, subValue, icon, trend, trendUp, isCurrency = true }) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-slate-50 rounded-lg">{icon}</div>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${trendUp ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {trend}
        </span>
      </div>
      <div>
        <h4 className="text-sm font-medium text-slate-500 mb-1">{title}</h4>
        <div className="flex items-baseline gap-1">
          <h2 className="text-2xl font-bold text-slate-800">
            {isCurrency ? `₹${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : value}
          </h2>
          {subValue && <span className="text-sm text-slate-400">{subValue}</span>}
        </div>
      </div>
    </div>
  );
};
