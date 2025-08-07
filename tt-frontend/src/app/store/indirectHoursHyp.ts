import { create } from 'zustand';

type IndirectHoursHypState = {
  indirectHoursHyp: number[];
  setIndirectHoursHyp: (data: number[]) => void;
};
//Store of indirect hours in plan ahead
export const useIndirectHoursHyp = create<IndirectHoursHypState>((set) => ({
  indirectHoursHyp: Array(53).fill(0),
  setIndirectHoursHyp: (data) => set({ indirectHoursHyp: data }),
}));
