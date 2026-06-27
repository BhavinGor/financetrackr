import React, { useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { TransactionsPage } from './pages/Transactions';
import { AccountsPage } from './pages/Accounts';
import { BudgetPage } from './pages/Budget';
import { VehiclesPage } from './pages/Vehicles';
import { SavingsPage } from './pages/Savings';
import { SettingsPage } from './pages/Profile';
import { LoginPage } from './pages/Login';
import { supabase } from './services/supabase/client';
import { Loader2 } from 'lucide-react';
import { ViewState } from './types/index';
import { useAuthStore } from './stores/authStore';
import { useTransactionStore } from './stores/transactionStore';
import { useAccountStore } from './stores/accountStore';
import { useBudgetStore } from './stores/budgetStore';
import { useVehicleStore } from './stores/vehicleStore';

const App = () => {
  const [currentView, setCurrentView] = React.useState<ViewState>(() => {
    return (localStorage.getItem('financeTrackr_activeTab') as ViewState) || 'dashboard';
  });

  const { session, loading: authLoading, setSession, signOut } = useAuthStore();
  const { transactions, loading: txLoading, load: loadTransactions } = useTransactionStore();
  const { accounts, loading: accLoading, load: loadAccounts } = useAccountStore();
  const { budgets, loading: budLoading, load: loadBudgets } = useBudgetStore();
  const { vehicles, loading: vehLoading, load: loadVehicles } = useVehicleStore();

  useEffect(() => {
    localStorage.setItem('financeTrackr_activeTab', currentView);
  }, [currentView]);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (!session) return;

      await Promise.all([
        loadTransactions(),
        loadAccounts(),
        loadVehicles(),
      ]);
      await loadBudgets(transactions);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        init();
      } else {
        useTransactionStore.setState({ transactions: [], fuelLogs: [], investments: [] });
        useAccountStore.setState({ accounts: [] });
        useVehicleStore.setState({ vehicles: [] });
        useBudgetStore.setState({ budgets: [] });
      }
    });

    return () => { subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (transactions.length > 0 && budgets.length > 0) {
      loadBudgets(transactions);
    }
  }, [transactions]);

  const loading = authLoading || txLoading || accLoading || budLoading || vehLoading;

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

  if (!session) {
    return <LoginPage />;
  }

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard accounts={accounts} transactions={transactions} budgets={budgets} onSyncGmail={async () => {}} />;
      case 'transactions':
        return <TransactionsPage />;
      case 'accounts':
        return <AccountsPage />;
      case 'vehicles':
        return <VehiclesPage />;
      case 'budget':
        return <BudgetPage />;
      case 'savings':
        return <SavingsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <Dashboard accounts={accounts} transactions={transactions} budgets={budgets} onSyncGmail={async () => {}} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} onLogout={signOut} />
      <main className="flex-1 overflow-auto">
        <div className="p-4 md:p-8 md:pt-10 max-w-7xl mx-auto min-h-full">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
