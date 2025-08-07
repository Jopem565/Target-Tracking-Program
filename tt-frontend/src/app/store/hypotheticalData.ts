import { EventInput } from '@fullcalendar/core/index.js';
import { create } from 'zustand';

interface HypotheticalDataInterface {
  'ID' : string,
  'Hours Off': number | null,
  'Target' : string | null,
  'Leave Hours': number | null,
  'Average Hours for Mid Goal': number | null,
  'Average Hours for End Goal': number | null,
  'Events' : EventInput[],
  'Holiday Events': EventInput[],
  [key: `Indirect ${number}`]: number | null,
  [key: `Direct ${number}`]: number | null,
  indirectHoursHyp: number[],
  directHoursHyp: number[]

}
//Store of all data in plan ahead page
interface HypotheticalDataState {
  hypotheticalData: HypotheticalDataInterface | null;
  setHypotheticalData: (data: HypotheticalDataInterface) => void;
}

export const useHypotheticalData = create<HypotheticalDataState>((set) => ({
  hypotheticalData: null,
  setHypotheticalData: (data) => set({ hypotheticalData: data }),
}));