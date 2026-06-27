import { create } from 'zustand';
import { Vehicle } from '../types';
import {
  fetchVehicles,
  addVehicleToDb,
  updateVehicleInDb,
  deleteVehicleFromDb,
} from '../services/supabase/database';

interface VehicleState {
  vehicles: Vehicle[];
  loading: boolean;
  load: () => Promise<void>;
  addVehicle: (vehicle: Vehicle) => Promise<void>;
  updateVehicle: (vehicle: Vehicle) => Promise<void>;
  deleteVehicle: (id: string) => Promise<void>;
}

export const useVehicleStore = create<VehicleState>((set) => ({
  vehicles: [],
  loading: true,

  load: async () => {
    try {
      const vehicles = await fetchVehicles();
      set({ vehicles });
    } finally {
      set({ loading: false });
    }
  },

  addVehicle: async (vehicle: Vehicle) => {
    set((s) => ({ vehicles: [...s.vehicles, vehicle] }));
    try {
      const id = await addVehicleToDb(vehicle);
      set((s) => ({
        vehicles: s.vehicles.map((v) => (v.id === vehicle.id ? { ...vehicle, id } : v)),
      }));
    } catch {
      set((s) => ({ vehicles: s.vehicles.filter((v) => v.id !== vehicle.id) }));
    }
  },

  updateVehicle: async (vehicle: Vehicle) => {
    set((s) => ({ vehicles: s.vehicles.map((v) => (v.id === vehicle.id ? vehicle : v)) }));
    await updateVehicleInDb(vehicle);
  },

  deleteVehicle: async (id: string) => {
    set((s) => ({ vehicles: s.vehicles.filter((v) => v.id !== id) }));
    await deleteVehicleFromDb(id);
  },
}));
