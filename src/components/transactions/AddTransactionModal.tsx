import React, { useState, useEffect } from 'react';
import { Transaction, Account, TransactionType, Vehicle, Investment } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { TransactionCategoryExtras } from './TransactionCategoryExtras';
import { getAllCategories, saveCustomCategory } from '../../services/categoryStorage';
import { Check, Plus, Trash2 } from 'lucide-react';

interface AddTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (tx: Transaction) => Promise<void>;
    accounts: Account[];
    vehicles?: Vehicle[];
    investments?: Investment[];
    onAddVehicle?: () => void;
    onAddInvestment?: () => void;
}

export const AddTransactionModal = ({
    isOpen, onClose, onSave, accounts,
    vehicles = [], investments = [], onAddVehicle, onAddInvestment
}: AddTransactionModalProps) => {
    const [formData, setFormData] = useState<Partial<Transaction>>({
        date: new Date().toISOString().split('T')[0],
        type: TransactionType.EXPENSE,
        category: 'Food',
        description: '',
        amount: 0,
        accountId: accounts[0]?.id || ''
    });
    const [metadata, setMetadata] = useState<any>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Custom Category State
    const [availableCategories, setAvailableCategories] = useState<string[]>([]);
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');

    // Load categories
    useEffect(() => {
        const loadCats = async () => {
            const cats = await getAllCategories();
            setAvailableCategories(cats);
        };
        loadCats();
    }, [isOpen]); // Reload when opened to be fresh

    // Reset form when opened
    useEffect(() => {
        if (isOpen) {
            setFormData({
                date: new Date().toISOString().split('T')[0],
                type: TransactionType.EXPENSE,
                category: 'Food',
                description: '',
                amount: 0,
                accountId: accounts[0]?.id || ''
            });
            setMetadata({});
            setIsAddingCategory(false);
            setNewCategoryName('');
        }
    }, [isOpen, accounts]);

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return;
        const success = await saveCustomCategory(newCategoryName);
        if (success) {
            const updatedCats = await getAllCategories();
            setAvailableCategories(updatedCats);
            setFormData(prev => ({ ...prev, category: newCategoryName }));
            setIsAddingCategory(false);
            setNewCategoryName('');
        }
    };

    const handleSubmit = async () => {
        if (!formData.amount || !formData.description || !formData.accountId) return;

        setIsSubmitting(true);
        try {
            // Merge metadata into transaction object
            const txToSave = {
                ...formData,
                metadata: Object.keys(metadata).length > 0 ? metadata : undefined
            };
            await onSave(txToSave as Transaction);
            onClose();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add New Transaction">
            <div className="space-y-4">
                <div className="flex gap-4">
                    <div className="flex-1">
                        <Select
                            label="Type"
                            value={formData.type}
                            onChange={(e) => setFormData({ ...formData, type: e.target.value as TransactionType })}
                        >
                            <option value={TransactionType.EXPENSE}>Expense</option>
                            <option value={TransactionType.INCOME}>Income</option>
                        </Select>
                    </div>
                    <div className="flex-1">
                        <Input
                            label="Date"
                            type="date"
                            value={formData.date || ''}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        />
                    </div>
                </div>

                <Input
                    label="Amount"
                    type="number"
                    value={formData.amount || ''}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                    placeholder="0.00"
                    leftIcon={<span className="text-slate-500 font-bold">₹</span>}
                />

                <Input
                    label="Description"
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="What was this for?"
                />

                <div className="flex gap-4">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
                        {isAddingCategory ? (
                            <div className="flex gap-2">
                                <Input
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    placeholder="New Category Name"
                                    className="bg-white"
                                    autoFocus
                                />
                                <Button type="button" onClick={handleAddCategory} variant="primary" className="px-3">
                                    <Check size={16} />
                                </Button>
                                <Button type="button" onClick={() => setIsAddingCategory(false)} variant="ghost" className="px-2">
                                    <Trash2 size={16} />
                                </Button>
                            </div>
                        ) : (
                            <Select
                                value={formData.category as string}
                                onChange={(e) => {
                                    if (e.target.value === '__NEW__') setIsAddingCategory(true);
                                    else setFormData({ ...formData, category: e.target.value });
                                }}
                            >
                                {availableCategories.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                                <option value="__NEW__" className="font-semibold text-primary-600">+ New Category</option>
                            </Select>
                        )}
                    </div>
                    <div className="flex-1">
                        <Select
                            label="Account"
                            value={formData.accountId}
                            onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                        >
                            {accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name}</option>
                            ))}
                        </Select>
                    </div>
                </div>

                {/* Extras Component */}
                <TransactionCategoryExtras
                    category={formData.category as string}
                    metadata={metadata}
                    onUpdateMetadata={(key, value) => {
                        setMetadata(prev => ({ ...prev, [key]: value }));
                    }}
                    isExpanded={true}
                    vehicles={vehicles}
                    investments={investments}
                    onAddVehicle={onAddVehicle}
                    onAddInvestment={onAddInvestment}
                />

                <div className="flex justify-end gap-3 mt-6">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button
                        variant="primary"
                        onClick={handleSubmit}
                        isLoading={isSubmitting}
                        disabled={!formData.amount || !formData.description}
                    >
                        Add Transaction
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
