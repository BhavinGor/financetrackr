import React, { useState, useRef } from 'react';
import { ConfirmModal } from './ConfirmModal';
import { PdfImportModal } from './PdfImportModal';
import { Account, Category, Transaction, TransactionType, AccountType } from '../types';
import { Plus, Search, Upload, Trash2, ArrowRight, X, Edit, FileUp, AlertCircle } from 'lucide-react';
import { isPdfFile, validatePdfSize } from '../services/pdfService';

// Date format helpers
const formatDateDisplay = (dateStr: string): string => {
  if (!dateStr) return '';
  // If in yyyy-MM-dd format, convert to dd-mm-yyyy
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-');
    return `${day}-${month}-${year}`;
  }
  return dateStr;
};

const formatDateForInput = (dateStr: string): string => {
  if (!dateStr) return '';
  // If in dd-mm-yyyy format, convert to yyyy-MM-dd for input
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split('-');
    return `${year}-${month}-${day}`;
  }
  // If already in yyyy-MM-dd, return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  return dateStr;
};

const formatDateToStore = (inputDateStr: string): string => {
  if (!inputDateStr) return '';
  // HTML5 date input always gives yyyy-MM-dd format
  if (/^\d{4}-\d{2}-\d{2}$/.test(inputDateStr)) {
    const [year, month, day] = inputDateStr.split('-');
    return `${day}-${month}-${year}`;
  }
  return inputDateStr;
};

interface TransactionsProps {
  transactions: Transaction[];
  accounts: Account[];
  onAddTransaction: (tx: Transaction) => void;
  onBulkAddTransactions: (txs: Transaction[]) => void;
  onDeleteTransaction: (id: string) => void;
  onEditTransaction?: (tx: Transaction) => void;
  onAddAccount?: (account: Account) => Promise<Account>;
}

type CSVImportStep = 'upload' | 'map' | 'preview';

interface CSVMapping {
  date: string;
  description: string;
  amount: string;
  category: string;
  type: string;
}

export const Transactions: React.FC<TransactionsProps> = ({ transactions, accounts, onAddTransaction, onBulkAddTransactions, onDeleteTransaction, onEditTransaction, onAddAccount }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterText, setFilterText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // CSV State
  const [importStep, setImportStep] = useState<CSVImportStep>('upload');
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<CSVMapping>({ date: '', description: '', amount: '', category: '', type: '' });

  // PDF State
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfExtractedData, setPdfExtractedData] = useState<any>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string>('');
  const [pdfPassword, setPdfPassword] = useState('');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [pendingPdfFile, setPendingPdfFile] = useState<File | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);

  // Form State
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [category, setCategory] = useState<string>(Category.FOOD);
  const [accountId, setAccountId] = useState<string>(accounts[0]?.id || '');
  const [date, setDate] = useState(formatDateDisplay(new Date().toISOString().split('T')[0]));
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filter State
  const [filterMonth, setFilterMonth] = useState<string>(''); // Format: yyyy-mm
  const [filterAccount, setFilterAccount] = useState<string>(''); // Account ID

  // Delete Modal State
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // -- Add Transaction Handlers --
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!desc.trim()) {
      alert('Please enter a description');
      return;
    }
    if (!amount || Number.parseFloat(amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    if (!accountId) {
      alert('Please select an account');
      return;
    }

    const storedDate = formatDateToStore(date);
    const newTx: Transaction = {
      id: editingId || `tx_${Date.now()}`,
      description: desc,
      amount: Number.parseFloat(amount),
      type,
      category,
      accountId,
      date: storedDate,
      source: 'manual'
    };

    if (editingId && onEditTransaction) {
      onEditTransaction(newTx);
    } else {
      onAddTransaction(newTx);
    }

    setShowAddForm(false);
    resetForm();
  };

  const resetForm = () => {
    setDesc('');
    setAmount('');
    setEditingId(null);
    setDate(formatDateDisplay(new Date().toISOString().split('T')[0]));
    setType(TransactionType.EXPENSE);
    setAccountId(accounts.length > 0 ? accounts[0].id : '');
  };

  const handleEditClick = (tx: Transaction) => {
    setEditingId(tx.id);
    setDesc(tx.description);
    setAmount(tx.amount.toString());
    setType(tx.type);
    setCategory(tx.category);
    setAccountId(tx.accountId);
    setDate(formatDateDisplay(tx.date));
    setShowAddForm(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (deleteId) {
      onDeleteTransaction(deleteId);
      setDeleteId(null);
    }
  };

  // -- CSV Import Handlers --

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim() !== '');
      if (lines.length < 2) {
        setPdfError("File appears empty or invalid. Please check your CSV file.");
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim());
      const rows = lines.slice(1).map(line => line.split(',').map(c => c.trim()));

      setCsvHeaders(headers);
      setCsvData(rows);
      setImportStep('map');

      // Auto-guess mapping if simple headers match
      const guessMapping: CSVMapping = { date: '', description: '', amount: '', category: '', type: '' };
      headers.forEach(h => {
        const lowerH = h.toLowerCase();
        if (lowerH.includes('date')) guessMapping.date = h;
        else if (lowerH.includes('desc') || lowerH.includes('narrat')) guessMapping.description = h;
        else if (lowerH.includes('amount') || lowerH.includes('debit') || lowerH.includes('credit')) guessMapping.amount = h;
        else if (lowerH.includes('category')) guessMapping.category = h;
        else if (lowerH.includes('type')) guessMapping.type = h;
      });
      setColumnMapping(guessMapping);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleMapConfirm = () => {
    if (!columnMapping.date || !columnMapping.amount) {
      setPdfError("Please map at least Date and Amount columns.");
      return;
    }
    setPdfError('');
    setImportStep('preview');
  };

  const cancelImport = () => {
    setImportStep('upload');
    setCsvData([]);
    setCsvHeaders([]);
  };

  const getMappedData = () => {
    return csvData.map((row, idx) => {
      const getVal = (colName: string) => {
        const colIdx = csvHeaders.indexOf(colName);
        return colIdx !== -1 ? row[colIdx] : '';
      };

      const dateVal = getVal(columnMapping.date);
      const descVal = getVal(columnMapping.description) || 'Imported Transaction';
      const amtVal = parseFloat(getVal(columnMapping.amount));
      const catVal = getVal(columnMapping.category) || 'Other';
      const typeVal = getVal(columnMapping.type);

      // Simple type inference
      let finalType = TransactionType.EXPENSE;
      if (typeVal && typeVal.toLowerCase().includes('income')) finalType = TransactionType.INCOME;
      else if (typeVal && typeVal.toLowerCase().includes('cr')) finalType = TransactionType.INCOME;

      return {
        id: `csv_${Date.now()}_${idx}`,
        date: dateVal,
        description: descVal,
        amount: isNaN(amtVal) ? 0 : amtVal,
        category: catVal,
        type: finalType,
        accountId: accounts[0]?.id || 'unknown',
        source: 'csv'
      } as Transaction;
    }).filter(tx => tx.amount !== 0); // Filter invalid rows
  };

  const confirmImport = () => {
    const newTxs = getMappedData();
    if (newTxs.length === 0) {
      setPdfError('No valid transactions found in the CSV. Please check your data.');
      return;
    }
    onBulkAddTransactions(newTxs);
    setPdfError('');
    cancelImport();
  };

  // -- PDF Import Handlers --
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (!isPdfFile(file)) {
      setPdfError('Please select a PDF file');
      return;
    }

    if (!validatePdfSize(file)) {
      setPdfError('PDF file is too large. Maximum size is 10MB');
      return;
    }

    await processPdfFile(file);
    // Reset input
    if (pdfInputRef.current) pdfInputRef.current.value = '';
  };

  const processPdfFile = async (file: File, password?: string) => {
    setPdfLoading(true);
    setPdfError(''); // Clear previous errors
    try {
      console.log('📄 [processPdfFile] Starting PDF processing');
      console.log('   File name:', file.name);
      console.log('   File size:', file.size);
      console.log('   Has password:', !!password);

      // Store the PDF blob for display in modal
      setPdfBlob(file);

      // Send PDF directly to backend with Nova Pro extraction
      const formData = new FormData();
      formData.append('file', file);
      if (password) {
        formData.append('password', password);
      }

      console.log('   Sending PDF to backend...');
      const response = await fetch('http://localhost:5000/api/pdf/parse', {
        method: 'POST',
        body: formData
      });

      console.log('   Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('   Backend error:', errorData);

        if (response.status === 401) {
          // Password required or invalid
          if (errorData.error === 'PDF_PASSWORD_REQUIRED') {
            console.log('   Password required');
            setPendingPdfFile(file);
            setShowPasswordPrompt(true);
            return;
          } else if (errorData.error === 'PDF_INVALID_PASSWORD') {
            console.log('   Invalid password');
            setPdfError('Invalid password. Please try again.');
            setPendingPdfFile(file);
            setShowPasswordPrompt(true);
            return;
          }
        }

        throw new Error(errorData.message || 'Failed to process PDF');
      }

      const result = await response.json();
      console.log('✅ PDF parsing successful');
      console.log('   Transactions found:', result.data?.transactions?.length || 0);

      if (!result.success || !result.data) {
        throw new Error('Invalid response from PDF processor');
      }

      const { data } = result;

      // Validate we have transactions
      if (!data.transactions || data.transactions.length === 0) {
        setPdfError('No transactions found in the PDF. Please try a different file or use CSV import.');
        return;
      }

      // Transform Nova Pro response to match our transaction format
      const extractedData = {
        transactions: data.transactions.map((tx: any) => ({
          date: tx.date,
          description: tx.description || 'Transaction',
          // Remove commas from amount string before parsing (handles "10,000" -> 10000)
          amount: Number.parseFloat(String(tx.amount).replace(/,/g, '')) || 0,
          type: tx.type?.toLowerCase().includes('credit') ? 'income' : 'expense'
        })),
        accountInfo: data.accountInfo || {},
        statementPeriod: data.statementPeriod || ''
      };

      console.log('✅ Data transformed for display');

      setPdfExtractedData(extractedData);
      setShowPdfModal(true);
      setShowPasswordPrompt(false);
      setPendingPdfFile(null);
      setPdfPassword('');
    } catch (error: any) {
      console.error('❌ PDF processing error:', error);
      console.error('   Error type:', error.name);
      console.error('   Error message:', error.message);
      console.error('   Error stack:', error.stack);

      // Show the actual error message
      setPdfError(error.message || 'Failed to process PDF. Please try a different file.');
    } finally {
      setPdfLoading(false);
    }
  };

  const handlePasswordSubmit = () => {
    if (pendingPdfFile && pdfPassword) {
      processPdfFile(pendingPdfFile, pdfPassword);
    }
  };

  const handlePdfImportConfirm = async (transactions: any[], accountsToCreate?: any[]) => {
    // Build a map of account names to database IDs as we create them
    const accountNameToIdMap = new Map<string, string>();

    // Create accounts first and collect their database IDs
    if (accountsToCreate && Array.isArray(accountsToCreate) && onAddAccount) {
      for (const acc of accountsToCreate) {
        const newAccount: Account = {
          id: '', // Will be replaced with database UUID
          name: acc.name,
          type: acc.type as AccountType,
          bankName: acc.bankName,
          balance: acc.balance || 0,
          currency: 'INR'
        };

        // onAddAccount now returns the created account with database UUID
        const createdAccount = await onAddAccount(newAccount);
        accountNameToIdMap.set(acc.name, createdAccount.id);
        console.log('Account created:', createdAccount.name, 'with ID:', createdAccount.id);
      }
    }

    // Map transactions to proper account IDs using the account name map
    const transactionsWithIds = transactions.map((tx) => {
      let finalAccountId = tx.accountId;

      // If transaction has accountName, use it to find the real account ID
      if (tx.accountName) {
        // First check our newly created accounts map
        if (accountNameToIdMap.has(tx.accountName)) {
          finalAccountId = accountNameToIdMap.get(tx.accountName)!;
        } else {
          // Otherwise find in existing accounts
          const existingAccount = accounts.find(a => a.name === tx.accountName);
          if (existingAccount) {
            finalAccountId = existingAccount.id;
          }
        }
      }
      // If accountId is a detected ID, try to map by name
      else if (tx.accountId?.includes('detected')) {
        // Extract bank name from detected ID and find in our map
        const detectedAccount = accounts.find(a =>
          tx.accountId.includes(a.name) ||
          tx.accountId.includes(a.bankName)
        );
        if (detectedAccount) {
          finalAccountId = detectedAccount.id;
        } else {
          // Check if we just created an account with matching bank name
          for (const [name, id] of accountNameToIdMap.entries()) {
            if (tx.accountId.includes(name)) {
              finalAccountId = id;
              break;
            }
          }
        }
      }

      return {
        ...tx,
        accountId: finalAccountId,
        // Ensure date is in yyyy-MM-dd format for database
        date: tx.date.includes('/')
          ? tx.date.split('/').reverse().join('-')  // Convert dd/MM/yyyy to yyyy-MM-dd
          : tx.date
      };
    });

    await onBulkAddTransactions(transactionsWithIds);

    setShowPdfModal(false);
    setPdfExtractedData(null);
    setPdfBlob(null);

    // Run tests in development mode
    if (import.meta.env.DEV && (window as any).pdfImportTests) {
      setTimeout(() => {
        console.log('\n🧪 Running PDF Import Tests...\n');
        const tests = (window as any).pdfImportTests;

        // Get newly created accounts (last N accounts where N = accountsToCreate.length)
        const numCreated = accountsToCreate?.length || 0;
        const createdAccounts = accounts.slice(0, numCreated);

        // Get newly imported transactions
        const importedTransactions = transactionsWithIds;

        // Run tests
        tests.runAllTests(createdAccounts, importedTransactions, accounts);
      }, 1000); // Wait for state to update
    }
  };

  const handlePdfImportCancel = () => {
    setShowPdfModal(false);
    setPdfExtractedData(null);
  };


  // Helper to convert date string to Date object
  const parseDate = (dateStr: string): Date => {
    // Handle yyyy-MM-dd format (database format)
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return new Date(dateStr);
    }
    // Handle dd-MM-yyyy format (display format)
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
      const [day, month, year] = dateStr.split('-');
      return new Date(`${year}-${month}-${day}`);
    }
    return new Date(dateStr);
  };

  // Helper to format yyyy-MM-dd to dd-MM-yyyy for display
  const formatDateForDisplay = (dateStr: string): string => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('-');
      return `${day}-${month}-${year}`;
    }
    return dateStr;
  };

  // -- Render --
  const filteredTransactions = transactions.filter(t => {
    // Text filter
    const matchesText = t.description.toLowerCase().includes(filterText.toLowerCase()) ||
      t.category.toLowerCase().includes(filterText.toLowerCase());

    // Month filter
    let matchesMonth = true;
    if (filterMonth) {
      const txDate = parseDate(t.date);
      const txYearMonth = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
      matchesMonth = txYearMonth === filterMonth;
    }

    // Account filter
    const matchesAccount = !filterAccount || t.accountId === filterAccount;

    return matchesText && matchesMonth && matchesAccount;
  }).sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());

  if (importStep === 'map') {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 max-w-2xl mx-auto mt-10">
        <h2 className="text-xl font-bold mb-4">Map CSV Columns</h2>
        <p className="text-slate-500 mb-6 text-sm">Match your file columns to FinanceTrackr fields.</p>

        <div className="space-y-4">
          {[
            { key: 'date', label: 'Date' },
            { key: 'description', label: 'Description' },
            { key: 'amount', label: 'Amount' },
            { key: 'category', label: 'Category' },
            { key: 'type', label: 'Type (Income/Expense)' },
          ].map((field) => (
            <div key={field.key} className="grid grid-cols-3 items-center gap-4">
              <label className="text-sm font-medium text-slate-700 text-right">{field.label}</label>
              <div className="col-span-2">
                <select
                  className="w-full px-3 py-2 border rounded-lg"
                  value={columnMapping[field.key as keyof CSVMapping]}
                  onChange={(e) => setColumnMapping({ ...columnMapping, [field.key]: e.target.value })}
                >
                  <option value="">-- Select Column --</option>
                  {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button onClick={cancelImport} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg">Cancel</button>
          <button onClick={handleMapConfirm} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Preview Data <ArrowRight size={16} className="inline ml-1" /></button>
        </div>
      </div>
    );
  }

  if (importStep === 'preview') {
    const previewData = getMappedData().slice(0, 5);
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 max-w-4xl mx-auto mt-10">
        <h2 className="text-xl font-bold mb-4">Preview Import</h2>
        <p className="text-slate-500 mb-6 text-sm">Review the first 5 rows before importing.</p>

        <div className="overflow-x-auto border rounded-lg mb-6">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 font-medium text-slate-700">
              <tr>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Description</th>
                <th className="px-4 py-2">Category</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {previewData.map((row, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="px-4 py-2">{row.date}</td>
                  <td className="px-4 py-2">{row.description}</td>
                  <td className="px-4 py-2">{row.category}</td>
                  <td className="px-4 py-2">{row.type}</td>
                  <td className="px-4 py-2 text-right">₹{row.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={() => setImportStep('map')} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg">Back to Mapping</button>
          <button onClick={cancelImport} className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg">Discard File</button>
          <button onClick={confirmImport} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Confirm Import</button>
        </div>
      </div>
    );
  }

  // Default View
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Transactions</h1>
          <p className="text-slate-500">Track every penny going in and out.</p>
        </div>

        {/* Filter Section */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search Filter */}
            <div className="lg:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search by description or category..."
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Month Filter */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-2">Month/Year</label>
              <input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Account Filter */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-2">Account</label>
              <select
                value={filterAccount}
                onChange={(e) => setFilterAccount(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
              >
                <option value="">All Accounts</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Clear Filters Button */}
          {(filterText || filterMonth || filterAccount) && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <button
                onClick={() => {
                  setFilterText('');
                  setFilterMonth('');
                  setFilterAccount('');
                }}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                ✕ Clear All Filters
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Upload size={18} /> Import CSV
          </button>

          <input
            ref={pdfInputRef}
            type="file"
            accept=".pdf"
            onChange={handlePdfUpload}
            className="hidden"
          />
          <button
            onClick={() => pdfInputRef.current?.click()}
            disabled={pdfLoading}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileUp size={18} />
            {pdfLoading ? 'Processing...' : 'Import PDF'}
          </button>

          <button
            onClick={() => { setShowAddForm(!showAddForm); resetForm(); }}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            <Plus size={18} /> {showAddForm && editingId ? 'Cancel Edit' : 'Add Transaction'}
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {pdfError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
          <div className="flex-1">
            <p className="font-semibold text-red-900">{pdfError}</p>
          </div>
          <button
            onClick={() => setPdfError('')}
            className="text-red-400 hover:text-red-600 transition-colors flex-shrink-0"
          >
            <X size={20} />
          </button>
        </div>
      )}

      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-top-4">
          <h3 className="font-semibold text-slate-800 mb-4">{editingId ? 'Edit Transaction' : 'New Transaction'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Type</label>
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button
                  type="button"
                  className={`flex - 1 py - 1.5 rounded - md text - sm font - medium transition - colors ${type === TransactionType.EXPENSE ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'} `}
                  onClick={() => setType(TransactionType.EXPENSE)}
                >
                  Expense
                </button>
                <button
                  type="button"
                  className={`flex - 1 py - 1.5 rounded - md text - sm font - medium transition - colors ${type === TransactionType.INCOME ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'} `}
                  onClick={() => setType(TransactionType.INCOME)}
                >
                  Income
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                value={amount} onChange={e => setAmount(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Date (dd-mm-yyyy)</label>
              <input
                type="date"
                value={formatDateForInput(date)}
                onChange={(e) => setDate(formatDateDisplay(e.target.value))}
                className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="flex flex-col gap-1 md:col-span-2">
              <label className="text-xs font-medium text-slate-500">Description</label>
              <input
                type="text"
                placeholder="What was this for?"
                value={desc} onChange={e => setDesc(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Category</label>
              <select
                value={category} onChange={e => setCategory(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.values(Category).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Account</label>
              <select
                value={accountId} onChange={e => setAccountId(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {editingId ? 'Update Transaction' : 'Save Transaction'}
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-medium">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Account</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-6 py-4 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.map((tx) => {
                const account = accounts.find(a => a.id === tx.accountId);
                return (
                  <tr key={tx.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-800">{formatDateForDisplay(tx.date)}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {tx.description}
                      {tx.source === 'csv' && <span className="ml-2 inline-flex align-middle text-[10px] bg-green-50 text-green-700 px-1.5 rounded">CSV</span>}
                      {tx.source === 'gmail' && <span className="ml-2 inline-flex align-middle text-[10px] bg-red-50 text-red-700 px-1.5 rounded">Gmail</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600 text-xs">
                        {tx.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">{account?.name || 'Unknown'}</td>
                    <td className={`px - 6 py - 4 text - right font - semibold ${tx.type === TransactionType.INCOME ? 'text-green-600' : 'text-slate-900'} `}>
                      {tx.type === TransactionType.INCOME ? '+' : '-'}₹{tx.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditClick(tx);
                          }}
                          className="text-slate-400 hover:text-blue-500 transition-colors p-2"
                          title="Edit Transaction"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(tx.id);
                          }}
                          className="text-slate-400 hover:text-red-500 transition-colors p-2"
                          title="Delete Transaction"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredTransactions.length === 0 && (
          <div className="p-8 text-center text-slate-400">
            No transactions found.
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!deleteId}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction? This action cannot be undone and will affect your account balance."
        confirmText="Delete"
        isDestructive={true}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />

      {/* Password Prompt Modal */}
      {showPasswordPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 shadow-2xl max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-slate-800 mb-2">PDF Password Required</h3>
            <p className="text-sm text-slate-600 mb-4">
              This PDF is password-protected. Please enter the password to continue.
            </p>
            {pdfError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-start gap-2">
                <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
                <p className="text-sm text-red-900">{pdfError}</p>
              </div>
            )}
            <input
              type="password"
              value={pdfPassword}
              onChange={(e) => setPdfPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
              placeholder="Enter PDF password"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 outline-none"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowPasswordPrompt(false);
                  setPendingPdfFile(null);
                  setPdfPassword('');
                  setPdfError('');
                }}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordSubmit}
                disabled={!pdfPassword || pdfLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {pdfLoading ? 'Processing...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Import Preview Modal */}
      <PdfImportModal
        isOpen={showPdfModal}
        extractedData={pdfExtractedData}
        pdfBlob={pdfBlob}
        accounts={accounts}
        onConfirm={handlePdfImportConfirm}
        onCancel={handlePdfImportCancel}
      />
    </div>
  );
};
