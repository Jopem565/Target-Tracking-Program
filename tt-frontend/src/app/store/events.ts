import { create } from 'zustand';
import { EventInput } from '@fullcalendar/core'; 

type EventsState = {
  events: EventInput[];
  setEvents: (data: EventInput[] | ((prev: EventInput[]) => EventInput[])) => void;
};

//Store of events in calendar
export const useEvents = create<EventsState>((set) => ({
  events: [],
  setEvents: (data) =>
    set((state) => ({
      events: typeof data === 'function' ? data(state.events) : data,
    })),
}));

