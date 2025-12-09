import React, { useState, useEffect } from 'react';
import { X, Check, Trash2, FileText } from 'lucide-react';
import { TransactionType, Account, AccountType } from '../types';
import { getCustomCategories, getCustomCategoriesSync, saveCustomCategory, DEFAULT_CATEGORIES } from '../services/categoryStorage';

interface PdfImportModalProps {
    isOpen: boolean;
    extractedData: any;
    pdfBlob?: Blob; // Add PDF blob for preview
    accounts: Account[];
    onAddAccount?: (account: any) => void;
    onConfirm: (transactions: any[], createAccount?: any) => void;
    onCancel: () => void;
}

// All available transaction categories and types
const TRANSACTION_CATEGORIES = DEFAULT_CATEGORIES;

const TRANSACTION_TYPES = ['Income', 'Expense', 'Savings', 'Self Transfer'];

export const PdfImportModal: React.FC<PdfImportModalProps> = ({
    isOpen,
    extractedData,
    pdfBlob,
    accounts,
    onAddAccount,
    onConfirm,
    onCancel,
}) => {
    const [editedTransactions, setEditedTransactions] = useState<any[]>([]);
    const [transactionAccounts, setTransactionAccounts] = useState<Map<number, string>>(new Map());
    const [transactionCategories, setTransactionCategories] = useState<Map<number, string>>(new Map());
    const [createNewAccounts, setCreateNewAccounts] = useState<Set<string>>(new Set());
    const [customCategories, setCustomCategories] = useState<Set<string>>(() => getCustomCategoriesSync());
    const [pendingAccountToAdd, setPendingAccountToAdd] = useState<{ index: number, account: any } | null>(null);
    const [showAddAccountDialog, setShowAddAccountDialog] = useState(false);
    const [customCategoryInput, setCustomCategoryInput] = useState<{ index: number, value: string } | null>(null);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [pdfWidth, setPdfWidth] = useState<number>(400);
    const [showPdfViewer, setShowPdfViewer] = useState(true);

    // Merge existing accounts with detected accounts
    const getAvailableAccounts = (): Account[] => {
        const existingAccountIds = new Set(accounts.map(a => a.id));
        const detectedAccounts: Account[] = [];

        // Add primary account from detection
        if (extractedData?.accountInfo?.bankName && !accounts.some(a => a.bankName === extractedData.accountInfo.bankName)) {
            detectedAccounts.push({
                id: `detected-primary-${extractedData.accountInfo.accountNumber || 'primary'}`,
                name: extractedData.accountInfo.bankName,
                type: AccountType.CHECKING,
                bankName: extractedData.accountInfo.bankName,
                balance: 0,
                currency: 'INR'
            });
        }

        // Add linked accounts from detection
        if (extractedData?.accountInfo?.linkedAccounts) {
            for (const linked of extractedData.accountInfo.linkedAccounts) {
                if (!accounts.some(a => a.bankName === linked.name)) {
                    detectedAccounts.push({
                        id: `detected-linked-${linked.accountNumber}`,
                        name: linked.name,
                        type: linked.name?.includes('PPF') ? AccountType.INVESTMENT : AccountType.SAVINGS,
                        bankName: extractedData.accountInfo.bankName,
                        balance: 0,
                        currency: 'INR'
                    });
                }
            }
        }

        return [...accounts, ...detectedAccounts];
    };

    // Format date from backend format (dd/mm/yyyy or yyyy-MM-dd) to input format (yyyy-MM-dd)
    const formatDateForInput = (dateStr: string): string => {
        if (!dateStr) return '';

        // If already in yyyy-MM-dd format, return as-is
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;

        // If in dd/mm/yyyy format, convert to yyyy-MM-dd
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
            const [day, month, year] = dateStr.split('/');
            return `${year}-${month}-${day}`;
        }

        // If in dd-MM-yyyy format, convert to yyyy-MM-dd
        if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
            const [day, month, year] = dateStr.split('-');
            return `${year}-${month}-${day}`;
        }

        // If in other format, try to parse and convert
        try {
            const date = new Date(dateStr);
            if (!Number.isNaN(date.getTime())) {
                return date.toISOString().split('T')[0];
            }
        } catch {
            // If parsing fails, return original
        }

        return dateStr;
    };

    // Create PDF URL from blob
    useEffect(() => {
        if (pdfBlob) {
            const url = URL.createObjectURL(pdfBlob);
            setPdfUrl(url);
            return () => URL.revokeObjectURL(url);
        }
    }, [pdfBlob]);

    // Load custom categories from database
    useEffect(() => {
        const loadCategories = async () => {
            try {
                const categories = await getCustomCategories();
                setCustomCategories(categories);
            } catch (error) {
                console.error('Failed to load custom categories:', error);
            }
        };
        loadCategories();
    }, []);

    // Initialize transactions with default categories and accounts
    useEffect(() => {
        if (extractedData?.transactions) {
            setEditedTransactions(extractedData.transactions);

            // Initialize default account to first available account
            const allAccounts = getAvailableAccounts();
            const newMap = new Map<number, string>();
            if (allAccounts.length > 0) {
                extractedData.transactions.forEach((_: any, i: number) => {
                    newMap.set(i, allAccounts[0].id);
                });
            }
            setTransactionAccounts(newMap);

            // Initialize default categories
            const catMap = new Map<number, string>();
            extractedData.transactions.forEach((_: any, i: number) => {
                catMap.set(i, 'Other');
            });
            setTransactionCategories(catMap);
        }
    }, [extractedData, accounts]);

    if (!isOpen || !extractedData) return null;

    const { accountInfo, statementPeriod, summary } = extractedData;
    const availableAccounts = getAvailableAccounts();

    // Handle confirm - import all transactions
    const handleConfirm = () => {
        const transactionsToImport = editedTransactions.map((t: any, idx: number) => {
            const txAccountId = transactionAccounts.get(idx);
            const txCategory = transactionCategories.get(idx) || 'Other';

            // Determine transaction type from the extracted type field
            let txType = TransactionType.EXPENSE;
            if (t.type?.toLowerCase().includes('deposit') ||
                t.type?.toLowerCase().includes('credit') ||
                t.type?.toLowerCase().includes('income') ||
                t.type?.toLowerCase().includes('salary')) {
                txType = TransactionType.INCOME;
            }

            // Parse amount - handle both string and number types
            let parsedAmount = 0;
            if (typeof t.amount === 'string') {
                parsedAmount = Number.parseFloat(t.amount.replaceAll(',', '')) || 0;
            } else if (typeof t.amount === 'number') {
                parsedAmount = t.amount;
            }

            // Get account name for this transaction
            const selectedAccount = availableAccounts.find(a => a.id === txAccountId);
            const accountName = selectedAccount?.name || '';

            return {
                date: t.date,
                type: txType,
                category: txCategory,
                amount: parsedAmount,
                description: t.description,
                accountId: txAccountId || '',
                accountName: accountName  // Pass account name for mapping
            };
        });

        if (transactionsToImport.length === 0) {
            alert('Please add at least one transaction to import.');
            return;
        }

        // Create accounts for linked accounts if checked
        const accountsToCreate = [];
        const usedDetectedAccountIds = new Set<string>();

        // Collect all detected account IDs used in transactions
        editedTransactions.forEach((_, idx) => {
            const accountId = transactionAccounts.get(idx);
            if (accountId?.includes('detected')) {
                usedDetectedAccountIds.add(accountId);
            }
        });

        // Create actual accounts for any used detected accounts
        const allAvailableAccounts = getAvailableAccounts();
        for (const detectedId of usedDetectedAccountIds) {
            const detectedAccount = allAvailableAccounts.find(a => a.id === detectedId);
            // Only create if it doesn't already exist AND it's not the primary account we're about to create
            if (detectedAccount && !accounts.some(a => a.id === detectedId)) {
                // Check if this is the same as the primary account
                const isPrimaryAccount = createNewAccounts.has('primary') &&
                    detectedAccount.bankName === accountInfo?.bankName;

                if (!isPrimaryAccount) {
                    accountsToCreate.push({
                        name: detectedAccount.name,
                        type: detectedAccount.type,
                        bankName: detectedAccount.bankName,
                        balance: detectedAccount.balance
                    });
                }
            }
        }

        // Primary account
        if (createNewAccounts.has('primary') && accountInfo?.bankName) {
            const primaryBalance = accountInfo.primaryBalance ?
                Number.parseFloat(accountInfo.primaryBalance.replaceAll(',', '')) :
                (summary?.closingBalance ? Number.parseFloat(summary.closingBalance) : 0);

            accountsToCreate.push({
                name: `${accountInfo.bankName}`,
                type: 'Savings',
                bankName: accountInfo.bankName || 'Unknown',
                accountNumber: accountInfo.accountNumber,
                balance: primaryBalance
            });
        }

        // Linked accounts
        if (accountInfo?.linkedAccounts && Array.isArray(accountInfo.linkedAccounts)) {
            for (const linked of accountInfo.linkedAccounts) {
                if (createNewAccounts.has(linked.accountNumber)) {
                    accountsToCreate.push({
                        name: `${linked.name}`,
                        type: linked.name?.includes('PPF') ? 'Investment' : 'Savings',
                        bankName: accountInfo.bankName || 'Unknown',
                        accountNumber: linked.accountNumber,
                        balance: linked.balance ? Number.parseFloat(linked.balance.replaceAll(',', '')) : 0
                    });
                }
            }
        }

        onConfirm(transactionsToImport, accountsToCreate.length > 0 ? accountsToCreate : undefined);
    };

    // Add detected account as real account
    const handleAddDetectedAccount = (detectedAccount: Account) => {
        if (onAddAccount) {
            onAddAccount(detectedAccount);
            // Update transaction assignments to use the new account
            const newMap = new Map(transactionAccounts);
            newMap.forEach((accountId, idx) => {
                if (accountId === detectedAccount.id) {
                    newMap.set(idx, detectedAccount.id);
                }
            });
            setTransactionAccounts(newMap);
        }
        setShowAddAccountDialog(false);
        setPendingAccountToAdd(null);
    };

    // Delete transaction
    const deleteTransaction = (index: number) => {
        setEditedTransactions(prev => prev.filter((_: any, i: number) => i !== index));
    };

    // Add new transaction
    const addNewTransaction = () => {
        const newTransaction = {
            date: new Date().toISOString().split('T')[0],
            description: '',
            amount: 0,
            type: 'expense'
        };
        setEditedTransactions(prev => [...prev, newTransaction]);

        // Auto-assign to first available account
        const allAccounts = getAvailableAccounts();
        if (allAccounts.length > 0) {
            const newMap = new Map(transactionAccounts);
            newMap.set(editedTransactions.length, allAccounts[0].id);
            setTransactionAccounts(newMap);
        }

        // Set default category
        const newMap = new Map(transactionCategories);
        newMap.set(editedTransactions.length, 'Other');
        setTransactionCategories(newMap);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-1">
            <div className="bg-white rounded-xl shadow-2xl w-[98vw] h-[98vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50 flex-shrink-0">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                            ✓ PDF Import Preview
                        </h2>
                        <p className="text-sm text-slate-600 mt-1">
                            Review transactions and confirm before importing to your account
                        </p>
                    </div>
                    <button
                        onClick={onCancel}
                        className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-auto flex gap-3 p-4">
                    {/* Left: PDF Viewer with Resize Controls */}
                    {pdfUrl && showPdfViewer && (
                        <div
                            style={{ width: `${pdfWidth}px` }}
                            className="border border-slate-200 rounded-lg overflow-hidden bg-slate-100 flex flex-col flex-shrink-0 group relative"
                        >
                            {/* PDF Header with Controls */}
                            <div className="bg-slate-700 text-white px-3 py-2 flex items-center justify-between text-sm flex-shrink-0">
                                <div className="flex items-center gap-2 font-medium text-sm">
                                    <FileText size={16} />
                                    Bank Statement
                                </div>
                                <button
                                    onClick={() => setShowPdfViewer(false)}
                                    className="p-1 hover:bg-slate-600 rounded transition-colors"
                                    title="Hide PDF"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                            {/* PDF Viewer */}
                            <div className="flex-1 overflow-auto bg-slate-100">
                                <iframe
                                    src={pdfUrl}
                                    className="w-full h-full border-none"
                                    title="PDF Preview"
                                />
                            </div>
                            {/* Resize Handle */}
                            <button
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    const startX = e.clientX;
                                    const startWidth = pdfWidth;

                                    const handleMouseMove = (moveEvent: MouseEvent) => {
                                        const delta = moveEvent.clientX - startX;
                                        setPdfWidth(Math.max(300, Math.min(800, startWidth + delta)));
                                    };

                                    const handleMouseUp = () => {
                                        document.removeEventListener('mousemove', handleMouseMove);
                                        document.removeEventListener('mouseup', handleMouseUp);
                                    };

                                    document.addEventListener('mousemove', handleMouseMove);
                                    document.addEventListener('mouseup', handleMouseUp);
                                }}
                                className="h-1 bg-slate-400 hover:bg-blue-500 cursor-col-resize transition-colors w-full"
                                title="Drag to resize PDF viewer"
                            />
                        </div>
                    )}

                    {/* Toggle PDF Button when hidden */}
                    {pdfUrl && !showPdfViewer && (
                        <button
                            onClick={() => setShowPdfViewer(true)}
                            className="px-3 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium whitespace-nowrap h-fit"
                            title="Show PDF"
                        >
                            📄 Show PDF
                        </button>
                    )}

                    {/* Right: Data & Transactions */}
                    <div className="flex-1 min-w-0">
                        {/* Account Info Section */}
                        <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <p className="text-xs text-blue-600 font-medium uppercase">Bank Name</p>
                                    <p className="font-semibold text-slate-800 text-sm">
                                        {accountInfo?.bankName || 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-blue-600 font-medium uppercase">Account</p>
                                    <p className="font-semibold text-slate-800 text-sm">
                                        {accountInfo?.accountNumber ? `****${accountInfo.accountNumber.slice(-4)}` : 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-blue-600 font-medium uppercase">Period</p>
                                    <p className="font-semibold text-slate-800 text-sm">
                                        {statementPeriod || 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-blue-600 font-medium uppercase">Status</p>
                                    <p className="font-semibold text-slate-800 text-sm capitalize">
                                        ✓ Ready
                                    </p>
                                </div>
                            </div>

                            {/* Create Account Options */}
                            {accountInfo?.bankName && (
                                <div className="mt-4 pt-4 border-t border-blue-100 space-y-3 bg-white/50 p-3 rounded">
                                    {/* Primary Account */}
                                    {!accounts.some(a => a.bankName === accountInfo.bankName) && (
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                id="createPrimaryAccount"
                                                checked={createNewAccounts.has('primary')}
                                                onChange={(e) => {
                                                    const newSet = new Set(createNewAccounts);
                                                    if (e.target.checked) {
                                                        newSet.add('primary');
                                                    } else {
                                                        newSet.delete('primary');
                                                    }
                                                    setCreateNewAccounts(newSet);
                                                }}
                                                className="w-4 h-4 rounded cursor-pointer"
                                            />
                                            <label htmlFor="createPrimaryAccount" className="text-sm text-slate-700 cursor-pointer flex-1">
                                                <span className="font-medium">Create account:</span> {accountInfo.bankName} (****{accountInfo.accountNumber?.slice(-4)})
                                            </label>
                                        </div>
                                    )}

                                    {/* Linked Accounts */}
                                    {accountInfo?.linkedAccounts && Array.isArray(accountInfo.linkedAccounts) && (
                                        <div className="space-y-2 ml-4">
                                            {accountInfo.linkedAccounts.map((linked: any) => (
                                                <div key={linked.accountNumber} className="flex items-center gap-3">
                                                    <input
                                                        type="checkbox"
                                                        id={`createLinkedAccount-${linked.accountNumber}`}
                                                        checked={createNewAccounts.has(linked.accountNumber)}
                                                        onChange={(e) => {
                                                            const newSet = new Set(createNewAccounts);
                                                            if (e.target.checked) {
                                                                newSet.add(linked.accountNumber);
                                                            } else {
                                                                newSet.delete(linked.accountNumber);
                                                            }
                                                            setCreateNewAccounts(newSet);
                                                        }}
                                                        className="w-4 h-4 rounded cursor-pointer"
                                                    />
                                                    <label htmlFor={`createLinkedAccount-${linked.accountNumber}`} className="text-sm text-slate-600 cursor-pointer flex-1">
                                                        {linked.name} (****{linked.accountNumber?.slice(-4)}) - Balance: ₹{linked.balance}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Transactions List */}
                        <div className="border border-slate-200 rounded-lg overflow-hidden flex flex-col flex-1">
                            <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
                                <h3 className="font-semibold text-slate-800">
                                    Transactions ({editedTransactions.length})
                                </h3>
                                <button
                                    onClick={addNewTransaction}
                                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 transition-colors"
                                    title="Add a new transaction"
                                >
                                    + Add Transaction
                                </button>
                            </div>

                            <div className="overflow-auto flex-1">
                                {editedTransactions.length === 0 ? (
                                    <div className="p-8 text-center text-slate-500">
                                        No transactions found
                                    </div>
                                ) : (
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-100 sticky top-0">
                                            <tr>
                                                <th className="px-3 py-2 text-left font-medium text-slate-700">Date</th>
                                                <th className="px-3 py-2 text-left font-medium text-slate-700">Description</th>
                                                <th className="px-3 py-2 text-right font-medium text-slate-700">Amount</th>
                                                <th className="px-3 py-2 text-center font-medium text-slate-700">Type</th>
                                                <th className="px-3 py-2 text-center font-medium text-slate-700">Category</th>
                                                <th className="px-3 py-2 text-center font-medium text-slate-700">Account</th>
                                                <th className="w-12 px-3 py-2 text-center font-medium text-slate-700">Delete</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200">
                                            {editedTransactions.map((tx: any, idx: number) => {
                                                const currentCustomCat = customCategoryInput?.index === idx ? customCategoryInput.value : '';

                                                return (
                                                    <tr key={`tx-${accountInfo?.accountNumber || 'default'}-${idx}`} className="hover:bg-slate-50">
                                                        {/* Date */}
                                                        <td className="px-3 py-2 font-medium text-slate-800">
                                                            <input
                                                                type="date"
                                                                value={formatDateForInput(tx.date) || ''}
                                                                onChange={(e) => {
                                                                    const updated = [...editedTransactions];
                                                                    updated[idx] = { ...tx, date: e.target.value };
                                                                    setEditedTransactions(updated);
                                                                }}
                                                                className="px-2 py-1 border border-slate-300 rounded w-full text-sm"
                                                            />
                                                        </td>

                                                        {/* Description */}
                                                        <td className="px-3 py-2 text-slate-700">
                                                            <input
                                                                type="text"
                                                                value={tx.description || ''}
                                                                onChange={(e) => {
                                                                    const updated = [...editedTransactions];
                                                                    updated[idx] = { ...tx, description: e.target.value };
                                                                    setEditedTransactions(updated);
                                                                }}
                                                                className="px-2 py-1 border border-slate-300 rounded w-full text-sm"
                                                                maxLength={100}
                                                            />
                                                        </td>

                                                        {/* Amount */}
                                                        <td className="px-3 py-2 text-right font-semibold text-slate-800">
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                value={tx.amount || ''}
                                                                onChange={(e) => {
                                                                    const updated = [...editedTransactions];
                                                                    updated[idx] = { ...tx, amount: e.target.value };
                                                                    setEditedTransactions(updated);
                                                                }}
                                                                className="px-2 py-1 border border-slate-300 rounded w-full text-right text-sm"
                                                            />
                                                        </td>

                                                        {/* Type */}
                                                        <td className="px-3 py-2 text-center">
                                                            <select
                                                                value={tx.type || 'expense'}
                                                                onChange={(e) => {
                                                                    const updated = [...editedTransactions];
                                                                    updated[idx] = { ...tx, type: e.target.value };
                                                                    setEditedTransactions(updated);
                                                                }}
                                                                className="px-2 py-1 border border-slate-300 rounded w-full text-sm"
                                                            >
                                                                <option value="expense">Withdrawal</option>
                                                                <option value="income">Deposit</option>
                                                            </select>
                                                        </td>

                                                        {/* Category - with custom input */}
                                                        <td className="px-3 py-2 text-center">
                                                            {customCategoryInput?.index === idx ? (
                                                                <div className="flex gap-1">
                                                                    <input
                                                                        type="text"
                                                                        value={currentCustomCat}
                                                                        onChange={(e) => setCustomCategoryInput({ index: idx, value: e.target.value })}
                                                                        placeholder="New category..."
                                                                        className="px-2 py-1 border border-blue-300 rounded flex-1 text-sm bg-blue-50"
                                                                        autoFocus
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter' && currentCustomCat.trim()) {
                                                                                const newCats = new Map(transactionCategories);
                                                                                newCats.set(idx, currentCustomCat.trim());
                                                                                setTransactionCategories(newCats);
                                                                                // Add to custom categories list and save to localStorage
                                                                                saveCustomCategory(currentCustomCat.trim());
                                                                                const newCustom = new Set(customCategories);
                                                                                newCustom.add(currentCustomCat.trim());
                                                                                setCustomCategories(newCustom);
                                                                                setCustomCategoryInput(null);
                                                                            } else if (e.key === 'Escape') {
                                                                                setCustomCategoryInput(null);
                                                                            }
                                                                        }}
                                                                        onBlur={() => {
                                                                            if (currentCustomCat.trim()) {
                                                                                const newCats = new Map(transactionCategories);
                                                                                newCats.set(idx, currentCustomCat.trim());
                                                                                setTransactionCategories(newCats);
                                                                                // Add to custom categories list and save to localStorage
                                                                                saveCustomCategory(currentCustomCat.trim());
                                                                                const newCustom = new Set(customCategories);
                                                                                newCustom.add(currentCustomCat.trim());
                                                                                setCustomCategories(newCustom);
                                                                            }
                                                                            setCustomCategoryInput(null);
                                                                        }}
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center justify-between gap-1">
                                                                    <select
                                                                        value={transactionCategories.get(idx) || 'Other'}
                                                                        onChange={(e) => {
                                                                            if (e.target.value === '__custom__') {
                                                                                setCustomCategoryInput({ index: idx, value: '' });
                                                                            } else {
                                                                                const newCats = new Map(transactionCategories);
                                                                                newCats.set(idx, e.target.value);
                                                                                setTransactionCategories(newCats);
                                                                            }
                                                                        }}
                                                                        className="px-2 py-1 border border-slate-300 rounded text-sm flex-1"
                                                                    >
                                                                        {TRANSACTION_CATEGORIES.map((cat) => (
                                                                            <option key={cat} value={cat}>{cat}</option>
                                                                        ))}
                                                                        {/* Add custom categories to dropdown */}
                                                                        {customCategories.size > 0 && (
                                                                            <>
                                                                                <option disabled>─ Custom ─</option>
                                                                                {Array.from(customCategories).sort((a, b) => a.localeCompare(b)).map((cat) => (
                                                                                    <option key={`custom-${cat}`} value={cat}>{cat}</option>
                                                                                ))}
                                                                            </>
                                                                        )}
                                                                        <option value="__custom__">+ Add New</option>
                                                                    </select>
                                                                </div>
                                                            )}
                                                        </td>

                                                        {/* Account */}
                                                        <td className="px-3 py-2 text-center">
                                                            <select
                                                                value={transactionAccounts.get(idx) || ''}
                                                                onChange={(e) => {
                                                                    const newAccs = new Map(transactionAccounts);
                                                                    newAccs.set(idx, e.target.value);
                                                                    setTransactionAccounts(newAccs);
                                                                }}
                                                                className="px-2 py-1 border border-slate-300 rounded text-sm w-full"
                                                            >
                                                                <option value="">Select Account</option>
                                                                {availableAccounts.map((acc) => (
                                                                    <optgroup key={acc.id} label={acc.id.includes('detected') ? '📥 Detected' : '✓ Existing'}>
                                                                        <option value={acc.id}>{acc.name}</option>
                                                                    </optgroup>
                                                                ))}
                                                            </select>
                                                        </td>

                                                        {/* Delete Button */}
                                                        <td className="px-3 py-2 text-center">
                                                            <button
                                                                onClick={() => deleteTransaction(idx)}
                                                                className="p-1 text-red-600 hover:bg-red-50 rounded inline-block"
                                                                title="Delete transaction"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}

                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-slate-200 p-6 bg-slate-50 flex justify-between items-center">
                    <div className="text-sm text-slate-600">
                        <span className="font-medium">{editedTransactions.length}</span> transactions ready to import
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onCancel}
                            className="px-6 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={editedTransactions.length === 0}
                            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
                        >
                            <Check size={18} />
                            Import {editedTransactions.length} {editedTransactions.length === 1 ? 'Transaction' : 'Transactions'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
