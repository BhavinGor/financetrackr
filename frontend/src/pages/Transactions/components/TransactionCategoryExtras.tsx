import React from 'react';
import { Target, Car, TrendingUp, Plus } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { Input } from '../../../components/ui/Input';
import { Vehicle, Investment } from '../../../types/index';

interface TransactionCategoryExtrasProps {
    category: string;
    isExpanded: boolean;
    onUpdateMetadata: (key: string, value: any) => void;
    metadata?: any;
    vehicles?: Vehicle[];
    investments?: Investment[];
    onAddVehicle?: () => void;
    onAddInvestment?: () => void;
}

export const TransactionCategoryExtras = ({
    category,
    isExpanded,
    onUpdateMetadata,
    metadata = {},
    vehicles = [],
    investments = [],
    onAddVehicle,
    onAddInvestment
}: TransactionCategoryExtrasProps) => {
    if (!isExpanded) return null;

    const catLower = category.toLowerCase();

    // Investment / Savings Case
    if (catLower === 'savings' || catLower === 'transfer' || catLower === 'investment') {
        return (
            <div className="animate-slide-down bg-purple-50/50 rounded-lg p-4 border border-purple-100 mt-3">
                <div className="flex items-center gap-2 mb-3 text-purple-700">
                    <TrendingUp size={18} />
                    <h4 className="font-medium text-sm">Investment / Savings Assignment</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                        label="Select Investment/Goal"
                        value={metadata.investmentId || ''}
                        onChange={(e) => onUpdateMetadata('investmentId', e.target.value)}
                        className="bg-white"
                    >
                        <option value="">-- Select Option --</option>
                        {investments.map(inv => (
                            <option key={inv.id} value={inv.id}>{inv.name} ({inv.type})</option>
                        ))}
                    </Select>
                    <div className="flex items-end">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full text-purple-600 border-purple-200 hover:bg-purple-50"
                            leftIcon={<Plus size={14} />}
                            onClick={onAddInvestment}
                        >
                            Create New Investment
                        </Button>
                    </div>

                    {/* Optional: Add unit/price tracking if needed for every transaction, 
                        or just rely on total amount for simple savings */}
                    {metadata.investmentId && (
                        <>
                            <Input
                                label="Units (Optional)"
                                type="number"
                                value={metadata.units || ''}
                                onChange={(e) => onUpdateMetadata('units', e.target.value)}
                                placeholder="0.00"
                                className="bg-white"
                            />
                            <Input
                                label="NAV / Price (Optional)"
                                type="number"
                                value={metadata.price || ''}
                                onChange={(e) => onUpdateMetadata('price', e.target.value)}
                                placeholder="Price"
                                className="bg-white"
                            />
                        </>
                    )}
                </div>
            </div>
        );
    }

    // Vehicle / Fuel Case
    if (['fuel', 'transport', 'vehicle maint.', 'maintenance'].includes(catLower)) {
        return (
            <div className="animate-slide-down bg-orange-50/50 rounded-lg p-4 border border-orange-100 mt-3">
                <div className="flex items-center gap-2 mb-3 text-orange-700">
                    <Car size={18} />
                    <h4 className="font-medium text-sm">Vehicle Expense Details</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                        label="Select Vehicle"
                        value={metadata.vehicleId || ''}
                        onChange={(e) => onUpdateMetadata('vehicleId', e.target.value)}
                        className="bg-white"
                    >
                        <option value="">-- Select Vehicle --</option>
                        {vehicles.map(v => (
                            <option key={v.id} value={v.id}>{v.name} ({v.licensePlate})</option>
                        ))}
                    </Select>
                    <div className="flex items-end">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full text-orange-600 border-orange-200 hover:bg-orange-50"
                            leftIcon={<Plus size={14} />}
                            onClick={onAddVehicle}
                        >
                            Add Vehicle
                        </Button>
                    </div>

                    {/* Fuel Logic */}
                    {catLower === 'fuel' && (
                        <>
                            <Input
                                label="Liters"
                                type="number"
                                value={metadata.liters || ''}
                                onChange={(e) => onUpdateMetadata('liters', e.target.value)}
                                placeholder="0.00"
                                className="bg-white"
                            />
                            <Input
                                label="Odometer (km)"
                                type="number"
                                value={metadata.odometer || ''}
                                onChange={(e) => onUpdateMetadata('odometer', e.target.value)}
                                placeholder="Reading"
                                className="bg-white"
                            />
                            {/* Auto-calc rate? */}
                            <Input
                                label="Rate (₹/L, Optional)"
                                type="number"
                                value={metadata.fuelRate || ''}
                                onChange={(e) => onUpdateMetadata('fuelRate', e.target.value)}
                                placeholder="Auto-calc if empty"
                                className="bg-white"
                            />
                        </>
                    )}
                </div>
            </div>
        );
    }

    return null;
};
