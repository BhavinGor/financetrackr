import React, { useState } from 'react';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Account, AccountType } from '../types';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Plus, Wallet, Edit2, Trash2, CreditCard, Building2, TrendingUp } from 'lucide-react';

interface AccountsPageProps {
    accounts: Account[];
    onAddAccount: (account: Account) => Promise<Account>;
    onUpdateAccount: (account: Account) => Promise<void>;
    onDeleteAccount: (id: string) => Promise<void>;
}

export const AccountsPage = ({ accounts, onAddAccount, onUpdateAccount, onDeleteAccount }: AccountsPageProps) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Partial<Account> | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

    const handleSave = async () => {
        if (!editingAccount?.name || editingAccount.balance === undefined) return;

        if (editingAccount.id) {
            await onUpdateAccount(editingAccount as Account);
        } else {
            const newAcc = {
                ...editingAccount,
                id: Math.random().toString(36).substr(2, 9),
                type: editingAccount.type || 'savings'
            } as Account;
            await onAddAccount(newAcc);
        }
        setIsModalOpen(false);
        setEditingAccount(null);
    };

    const openEdit = (acc: Account) => {
        setEditingAccount(acc);
        setIsModalOpen(true);
    };

    const openNew = () => {
        setEditingAccount({ type: AccountType.SAVINGS, balance: 0, currency: 'INR' });
        setIsModalOpen(true);
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'credit_card': return <CreditCard className="text-purple-600" />;
            case 'investment': return <TrendingUp className="text-green-600" />;
            default: return <Building2 className="text-blue-600" />;
        }
    };

    const getGradient = (type: string) => {
        switch (type) {
            case 'credit_card': return 'bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-100';
            case 'investment': return 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100';
            default: return 'bg-gradient-to-br from-blue-50 to-sky-50 border-blue-100';
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in max-w-6xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Accounts</h1>
                    <p className="text-slate-500 mt-1">Manage your bank accounts, credit cards, and wallets.</p>
                </div>
                <Button variant="primary" leftIcon={<Plus size={18} />} onClick={openNew}>
                    Add Account
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-0 shadow-xl">
                    <CardContent className="p-6">
                        <p className="text-slate-400 font-medium mb-1">Total Balance</p>
                        <h2 className="text-3xl font-bold">₹{totalBalance.toLocaleString()}</h2>
                        <div className="mt-4 flex items-center gap-2 text-sm text-slate-300 bg-white/10 w-fit px-3 py-1 rounded-full">
                            <Wallet size={14} />
                            <span>Across {accounts.length} accounts</span>
                        </div>
                    </CardContent>
                </Card>
                {/* Add more summary cards if needed */}
            </div>

            {/* Account List Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {accounts.map(acc => (
                    <Card key={acc.id} className={`transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${getGradient(acc.type)}`}>
                        <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-white rounded-xl shadow-sm">
                                    {getIcon(acc.type)}
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => openEdit(acc)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white/50 rounded-lg">
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => setDeleteId(acc.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-white/50 rounded-lg">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-bold text-slate-800 mb-1">{acc.name}</h3>
                                <p className="text-slate-500 text-sm capitalize mb-4">{acc.type.replace('_', ' ')} Account</p>
                                <p className="text-2xl font-bold text-slate-900">₹{acc.balance.toLocaleString()}</p>
                                <p className="text-xs text-slate-400 mt-1">Last updated today</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingAccount?.id ? 'Edit Account' : 'Add New Account'}
            >
                <div className="space-y-4">
                    <Input
                        label="Account Name"
                        value={editingAccount?.name || ''}
                        onChange={e => setEditingAccount({ ...editingAccount, name: e.target.value })}
                        placeholder="e.g. HDFC Savings"
                    />
                    <Select
                        label="Account Type"
                        value={editingAccount?.type}
                        onChange={e => setEditingAccount({ ...editingAccount, type: e.target.value as AccountType })}
                    >
                        <option value={AccountType.SAVINGS}>Savings</option>
                        <option value={AccountType.CREDIT_CARD}>Credit Card</option>
                        <option value={AccountType.WALLET}>Wallet/Cash</option>
                        <option value={AccountType.INVESTMENT}>Investment</option>
                    </Select>
                    <Input
                        label="Current Balance"
                        type="number"
                        value={editingAccount?.balance || ''}
                        onChange={e => setEditingAccount({ ...editingAccount, balance: parseFloat(e.target.value) })}
                        placeholder="0.00"
                    />
                    <div className="flex justify-end gap-2 mt-6">
                        <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button variant="primary" onClick={handleSave}>Save Account</Button>
                    </div>
                </div>
            </Modal>

            <ConfirmDialog
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={() => {
                    if (deleteId) {
                        onDeleteAccount(deleteId);
                        setDeleteId(null);
                    }
                }}
                title="Delete Account"
                message="Are you sure you want to delete this account? WARNING: All transactions associated with this account will also be deleted. This action cannot be undone."
                variant="danger"
            />
        </div>
    );
};
