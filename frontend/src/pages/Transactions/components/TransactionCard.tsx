import React, { useState, useEffect } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Transaction, TransactionType, Vehicle, Investment, InvestmentType } from '../../../types/index';
import { ChevronDown, ChevronUp, Trash2, Save, X, Check, Plus, Loader2 } from 'lucide-react';
import { getAllCategories, saveCustomCategory } from '../../../services/storage/categoryStorage';
import { useVehicleStore } from '../../../stores/vehicleStore';
import { generateId } from '../../../utils/id';

interface TransactionCardProps {
    transaction: Transaction;
    accounts: any[];
    onUpdate: (id: string, updates: Partial<Transaction>) => void;
    onDelete: (id: string) => void;
    isExpanded?: boolean;
    vehicles?: Vehicle[];
    investments?: Investment[];
    onAddVehicleClick?: () => void;
    onAddInvestmentClick?: () => void;
}

interface ValidationErrors {
    description?: string;
    amount?: string;
    account?: string;
}

export const TransactionCard = ({
    transaction,
    accounts,
    onUpdate,
    onDelete,
    isExpanded: defaultExpanded = false,
    vehicles = [],
    investments = [],
    onAddVehicleClick,
    onAddInvestmentClick
}: TransactionCardProps) => {
    // State
    const { vehicles: storeVehicles, addVehicle: addVehicleToStore } = useVehicleStore();

    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const [isDirty, setIsDirty] = useState(false);
    const [editedTransaction, setEditedTransaction] = useState<Transaction>(transaction);
    const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
    const [availableCategories, setAvailableCategories] = useState<string[]>([]);

    // Inline vehicle creation state
    const [showVehicleForm, setShowVehicleForm] = useState(false);
    const [newVehicleName, setNewVehicleName] = useState('');
    const [newVehicleType, setNewVehicleType] = useState('Car');
    const [isCreatingVehicle, setIsCreatingVehicle] = useState(false);

    // Custom category state
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');

    // Load categories
    useEffect(() => {
        const loadCategories = async () => {
            const cats = await getAllCategories();
            setAvailableCategories(cats);
        };
        loadCategories();
    }, []);

    // Reset when transaction prop changes
    useEffect(() => {
        setEditedTransaction(transaction);
        setIsDirty(false);
    }, [transaction]);

    // Validation
    const validate = (): boolean => {
        const errors: ValidationErrors = {};

        if (!editedTransaction.description?.trim()) {
            errors.description = 'Description is required';
        }

        if (!editedTransaction.amount || editedTransaction.amount <= 0) {
            errors.amount = 'Amount must be greater than 0';
        }

        if (!editedTransaction.accountId) {
            errors.account = 'Account is required';
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Handlers
    const handleFieldChange = (field: keyof Transaction, value: any) => {
        setEditedTransaction(prev => ({ ...prev, [field]: value }));
        setIsDirty(true);
    };

    const handleMetadataChange = (key: string, value: any) => {
        setEditedTransaction(prev => ({
            ...prev,
            metadata: { ...(prev.metadata || {}), [key]: value }
        }));
        setIsDirty(true);
    };

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return;
        const success = await saveCustomCategory(newCategoryName);
        if (success) {
            const updatedCats = await getAllCategories();
            setAvailableCategories(updatedCats);
            setEditedTransaction(prev => ({ ...prev, category: newCategoryName }));
            setIsAddingCategory(false);
            setNewCategoryName('');
            setIsDirty(true);
        }
    };

    const handleCreateVehicle = async () => {
        if (!newVehicleName.trim()) return;
        setIsCreatingVehicle(true);
        try {
            const id = generateId('veh');
            await addVehicleToStore({ id, name: newVehicleName, make: '', model: '', year: new Date().getFullYear(), licensePlate: '', mileage: 0, type: newVehicleType });
            handleMetadataChange('vehicleId', id);
            setShowVehicleForm(false);
            setNewVehicleName('');
        } finally {
            setIsCreatingVehicle(false);
        }
    };

    const handleSave = () => {
        if (validate()) {
            onUpdate(transaction.id, editedTransaction);
            setIsDirty(false);
        }
    };

    const handleCancel = () => {
        if (isDirty) {
            if (window.confirm('Discard unsaved changes?')) {
                setEditedTransaction(transaction);
                setIsDirty(false);
                setIsExpanded(false);
            }
        } else {
            setIsExpanded(false);
        }
    };

    const handleToggleExpand = () => {
        if (isExpanded && isDirty) {
            if (window.confirm('You have unsaved changes. Discard them?')) {
                setEditedTransaction(transaction);
                setIsDirty(false);
                setIsExpanded(false);
            }
        } else {
            setIsExpanded(!isExpanded);
        }
    };

    const canSave = isDirty && Object.keys(validationErrors).length === 0;

    // Format date for display (yyyy-mm-dd -> dd-mm-yyyy)
    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        return dateStr;
    };

    // Format amount for display
    const formatAmount = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    // Get category color
    const getCategoryColor = (category: string) => {
        const colors: Record<string, string> = {
            'Food': 'bg-orange-100 text-orange-700',
            'Groceries': 'bg-green-100 text-green-700',
            'Transport': 'bg-blue-100 text-blue-700',
            'Fuel': 'bg-purple-100 text-purple-700',
            'Entertainment': 'bg-pink-100 text-pink-700',
            'Utilities': 'bg-cyan-100 text-cyan-700',
            'Shopping': 'bg-yellow-100 text-yellow-700',
            'Investment': 'bg-indigo-100 text-indigo-700',
            'Savings': 'bg-teal-100 text-teal-700',
        };
        return colors[category] || 'bg-slate-100 text-slate-700';
    };

    return (
        <div className={`bg-white rounded-xl border transition-all ${isDirty ? 'border-blue-300 shadow-sm' : 'border-slate-200'
            } hover:shadow-md mb-4`}>
            {/* Layer 1: Compact Header */}
            <div
                className="p-4 flex items-center gap-4 cursor-pointer"
                onClick={handleToggleExpand}
            >
                {/* Date */}
                <div className="text-sm text-slate-500 w-24 flex-shrink-0">
                    {formatDate(transaction.date)}
                </div>

                {/* Description */}
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">
                        {transaction.description}
                    </div>
                </div>

                {/* Category Pill */}
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${getCategoryColor(transaction.category)}`}>
                    {transaction.category}
                </div>

                {/* Amount */}
                <div className={`text-lg font-bold ${transaction.type === TransactionType.INCOME ? 'text-green-600' : 'text-slate-900'
                    }`}>
                    {transaction.type === TransactionType.INCOME ? '+' : '-'}{formatAmount(transaction.amount)}
                </div>

                {/* Icons */}
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={() => onDelete(transaction.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                    >
                        <Trash2 size={16} />
                    </button>
                    <button
                        onClick={handleToggleExpand}
                        className={`p-2 rounded-lg transition-colors ${isExpanded ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:bg-slate-100'
                            }`}
                    >
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                </div>

                {/* Dirty indicator */}
                {isDirty && (
                    <div className="w-2 h-2 rounded-full bg-blue-500" title="Unsaved changes" />
                )}
            </div>

            {/* Layer 2 & 3: Expanded Content */}
            {isExpanded && (
                <div className="px-4 pb-4 pt-0 border-t border-slate-100">
                    <div className="pt-6 grid gap-4">
                        {/* Description */}
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-2">
                                Description *
                            </label>
                            <textarea
                                value={editedTransaction.description}
                                onChange={(e) => handleFieldChange('description', e.target.value)}
                                className={`w-full px-3 py-2 border rounded-lg text-sm ${validationErrors.description ? 'border-red-300' : 'border-slate-300'
                                    } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                                rows={2}
                            />
                            {validationErrors.description && (
                                <p className="mt-1 text-xs text-red-600">{validationErrors.description}</p>
                            )}
                        </div>

                        {/* Amount & Type */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-2">
                                    Amount *
                                </label>
                                <input
                                    type="number"
                                    value={editedTransaction.amount}
                                    onChange={(e) => handleFieldChange('amount', parseFloat(e.target.value) || 0)}
                                    className={`w-full px-3 py-2 border rounded-lg text-sm ${validationErrors.amount ? 'border-red-300' : 'border-slate-300'
                                        } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                                    step="0.01"
                                />
                                {validationErrors.amount && (
                                    <p className="mt-1 text-xs text-red-600">{validationErrors.amount}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-2">
                                    Type
                                </label>
                                <select
                                    value={editedTransaction.type}
                                    onChange={(e) => handleFieldChange('type', e.target.value as TransactionType)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value={TransactionType.EXPENSE}>Expense</option>
                                    <option value={TransactionType.INCOME}>Income</option>
                                </select>
                            </div>
                        </div>

                        {/* Category & Account */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-2">
                                    Category
                                </label>
                                {isAddingCategory ? (
                                    <div className="flex gap-2">
                                        <input
                                            value={newCategoryName}
                                            onChange={(e) => setNewCategoryName(e.target.value)}
                                            placeholder="New Category Name"
                                            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            autoFocus
                                        />
                                        <button
                                            type="button"
                                            onClick={handleAddCategory}
                                            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                        >
                                            <Check size={16} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsAddingCategory(false)}
                                            className="px-2 py-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <select
                                        value={editedTransaction.category}
                                        onChange={(e) => {
                                            if (e.target.value === '__NEW__') setIsAddingCategory(true);
                                            else handleFieldChange('category', e.target.value);
                                        }}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        {availableCategories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                        <option value="__NEW__" className="font-semibold text-primary-600">+ New Category</option>
                                    </select>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-2">
                                    Account *
                                </label>
                                <select
                                    value={editedTransaction.accountId}
                                    onChange={(e) => handleFieldChange('accountId', e.target.value)}
                                    className={`w-full px-3 py-2 border rounded-lg text-sm ${validationErrors.account ? 'border-red-300' : 'border-slate-300'
                                        } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                                >
                                    <option value="">Select Account</option>
                                    {accounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                                    ))}
                                </select>
                                {validationErrors.account && (
                                    <p className="mt-1 text-xs text-red-600">{validationErrors.account}</p>
                                )}
                            </div>
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-2">
                                Notes
                            </label>
                            <textarea
                                value={editedTransaction.notes || ''}
                                onChange={(e) => handleFieldChange('notes', e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                rows={2}
                                placeholder="Optional notes..."
                            />
                        </div>

                        {/* Layer 3: Conditional Sections */}
                        {editedTransaction.category === 'Fuel' && (
                            <div className="mt-2 p-4 bg-orange-50 rounded-lg border border-orange-100">
                                <h4 className="text-sm font-semibold text-orange-800 mb-3">Vehicle Expense Details</h4>
                                <div className="grid gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1.5">Vehicle</label>
                                        <div className="flex gap-2">
                                            <select
                                                value={editedTransaction.metadata?.vehicleId || ''}
                                                onChange={(e) => { handleMetadataChange('vehicleId', e.target.value); setShowVehicleForm(false); }}
                                                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            >
                                                <option value="">-- Select Vehicle --</option>
                                                {storeVehicles.map(v => (
                                                    <option key={v.id} value={v.id}>{v.name}</option>
                                                ))}
                                            </select>
                                            <button
                                                type="button"
                                                onClick={() => setShowVehicleForm(f => !f)}
                                                className="px-3 py-2 text-xs font-medium text-orange-700 border border-orange-300 rounded-lg hover:bg-orange-100 transition-colors flex items-center gap-1"
                                            >
                                                <Plus size={13} /> Add
                                            </button>
                                        </div>
                                    </div>

                                    {showVehicleForm && (
                                        <div className="bg-white border border-orange-200 rounded-lg p-3 space-y-2">
                                            <p className="text-xs font-medium text-slate-600">Quick Add Vehicle</p>
                                            <div className="flex gap-2">
                                                <input
                                                    autoFocus
                                                    value={newVehicleName}
                                                    onChange={(e) => setNewVehicleName(e.target.value)}
                                                    placeholder="Vehicle name (e.g. My Car)"
                                                    className="flex-1 px-2 py-1.5 border border-slate-300 rounded-md text-sm focus:ring-1 focus:ring-orange-400"
                                                    onKeyDown={(e) => e.key === 'Enter' && handleCreateVehicle()}
                                                />
                                                <select
                                                    value={newVehicleType}
                                                    onChange={(e) => setNewVehicleType(e.target.value)}
                                                    className="px-2 py-1.5 border border-slate-300 rounded-md text-sm focus:ring-1 focus:ring-orange-400"
                                                >
                                                    {['Car', 'Bike', 'Scooter', 'Truck', 'Other'].map(t => <option key={t}>{t}</option>)}
                                                </select>
                                                <button
                                                    onClick={handleCreateVehicle}
                                                    disabled={!newVehicleName.trim() || isCreatingVehicle}
                                                    className="px-3 py-1.5 bg-orange-600 text-white rounded-md text-sm hover:bg-orange-700 disabled:opacity-50 flex items-center gap-1"
                                                >
                                                    {isCreatingVehicle ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                                                </button>
                                                <button onClick={() => setShowVehicleForm(false)} className="px-2 py-1.5 text-slate-400 hover:text-slate-600">
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-700 mb-1.5">Liters</label>
                                            <input type="number" value={editedTransaction.metadata?.liters || ''} onChange={(e) => handleMetadataChange('liters', e.target.value)}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" step="0.1" placeholder="Optional" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-700 mb-1.5">Odometer (km)</label>
                                            <input type="number" value={editedTransaction.metadata?.odometer || ''} onChange={(e) => handleMetadataChange('odometer', e.target.value)}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Optional" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {(editedTransaction.category === 'Investment' || editedTransaction.category === 'Savings') && (
                            <div className="mt-2 p-4 bg-purple-50 rounded-lg border border-purple-100">
                                <h4 className="text-sm font-semibold text-purple-800 mb-3">Investment Details</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="col-span-2">
                                        <label className="block text-xs font-medium text-slate-700 mb-1.5">Asset / Investment Name</label>
                                        <input
                                            type="text"
                                            value={editedTransaction.metadata?.assetName || ''}
                                            onChange={(e) => handleMetadataChange('assetName', e.target.value)}
                                            placeholder="e.g. HDFC Nifty 50 Fund, SBI FD"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1.5">Investment Type</label>
                                        <select
                                            value={editedTransaction.metadata?.investmentType || InvestmentType.OTHER}
                                            onChange={(e) => handleMetadataChange('investmentType', e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                                        >
                                            {Object.values(InvestmentType).map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1.5">Units / Qty (Optional)</label>
                                        <input
                                            type="number"
                                            value={editedTransaction.metadata?.units || ''}
                                            onChange={(e) => handleMetadataChange('units', e.target.value)}
                                            placeholder="0.00"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                                            step="0.001"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Save/Cancel Actions */}
                        <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100">
                            <button
                                onClick={handleCancel}
                                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                                <X size={16} className="inline mr-1" />
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!canSave}
                                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${canSave
                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    }`}
                            >
                                <Save size={16} className="inline mr-1" />
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
