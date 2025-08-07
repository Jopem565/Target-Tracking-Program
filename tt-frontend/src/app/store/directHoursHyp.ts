import { create } from 'zustand';

type DirectHoursHypState = {
  directHoursHyp: number[];
  setDirectHoursHyp: (data: number[]) => void;
};

//Storage for direct hours in plan ahead table
export const useDirectHoursHyp = create<DirectHoursHypState>((set) => ({
  
  directHoursHyp: Array(53).fill(0),
  setDirectHoursHyp: (data : number[]) => set({ directHoursHyp: data }),

}));

