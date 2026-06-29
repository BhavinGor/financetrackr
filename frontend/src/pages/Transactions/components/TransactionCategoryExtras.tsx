import React, { useState } from 'react';
import { Car, TrendingUp, Plus, Check, X, Loader2 } from 'lucide-react';
import { Vehicle, InvestmentType } from '../../../types/index';
import { useVehicleStore } from '../../../stores/vehicleStore';
import { generateId } from '../../../utils/id';

interface TransactionCategoryExtrasProps {
    category: string;
    isExpanded: boolean;
    onUpdateMetadata: (key: string, value: any) => void;
    metadata?: any;
    vehicles?: Vehicle[];
}

export const TransactionCategoryExtras = ({
    category,
    isExpanded,
    onUpdateMetadata,
    metadata = {},
}: TransactionCategoryExtrasProps) => {
    const { vehicles: storeVehicles, addVehicle: addVehicleToStore } = useVehicleStore();

    const [showVehicleForm, setShowVehicleForm] = useState(false);
    const [newVehicleName, setNewVehicleName] = useState('');
    const [newVehicleType, setNewVehicleType] = useState('Car');
    const [isCreatingVehicle, setIsCreatingVehicle] = useState(false);

    if (!isExpanded) return null;

    const catLower = category.toLowerCase();

    const handleCreateVehicle = async () => {
        if (!newVehicleName.trim()) return;
        setIsCreatingVehicle(true);
        try {
            const id = generateId('veh');
            await addVehicleToStore({ id, name: newVehicleName, make: '', model: '', year: new Date().getFullYear(), licensePlate: '', mileage: 0, type: newVehicleType });
            onUpdateMetadata('vehicleId', id);
            setShowVehicleForm(false);
            setNewVehicleName('');
        } finally {
            setIsCreatingVehicle(false);
        }
    };

    // Investment / Savings Case
    if (catLower === 'savings' || catLower === 'transfer' || catLower === 'investment') {
        return (
            <div className="animate-slide-down bg-purple-50/50 rounded-lg p-4 border border-purple-100 mt-3">
                <div className="flex items-center gap-2 mb-3 text-purple-700">
                    <TrendingUp size={18} />
                    <h4 className="font-medium text-sm">Investment Details</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-slate-700 mb-1.5">Asset / Investment Name</label>
                        <input
                            type="text"
                            value={metadata.assetName || ''}
                            onChange={(e) => onUpdateMetadata('assetName', e.target.value)}
                            placeholder="e.g. HDFC Nifty 50 Fund, SBI FD, Gold ETF"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1.5">Investment Type</label>
                        <select
                            value={metadata.investmentType || InvestmentType.OTHER}
                            onChange={(e) => onUpdateMetadata('investmentType', e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                        >
                            {Object.values(InvestmentType).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1.5">Units / Qty (Optional)</label>
                        <input
                            type="number"
                            value={metadata.units || ''}
                            onChange={(e) => onUpdateMetadata('units', e.target.value)}
                            placeholder="0.00"
                            step="0.001"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                        />
                    </div>
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
                    <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-slate-700 mb-1.5">Vehicle</label>
                        <div className="flex gap-2">
                            <select
                                value={metadata.vehicleId || ''}
                                onChange={(e) => { onUpdateMetadata('vehicleId', e.target.value); setShowVehicleForm(false); }}
                                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                            >
                                <option value="">-- Select Vehicle --</option>
                                {storeVehicles.map(v => (
                                    <option key={v.id} value={v.id}>{v.name}</option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={() => setShowVehicleForm(f => !f)}
                                className="px-3 py-2 text-sm font-medium text-orange-700 border border-orange-300 rounded-lg hover:bg-orange-100 transition-colors flex items-center gap-1"
                            >
                                <Plus size={14} /> Add
                            </button>
                        </div>
                    </div>

                    {showVehicleForm && (
                        <div className="md:col-span-2 bg-white border border-orange-200 rounded-lg p-3 space-y-2">
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
                                    className="px-2 py-1.5 border border-slate-300 rounded-md text-sm"
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

                    {/* Fuel-specific fields */}
                    {catLower === 'fuel' && (
                        <>
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1.5">Liters</label>
                                <input
                                    type="number"
                                    value={metadata.liters || ''}
                                    onChange={(e) => onUpdateMetadata('liters', e.target.value)}
                                    placeholder="0.00"
                                    step="0.1"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1.5">Odometer (km)</label>
                                <input
                                    type="number"
                                    value={metadata.odometer || ''}
                                    onChange={(e) => onUpdateMetadata('odometer', e.target.value)}
                                    placeholder="Reading"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                                />
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    }

    return null;
};
