import React, { useState } from 'react';
import { ConfirmModal } from './ConfirmModal';
import { Account, AccountType } from '../types';
import { CreditCard, Landmark, Wallet, Plus, Edit2, Trash2 } from 'lucide-react';

interface AccountsProps {
  accounts: Account[];
  onAddAccount: (acc: Account) => void;
  onEditAccount: (acc: Account) => void;
  onDeleteAccount: (id: string) => void;
}

export const Accounts: React.FC<AccountsProps> = ({ accounts, onAddAccount, onEditAccount, onDeleteAccount }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form State
  const [newAccName, setNewAccName] = useState('');
  const [newAccBank, setNewAccBank] = useState('');
  const [newAccType, setNewAccType] = useState<AccountType>(AccountType.CHECKING);
  const [newAccBalance, setNewAccBalance] = useState('');
  const [newAccLimit, setNewAccLimit] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingId) {
      // Edit mode
      const updatedAccount: Account = {
        id: editingId,
        name: newAccName,
        bankName: newAccBank,
        type: newAccType,
        balance: parseFloat(newAccBalance) || 0,
        currency: 'INR',
        limit: newAccType === AccountType.CREDIT_CARD ? parseFloat(newAccLimit) : undefined
      };
      onEditAccount(updatedAccount);
    } else {
      // Add mode
      const newAccount: Account = {
        id: `acc_${Date.now()}`,
        name: newAccName,
        bankName: newAccBank,
        type: newAccType,
        balance: parseFloat(newAccBalance) || 0,
        currency: 'INR',
        limit: newAccType === AccountType.CREDIT_CARD ? parseFloat(newAccLimit) : undefined
      };
      onAddAccount(newAccount);
    }

    setShowAddForm(false);
    setEditingId(null);
    // Reset form
    setNewAccName('');
    setNewAccBank('');
    setNewAccBalance('');
    setNewAccLimit('');
  };

  const handleEdit = (account: Account) => {
    setEditingId(account.id);
    setNewAccName(account.name);
    setNewAccBank(account.bankName);
    setNewAccType(account.type);
    setNewAccBalance(account.balance.toString());
    setNewAccLimit(account.limit?.toString() || '');
    setShowAddForm(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (deleteId) {
      onDeleteAccount(deleteId);
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Accounts & Cards</h1>
          <p className="text-slate-500">Manage your bank accounts, credit cards, and wallets.</p>
        </div>
        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            if (showAddForm) {
              setEditingId(null);
              setNewAccName('');
              setNewAccBank('');
              setNewAccBalance('');
              setNewAccLimit('');
            }
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} /> {editingId ? 'Cancel Edit' : 'Add Account'}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAdd} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-top-4">
          <h3 className="font-semibold text-slate-800 mb-4">{editingId ? 'Edit Account' : 'Add New Account'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Account Name (e.g. HDFC Checking)"
              value={newAccName} onChange={e => setNewAccName(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="text"
              placeholder="Bank Name"
              value={newAccBank} onChange={e => setNewAccBank(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <select
              value={newAccType}
              onChange={e => setNewAccType(e.target.value as AccountType)}
              className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.values(AccountType).map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Current Balance"
              value={newAccBalance} onChange={e => setNewAccBalance(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            {newAccType === AccountType.CREDIT_CARD && (
              <input
                type="number"
                placeholder="Credit Limit"
                value={newAccLimit} onChange={e => setNewAccLimit(e.target.value)}
                className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            )}
          </div>
          <div className="mt-4 flex justify-end gap-2">
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
              Save Account
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map(acc => (
          <AccountCard key={acc.id} account={acc} onEdit={handleEdit} onDelete={handleDeleteClick} />
        ))}
      </div>

      <ConfirmModal
        isOpen={!!deleteId}
        title="Delete Account"
        message="Are you sure you want to delete this account? This action cannot be undone."
        confirmText="Delete"
        isDestructive={true}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
};

const AccountCard: React.FC<{ account: Account; onEdit: (acc: Account) => void; onDelete: (id: string) => void }> = ({ account, onEdit, onDelete }) => {
  const getIcon = (type: AccountType) => {
    switch (type) {
      case AccountType.CREDIT_CARD: return <CreditCard size={24} className="text-purple-600" />;
      case AccountType.WALLET: return <Wallet size={24} className="text-orange-600" />;
      default: return <Landmark size={24} className="text-blue-600" />;
    }
  };

  const isLiability = account.balance < 0 || account.type === AccountType.CREDIT_CARD;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-bl-full -mr-4 -mt-4 z-0"></div>
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-6">
          <div className="p-3 bg-slate-50 rounded-xl">
            {getIcon(account.type)}
          </div>
          <span className="text-xs font-medium px-2 py-1 bg-slate-100 text-slate-600 rounded-full">
            {account.type}
          </span>
        </div>

        <div>
          <p className="text-sm text-slate-500 mb-1">{account.bankName}</p>
          <h3 className="text-lg font-bold text-slate-800 mb-2">{account.name}</h3>
          <p className={`text-2xl font-bold ${isLiability && account.type === AccountType.CREDIT_CARD ? 'text-slate-800' : (account.balance < 0 ? 'text-red-600' : 'text-green-600')}`}>
            {account.balance < 0 ? '-' : ''}₹{Math.abs(account.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </div>

        {account.type === AccountType.CREDIT_CARD && account.limit && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Used: ₹{Math.abs(account.balance).toLocaleString()}</span>
              <span>Limit: ₹{account.limit.toLocaleString()}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5">
              <div
                className="bg-purple-500 h-1.5 rounded-full"
                style={{ width: `${Math.min(100, (Math.abs(account.balance) / account.limit) * 100)}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end gap-2">
          <button
            onClick={() => onEdit(account)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Edit Account"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => onDelete(account.id)}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete Account"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
