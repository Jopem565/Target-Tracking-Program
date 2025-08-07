import { create } from 'zustand';

interface TableOffHoursStore {
  TableValuesHoursOff: number;
  setTableValuesHoursOff: (value: number) => void;
}

//using local storage for the hours taken off
export const tableOffHours = create<TableOffHoursStore>((set) => ({
  TableValuesHoursOff: 0,
  setTableValuesHoursOff: (value) => set(() => ({ TableValuesHoursOff: value })),
}));
