import React, { useState } from 'react';
import { Transaction, TransactionType, Vehicle, Investment } from '../../types/index';
import { TransactionCard } from './components/TransactionCard';
import { AddTransactionModal } from './components/AddTransactionModal';
import { PdfLoadingModal } from './components/PdfLoadingModal';
import { TransactionImportPanel } from './components/TransactionImportPanel';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Plus, Upload, Filter, Search } from 'lucide-react';
import { AddVehicleModal } from '../Vehicles/components/AddVehicleModal';
import { AddInvestmentModal } from '../Savings/components/AddInvestmentModal';
import { useTransactionStore } from '../../stores/transactionStore';
import { useAccountStore } from '../../stores/accountStore';
import { useVehicleStore } from '../../stores/vehicleStore';
import { usePdfImport } from '../../hooks/usePdfImport';

export const TransactionsPage = () => {
  const { transactions, addTransaction, addTransactionWithExt, updateTransaction, deleteTransaction, addFuelLog, addInvestment } = useTransactionStore();
  const { accounts, addAccount } = useAccountStore();
  const { vehicles, addVehicle } = useVehicleStore();

  const {
    isImporting, pdfBlob, scannedTransactions, rawAccountInfo,
    loadingStage, showLoadingModal, fileInputRef,
    handleFileUpload, handleConfirmImport, cancelImport,
  } = usePdfImport();

  const [filterSearch, setFilterSearch] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterAccount, setFilterAccount] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isAddVehicleModalOpen, setIsAddVehicleModalOpen] = useState(false);
  const [isAddInvestmentModalOpen, setIsAddInvestmentModalOpen] = useState(false);

  const handleManualAddTransaction = async (tx: any) => {
    const { metadata, ...rest } = tx;
    const cat = rest.category?.toLowerCase();

    if (cat === 'fuel' && metadata?.vehicleId) {
      await addTransactionWithExt(rest, {
        vehicleId: metadata.vehicleId,
        liters: parseFloat(metadata.liters || 0),
        mileage: metadata.odometer ? parseFloat(metadata.odometer) : undefined,
      });
    } else if ((cat === 'investment' || cat === 'savings') && metadata?.assetName) {
      await addTransactionWithExt(rest, undefined, {
        investmentType: metadata.investmentType || 'Other',
        assetName: metadata.assetName,
        quantity: metadata.units ? parseFloat(metadata.units) : undefined,
        pricePerUnit: undefined,
      });
    } else {
      const notes = rest.notes || (metadata && Object.keys(metadata).length > 0 ? `Details: ${JSON.stringify(metadata)}` : undefined);
      await addTransaction({ ...rest, notes });
    }
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(filterSearch.toLowerCase()) ||
      t.category.toLowerCase().includes(filterSearch.toLowerCase());
    const matchesAccount = filterAccount ? t.accountId === filterAccount : true;
    const matchesMonth = filterMonth ? t.date.startsWith(filterMonth) : true;
    return matchesSearch && matchesAccount && matchesMonth;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const uniqueMonths = Array.from(new Set(transactions.map(t => t.date.substring(0, 7)))).sort().reverse();

  if (isImporting && pdfBlob) {
    return (
      <TransactionImportPanel
        pdfUrl={pdfBlob}
        transactions={scannedTransactions}
        accounts={accounts}
        vehicles={vehicles}
        investments={[]}
        onConfirm={handleConfirmImport}
        onCancel={cancelImport}
        accountInfo={rawAccountInfo}
        onAddAccount={addAccount}
        onAddVehicle={addVehicle}
        onAddInvestment={(inv) => addInvestment(inv, accounts[0]?.id || '')}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in max-w-5xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Transactions</h1>
          <p className="text-slate-500 mt-1">Manage, filter, and track every expense.</p>
        </div>
        <div className="flex gap-2">
          <input type="file" ref={fileInputRef} className="hidden" accept=".pdf" onChange={handleFileUpload} />
          <Button variant="secondary" leftIcon={<Upload size={18} />} onClick={() => fileInputRef.current?.click()} isLoading={showLoadingModal}>Import PDF</Button>
          <Button variant="primary" leftIcon={<Plus size={18} />} onClick={() => setIsAddModalOpen(true)}>Add Transaction</Button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="flex-1 w-full relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="Search transactions..." value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all text-sm" />
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}
            className="w-full md:w-40 h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-primary-500 outline-none">
            <option value="">All Months</option>
            {uniqueMonths.map(month => {
              const [y, m] = month.split('-');
              const date = new Date(parseInt(y), parseInt(m) - 1);
              return <option key={month} value={month}>{date.toLocaleString('default', { month: 'long', year: 'numeric' })}</option>;
            })}
          </select>
          <select value={filterAccount} onChange={(e) => setFilterAccount(e.target.value)}
            className="w-full md:w-40 h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-primary-500 outline-none">
            <option value="">All Accounts</option>
            {accounts.map(acc => (<option key={acc.id} value={acc.id}>{acc.name}</option>))}
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {filteredTransactions.length > 0 ? (
          filteredTransactions.map(tx => (
            <TransactionCard key={tx.id} transaction={tx} accounts={accounts}
              onUpdate={(id, updates) => { const tx = transactions.find(t => t.id === id); if (tx) updateTransaction({ ...tx, ...updates }); }}
              onDelete={(id) => setDeleteId(id)}
              vehicles={vehicles} investments={[]}
              onAddVehicleClick={() => setIsAddVehicleModalOpen(true)} onAddInvestmentClick={() => setIsAddInvestmentModalOpen(true)} />
          ))
        ) : (
          <div className="text-center py-20 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <div className="mx-auto w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-3"><Filter size={24} /></div>
            <h3 className="text-slate-900 font-medium">No transactions found</h3>
            <p className="text-slate-500 text-sm">Try adjusting your filters or add a new transaction.</p>
          </div>
        )}
      </div>

      <AddTransactionModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} accounts={accounts} onSave={handleManualAddTransaction}
        vehicles={vehicles} investments={[]} onAddVehicle={() => setIsAddVehicleModalOpen(true)} onAddInvestment={() => setIsAddInvestmentModalOpen(true)} />

      <AddVehicleModal isOpen={isAddVehicleModalOpen} onClose={() => setIsAddVehicleModalOpen(false)} onSave={async (v) => { await addVehicle(v); }} />
      <AddInvestmentModal isOpen={isAddInvestmentModalOpen} onClose={() => setIsAddInvestmentModalOpen(false)} onSave={async (i) => { await addInvestment(i, accounts[0]?.id || ''); }} />

      <PdfLoadingModal isOpen={showLoadingModal} stage={loadingStage} />

      <ConfirmDialog isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { if (deleteId) { deleteTransaction(deleteId); setDeleteId(null); } }}
        title="Delete Transaction" message="Are you sure you want to delete this transaction? This action cannot be undone." />
    </div>
  );
};
