import React, { useState } from 'react';
import { ConfirmModal } from './ConfirmModal';
import { FuelLog, Vehicle } from '../types';
import { Car, Fuel, Plus, Search, Loader2, Gauge, Edit2, Trash2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface VehiclesProps {
  vehicles: Vehicle[];
  fuelLogs: FuelLog[];
  onAddFuelLog: (log: FuelLog) => void;
  onAddVehicle: (vehicle: Vehicle) => void;
  onEditVehicle: (vehicle: Vehicle) => void;
  onDeleteVehicle: (id: string) => void;
}

export const Vehicles: React.FC<VehiclesProps> = ({ vehicles, fuelLogs, onAddFuelLog, onAddVehicle, onEditVehicle, onDeleteVehicle }) => {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(vehicles[0]?.id || '');
  const [showLogForm, setShowLogForm] = useState(false);
  const [showAddVehicleForm, setShowAddVehicleForm] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [deleteVehicleId, setDeleteVehicleId] = useState<string | null>(null);

  // Fuel Form
  const [liters, setLiters] = useState('');
  const [cost, setCost] = useState('');
  const [mileage, setMileage] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // New Vehicle Form
  const [newVehiclePlate, setNewVehiclePlate] = useState('');
  const [newVehicleName, setNewVehicleName] = useState('');
  const [newVehicleType, setNewVehicleType] = useState('');
  const [loadingVehicle, setLoadingVehicle] = useState(false);

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
  const vehicleLogs = fuelLogs.filter(l => l.vehicleId === selectedVehicleId).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const handleLookupVehicle = async () => {
    if (!newVehiclePlate) return;
    setLoadingVehicle(true);
    // Mock API lookup
    await new Promise(resolve => setTimeout(resolve, 1500));
    setNewVehicleName(`Maruti Suzuki Swift (${newVehiclePlate.toUpperCase()})`);
    setNewVehicleType('Hatchback'); // Mock type
    setLoadingVehicle(false);
  };

  const handleAddVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehicleName || !newVehiclePlate || !newVehicleType) return;

    if (editingVehicleId) {
      // Edit mode
      const updatedVehicle: Vehicle = {
        id: editingVehicleId,
        make: newVehicleName.split(' ')[0],
        model: newVehicleName.split(' ')[1] || '',
        year: new Date().getFullYear(),
        licensePlate: newVehiclePlate.toUpperCase(),
        type: newVehicleType,
        name: newVehicleName,
        mileage: 0
      };
      onEditVehicle(updatedVehicle);
    } else {
      // Add mode
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

  const handleEditVehicle = (vehicle: Vehicle) => {
    setEditingVehicleId(vehicle.id);
    setNewVehiclePlate(vehicle.licensePlate);
    setNewVehicleName(vehicle.name);
    setNewVehicleType(vehicle.type);
    setShowAddVehicleForm(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteVehicleId(id);
  };

  const confirmDeleteVehicle = () => {
    if (deleteVehicleId) {
      onDeleteVehicle(deleteVehicleId);
      if (selectedVehicleId === deleteVehicleId && vehicles.length > 1) {
        const remainingVehicles = vehicles.filter(v => v.id !== deleteVehicleId);
        setSelectedVehicleId(remainingVehicles[0]?.id || '');
      }
      setDeleteVehicleId(null);
    }
  };

  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) return;

    const newLog: FuelLog = {
      id: `fl_${Date.now()}`,
      vehicleId: selectedVehicle.id,
      date,
      liters: parseFloat(liters),
      cost: parseFloat(cost),
      mileage: parseFloat(mileage)
    };
    onAddFuelLog(newLog);
    setShowLogForm(false);
    setLiters('');
    setCost('');
    setMileage('');
  };

  // Calculate stats
  const totalCost = vehicleLogs.reduce((acc, curr) => acc + curr.cost, 0);
  const totalLiters = vehicleLogs.reduce((acc, curr) => acc + curr.liters, 0);
  const avgEfficiency = vehicleLogs.length > 1
    ? (vehicleLogs[vehicleLogs.length - 1].mileage - vehicleLogs[0].mileage) / totalLiters // Simplified MPG calc
    : 0;

  // Chart data
  const chartData = vehicleLogs.map(log => ({
    date: log.date,
    cost: log.cost,
    efficiency: log.mileage
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Vehicle Tracking</h1>
          <p className="text-slate-500">Monitor fuel efficiency and maintenance costs.</p>
        </div>
        <button
          className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-900 transition-colors"
          onClick={() => setShowAddVehicleForm(!showAddVehicleForm)}
        >
          <Plus size={18} /> {showAddVehicleForm ? 'Close' : 'Add Vehicle'}
        </button>
      </div>

      {showAddVehicleForm && (
        <form onSubmit={handleAddVehicle} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-4 animate-in fade-in slide-in-from-top-2">
          <h3 className="font-bold text-slate-800 mb-3">Add New Vehicle</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="relative">
              <input
                type="text"
                placeholder="License Plate (e.g. MH12AB1234)"
                value={newVehiclePlate} onChange={e => setNewVehiclePlate(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <button
                type="button"
                onClick={handleLookupVehicle}
                disabled={loadingVehicle || !newVehiclePlate}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-600 hover:text-blue-700 disabled:opacity-50"
              >
                {loadingVehicle ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Vehicle Name (e.g. Maruti Swift)"
                value={newVehicleName} onChange={e => setNewVehicleName(e.target.value)}
                className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <input
                type="text"
                placeholder="Type (e.g. SUV)"
                value={newVehicleType} onChange={e => setNewVehicleType(e.target.value)}
                className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700">Save Vehicle</button>
        </form>
      )}

      {/* Vehicle Selector Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {vehicles.map(v => (
          <button
            key={v.id}
            onClick={() => setSelectedVehicleId(v.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${selectedVehicleId === v.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            {v.make} {v.model}
          </button>
        ))}
      </div>

      {selectedVehicle ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                <Car size={24} />
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-500 uppercase font-semibold">Vehicle Info</p>
                <p className="font-bold text-slate-800">{selectedVehicle.year} {selectedVehicle.make}</p>
                <p className="text-sm text-slate-400">{selectedVehicle.licensePlate}</p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handleEditVehicle(selectedVehicle)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Edit Vehicle"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDeleteClick(selectedVehicle.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete Vehicle"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="p-3 bg-orange-50 text-orange-600 rounded-lg">
                <Fuel size={24} />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold">Total Fuel Cost</p>
                <p className="font-bold text-slate-800">₹{totalCost.toFixed(2)}</p>
                <p className="text-sm text-slate-400">{totalLiters.toFixed(1)} Liters filled</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                <Gauge size={24} />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-semibold">Avg. Mileage</p>
                <p className="font-bold text-slate-800">{avgEfficiency > 0 ? avgEfficiency.toFixed(1) : '-'} km/L</p>
                <p className="text-sm text-slate-400">Efficiency</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Logs List & Form */}
            <div className="lg:col-span-1 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-800">Fuel Log</h3>
                <button onClick={() => setShowLogForm(!showLogForm)} className="text-sm text-blue-600 hover:underline">
                  {showLogForm ? 'Close' : 'Add Entry'}
                </button>
              </div>

              {showLogForm && (
                <form onSubmit={handleAddLog} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-4 animate-in fade-in slide-in-from-top-2">
                  <div className="space-y-3">
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" required />
                    <input type="number" placeholder="Liters" value={liters} onChange={e => setLiters(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" required step="0.1" />
                    <input type="number" placeholder="Total Cost (₹)" value={cost} onChange={e => setCost(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" required step="0.1" />
                    <input type="number" placeholder="Odometer (km)" value={mileage} onChange={e => setMileage(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" required />
                    <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700">Save Entry</button>
                  </div>
                </form>
              )}

              <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden max-h-96 overflow-y-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600 font-medium">
                    <tr>
                      <th className="px-4 py-2">Date</th>
                      <th className="px-4 py-2">Cost</th>
                      <th className="px-4 py-2">Liters</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vehicleLogs.length === 0 ? (
                      <tr><td colSpan={3} className="px-4 py-4 text-center text-slate-400">No logs yet</td></tr>
                    ) : (
                      vehicleLogs.map(log => (
                        <tr key={log.id}>
                          <td className="px-4 py-2">{log.date}</td>
                          <td className="px-4 py-2">₹{log.cost.toFixed(2)}</td>
                          <td className="px-4 py-2">{log.liters} L</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Charts */}
            <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-4">Fuel Cost History</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(v) => `₹${v}`} />
                    <Tooltip />
                    <Line type="monotone" dataKey="cost" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-slate-500">Select a vehicle to view details.</div>
      )}

      <ConfirmModal
        isOpen={!!deleteVehicleId}
        title="Delete Vehicle"
        message="Are you sure you want to delete this vehicle? All associated fuel logs will also be deleted."
        confirmText="Delete"
        isDestructive={true}
        onConfirm={confirmDeleteVehicle}
        onCancel={() => setDeleteVehicleId(null)}
      />
    </div>
  );
};
