import React, { useState, useMemo } from 'react';
import { Account, Transaction, TransactionType, Budget } from '../../types/index';
import { KPICard } from './components/KPICard';
import { SpendingChart } from './components/SpendingChart';
import { IncomeExpenseChart } from './components/IncomeExpenseChart';
import { CategoryBreakdown } from './components/CategoryBreakdown';
import { SavingsWidget } from './components/SavingsWidget';
import { UpcomingBillsWidget } from './components/UpcomingBillsWidget';
import { Wallet, TrendingUp, TrendingDown, DollarSign, Sparkles, Loader2, Mail, CheckCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { getFinancialInsights } from '../../services/external/bedrock';
import ReactMarkdown from 'react-markdown';

interface DashboardProps {
    accounts: Account[];
    transactions: Transaction[];
    budgets: Budget[];
    onSyncGmail: () => Promise<void>;
}

export const Dashboard = ({ accounts, transactions, budgets, onSyncGmail }: DashboardProps) => {
    const [timeRange, setTimeRange] = useState('monthly');
    const [insight, setInsight] = useState<string | null>(null);
    const [loadingInsight, setLoadingInsight] = useState(false);
    const [syncingGmail, setSyncingGmail] = useState(false);
    const [gmailSynced, setGmailSynced] = useState(false);

    // --- Calculations ---

    // 1. Filter Transactions based on time range
    const [customMonth, setCustomMonth] = useState('');

    // --- Calculations ---

    // 1. Filter Transactions based on time range
    const filteredTransactions = useMemo(() => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        return transactions.filter(t => {
            const tDate = new Date(t.date);

            if (timeRange === 'monthly') {
                return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
            } else if (timeRange === 'last_month') {
                const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
                return tDate.getMonth() === lastMonthDate.getMonth() && tDate.getFullYear() === lastMonthDate.getFullYear();
            } else if (timeRange === 'yearly') {
                return tDate.getFullYear() === currentYear;
            } else if (timeRange === 'custom' && customMonth) {
                return t.date.startsWith(customMonth);
            }
            return true; // All Time or when custom is empty (show all or none? show all for now)
        });
    }, [transactions, timeRange, customMonth]);

    // 2. KPIs
    const totalNetWorth = accounts.reduce((sum, acc) => sum + acc.balance, 0);

    const totalIncome = filteredTransactions
        .filter(t => t.type === TransactionType.INCOME)
        .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = filteredTransactions
        .filter(t => t.type === TransactionType.EXPENSE)
        .reduce((sum, t) => sum + t.amount, 0);

    const budgetLimit = budgets.reduce((sum, b) => sum + b.limit, 0);
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

    // 3. Chart Data: Spending Trend (Daily)
    const spendingTrendData = useMemo(() => {
        const dailyMap = new Map<string, number>();

        // Initialize dates for current month if monthly view
        if (timeRange === 'monthly') {
            const now = new Date();
            const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
            for (let i = 1; i <= daysInMonth; i++) {
                // Need accurate date string construction
                const dayStr = `${now.toLocaleString('default', { month: 'short' })} ${i}`;
                dailyMap.set(dayStr, 0);
            }
        }

        filteredTransactions
            .filter(t => t.type === TransactionType.EXPENSE)
            .forEach(t => {
                const d = new Date(t.date);
                let key = '';
                if (timeRange === 'monthly') {
                    key = `${d.toLocaleString('default', { month: 'short' })} ${d.getDate()}`;
                } else {
                    // For yearly/all-time, maybe group by month
                    key = d.toLocaleString('default', { month: 'short', year: 'numeric' });
                }

                dailyMap.set(key, (dailyMap.get(key) || 0) + t.amount);
            });

        return Array.from(dailyMap.entries())
            .map(([day, spent]) => ({ day, spent }))
        // Sort logic needed if keys are not already sorted. 
        // For simplicity in this redesign, we rely on insertion order or need a sort helper.
        // Re-sorting by date object would be better.
    }, [filteredTransactions, timeRange]);

    // 4. Chart Data: Income vs Expense (Monthly - last 6 months)
    const incomeVsExpenseData = useMemo(() => {
        const data = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const monthStr = d.toISOString().slice(0, 7);
            const monthName = d.toLocaleString('default', { month: 'short' });

            const inc = transactions
                .filter(t => t.date.startsWith(monthStr) && t.type === TransactionType.INCOME)
                .reduce((sum, t) => sum + t.amount, 0);

            const exp = transactions
                .filter(t => t.date.startsWith(monthStr) && t.type === TransactionType.EXPENSE)
                .reduce((sum, t) => sum + t.amount, 0);

            data.push({ name: monthName, income: inc, expense: exp });
        }
        return data;
    }, [transactions]);

    // 5. Chart Data: Category Breakdown
    const categoryData = useMemo(() => {
        const catMap = new Map<string, number>();
        filteredTransactions
            .filter(t => t.type === TransactionType.EXPENSE)
            .forEach(t => {
                catMap.set(t.category, (catMap.get(t.category) || 0) + t.amount);
            });

        return Array.from(catMap.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [filteredTransactions]);


    // --- Handlers ---
    const handleGenerateInsight = async () => {
        setLoadingInsight(true);
        try {
            const result = await getFinancialInsights(transactions, totalNetWorth);
            setInsight(result);
        } catch (e) { console.error(e) }
        setLoadingInsight(false);
    };

    const handleGmailSync = async () => {
        setSyncingGmail(true);
        try {
            await onSyncGmail();
            setGmailSynced(true);
            setTimeout(() => setGmailSynced(false), 3000);
        } catch (e) { console.error(e) }
        setSyncingGmail(false);
    };

    return (
        <div className="space-y-8 animate-in fade-in pb-10">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
                    <p className="text-slate-500 mt-1">Your financial health at a glance.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <Select
                        value={timeRange}
                        onChange={(e) => {
                            setTimeRange(e.target.value);
                            if (e.target.value !== 'custom') setCustomMonth('');
                        }}
                        className="w-48 bg-white"
                    >
                        <option value="monthly">This Month</option>
                        <option value="last_month">Last Month</option>
                        <option value="yearly">This Year</option>
                        <option value="all">All Time</option>
                        <option value="custom">Select Month</option>
                    </Select>

                    {timeRange === 'custom' && (
                        <input
                            type="month"
                            className="bg-white border border-gray-300 text-slate-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block p-2.5"
                            value={customMonth}
                            onChange={(e) => setCustomMonth(e.target.value)}
                        />
                    )}

                    <Button
                        variant="secondary"
                        onClick={handleGmailSync}
                        isLoading={syncingGmail}
                        leftIcon={!syncingGmail && (gmailSynced ? <CheckCircle size={18} className="text-green-600" /> : <Mail size={18} />)}
                    >
                        {gmailSynced ? 'Synced' : 'Sync Gmail'}
                    </Button>

                    <Button
                        variant="primary"
                        className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white border-0 shadow-lg shadow-indigo-200"
                        onClick={handleGenerateInsight}
                        isLoading={loadingInsight}
                        leftIcon={<Sparkles size={18} />}
                    >
                        AI Insights
                    </Button>
                </div>
            </div>

            {/* AI Insight Section */}
            {insight && (
                <div className="bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 p-6 rounded-2xl animate-scale-in shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-white rounded-lg shadow-sm text-indigo-600">
                            <Sparkles size={20} />
                        </div>
                        <h3 className="font-semibold text-indigo-900 text-lg">AI Financial Analysis</h3>
                    </div>
                    <div className="prose prose-indigo prose-sm max-w-none text-indigo-800/90 leading-relaxed">
                        <ReactMarkdown>{insight}</ReactMarkdown>
                    </div>
                </div>
            )}

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                    title="Total Net Worth"
                    value={totalNetWorth}
                    icon={<Wallet size={24} />}
                    trend="+2.5%"
                    trendUp={true}
                    className="hover:shadow-md transition-shadow"
                />
                <KPICard
                    title="Income"
                    value={totalIncome}
                    icon={<TrendingUp size={24} />}
                    trend={timeRange === 'monthly' ? "vs last month" : ""}
                    trendUp={true}
                    className="hover:shadow-md transition-shadow"
                />
                <KPICard
                    title="Expenses"
                    value={totalExpense}
                    icon={<TrendingDown size={24} />}
                    trend={`${savingsRate.toFixed(1)}% savings rate`}
                    trendUp={savingsRate > 20}
                    className="hover:shadow-md transition-shadow"
                />
                <KPICard
                    title="Budget Limit"
                    value={budgetLimit}
                    icon={<DollarSign size={24} />}
                    subValue={`Left: ₹${Math.max(0, budgetLimit - totalExpense).toLocaleString()}`}
                    trend={`${Math.round((totalExpense / budgetLimit) * 100)}% used`}
                    trendUp={totalExpense < budgetLimit}
                    className="hover:shadow-md transition-shadow"
                />
            </div>

            {/* Main Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Spending Trend - Takes up 2 columns */}
                <SpendingChart data={spendingTrendData} />

                {/* Upcoming Bills - Takes up 1 column */}
                <div className="lg:col-span-1 h-full">
                    <UpcomingBillsWidget />
                </div>
            </div>

            {/* Secondary Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <IncomeExpenseChart data={incomeVsExpenseData} />
                <CategoryBreakdown
                    data={categoryData}
                    totalExpense={totalExpense}
                />
            </div>

            {/* Bottom Section: Savings */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <SavingsWidget />
                {/* Potential space for "Recent Transactions" list widget here if needed */}
            </div>

        </div>
    );
};
