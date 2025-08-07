import { create } from 'zustand';

type HoursTakenOffState = {
  hoursTakenOff: number | null;
  setHoursTakenOff: (hours: number) => void;
};

//local storage for the hours taken off
export const useHoursTakenOffStore = create<HoursTakenOffState>((set) => ({
  hoursTakenOff: null,
  setHoursTakenOff: (hours: number) => set({ hoursTakenOff: hours }),
}));
