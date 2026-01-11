import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Investment } from '../../../types/index';

interface AddInvestmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (investment: Investment) => Promise<void>;
}

export const AddInvestmentModal = ({ isOpen, onClose, onSave }: AddInvestmentModalProps) => {
    const [name, setName] = useState('');
    const [type, setType] = useState('Mutual Fund');
    const [targetAmount, setTargetAmount] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!name) return;
        setIsSubmitting(true);
        try {
            await onSave({
                id: crypto.randomUUID(),
                name,
                type: type as any,
                investedAmount: 0,
                currentValue: 0,
                date: new Date().toISOString(),
                quantity: targetAmount ? parseFloat(targetAmount) : undefined // Map target to quantity or just ignore if not in schema, but for now let's treat it as possibly quantity or metadata
            });
            onClose();
            setName('');
            setTargetAmount('');
        } catch (error) {
            console.error("Failed to save investment", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add New Investment / Goal">
            <div className="space-y-4">
                <Input
                    label="Investment Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Nifty 50 Index Fund"
                />
                <Select
                    label="Type"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                >
                    <option value="Mutual Fund">Mutual Fund</option>
                    <option value="Stock">Stock</option>
                    <option value="FD">Fixed Deposit</option>
                    <option value="Gold">Gold</option>
                    <option value="PPF">PPF</option>
                    <option value="Savings Goal">Savings Goal</option>
                </Select>
                <Input
                    label="Target Amount (Optional)"
                    type="number"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    placeholder="e.g. 100000"
                />
                <div className="flex justify-end gap-3 mt-4">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button
                        variant="primary"
                        onClick={handleSubmit}
                        isLoading={isSubmitting}
                        disabled={!name}
                    >
                        Create Investment
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
