import { create } from 'zustand';

interface LoadingStoreState {
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
}

//local storage for the hours off that an employee
export const useLoadingStore = create<LoadingStoreState>((set) => ({
  isLoading: false,

  //Setter
  setIsLoading: (isLoading: boolean) => set({ isLoading: isLoading }),
}));