import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Login } from './components/Login';
import { Accounts } from './components/Accounts';
import { Transactions } from './components/Transactions';
import { Vehicles } from './components/Vehicles';
import { Budget } from './components/Budget';
import { Savings } from './components/Savings';
import { ViewState, Transaction, Account, FuelLog, Vehicle, Budget as BudgetType, TransactionType, Category, Investment } from './types';
import { MOCK_ACCOUNTS, MOCK_FUEL_LOGS, MOCK_TRANSACTIONS, MOCK_VEHICLES, MOCK_BUDGETS, MOCK_INVESTMENTS } from './constants'; // Keep for type ref if needed, but don't use data
import { Menu } from 'lucide-react';
import { Profile } from './components/Profile';
import {
  fetchTransactions, addTransactionToDb, updateTransactionInDb, deleteTransactionFromDb,
  fetchAccounts, addAccountToDb, updateAccountInDb, deleteAccountFromDb,
  fetchBudgets, saveBudgetsToDb,
  fetchVehicles, addVehicleToDb, updateVehicleInDb, deleteVehicleFromDb,
  fetchFuelLogs, addFuelLogToDb,
  fetchInvestments, addInvestmentToDb, updateInvestmentInDb, deleteInvestmentFromDb,
  supabase
} from './services/supabase';
import { fetchGmailTransactions } from './services/gmailService';

// Import tests in development mode
if (import.meta.env.DEV) {
  import('./tests/pdfImportTests');
}

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentView, setCurrentView] = useState<ViewState>(() => {
    const saved = localStorage.getItem('financetrackr_current_view');
    return (saved as ViewState) || 'dashboard';
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Save current view to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('financetrackr_current_view', currentView);
  }, [currentView]);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
      if (_event === 'PASSWORD_RECOVERY') {
        setCurrentView('profile');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // App State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [budgets, setBudgets] = useState<BudgetType[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);

  useEffect(() => {
    if (isLoggedIn) {
      loadData();
    }
  }, [isLoggedIn]);

  const loadData = async () => {
    try {
      const [txs, accs, budgs, vehs, logs, invs] = await Promise.all([
        fetchTransactions(),
        fetchAccounts(),
        fetchBudgets(),
        fetchVehicles(),
        fetchFuelLogs(),
        fetchInvestments()
      ]);

      setTransactions(txs || []);
      setAccounts(accs || []);
      setBudgets(budgs || []);
      setVehicles(vehs || []);
      setFuelLogs(logs || []);
      setInvestments(invs || []);
    } catch (error) {
      console.error("Failed to fetch data", error);
    }
  };

  // Handlers
  const handleAddTransaction = async (newTx: Transaction) => {
    let dbId = newTx.id;
    try {
      dbId = await addTransactionToDb(newTx);
    } catch (error) {
      console.error("Failed to add to DB, using local state only", error);
    }
    // Use database-generated ID
    setTransactions(prev => [{ ...newTx, id: dbId }, ...prev]);
    updateAccountBalance(newTx, false);
  };

  const handleEditTransaction = async (updatedTx: Transaction) => {
    try {
      await updateTransactionInDb(updatedTx);
    } catch (error) {
      console.error("Failed to update DB, using local state only", error);
    }

    setTransactions(prev => prev.map(t => t.id === updatedTx.id ? updatedTx : t));

    // Re-calculate balance: Revert old, apply new. 
    // This is complex without fetching old tx. For simplicity in this mock/hybrid mode:
    // We'll just assume the user refreshes or we accept slight drift in this demo.
    // Ideally: find old tx, revert it, apply new.
    const oldTx = transactions.find(t => t.id === updatedTx.id);
    if (oldTx) {
      updateAccountBalance(oldTx, true); // Revert old
      updateAccountBalance(updatedTx, false); // Apply new
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    const tx = transactions.find(t => t.id === id);
    if (tx) {
      try {
        await deleteTransactionFromDb(id);
      } catch (error) {
        console.error("Failed to delete from DB, using local state only", error);
      }
      updateAccountBalance(tx, true); // Revert balance
      setTransactions(prev => prev.filter(t => t.id !== id));
    }
  };

  const handleBulkAddTransactions = async (newTxs: Transaction[]) => {
    const transactionsWithDbIds: Transaction[] = [];

    // Save each transaction to database and get real UUIDs
    for (const tx of newTxs) {
      try {
        const dbId = await addTransactionToDb(tx);
        transactionsWithDbIds.push({ ...tx, id: dbId });
      } catch (error) {
        console.error("Failed to add transaction to DB:", error);
        // Skip failed transactions
      }
    }

    // Update local state with database UUIDs
    setTransactions(prev => [...transactionsWithDbIds, ...prev]);
    transactionsWithDbIds.forEach(tx => updateAccountBalance(tx, false));
  };

  const updateAccountBalance = async (tx: Transaction, isRevert: boolean) => {
    setAccounts(prev => prev.map(acc => {
      if (acc.id === tx.accountId) {
        let change = tx.type === TransactionType.INCOME ? tx.amount : -tx.amount;
        if (isRevert) change = -change;
        const updatedAccount = { ...acc, balance: acc.balance + change };

        // Save to DB (async, no await to avoid blocking UI)
        updateAccountInDb(updatedAccount).catch(err => console.error("Failed to update account balance", err));

        return updatedAccount;
      }
      return acc;
    }));
  };

  const handleAddAccount = async (newAccount: Account): Promise<Account> => {
    let dbId = newAccount.id;
    try {
      dbId = await addAccountToDb(newAccount);
    } catch (error) {
      console.error("Failed to save account to DB", error);
    }
    // Create account with database-generated ID
    const accountWithDbId = { ...newAccount, id: dbId };
    setAccounts(prev => [accountWithDbId, ...prev]);
    return accountWithDbId;
  };

  const handleEditAccount = async (updatedAccount: Account) => {
    try {
      await updateAccountInDb(updatedAccount);
      setAccounts(prev => prev.map(a => a.id === updatedAccount.id ? updatedAccount : a));
    } catch (error) {
      console.error("Failed to update account in DB", error);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    try {
      await deleteAccountFromDb(id);
      setAccounts(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      console.error("Failed to delete account from DB", error);
    }
  };

  const handleAddVehicle = async (newVehicle: Vehicle) => {
    try {
      await addVehicleToDb(newVehicle);
    } catch (error) {
      console.error("Failed to save vehicle to DB", error);
    }
    setVehicles(prev => [newVehicle, ...prev]);
  };

  const handleEditVehicle = async (updatedVehicle: Vehicle) => {
    try {
      await updateVehicleInDb(updatedVehicle);
      setVehicles(prev => prev.map(v => v.id === updatedVehicle.id ? updatedVehicle : v));
    } catch (error) {
      console.error("Failed to update vehicle in DB", error);
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    try {
      await deleteVehicleFromDb(id);
      setVehicles(prev => prev.filter(v => v.id !== id));
      // Also remove associated fuel logs
      setFuelLogs(prev => prev.filter(log => log.vehicleId !== id));
    } catch (error) {
      console.error("Failed to delete vehicle from DB", error);
    }
  };

  const handleAddInvestment = async (newInvestment: Investment) => {
    try {
      await addInvestmentToDb(newInvestment);
    } catch (error) {
      console.error("Failed to save investment to DB", error);
    }
    setInvestments(prev => [newInvestment, ...prev]);
  };

  const handleEditInvestment = async (updatedInvestment: Investment) => {
    try {
      await updateInvestmentInDb(updatedInvestment);
      setInvestments(prev => prev.map(i => i.id === updatedInvestment.id ? updatedInvestment : i));
    } catch (error) {
      console.error("Failed to update investment in DB", error);
    }
  };

  const handleDeleteInvestment = async (id: string) => {
    try {
      await deleteInvestmentFromDb(id);
      setInvestments(prev => prev.filter(i => i.id !== id));
    } catch (error) {
      console.error("Failed to delete investment from DB", error);
    }
  };

  const handleAddFuelLog = async (newLog: FuelLog) => {
    try {
      await addFuelLogToDb(newLog);
    } catch (error) {
      console.error("Failed to add fuel log to DB", error);
    }
    setFuelLogs(prev => [...prev, newLog]);
  };

  const handleUpdateBudgets = async (updatedBudgets: BudgetType[]) => {
    try {
      await saveBudgetsToDb(updatedBudgets);
    } catch (error) {
      console.error("Failed to save budgets to DB", error);
    }
    setBudgets(updatedBudgets);
  };

  // Mock Gmail Sync function
  const handleSyncGmail = async () => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      const gmailTxs = await fetchGmailTransactions();

      // Assign account ID (e.g., first account)
      const validTxs = gmailTxs.map(tx => ({
        ...tx,
        accountId: accounts[0]?.id || 'unknown'
      }));

      // Try to save to DB
      for (const tx of validTxs) {
        try { await addTransactionToDb(tx); } catch (e) { console.error(e); }
      }

      handleBulkAddTransactions(validTxs);
    } catch (error) {
      console.error("Gmail sync failed", error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setTransactions([]);
    setAccounts([]);
    setVehicles([]);
    setFuelLogs([]);
    setBudgets([]);
    setInvestments([]);
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard accounts={accounts} transactions={transactions} onSyncGmail={handleSyncGmail} budgets={budgets} />;
      case 'accounts':
        return <Accounts accounts={accounts} onAddAccount={handleAddAccount} onEditAccount={handleEditAccount} onDeleteAccount={handleDeleteAccount} />;
      case 'transactions':
        return <Transactions
          transactions={transactions}
          accounts={accounts}
          onAddTransaction={handleAddTransaction}
          onBulkAddTransactions={handleBulkAddTransactions}
          onDeleteTransaction={handleDeleteTransaction}
          onEditTransaction={handleEditTransaction}
          onAddAccount={handleAddAccount}
        />;
      case 'budget':
        return <Budget budgets={budgets} transactions={transactions} onUpdateBudgets={handleUpdateBudgets} />;
      case 'savings':
        return <Savings investments={investments} budgets={budgets} onAddInvestment={handleAddInvestment} onEditInvestment={handleEditInvestment} onDeleteInvestment={handleDeleteInvestment} />;
      case 'vehicles':
        return <Vehicles vehicles={vehicles} fuelLogs={fuelLogs} onAddFuelLog={handleAddFuelLog} onAddVehicle={handleAddVehicle} onEditVehicle={handleEditVehicle} onDeleteVehicle={handleDeleteVehicle} />;
      case 'profile':
        return <Profile />;
      default:
        return <Dashboard accounts={accounts} transactions={transactions} onSyncGmail={handleSyncGmail} budgets={budgets} />;
    }
  };

  if (!isLoggedIn) {
    return <Login onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Mobile Menu Button */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 bg-white rounded-lg shadow-md text-slate-700"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Sidebar - Hidden on mobile unless toggled */}
      <div className={`${isMobileMenuOpen ? 'fixed inset-y-0 left-0 z-40 bg-white w-64 shadow-2xl' : 'hidden'} md:block md:static md:w-64 md:shadow-none`}>
        <Sidebar currentView={currentView} setCurrentView={(view) => { setCurrentView(view); setIsMobileMenuOpen(false); }} onLogout={handleLogout} />
      </div>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 overflow-x-hidden pt-16 md:pt-8">
        <div className="max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
