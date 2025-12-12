import React, { useState } from 'react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { PDFViewer } from './PDFViewer';
import { TransactionCategoryExtras } from './TransactionCategoryExtras';
import { TransactionCard } from './TransactionCard';
import { Transaction, Account, Vehicle, Investment } from '../../types';
import { Check, X, ArrowLeft, Loader2, Plus, AlertCircle } from 'lucide-react';

interface TransactionImportPanelProps {
    pdfUrl: string;
    transactions: any[];
    accounts: any[];
    vehicles?: Vehicle[];
    investments?: Investment[];
    onConfirm: (txs: any[]) => void;
    onCancel: () => void;
    accountInfo?: any;
    onAddAccount?: (account: any) => Promise<any>;
}

export const TransactionImportPanel = (props: TransactionImportPanelProps) => {
    const { pdfUrl, transactions: initialTransactions, accounts, onConfirm, onCancel, accountInfo, onAddAccount } = props;
    const [transactions, setTransactions] = useState(initialTransactions);
    const [isProcessing, setIsProcessing] = useState(false);

    // Calculate totals
    const totalCount = transactions.length;
    const totalAmount = transactions.reduce((sum, t) => sum + (typeof t.amount === 'number' ? t.amount : 0), 0);

    const handleTransactionUpdate = (id: string, updates: any) => {
        setTransactions(prev => prev.map((t: any, idx: number) =>
            // Using index as ID if no ID present (should use real IDs ideally)
            (t.id === id || (!t.id && `pdf_tx_${idx}` === id)) ? { ...t, ...updates } : t
        ));
    };

    const handleTransactionDelete = (id: string) => {
        setTransactions(prev => prev.filter((t: any, idx: number) =>
            (t.id !== id && `pdf_tx_${idx}` !== id)
        ));
    };

    const handleFinalConfirm = () => {
        setIsProcessing(true);
        // Simulate processing
        setTimeout(() => {
            onConfirm(transactions);
            setIsProcessing(false);
        }, 800);
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col h-screen animate-in fade-in">

            {/* Top Bar */}
            <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0 z-20 shadow-sm">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={onCancel} leftIcon={<ArrowLeft size={18} />}>
                        Back
                    </Button>
                    <div className="h-6 w-px bg-slate-200" />
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            Import Transactions
                            <Badge variant="info" size="sm">PDF</Badge>
                        </h2>
                        <p className="text-xs text-slate-500">
                            {accountInfo?.bankName} • {accountInfo?.accountNumber ? `****${accountInfo.accountNumber.slice(-4)}` : 'Account'} • {totalCount} Transactions Found
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-right hidden md:block">
                        <p className="text-xs text-slate-500 uppercase font-medium">Total Value</p>
                        <p className="text-lg font-bold text-slate-900">₹{totalAmount.toLocaleString()}</p>
                    </div>

                    <Button
                        variant="primary"
                        size="lg"
                        leftIcon={<Check size={18} />}
                        onClick={handleFinalConfirm}
                        isLoading={isProcessing}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        Confirm Import
                    </Button>
                </div>
            </div>

            {/* Main Content Split View */}
            <div className="flex-1 flex overflow-hidden">

                {/* Left Panel: PDF Viewer */}
                <PDFViewer pdfUrl={pdfUrl} initialWidth={600} />

                {/* Right Panel: Transactions List */}
                <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
                    <div className="max-w-3xl mx-auto space-y-4">

                        {/* Extraction Quality Banner */}
                        {accountInfo?.extractionQuality && (
                            <div className={`mb-4 rounded-lg border p-3 flex items-start args-2 ${accountInfo.extractionQuality.confidence === 'high' ? 'bg-green-50 border-green-200 text-green-800' :
                                accountInfo.extractionQuality.confidence === 'medium' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
                                    'bg-red-50 border-red-200 text-red-800'
                                }`}>
                                {accountInfo.extractionQuality.confidence === 'high' ? <Check size={18} className="mt-0.5" /> : <AlertCircle size={18} className="mt-0.5" />}
                                <div>
                                    <p className="text-sm font-semibold uppercase tracking-wider text-[10px] mb-0.5">
                                        Extraction Confidence: {accountInfo.extractionQuality.confidence}
                                    </p>
                                    <p className="text-xs opacity-90">{accountInfo.extractionQuality.notes}</p>
                                </div>
                            </div>
                        )}

                        {/* Detected Accounts Card (Multi-Account Support) */}
                        {accountInfo && accountInfo.parsedAccounts && (
                            <Card className="bg-white border-slate-200 mb-4 overflow-hidden">
                                <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex justify-between items-center">
                                    <h4 className="font-semibold text-slate-700 text-sm">Detected Accounts</h4>
                                    <span className="text-xs text-slate-400">{accountInfo.parsedAccounts.length} found</span>
                                </div>
                                <div className="divide-y divide-slate-100">
                                    {accountInfo.parsedAccounts.map((acc: any, idx: number) => {
                                        const isLinked = accounts.some(a =>
                                            // Simple matching logic: fuzzy match name or exact match number if available
                                            (a.accountNumber && acc.accountNumber && a.accountNumber.endsWith(acc.accountNumber.slice(-4))) ||
                                            a.name.toLowerCase() === acc.name.toLowerCase()
                                        );

                                        return (
                                            <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${acc.isPrimary ? 'bg-indigo-50 text-indigo-600' : 'bg-purple-50 text-purple-600'}`}>
                                                        <span className="font-bold text-xs">{acc.bankName?.substring(0, 2).toUpperCase() || 'BK'}</span>
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                                                            {acc.name}
                                                            {isLinked && <Badge variant="success" size="sm">Linked</Badge>}
                                                            {acc.isLinked && <Badge variant="secondary" size="sm">Nested</Badge>}
                                                        </h4>
                                                        <p className="text-sm text-slate-500">
                                                            {acc.accountNumber ? `****${acc.accountNumber.slice(-4)}` : 'No Number'}
                                                            {acc.balance && ` • Bal: ₹${parseFloat(acc.balance.replace(/,/g, '')).toLocaleString()}`}
                                                        </p>
                                                    </div>
                                                </div>

                                                {!isLinked && onAddAccount && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={async () => {
                                                            try {
                                                                const newAcc = {
                                                                    name: acc.name, // Name already includes last 4 digits "Bank - 1234"
                                                                    bankName: acc.bankName,
                                                                    type: acc.type || 'Savings',
                                                                    balance: parseFloat(acc.balance.replace(/,/g, '') || '0'),
                                                                    currency: 'INR'
                                                                    // accountNumber not in DB schema, omitting. Name has specific info.
                                                                };
                                                                await onAddAccount(newAcc);
                                                            } catch (err) {
                                                                console.error("Failed to add account", err);
                                                            }
                                                        }}
                                                        leftIcon={<Plus size={14} />}
                                                    >
                                                        Save Account
                                                    </Button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </Card>
                        )}

                        {/* Bulk Actions & Account Link */}
                        <div className="flex items-center justify-between mb-4 gap-4 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-slate-700">Link all to:</span>
                                <select
                                    className="h-9 rounded-md border-slate-200 text-sm focus:ring-primary-500 focus:border-primary-500"
                                    onChange={(e) => {
                                        const accId = e.target.value;
                                        if (accId) {
                                            setTransactions(prev => prev.map((t: any) => ({ ...t, accountId: accId })));
                                        }
                                    }}
                                    defaultValue=""
                                >
                                    <option value="" disabled>Select Account...</option>
                                    {accounts.map(a => (
                                        <option key={a.id} value={a.id}>{a.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="text-sm text-slate-500">
                                {transactions.filter(t => t.category && t.category !== 'Other').length > 0
                                    ? `Auto-categorized ${transactions.filter(t => t.category && t.category !== 'Other').length} items`
                                    : 'No categories detected automatically'
                                }
                            </div>
                        </div>

                        <h3 className="font-semibold text-slate-700 mb-4 px-1">Detected Transactions</h3>

                        <div className="space-y-3">
                            {transactions.map((tx: any, idx: number) => (
                                <TransactionCard
                                    key={tx.id || `pdf_tx_${idx}`}
                                    transaction={{ ...tx, id: tx.id || `pdf_tx_${idx}` }}
                                    accounts={accounts}
                                    onUpdate={(id, updates) => handleTransactionUpdate(id, updates)}
                                    onDelete={(id) => handleTransactionDelete(id)}
                                    isExpanded={idx === 0} // Expand first one by default for onboarding
                                    vehicles={props.vehicles}
                                    investments={props.investments}
                                />
                            ))}
                        </div>

                        {/* Empty State */}
                        {transactions.length === 0 && (
                            <div className="text-center py-20 opacity-50">
                                <p>No transactions to display.</p>
                            </div>
                        )}

                        {/* Bottom Spacer */}
                        <div className="h-20" />
                    </div>
                </div>
            </div>
        </div>
    );
};
