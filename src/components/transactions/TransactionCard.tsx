import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Badge } from '../ui/Badge';
import { TransactionCategoryExtras } from './TransactionCategoryExtras';
import { ChevronDown, ChevronUp, Trash2, GripVertical, Calendar, DollarSign, StickyNote, Plus, Check } from 'lucide-react';
import { Transaction, TransactionType, Vehicle, Investment } from '../../types';
import { formatDateToDDMMYYYY } from '../../utils/formatters';

interface TransactionCardProps {
    transaction: Transaction;
    accounts: any[];
    onUpdate: (id: string, updates: Partial<Transaction>) => void;
    onDelete: (id: string) => void;
    isExpanded?: boolean;
    // New Props for Integration
    vehicles?: Vehicle[];
    investments?: Investment[];
    onAddVehicleClick?: () => void;
    onAddInvestmentClick?: () => void;
}

import { getAllCategories, saveCustomCategory } from '../../services/categoryStorage';

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
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const [availableCategories, setAvailableCategories] = useState<string[]>([]);
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');

    const toggleExpand = () => setIsExpanded(!isExpanded);

    // Load categories on mount
    useEffect(() => {
        const loadCategories = async () => {
            const cats = await getAllCategories();
            setAvailableCategories(cats);
        };
        loadCategories();
    }, []);

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return;
        const success = await saveCustomCategory(newCategoryName);
        if (success) {
            const updatedCats = await getAllCategories();
            setAvailableCategories(updatedCats);
            onUpdate(transaction.id, { category: newCategoryName });
            setIsAddingCategory(false);
            setNewCategoryName('');
        }
    };

    // Helper: propagate metadata changes
    const handleMetadataUpdate = (key: string, value: any) => {
        const currentMeta = (transaction as any).metadata || {};
        onUpdate(transaction.id, {
            metadata: { ...currentMeta, [key]: value }
        } as any);
    };

    return (
        <Card className={`transition-all duration-300 ${isExpanded ? 'ring-2 ring-primary-100 shadow-md transform scale-[1.01]' : 'hover:shadow-md'}`}>
            <div className="p-3">
                {/* Main Row - Compact & Editable */}
                <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">

                    {/* Drag Handle & Date */}
                    <div className="flex items-center gap-2">
                        <div className="text-slate-300 cursor-grab hover:text-slate-400">
                            <GripVertical size={16} />
                        </div>
                        <div className="w-32">
                            <Input
                                type="date"
                                value={transaction.date}
                                onChange={(e) => onUpdate(transaction.id, { date: e.target.value })}
                                className="h-9 text-sm bg-slate-50 border-slate-200"
                            />
                        </div>
                    </div>

                    {/* Description & Account */}
                    <div className="flex-1 min-w-0 w-full">
                        <Input
                            type="text"
                            value={transaction.description}
                            onChange={(e) => onUpdate(transaction.id, { description: e.target.value })}
                            className="h-9 text-sm font-medium border-slate-200 focus:border-primary-500"
                            placeholder="Description"
                        />
                        <div className="flex items-center gap-2 mt-1">
                            <Select
                                value={transaction.accountId}
                                onChange={(e) => onUpdate(transaction.id, { accountId: e.target.value })}
                                className="h-6 text-[10px] py-0 pl-1 pr-4 w-auto bg-slate-50 border-none text-slate-500"
                            >
                                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                            </Select>
                        </div>
                    </div>

                    {/* Amount & Type Toggle */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onUpdate(transaction.id, { type: transaction.type === TransactionType.INCOME ? TransactionType.EXPENSE : TransactionType.INCOME })}
                            className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors shadow-sm ${transaction.type === TransactionType.INCOME
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-red-100 text-red-700 hover:bg-red-200'
                                }`}
                            title={`Current: ${transaction.type === TransactionType.INCOME ? 'Income' : 'Expense'} (Click to switch)`}
                        >
                            {transaction.type === TransactionType.INCOME ? <Plus size={16} /> : <div className="w-3 h-0.5 bg-current" />}
                        </button>

                        <div className="w-28 relative">
                            <span className={`absolute left-2 top-1/2 -translate-y-1/2 font-bold ${transaction.type === TransactionType.INCOME ? 'text-green-600' : 'text-slate-600'
                                }`}>
                                {transaction.type === TransactionType.INCOME ? '+' : '-'}
                            </span>
                            <Input
                                type="number"
                                value={transaction.amount}
                                onChange={(e) => onUpdate(transaction.id, { amount: parseFloat(e.target.value) })}
                                className={`h-9 text-sm font-bold text-right pl-6 ${transaction.type === TransactionType.INCOME ? 'text-green-700' : 'text-slate-900'
                                    }`}
                            />
                        </div>
                    </div>

                    {/* Category Select */}
                    <div className="w-full md:w-40">
                        {isAddingCategory ? (
                            <div className="flex gap-1 animate-in">
                                <Input
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    placeholder="New Cat..."
                                    className="h-9 text-xs"
                                    autoFocus
                                />
                                <Button size="sm" variant="primary" onClick={handleAddCategory} className="px-2 h-9">
                                    <Check size={14} />
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setIsAddingCategory(false)} className="px-1 h-9">
                                    <Trash2 size={14} />
                                </Button>
                            </div>
                        ) : (
                            <Select
                                value={transaction.category}
                                onChange={(e) => {
                                    if (e.target.value === '__NEW__') setIsAddingCategory(true);
                                    else onUpdate(transaction.id, { category: e.target.value });
                                }}
                                className="h-9 text-sm border-slate-200"
                            >
                                {availableCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                <option value="__NEW__" className="font-semibold text-primary-600">+ New Category</option>
                            </Select>
                        )}
                    </div>

                    {/* Expand/Delete */}
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(transaction.id)}
                            className="text-slate-300 hover:text-red-500 hover:bg-red-50 h-9 w-9 p-0"
                            title="Delete"
                        >
                            <Trash2 size={16} />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={toggleExpand}
                            className={`h-9 w-9 p-0 ${isExpanded ? 'text-primary-600 bg-primary-50' : 'text-slate-400'}`}
                        >
                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </Button>
                    </div>
                </div>

                {/* Expanded Sections (Extras & Notes) */}
                {isExpanded && (
                    <div className="pt-3 mt-3 border-t border-slate-100 animate-slide-down">
                        <div className="grid grid-cols-1 gap-4">
                            {/* Integration Extras */}
                            <TransactionCategoryExtras
                                category={transaction.category}
                                isExpanded={true}
                                onUpdateMetadata={(key, value) => {
                                    handleMetadataUpdate(key, value);
                                }}
                                metadata={(transaction as any).metadata || {}}
                                vehicles={vehicles}
                                investments={investments}
                                onAddVehicle={onAddVehicleClick}
                                onAddInvestment={onAddInvestmentClick}
                            />

                            {/* Additional Notes */}
                            <div className="flex items-start gap-2 max-w-2xl">
                                <StickyNote size={16} className="text-slate-400 mt-2.5" />
                                <div className="flex-1">
                                    <label className="text-xs font-medium text-slate-500 mb-1 block">Notes / Comments</label>
                                    <Input
                                        value={transaction.notes || ''}
                                        onChange={(e) => onUpdate(transaction.id, { notes: e.target.value })}
                                        placeholder="Add details about this transaction..."
                                        className="text-sm bg-slate-50"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
};
