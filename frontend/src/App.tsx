import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { TransactionsPage } from './pages/Transactions';
import { AccountsPage } from './pages/Accounts';
import { BudgetPage } from './pages/Budget';
import { VehiclesPage } from './pages/Vehicles';
import { SavingsPage } from './pages/Savings';
import { SettingsPage } from './pages/Profile';
import { supabase } from './services/supabase/client';
import {
    fetchTransactions, addTransactionToDb, updateTransactionInDb, deleteTransactionFromDb,
    fetchAccounts, addAccountToDb, updateAccountInDb, deleteAccountFromDb,
    fetchBudgets, saveBudgetsToDb,
    fetchVehicles, addVehicleToDb, updateVehicleInDb, deleteVehicleFromDb,
    fetchFuelLogs, addFuelLogToDb,
    fetchInvestments, addInvestmentToDb, updateInvestmentInDb, deleteInvestmentFromDb
} from './services/supabase/database';
import { fetchGmailTransactions } from './services/external/gmail';
import { Loader2 } from 'lucide-react';
import { Transaction, Account, Budget, ViewState, Vehicle, FuelLog, Investment } from './types/index';

// Helper to calculate spent amount for current month
const calculateBudgetSpent = (category: string, transactions: Transaction[]): number => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return transactions
        .filter(t => {
            const tDate = new Date(t.date);
            return t.category === category &&
                t.type === 'expense' &&
                tDate.getMonth() === currentMonth &&
                tDate.getFullYear() === currentYear;
        })
        .reduce((sum, t) => sum + t.amount, 0);
};

const App = () => {
    // State
    const [currentView, setCurrentView] = useState<ViewState>(() => {
        const savedView = localStorage.getItem('financeTrackr_activeTab');
        return (savedView as ViewState) || 'dashboard';
    });

    // Persist view change
    useEffect(() => {
        localStorage.setItem('financeTrackr_activeTab', currentView);
    }, [currentView]);

    const [loading, setLoading] = useState(true);

    // Data State
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
    const [investments, setInvestments] = useState<Investment[]>([]);

    // Auth State (Simplified for this redesign, assuming auth works)
    const [session, setSession] = useState<any>(null);

    // Initial Load
    useEffect(() => {
        const loadData = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                setSession(session);

                const [txs, accs, bgs, vh, fl, inv] = await Promise.all([
                    fetchTransactions(),
                    fetchAccounts(),
                    fetchBudgets(),
                    fetchVehicles(),
                    fetchFuelLogs(),
                    fetchInvestments()
                ]);

                setTransactions(txs);
                setAccounts(accs);
                setVehicles(vh);
                setFuelLogs(fl);
                setInvestments(inv);

                // Calculate spent for budgets
                const budgetsWithSpent = bgs.map(b => ({
                    ...b,
                    spent: calculateBudgetSpent(b.category as string, txs),
                    period: 'monthly' as const
                }));
                setBudgets(budgetsWithSpent);

            } catch (error) {
                console.error('Error loading data:', error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    // Recalculate budgets when transactions change
    useEffect(() => {
        if (transactions.length > 0 && budgets.length > 0) {
            setBudgets(prev => prev.map(b => ({
                ...b,
                spent: calculateBudgetSpent(b.category as string, transactions)
            })));
        }
    }, [transactions]);

    // --- Handlers ---

    // Transactions
    const handleAddTransaction = async (tx: Transaction) => {
        // Optimistic update with temporary ID
        setTransactions([tx, ...transactions]);
        try {
            const id = await addTransactionToDb(tx);
            // Update with real ID
            const savedTx = { ...tx, id };
            setTransactions(prev => prev.map(t => t.id === tx.id ? savedTx : t));
        } catch (error) {
            console.error("Failed to add transaction:", error);
            // Revert on error
            setTransactions(prev => prev.filter(t => t.id !== tx.id));
        }
    };

    const handleUpdateTransaction = async (tx: Transaction) => {
        setTransactions(prev => prev.map(t => t.id === tx.id ? tx : t));
        await updateTransactionInDb(tx);
    };

    const handleDeleteTransaction = async (id: string) => {
        setTransactions(prev => prev.filter(t => t.id !== id));
        await deleteTransactionFromDb(id);
    };

    const handleBulkAddTransactions = async (txs: Transaction[]) => {
        setTransactions([...txs, ...transactions]);
        for (const tx of txs) {
            await addTransactionToDb(tx);
        }
    };

    // Accounts
    const handleAddAccount = async (acc: Account): Promise<Account> => {
        // Optimistic update not ideal here as we return the account, but following pattern
        const tempId = acc.id;
        setAccounts([...accounts, acc]);

        try {
            const id = await addAccountToDb(acc);
            const savedAccount = { ...acc, id };
            setAccounts(prev => prev.map(a => a.id === tempId ? savedAccount : a));
            return savedAccount;
        } catch (error) {
            console.error("Failed to add account:", error);
            setAccounts(prev => prev.filter(a => a.id !== tempId));
            throw error;
        }
    };

    // ... (Updates/Deletes remain same)

    const handleUpdateAccount = async (acc: Account) => {
        setAccounts(prev => prev.map(a => a.id === acc.id ? acc : a));
        await updateAccountInDb(acc);
    };

    const handleDeleteAccount = async (id: string) => {
        setAccounts(prev => prev.filter(a => a.id !== id));
        await deleteAccountFromDb(id);
    };

    // Budgets
    const handleSaveBudgets = async (newBudgets: Budget[]) => {
        setBudgets(newBudgets);
        await saveBudgetsToDb(newBudgets);
    };

    // Vehicles
    const handleAddVehicle = async (vehicle: Vehicle) => {
        setVehicles(prev => [...prev, vehicle]);
        try {
            const id = await addVehicleToDb(vehicle);
            setVehicles(prev => prev.map(v => v.id === vehicle.id ? { ...v, id } : v));
        } catch (error) {
            console.error("Failed to add vehicle:", error);
            setVehicles(prev => prev.filter(v => v.id !== vehicle.id));
        }
    };

    const handleEditVehicle = async (vehicle: Vehicle) => {
        setVehicles(prev => prev.map(v => v.id === vehicle.id ? vehicle : v));
        await updateVehicleInDb(vehicle);
    };

    const handleDeleteVehicle = async (id: string) => {
        setVehicles(prev => prev.filter(v => v.id !== id));
        await deleteVehicleFromDb(id);
    };

    const handleAddFuelLog = async (log: FuelLog) => {
        setFuelLogs(prev => [log, ...prev]);
        try {
            const id = await addFuelLogToDb(log);
            setFuelLogs(prev => prev.map(l => l.id === log.id ? { ...l, id } : l));
        } catch (error) {
            console.error("Failed to add fuel log:", error);
            setFuelLogs(prev => prev.filter(l => l.id !== log.id));
        }
    };

    // Investments
    const handleAddInvestment = async (inv: Investment) => {
        setInvestments(prev => [inv, ...prev]);
        try {
            const id = await addInvestmentToDb(inv);
            setInvestments(prev => prev.map(i => i.id === inv.id ? { ...i, id } : i));
        } catch (error) {
            console.error("Failed to add investment:", error);
            setInvestments(prev => prev.filter(i => i.id !== inv.id));
        }
    };

    const handleEditInvestment = async (inv: Investment) => {
        setInvestments(prev => prev.map(i => i.id === inv.id ? inv : i));
        await updateInvestmentInDb(inv);
    };

    const handleDeleteInvestment = async (id: string) => {
        setInvestments(prev => prev.filter(i => i.id !== id));
        await deleteInvestmentFromDb(id);
    };

    // Gmail Sync
    const handleGmailSync = async () => {
        const newTxs = await fetchGmailTransactions();
        if (newTxs.length > 0) {
            await handleBulkAddTransactions(newTxs);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 size={40} className="animate-spin text-primary-600" />
                    <p className="text-slate-500 font-medium">Loading FinanceTrackr...</p>
                </div>
            </div>
        );
    }

    const renderContent = () => {
        switch (currentView) {
            case 'dashboard':
                return <Dashboard
                    accounts={accounts}
                    transactions={transactions}
                    budgets={budgets}
                    onSyncGmail={handleGmailSync}
                />;
            case 'transactions':
                return <TransactionsPage
                    transactions={transactions}
                    accounts={accounts}
                    onAddTransaction={handleAddTransaction}
                    onBulkAddTransactions={handleBulkAddTransactions}
                    onUpdateTransaction={handleUpdateTransaction}
                    onDeleteTransaction={handleDeleteTransaction}
                    onAddAccount={handleAddAccount}
                    vehicles={vehicles}
                    investments={investments}
                    onAddFuelLog={handleAddFuelLog}
                    onUpdateInvestment={handleEditInvestment}
                    onAddVehicle={handleAddVehicle}
                    onAddInvestment={handleAddInvestment}
                />;
            case 'accounts':
                return <AccountsPage
                    accounts={accounts}
                    onAddAccount={handleAddAccount}
                    onUpdateAccount={handleUpdateAccount}
                    onDeleteAccount={handleDeleteAccount}
                />;
            case 'vehicles':
                return <VehiclesPage
                    vehicles={vehicles}
                    fuelLogs={fuelLogs}
                    onAddVehicle={handleAddVehicle}
                    onEditVehicle={handleEditVehicle}
                    onDeleteVehicle={handleDeleteVehicle}
                    onAddFuelLog={handleAddFuelLog}
                />;
            case 'budget':
                return <BudgetPage
                    budgets={budgets}
                    transactions={transactions} // Re-added transactions prop which BudgetPage might need for internal calcs if it uses them, though we pre-calc spent.
                    onSaveBudgets={handleSaveBudgets}
                />;
            case 'savings':
                return <SavingsPage
                    investments={investments}
                    budgets={budgets}
                    onAddInvestment={handleAddInvestment}
                    onEditInvestment={handleEditInvestment}
                    onDeleteInvestment={handleDeleteInvestment}
                />;
            case 'settings':
                return <SettingsPage />;
            default:
                return <Dashboard
                    accounts={accounts}
                    transactions={transactions}
                    budgets={budgets}
                    onSyncGmail={handleGmailSync}
                />;
        }
    };

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
            <Sidebar
                currentView={currentView}
                onViewChange={setCurrentView}
                onLogout={() => supabase.auth.signOut()}
            />

            <main className="flex-1 overflow-auto">
                <div className="p-4 md:p-8 md:pt-10 max-w-7xl mx-auto min-h-full">
                    {renderContent()}
                </div>
            </main>
        </div>
    );
};

export default App;
