import React, { useState } from 'react';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { FuelLog, Vehicle } from '../../types/index';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Car, Fuel, Plus, Search, Loader2, Gauge, Edit2, Trash2, CheckCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface VehiclesPageProps {
    vehicles: Vehicle[];
    fuelLogs: FuelLog[];
    onAddFuelLog: (log: FuelLog) => void;
    onAddVehicle: (vehicle: Vehicle) => void;
    onEditVehicle: (vehicle: Vehicle) => void;
    onDeleteVehicle: (id: string) => void;
}

export const VehiclesPage = ({ vehicles, fuelLogs, onAddFuelLog, onAddVehicle, onEditVehicle, onDeleteVehicle }: VehiclesPageProps) => {
    const [selectedVehicleId, setSelectedVehicleId] = useState<string>(vehicles[0]?.id || '');
    const [showLogForm, setShowLogForm] = useState(false);
    const [showAddVehicleForm, setShowAddVehicleForm] = useState(false);
    const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    // Use Effect to select first vehicle if none selected
    React.useEffect(() => {
        if (!selectedVehicleId && vehicles.length > 0) {
            setSelectedVehicleId(vehicles[0].id);
        }
    }, [vehicles, selectedVehicleId]);

    // Fuel Form State
    const [liters, setLiters] = useState('');
    const [cost, setCost] = useState('');
    const [mileage, setMileage] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    // Vehicle Form State
    const [newVehiclePlate, setNewVehiclePlate] = useState('');
    const [newVehicleName, setNewVehicleName] = useState('');
    const [newVehicleType, setNewVehicleType] = useState('');
    const [loadingVehicle, setLoadingVehicle] = useState(false);

    const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
    const vehicleLogs = fuelLogs
        .filter(l => l.vehicleId === selectedVehicleId)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // --- Handlers ---
    const handleLookupVehicle = async () => {
        if (!newVehiclePlate) return;
        setLoadingVehicle(true);
        await new Promise(resolve => setTimeout(resolve, 1500)); // Mock API
        setNewVehicleName(`Maruti Suzuki Swift (${newVehiclePlate.toUpperCase()})`);
        setNewVehicleType('Hatchback');
        setLoadingVehicle(false);
    };

    const handleAddVehicleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newVehicleName || !newVehiclePlate || !newVehicleType) return;

        if (editingVehicleId) {
            onEditVehicle({
                id: editingVehicleId,
                make: newVehicleName.split(' ')[0],
                model: newVehicleName.split(' ')[1] || '',
                year: new Date().getFullYear(),
                licensePlate: newVehiclePlate.toUpperCase(),
                type: newVehicleType,
                name: newVehicleName,
                mileage: 0
            });
        } else {
            const newVehicle: Vehicle = {
                id: `v_${Date.now()}`,
                make: newVehicleName.split(' ')[0],
                model: newVehicleName.split(' ')[1] || '',
                year: new Date().getFullYear(),
                licensePlate: newVehiclePlate.toUpperCase(),
                type: newVehicleType,
                name: newVehicleName,
                mileage: 0
            };
            onAddVehicle(newVehicle);
            setSelectedVehicleId(newVehicle.id);
        }

        setShowAddVehicleForm(false);
        setEditingVehicleId(null);
        setNewVehiclePlate('');
        setNewVehicleName('');
        setNewVehicleType('');
    };

    const handleEditClick = (v: Vehicle) => {
        setEditingVehicleId(v.id);
        setNewVehiclePlate(v.licensePlate);
        setNewVehicleName(v.name);
        setNewVehicleType(v.type || '');
        setShowAddVehicleForm(true);
    }

    const handleAddLogSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedVehicle) return;

        onAddFuelLog({
            id: `fl_${Date.now()}`,
            vehicleId: selectedVehicle.id,
            date,
            liters: parseFloat(liters),
            cost: parseFloat(cost),
            mileage: parseFloat(mileage)
        });
        setShowLogForm(false);
        setLiters('');
        setCost('');
        setMileage('');
    };

    // Stats
    const totalCost = vehicleLogs.reduce((acc, curr) => acc + curr.cost, 0);
    const totalLiters = vehicleLogs.reduce((acc, curr) => acc + curr.liters, 0);
    const avgEfficiency = vehicleLogs.length > 1
        ? (vehicleLogs[vehicleLogs.length - 1].mileage - vehicleLogs[0].mileage) / totalLiters
        : 0;

    const chartData = vehicleLogs.map(log => ({
        date: log.date,
        cost: log.cost,
        efficiency: log.mileage
    }));

    return (
        <div className="space-y-6 animate-in fade-in pb-10">

            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Vehicles</h1>
                    <p className="text-slate-500 mt-1">Manage your fleet and track fuel.</p>
                </div>
                <Button onClick={() => setShowAddVehicleForm(true)} leftIcon={<Plus size={18} />}>
                    Add Vehicle
                </Button>
            </div>

            {/* Tabs / Vehicle Selector */}
            {vehicles.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2 border-b border-slate-200">
                    {vehicles.map(v => (
                        <button
                            key={v.id}
                            onClick={() => setSelectedVehicleId(v.id)}
                            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 ${selectedVehicleId === v.id
                                ? 'border-primary-600 text-primary-600 bg-primary-50/50'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                }`}
                        >
                            {v.name}
                        </button>
                    ))}
                </div>
            )}

            {selectedVehicle ? (
                <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card>
                            <CardContent className="p-6 flex items-center gap-4">
                                <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                                    <Car size={24} />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 font-semibold uppercase">Vehicle Info</p>
                                    <h3 className="text-lg font-bold text-slate-900">{selectedVehicle.make} {selectedVehicle.model}</h3>
                                    <p className="text-sm text-slate-400">{selectedVehicle.licensePlate}</p>
                                </div>
                                <div className="ml-auto flex gap-1">
                                    <button onClick={() => handleEditClick(selectedVehicle)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"><Edit2 size={16} /></button>
                                    <button onClick={() => setDeleteId(selectedVehicle.id)} className="p-2 hover:bg-red-50 rounded-lg text-red-500"><Trash2 size={16} /></button>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-6 flex items-center gap-4">
                                <div className="p-3 bg-orange-100 text-orange-600 rounded-xl">
                                    <Fuel size={24} />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 font-semibold uppercase">Total Fuel Cost</p>
                                    <h3 className="text-lg font-bold text-slate-900">₹{totalCost.toFixed(0)}</h3>
                                    <p className="text-sm text-slate-400">{totalLiters.toFixed(1)} Liters</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-6 flex items-center gap-4">
                                <div className="p-3 bg-green-100 text-green-600 rounded-xl">
                                    <Gauge size={24} />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 font-semibold uppercase">Avg. Efficiency</p>
                                    <h3 className="text-lg font-bold text-slate-900">{avgEfficiency.toFixed(1)} km/L</h3>
                                    <p className="text-sm text-slate-400">Mileage</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Main Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">

                        {/* Logs List - Left Col */}
                        <Card className="lg:col-span-1 flex flex-col h-full">
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <CardTitle>Fuel Logs</CardTitle>
                                    <Button variant="ghost" size="sm" onClick={() => setShowLogForm(true)} leftIcon={<Plus size={14} />}>Add Entry</Button>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 overflow-auto max-h-[500px] p-0">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-600 font-medium sticky top-0">
                                        <tr>
                                            <th className="px-4 py-3">Date</th>
                                            <th className="px-4 py-3">Cost</th>
                                            <th className="px-4 py-3">L</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {vehicleLogs.length === 0 ? (
                                            <tr><td colSpan={3} className="p-8 text-center text-slate-400">No logs yet</td></tr>
                                        ) : (
                                            vehicleLogs.map(log => (
                                                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-4 py-3">{log.date}</td>
                                                    <td className="px-4 py-3 font-medium">₹{log.cost}</td>
                                                    <td className="px-4 py-3 text-slate-500">{log.liters}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>

                        {/* Charts - Right Col */}
                        <Card className="lg:col-span-2">
                            <CardHeader><CardTitle>Cost History</CardTitle></CardHeader>
                            <CardContent className="h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(v) => `₹${v}`} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Line type="monotone" dataKey="cost" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>
                </>
            ) : (
                <div className="text-center py-20 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <Car size={48} className="mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-medium text-slate-900">No vehicles found</h3>
                    <p className="text-slate-500 mb-6">Add a vehicle to start tracking fuel and maintenance.</p>
                    <Button onClick={() => setShowAddVehicleForm(true)}>Add First Vehicle</Button>
                </div>
            )}

            {/* Modal: Add/Edit Vehicle */}
            <Modal isOpen={showAddVehicleForm} onClose={() => setShowAddVehicleForm(false)} title={editingVehicleId ? "Edit Vehicle" : "Add Vehicle"}>
                <form onSubmit={handleAddVehicleSubmit} className="space-y-4">
                    <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <Input
                                label="License Plate"
                                placeholder="MH12AB1234"
                                value={newVehiclePlate}
                                onChange={e => setNewVehiclePlate(e.target.value)}
                            />
                            <button
                                type="button"
                                onClick={handleLookupVehicle}
                                disabled={loadingVehicle || !newVehiclePlate}
                                className="absolute right-2 top-[34px] text-blue-600 hover:text-blue-700 disabled:opacity-50"
                            >
                                {loadingVehicle ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                            </button>
                        </div>
                    </div>
                    <Input label="Vehicle Name" placeholder="e.g. Honda City" value={newVehicleName} onChange={e => setNewVehicleName(e.target.value)} />
                    <Input label="Type" placeholder="e.g. Sedan" value={newVehicleType} onChange={e => setNewVehicleType(e.target.value)} />

                    <div className="flex justify-end gap-3 mt-6">
                        <Button variant="secondary" onClick={() => setShowAddVehicleForm(false)}>Cancel</Button>
                        <Button type="submit" variant="primary">Save Vehicle</Button>
                    </div>
                </form>
            </Modal>

            {/* Modal: Add Fuel Log */}
            <Modal isOpen={showLogForm} onClose={() => setShowLogForm(false)} title="Add Fuel Log">
                <form onSubmit={handleAddLogSubmit} className="space-y-4">
                    <Input label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} />
                    <div className="flex gap-4">
                        <Input label="Liters" type="number" step="0.1" value={liters} onChange={e => setLiters(e.target.value)} containerClassName="flex-1" />
                        <Input label="Total Cost (₹)" type="number" value={cost} onChange={e => setCost(e.target.value)} containerClassName="flex-1" />
                    </div>
                    <Input label="Odometer (km)" type="number" value={mileage} onChange={e => setMileage(e.target.value)} />

                    <div className="flex justify-end gap-3 mt-6">
                        <Button variant="secondary" onClick={() => setShowLogForm(false)}>Cancel</Button>
                        <Button type="submit" variant="primary">Save Entry</Button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                isOpen={!!deleteId}
                onClose={() => setDeleteId(null)}
                onConfirm={() => {
                    if (deleteId) {
                        onDeleteVehicle(deleteId);
                        setDeleteId(null);
                    }
                }}
                title="Delete Vehicle"
                message="Are you sure you want to delete this vehicle? All associated fuel logs will also be deleted."
            />

        </div>
    );
};
