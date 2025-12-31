import React, { useState, useRef } from 'react';
import { Transaction, Account, TransactionType, Vehicle, Investment, FuelLog } from '../../types/index';
import { TransactionCard } from './components/TransactionCard';
import { AddTransactionModal } from './components/AddTransactionModal';
import { PdfLoadingModal } from './components/PdfLoadingModal';
import { TransactionImportPanel } from './components/TransactionImportPanel';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Plus, Upload, Filter, Search } from 'lucide-react';
import { parsePdfFile } from '../../services/external/pdf';

import { AddVehicleModal } from '../Vehicles/components/AddVehicleModal';
import { AddInvestmentModal } from '../Savings/components/AddInvestmentModal';

interface TransactionsPageProps {
    transactions: Transaction[];
    accounts: Account[];
    onAddTransaction: (tx: Transaction) => void;
    onBulkAddTransactions: (txs: Transaction[]) => void;
    onUpdateTransaction: (tx: Transaction) => void;
    onDeleteTransaction: (id: string) => void;
    onAddAccount: (account: Account) => Promise<Account>;
    // Data & Handlers for Extras
    vehicles: any[];
    investments: any[];
    onAddFuelLog: (log: any) => void;
    onUpdateInvestment: (inv: any) => void;
    // New handlers
    onAddVehicle: (vehicle: Vehicle) => void;
    onAddInvestment: (investment: Investment) => void;
}

export const TransactionsPage = (props: TransactionsPageProps) => {
    const {
        transactions,
        accounts,
        onAddTransaction,
        onBulkAddTransactions,
        onUpdateTransaction,
        onDeleteTransaction,
        onAddAccount,
        vehicles,
        investments,
        onAddFuelLog,
        onUpdateInvestment,
        onAddVehicle,
        onAddInvestment
    } = props;
    // State
    const [filterSearch, setFilterSearch] = useState('');
    const [filterMonth, setFilterMonth] = useState('');
    const [filterAccount, setFilterAccount] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    // PDF Import State
    const [isImporting, setIsImporting] = useState(false);
    const [pdfBlob, setPdfBlob] = useState<string | null>(null);
    const [scannedTransactions, setScannedTransactions] = useState<any[]>([]);
    const [rawAccountInfo, setRawAccountInfo] = useState<any>(null);
    const [loadingStage, setLoadingStage] = useState<'uploading' | 'parsing' | 'ai_analysis' | 'complete'>('uploading');
    const [showLoadingModal, setShowLoadingModal] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- Handlers ---

    // Helper to normalize date to YYYY-MM-DD
    const normalizeDate = (dateStr: string): string => {
        if (!dateStr) return new Date().toISOString().split('T')[0];
        // Handle DD-MM-YYYY or DD/MM/YYYY
        if (dateStr.match(/^\d{2}[-/]\d{2}[-/]\d{4}$/)) {
            const [d, m, y] = dateStr.split(/[-/]/);
            return `${y}-${m}-${d}`;
        }
        return dateStr;
    };

    const processSideEffects = (tx: any) => {
        if (!tx.metadata) return;

        // Handle Fuel
        if (tx.metadata.vehicleId && onAddFuelLog) {
            const fuelLog = {
                id: crypto.randomUUID(), // Ensure ID is generated
                date: tx.date,
                vehicleId: tx.metadata.vehicleId,
                odometer: parseFloat(tx.metadata.odometer || '0'),
                liters: parseFloat(tx.metadata.liters || '0'),
                cost: tx.amount, // Total cost from transaction
                mileage: parseFloat(tx.metadata.odometer || '0') // Keeping mileage same as odometer for now, or calculate diff if needed
            };
            // Calculate rate if needed, but FuelLog type usually just needs cost/liters
            onAddFuelLog(fuelLog);
        }

        // Handle Investments
        if (tx.metadata.investmentId && onUpdateInvestment) {
            const inv = investments.find(i => i.id === tx.metadata.investmentId);
            if (inv) {
                const units = parseFloat(tx.metadata.units || '0');
                const price = parseFloat(tx.metadata.price || '0');

                // Calculate added value: strictly units * price if available, else just transaction amount
                const addedValue = (units > 0 && price > 0) ? (units * price) : tx.amount;

                onUpdateInvestment({
                    ...inv,
                    investedAmount: (inv.investedAmount || 0) + addedValue,
                    currentValue: (inv.currentValue || 0) + addedValue, // naive update, ideally should fetch current price
                    quantity: (inv.quantity || 0) + units
                });
            }
        }
    };

    const handleConfirmImport = async (txs: any[]) => {
        // 1. Process Side Effects & Clean Transactions
        const cleanedTxs = txs.map(tx => {
            // Process side effects for each transaction
            processSideEffects(tx);

            const { metadata, id, ...rest } = tx; // remove metadata and temp id
            return {
                ...rest,
                // Check for ANY temporary ID prefix we might have used
                id: (typeof id === 'string' && (id.startsWith('pdf_') || id.startsWith('import_'))) ? crypto.randomUUID() : id,
                notes: tx.metadata ? JSON.stringify(tx.metadata) : rest.notes
            };
        });

        onBulkAddTransactions(cleanedTxs);
        setIsImporting(false);
        setPdfBlob(null);
    };

    const handleManualAddTransaction = async (tx: any) => {
        // Process side effects
        processSideEffects(tx);

        // Clean and Save
        const { metadata, ...rest } = tx;
        /* 
           Preserve metadata in notes if needed, 
           or just keep it in DB if we expand schema. 
           For now, stash in notes for reference 
        */
        const textNotes = metadata ? `Details: ${JSON.stringify(metadata)}` : undefined;

        onAddTransaction({
            ...rest,
            notes: rest.notes || textNotes
        });
    };

    // Helper function to check if file is PDF
    const isPdfFile = (file: File): boolean => {
        return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!isPdfFile(file)) {
            alert('Please upload a valid PDF file.');
            return;
        }

        const url = URL.createObjectURL(file);
        setPdfBlob(url);
        setShowLoadingModal(true);
        setLoadingStage('uploading');

        // Simulate "Uploading" delay for better UX
        await new Promise(r => setTimeout(r, 1000));
        setLoadingStage('parsing');

        try {
            // Call Backend API
            const response = await parsePdfFile(file);

            setLoadingStage('ai_analysis');
            await new Promise(r => setTimeout(r, 1500)); // Simulate analysis time if backend is too fast

            if (response && response.success && response.data) {
                const { transactions: rawTxs, accountInfo, extractionQuality } = response.data;

                // 1. Process Accounts (Primary + Linked)
                const parsedAccounts = [];

                // Primary Account
                if (accountInfo) {
                    const last4 = accountInfo.accountNumber ? accountInfo.accountNumber.slice(-4) : 'XXXX';
                    parsedAccounts.push({
                        name: `${accountInfo.bankName || 'Bank'} - ${last4} `,
                        bankName: accountInfo.bankName || 'Unknown Bank',
                        accountNumber: accountInfo.accountNumber,
                        balance: accountInfo.closingBalance || accountInfo.primaryBalance || '0', // Use closing if available
                        type: 'Savings', // Default assumption
                        isPrimary: true
                    });

                    // Linked Accounts
                    if (accountInfo.linkedAccounts && Array.isArray(accountInfo.linkedAccounts)) {
                        accountInfo.linkedAccounts.forEach((acc: any) => {
                            const lLast4 = acc.accountNumber ? acc.accountNumber.slice(-4) : 'XXXX';
                            parsedAccounts.push({
                                name: `${acc.name || 'Linked Account'} - ${lLast4} `,
                                bankName: accountInfo.bankName, // Usually same bank for PPF etc/ or generic
                                accountNumber: acc.accountNumber,
                                balance: acc.balance || '0',
                                type: acc.name?.includes('PPF') ? 'Investment' : 'Savings',
                                isLinked: true
                            });
                        });
                    }
                }

                // 2. Map Transactions
                const mappedTxs = Array.isArray(rawTxs) ? rawTxs.map((tx: any, index: number) => {
                    // Smart Type Mapping
                    let type = TransactionType.EXPENSE;
                    const rawType = tx.type?.toLowerCase() || '';
                    if (rawType.includes('deposit') || rawType.includes('credit')) {
                        type = TransactionType.INCOME;
                    }

                    return {
                        id: `import_${Date.now()}_${index}`,
                        date: normalizeDate(tx.date),
                        description: tx.description,
                        amount: typeof tx.amount === 'string' ? parseFloat(tx.amount.replace(/,/g, '')) : tx.amount,
                        type: type,
                        category: tx.category || 'Other',
                        accountId: accounts[0]?.id || '' // Default to first existing, or let user pick
                    };
                }) : [];

                setScannedTransactions(mappedTxs);
                // Pass enhanced account info + parsed list to panel
                setRawAccountInfo({
                    ...accountInfo,
                    parsedAccounts, // New field to pass structured accounts
                    extractionQuality
                });
                setLoadingStage('complete');

                // Small delay to show completion
                setTimeout(() => {
                    setShowLoadingModal(false);
                    setIsImporting(true);
                }, 500);

            } else {
                console.warn("PDF parsed but no data found", response);
                throw new Error("No data found in PDF");
            }

        } catch (error) {
            console.error("PDF Process Error", error);
            alert("Failed to process PDF. Please check the file and try again.");
            setPdfBlob(null);
            setShowLoadingModal(false);
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // Handlers for individual cards
    const handleUpdateTx = (id: string, updates: Partial<Transaction>) => {
        const tx = transactions.find(t => t.id === id);
        if (tx) {
            onUpdateTransaction({ ...tx, ...updates });
        }
    };

    // Filter Logic
    const filteredTransactions = transactions.filter(t => {
        const matchesSearch = t.description.toLowerCase().includes(filterSearch.toLowerCase()) ||
            t.category.toLowerCase().includes(filterSearch.toLowerCase());
        const matchesAccount = filterAccount ? t.accountId === filterAccount : true;
        const matchesMonth = filterMonth ? t.date.startsWith(filterMonth) : true;
        return matchesSearch && matchesAccount && matchesMonth;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (isImporting && pdfBlob) {
        return (
            <TransactionImportPanel
                pdfUrl={pdfBlob}
                transactions={scannedTransactions}
                accounts={accounts}
                vehicles={vehicles}
                investments={investments}
                onConfirm={handleConfirmImport}
                onCancel={() => {
                    setIsImporting(false);
                    setPdfBlob(null);
                }}
                accountInfo={rawAccountInfo}
                onAddAccount={onAddAccount}
            />
        );
    }

    const [isAddVehicleModalOpen, setIsAddVehicleModalOpen] = useState(false);
    const [isAddInvestmentModalOpen, setIsAddInvestmentModalOpen] = useState(false);

    // Dynamic Filters Logic
    const uniqueMonths = Array.from(new Set(transactions.map(t => t.date.substring(0, 7)))).sort().reverse();

    return (
        <div className="space-y-6 animate-in fade-in max-w-5xl mx-auto pb-20">

            {/* Header & Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Transactions</h1>
                    <p className="text-slate-500 mt-1">Manage, filter, and track every expense.</p>
                </div>
                <div className="flex gap-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".pdf"
                        onChange={handleFileUpload}
                    />
                    <Button
                        variant="secondary"
                        leftIcon={<Upload size={18} />}
                        onClick={() => fileInputRef.current?.click()}
                        isLoading={showLoadingModal}
                    >
                        Import PDF
                    </Button>
                    <Button
                        variant="primary"
                        leftIcon={<Plus size={18} />}
                        onClick={() => setIsAddModalOpen(true)}
                    >
                        Add Transaction
                    </Button>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                <div className="flex-1 w-full relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search transactions..."
                        value={filterSearch}
                        onChange={(e) => setFilterSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all text-sm"
                    />
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <select
                        value={filterMonth}
                        onChange={(e) => setFilterMonth(e.target.value)}
                        className="w-full md:w-40 h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                    >
                        <option value="">All Months</option>
                        {uniqueMonths.map(month => {
                            const [y, m] = month.split('-');
                            const date = new Date(parseInt(y), parseInt(m) - 1);
                            return <option key={month} value={month}>{date.toLocaleString('default', { month: 'long', year: 'numeric' })}</option>;
                        })}
                    </select>

                    <select
                        value={filterAccount}
                        onChange={(e) => setFilterAccount(e.target.value)}
                        className="w-full md:w-40 h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                    >
                        <option value="">All Accounts</option>
                        {accounts.map(acc => (
                            <option key={acc.id} value={acc.id}>
                                {acc.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Transactions List Grid */}
            <div className="space-y-3">
                {filteredTransactions.length > 0 ? (
                    filteredTransactions.map(tx => (
                        <TransactionCard
                            key={tx.id}
                            transaction={tx}
                            accounts={accounts}
                            onUpdate={handleUpdateTx}
                            onDelete={(id) => setDeleteId(id)}
                            vehicles={vehicles}
                            investments={investments}
                            onAddVehicleClick={() => setIsAddVehicleModalOpen(true)}
                            onAddInvestmentClick={() => setIsAddInvestmentModalOpen(true)}
                        />
                    ))
                ) : (
                    <div className="text-center py-20 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <div className="mx-auto w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-3">
                            <Filter size={24} />
                        </div>
                        <h3 className="text-slate-900 font-medium">No transactions found</h3>
                        <p className="text-slate-500 text-sm">Try adjusting your filters or add a new transaction.</p>
                    </div>
                )}
            </div>

            <AddTransactionModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                accounts={accounts}
                onSave={handleManualAddTransaction}
                // Add extras for modal too if we update it to support them
                vehicles={vehicles}
                investments={investments}
                onAddVehicle={() => setIsAddVehicleModalOpen(true)}
                onAddInvestment={() => setIsAddInvestmentModalOpen(true)}
            />

            {/* Integration Modals */}
            <AddVehicleModal
                isOpen={isAddVehicleModalOpen}
                onClose={() => setIsAddVehicleModalOpen(false)}
                onSave={async (v) => {
                    // We assume onAddVehicle prop is passed to page but based on App.tsx it's passed as vehicle prop? 
                    // No wait, TransactionsPageProps has onAddFuelLog but NOT onAddVehicle handler in the signature?
                    // Ah, we need to add onAddVehicle and onAddInvestment to Page Props first.
                    // Assuming they will be added, using them here.
                    // @ts-ignore
                    props.onAddVehicle?.(v);
                }}
            />
            <AddInvestmentModal
                isOpen={isAddInvestmentModalOpen}
                onClose={() => setIsAddInvestmentModalOpen(false)}
                onSave={async (i) => {
                    // @ts-ignore
                    props.onAddInvestment?.(i);
                }}
            />

            <PdfLoadingModal
                isOpen={showLoadingModal}
                stage={loadingStage}
            />

            <ConfirmDialog
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={() => {
                    if (deleteId) {
                        onDeleteTransaction(deleteId);
                        setDeleteId(null);
                    }
                }}
                title="Delete Transaction"
                message="Are you sure you want to delete this transaction? This action cannot be undone."
            />
        </div>
    );
};
