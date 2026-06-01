// store/useAppStore.ts
import { create } from 'zustand';

export const useAppStore = create((set) => ({
  selectedShipment: null,
  setSelectedShipment: (s: any) => set({ selectedShipment: s })
}));