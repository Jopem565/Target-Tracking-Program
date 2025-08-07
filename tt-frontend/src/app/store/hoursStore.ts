import { create } from 'zustand';

interface HoursStoreState {
  hoursOff: number | null;
  setHoursOff: (hours: number) => void;
}

// local storage for the hours off that an employee
export const useHoursStore = create<HoursStoreState>((set) => ({
  hoursOff: null,

  // setter
  setHoursOff: (hours: number) => set({ hoursOff: hours }),
}));