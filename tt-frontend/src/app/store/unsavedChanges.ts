import { create } from 'zustand';

interface UnsavedChangesStoreState {
  unsavedChanges: boolean;
  setUnsavedChanges: (unsavedChanges: boolean) => void;
}

//local storage for the hours off that an employee
export const useUnsavedChangesStore = create<UnsavedChangesStoreState>((set) => ({
  unsavedChanges: false,

  //Setter
  setUnsavedChanges: (unsavedChanges: boolean) => set({ unsavedChanges : unsavedChanges }),
}));