import { create } from 'zustand';

export const useTableViewStore = create((set) => ({
  tableView: null,

  // Setter
  setTableView: (tableView : boolean) => set({ tableView: tableView }),
}));