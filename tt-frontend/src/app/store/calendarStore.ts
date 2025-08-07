import { create } from 'zustand';

interface CalendarEvent {
  id: string;
  title: string;
  start: Date | string;
  end: Date | string;
}

interface EventStore {
  events: CalendarEvent[];
  setEvents: (events: CalendarEvent[]) => void;
  addEvent: (newEvent: CalendarEvent) => void;
  removeEvent: (eventId: string) => void;
}

//local storage for events on the calendar
export const useEventStore = create<EventStore>((set) => ({
  events: [],

  setEvents: (events) => set({ events }),

  addEvent: (newEvent) =>
    set((state) => ({
      events: [...state.events, newEvent],
    })),

  removeEvent: (eventId) =>
    set((state) => ({
      events: state.events.filter((event) => event.id !== eventId),
    })),
}));
