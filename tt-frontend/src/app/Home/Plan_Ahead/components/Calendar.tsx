'use client';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { EventResizeDoneArg } from '@fullcalendar/interaction';
import { DateSelectArg, EventApi, EventClickArg, EventDropArg, EventInput, ViewApi } from '@fullcalendar/core';
import { useState, useEffect } from 'react';
import { useHoursStore } from '@/app/store/hoursStore';
import { useHoursTakenOffStore } from '@/app/store/hoursTakenOff';
import { useHypotheticalData } from '@/app/store/hypotheticalData';
import { useEvents } from '@/app/store/events';
import toast, { ToastBar, Toaster } from 'react-hot-toast';
import { CheckCircle } from 'lucide-react';
import Image from 'next/image';
import { useSession } from "next-auth/react";

interface UpdatedData {
    'ID': string,
    'Hours Off': number | null,
    'Target': string | null,
    'Leave Hours': number | null,
    'Average Hours for Mid Goal': number | null,
    'Average Hours for End Goal': number | null,
    'Events': EventInput[],
    'Holiday Events': EventInput[],
    [key: `Indirect ${number}`]: number | null,
    [key: `Direct ${number}`]: number | null,
}

type EmpCalendarProps = {
    holidayEventsChange: EventInput[];
    unsavedChangesToPage: (val: boolean) => void;
    eventsToPage: (events: EventInput[]) => void;
    hypotheticalDataChange: UpdatedData | null
};

interface Employee {
    name: string;
    requestedTarget: string | undefined;
    totalHours: number;
    target: number;
    hoursRemaining: number;
    midYearTotal: number;
    avgHoursMid: number;
    avgHoursEnd: number;
    timeOff: number;
    firstWeek: number;
    midGoal: number;
    endGoal: number;
    pacingMid: number;
    pacingEnd: number;
    leaveHours: number;
    directHours: number[];
    indirectHours: number[];
}

export default function EmpCalendar({ holidayEventsChange, unsavedChangesToPage, eventsToPage }: EmpCalendarProps) {
    const [employees, setEmployees] = useState<Employee[]>([]);
    // Fetch hours for each employee
    useEffect(() => {
        fetch('/api/hours')
            .then(res => res.json())
            .then(tableData => setEmployees(tableData))
            .catch(err => console.error('Error fetching employees:', err));
    }, []);

    // Intital the match between the session and the employee data
    const { data: session } = useSession();
    const match = employees.find((emp) => {
        const fullName = emp.name;
        return fullName === session?.user.name;
    });
    //Intialize variables
    const events = useEvents((state) => state.events);
    const setEvents = useEvents((state) => state.setEvents);
    const [showModal, setShowModal] = useState(false);
    const [holidayEvents, setHolidayEvents] = useState<EventInput[]>([]);
    const [newEventInfo, setNewEventInfo] = useState<DateSelectArg | null>(null);
    const [newEventTitle, setNewEventTitle] = useState('');
    const [selectedEvent, setSelectedEvent] = useState<EventApi | null>(null);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editedTitle, setEditedTitle] = useState('');
    const hypotheticalData = useHypotheticalData((state) => state.hypotheticalData);
    const [editedStart, setEditedStart] = useState(new Date());
    const [startEdited, setStartEdited] = useState(false);
    const [editedEnd, setEditedEnd] = useState(new Date());
    const [endEdited, setEndEdited] = useState(false);
    const [isAllDay, setIsAllDay] = useState(false);
    const [dragCreated, setDragCreated] = useState(false);

    const notifySuccess = () => {
        toast.success("Event created.");
    }
    //Function to format date format
    function formatDateForInput(date: Date) {
        const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
        return localDate.toISOString().slice(0, 16);
    }

    //leave they plan to take 
    const hoursOff = useHoursStore((state) => state.hoursOff);
    const setHoursOff = useHoursStore((state) => state.setHoursOff);

    //leave already taken
    const hoursTakenOff = useHoursTakenOffStore((state) => state.hoursTakenOff);
    //Fetch holidays
    useEffect(() => {
        setHolidayEvents(holidayEventsChange);
    }, [holidayEventsChange]);

    useEffect(() => {
        const events: EventInput[] = []
        if (hypotheticalData) {
            for (const data of hypotheticalData['Events'] || []) {
                const event: EventInput = {
                    id: data.id,
                    title: data.title,
                    start: data.start,
                    end: data.end,
                    allDay: data.allDay,
                    containsWeekend: data.containsWeekend,
                    weekendDays: data.weekendDays,
                    isHoliday: data.isHoliday,
                    holidayActivated: data.isHoliday,
                    length: data.length,
                }
                events.push(event);
            }
            setEvents(events);
        }
    }, [hypotheticalData]);

    // Creating the event
    const handleDateSelect = (selectInfo: DateSelectArg) => {
        setNewEventInfo(selectInfo);
        setNewEventTitle('');
        setShowModal(true);
        setIsAllDay(selectInfo.allDay);
        setDragCreated(true);
    };
    //Adding an new event
    const handleAddEvent = () => {
        if (!newEventTitle.trim() || !newEventInfo) return;
        const start = new Date(newEventInfo.start);
        const end = new Date(newEventInfo.end);
        let eventStart: string | Date;
        let eventEnd: string | Date;

        if (isAllDay) {
            // Format to YYYY-MM-DD and shift end +1 day
            eventStart = start.toISOString().split("T")[0];
            if (dragCreated) {
                end.setDate(end.getDate());
            }
            else if (!dragCreated) {
                end.setDate(end.getDate() - 1);
            }
            eventEnd = end.toISOString().split("T")[0];
        } else {
            // Use full datetime for timed events
            eventStart = start.toISOString();
            eventEnd = end.toISOString();
        }

        const days = Math.ceil((new Date(eventEnd).getTime() - new Date(eventStart).getTime()) / (1000 * 60 * 60 * 24)) || 1;

        const newEvent: EventInput = {
            id: Date.now().toString(),
            title: newEventTitle,
            start: eventStart,
            end: eventEnd,
            allDay: isAllDay,
            containsWeekend: false,
            weekendDays: 0,
            isHoliday: false,
            holidayActivated: false,
            length: days,
        };

        // Check for weekends
        let weekendDaysCounter = 0;
        const current = new Date(start);
        while (current < end) {
            const day = current.getDay();
            if (day === 0 || day === 6) {
                newEvent.containsWeekend = true;
                weekendDaysCounter++;
            }
            current.setDate(current.getDate() + 1);
        }
        newEvent.weekendDays = weekendDaysCounter;

        notifySuccess();
        setEvents((prev: EventInput[]) => [...prev, newEvent]);
        unsavedChangesToPage(true);
        setShowModal(false);
        setNewEventInfo(null);
    };
    //moving the event within the calendar
    const handleEventDrop = (dropInfo: EventDropArg) => {
        const { event } = dropInfo;
        const start = new Date(event.startStr as string);
        const end = new Date(event.endStr as string);
        let weekendDaysCounter: number = 0;
        let weekend: boolean = false;

        //if new event is all day 
        if (event.allDay) {
            const current: Date = new Date(start);
            //checking if event contains a weekend day 
            while (current < end) {
                //event contains a Saturday or Sunday
                if (current.getDay() == 5 || current.getDay() == 6) {
                    weekend = true;
                    weekendDaysCounter++;
                }
                current.setDate(current.getDate() + 1);
            }
        }

        //if new event is not all day (start and end times differ from all day events so have to treat it differently)
        else if (!event.allDay) {
            //shifted days up by one, but same logic for checking if weekend
            if (start.getDay() == 6 || start.getDay() == 0) {
                weekend = true;
                weekendDaysCounter++;
            }
        }

        setEvents((prevEvents: EventInput[]) =>
            prevEvents.map((evt: EventInput) => {
                if (evt.id === event.id && evt.isHoliday) {
                    return evt;
                }
                return evt.id === event.id
                    ? {
                        ...evt,
                        start: event.start ?? undefined,
                        end: event.end ?? undefined,
                        containsWeekend: weekend,
                        weekendDays: weekendDaysCounter,
                    }
                    : evt;
            })
        );
    };
    // Resizing the event to expand
    const handleEventResize = (resizeInfo: EventResizeDoneArg) => {
        const { event } = resizeInfo;
        let weekendDaysCounter: number = 0;
        let weekend: boolean = false;
        const start = new Date(event.startStr as string);
        const end = new Date(event.endStr as string);

        //if new event is all day 
        if (event.allDay) {
            const current: Date = new Date(start);
            //checking if event contains a weekend day 
            while (current < end) {
                //event contains a Saturday or Sunday
                if (current.getDay() == 5 || current.getDay() == 6) {
                    weekend = true;
                    weekendDaysCounter++;
                }
                current.setDate(current.getDate() + 1);
            }
        }

        //if new event is not all day (start and end times differ from all day events so have to treat it differently)
        else if (!event.allDay) {
            const start = new Date(event.startStr as string);
            //shifted days up by one, but same logic for checking if weekend
            if (start.getDay() == 6 || start.getDay() == 0) {
                weekend = true;
                weekendDaysCounter++;
            }
        }

        setEvents((prevEvents: EventInput[]) =>
            prevEvents.map((evt: EventInput) => {
                if (evt.id === event.id && evt.isHoliday) {
                    return evt;
                }
                return evt.id === event.id
                    ? {
                        ...evt,
                        start: event.start ?? undefined,
                        end: event.end ?? undefined,
                        containsWeekend: weekend,
                        weekendDays: weekendDaysCounter,
                    }
                    : evt;
            })
        );
        unsavedChangesToPage(true);
    };
    // When an event is clicked
    const handleEventClick = ({ event }: EventClickArg) => {
        if (!event.start || !event.end) return;

        const adjustedStart = new Date(event.start);
        const adjustedEnd = new Date(event.end);

        if (event.allDay) {
            adjustedEnd.setDate(adjustedEnd.getDate() - 1);
        }

        setSelectedEvent(event);
        setEditedTitle(event.title);
        setIsEditingTitle(false);
        setShowModal(true);
        setEditedStart(adjustedStart);
        setEditedEnd(adjustedEnd);
        setIsAllDay(event.allDay ?? false);
    };

    // Iterate through each event to add the event's hours to the hours taken off
    useEffect(() => {
        let total = 0;
        for (const event of events) {
            //if event is a full day(s) taken off and it does not contain weekend
            if (event.allDay && !event.containsWeekend && !event.isHoliday) {
                const start = new Date(event.start as string);
                const end = new Date(event.end as string);
                const days: number = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
                total += (days * 8);
            }
            //if event is a full day(s) taken off and it does contain a weekend
            else if (event.allDay && event.containsWeekend && !event.isHoliday) {
                const start = new Date(event.start as string);
                const end = new Date(event.end as string);
                const days: number = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
                total = total + ((days - event.weekendDays) * 8);
            }
            //if event is not a full day taken off 
            else if (!event.allDay && !event.containsWeekend && !event.isHoliday) {
                const start: Date = new Date(event.start as string);
                const end: Date = new Date(event.end as string);
                //difference in milliseconds
                const diffMs = end.getTime() - start.getTime();
                const hours = diffMs / (1000 * 60 * 60);
                total = total + hours;
            }
        }

        for (const event of holidayEvents) {
            //if event is a preset holiday
            if (event.allDay && event.isHoliday) {
                if (event.holidayActivated) {
                    total += 8;
                }
            }
        }

        if (total != 0) {
            setHoursOff(total);
        }

        //planned time taken off is zero (no events)
        else if (total === 0) {
            //set hours off to be their real time off 
            if (match && match.timeOff) {
                setHoursOff(0);
            }
            //if no session nor match, set hours off to be zero 
            else {
                setHoursOff(0);
            }
        }
        eventsToPage(events);
    }, [hoursOff, hoursTakenOff, events, holidayEvents, match]);

    return (
        <div>
            {/* HTML for Toaster */}
            <Toaster
                toastOptions={{
                    duration: 4000,
                    style: {
                        background: 'white',
                        border: '1px solid #add8e6',
                        color: '#00344A',
                        padding: '16px 20px',
                        borderRadius: '12px',
                        boxShadow: '0 6px 20px rgba(0, 0, 0, 0.1)',
                    },
                    success: {
                        icon: <CheckCircle size={20} className="text-green-600" />,
                    },
                    error: {
                        icon: '⚠️',
                    },
                }}
            >
                {(t) => (
                    <ToastBar
                        toast={t}
                        style={{
                            ...t.style,
                            animation: t.visible
                                ? 'toast-slide-in 0.5s ease'
                                : 'toast-slide-out 0.5s ease forwards',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                        }}
                    >
                        {({ icon, message }) => (
                            <>
                                {icon}
                                <span style={{ fontWeight: 500 }}>{message}</span>
                            </>
                        )}
                    </ToastBar>
                )}
            </Toaster>
            {/* HTML for FullCalendar */}
            <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                views={{
                    timeGridWeek: {
                        type: "timeGridWeek",
                        businessHours: {
                            daysOfWeek: [1, 2, 3, 4, 5],
                            startTime: "09:00",
                            endTime: "17:00"
                        },
                        selectConstraint: {
                            startTime: "09:00",
                            endTime: "17:00"
                        },
                    }
                }}
                selectable={true}
                editable={true}
                events={[
                    ...events.map((evt) => ({ ...evt, editable: true })),
                    ...holidayEvents.map((evt) => ({ ...evt, editable: false }))
                ]}
                select={handleDateSelect}
                eventDrop={handleEventDrop}
                eventResize={handleEventResize}
                eventClick={handleEventClick}
                eventColor="#3C6778"
                dayMaxEventRows={6}
                timeZone='local'
                customButtons={{
                    addEvent: {
                        text: "All-Day Event",
                        click: () => {
                            //timing get to match with reg event creation
                            //end of day needs to be the next day.
                            const dateOnly = new Date();
                            dateOnly.setHours(0, 0, 0, 0);
                            const nextDay = new Date(dateOnly);
                            nextDay.setDate(nextDay.getDate() + 1);
                            handleDateSelect({
                                start: dateOnly,
                                end: nextDay,
                                startStr: dateOnly.toISOString(),
                                endStr: nextDay.toISOString(),
                                allDay: true,
                                jsEvent: new MouseEvent('click'),
                                view: {} as ViewApi,
                            });
                            setShowModal(true);
                        },
                    },

                    addWklyEvent: {
                        text: "Hourly Event",
                        click: () => {
                            const startTime = new Date();
                            //start time of 9am
                            startTime.setHours(9, 0, 0, 0);
                            //hour later
                            const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
                            handleDateSelect({
                                start: startTime,
                                end: endTime,
                                startStr: startTime.toISOString(),
                                endStr: endTime.toISOString(),
                                allDay: false,
                                jsEvent: new MouseEvent('click'),
                                view: {} as ViewApi,
                            });
                            setShowModal(true);
                        },
                    }
                }}
                headerToolbar={{
                    left: "prev,next today addEvent",
                    center: "title",
                    right: "addWklyEvent dayGridMonth,timeGridWeek",
                }}
            />
            {/* Creating a Event */}
            {showModal && newEventInfo && (
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleAddEvent();
                    }}
                >
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <h3>Create New Event</h3>
                            <p>
                                <strong>Title: </strong>
                                <input
                                    type="text"
                                    placeholder="Add a Title Here"
                                    style={{ width: '80%', padding: '10px', fontSize: '16px' }}
                                    value={newEventTitle}
                                    onChange={(e) => setNewEventTitle(e.target.value)}
                                />
                            </p>

                            <label>
                                <strong>Start Date: </strong>
                                <input
                                    type={isAllDay ? 'date' : 'datetime-local'}
                                    value={
                                        newEventInfo?.start
                                            ? formatDateForInput(new Date(newEventInfo.start)).slice(0, isAllDay ? 10 : 16)
                                            : ''
                                    }
                                    onChange={(e) => {
                                        const newStart = new Date(e.target.value);
                                        if (isAllDay) {
                                            newStart.setDate(newStart.getDate() + 1);
                                            newStart.setHours(0, 0, 0, 0);
                                        }

                                        setNewEventInfo((prev) =>
                                            prev
                                                ? {
                                                    ...prev,
                                                    start: newStart,
                                                    startStr: newStart.toISOString(),
                                                }
                                                : null
                                        );
                                    }}
                                />
                            </label>

                            <label>
                                <strong>End Date: </strong>
                                <input
                                    type={isAllDay ? 'date' : 'datetime-local'}
                                    value={
                                        newEventInfo?.end
                                            ? formatDateForInput(
                                                new Date(
                                                    isAllDay ? new Date(newEventInfo.end).getTime() - 86400000 : newEventInfo.end
                                                )
                                            ).slice(0, isAllDay ? 10 : 16)
                                            : ''
                                    }
                                    min={
                                        newEventInfo?.start
                                            ? formatDateForInput(new Date(newEventInfo.start)).slice(0, isAllDay ? 10 : 16)
                                            : ''
                                    }
                                    max={
                                        !isAllDay && newEventInfo?.start
                                            ? formatDateForInput(
                                                new Date(new Date(newEventInfo.start).setHours(23, 59, 0, 0))
                                            ).slice(0, 16)
                                            : undefined
                                    }
                                    onChange={(e) => {
                                        setDragCreated(false);
                                        const selected = new Date(e.target.value);

                                        if (isAllDay) {
                                            selected.setDate(selected.getDate() + 2);
                                        }
                                        setNewEventInfo((prev) => {
                                            if (!prev) return null;
                                            return {
                                                ...prev,
                                                end: selected,
                                                endStr: selected.toISOString(),
                                            };
                                        });
                                    }}
                                />
                            </label>

                            <div className="modal-buttons">
                                <button type="submit">Add Event</button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowModal(false);
                                        setNewEventInfo(null);
                                    }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            )}
            {/* Edit Date and Hours */}
            {showModal && selectedEvent && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3 className="event-title">
                            {/* Modal Popup */}
                            {isEditingTitle ? (
                                <input
                                    type="text"
                                    value={editedTitle}
                                    onChange={(e) => setEditedTitle(e.target.value)}
                                />
                            ) : (
                                <>
                                    {selectedEvent.title}
                                    <button
                                        className="edit-icon"
                                        onClick={() => {
                                            if (!selectedEvent.start || !selectedEvent.end) return;
                                            setEditedTitle(selectedEvent.title);
                                            setEditedStart(new Date(selectedEvent.start));
                                            setEditedEnd(new Date(selectedEvent.end));
                                            setIsAllDay(selectedEvent.allDay ?? false);
                                            setIsEditingTitle(true);
                                        }}
                                    >
                                        <Image src="/edit_icon.jpg" width={40} height={40} alt="Edit" />
                                    </button>
                                </>
                            )}
                        </h3>
                        {/* Popup when editing is available */}
                        {isEditingTitle ? (
                            <>
                                <p>
                                    <strong>Start Date: </strong>
                                    <input
                                        type={isAllDay ? 'date' : 'datetime-local'}
                                        value={formatDateForInput(editedStart).slice(0, isAllDay ? 10 : 16)}
                                        onChange={(e) => {
                                            const inputDate = new Date(e.target.value);

                                            if (isAllDay) {
                                                inputDate.setHours(0, 0, 0, 0);
                                                inputDate.setDate(inputDate.getDate() + 1);
                                            }
                                            setEditedStart(inputDate);
                                            setStartEdited(true);
                                        }}
                                    />
                                </p>

                                <p>
                                    <strong>End Date: </strong>
                                    <input
                                        type={isAllDay ? 'date' : 'datetime-local'}
                                        value={formatDateForInput(new Date(editedEnd.getTime() - (isAllDay ? 86400000 : 0))).slice(0, isAllDay ? 10 : 16)}
                                        min={formatDateForInput(editedStart).slice(0, isAllDay ? 10 : 16)}
                                        max={
                                            !isAllDay
                                                ? formatDateForInput(
                                                    (() => {
                                                        const date = new Date(editedStart.getTime());
                                                        date.setHours(23, 59, 0, 0);
                                                        return date;
                                                    })()
                                                ).slice(0, 16)
                                                : undefined
                                        }
                                        onChange={(e) => {
                                            const inputDate = new Date(e.target.value);

                                            if (isAllDay) {
                                                inputDate.setHours(0, 0, 0, 0);

                                                const originalEnd = new Date(selectedEvent.end!);
                                                originalEnd.setHours(0, 0, 0, 0);

                                                const diff = inputDate.getTime() - originalEnd.getTime();
                                                const oneDay = 24 * 60 * 60 * 1000;

                                                if (Math.abs(diff) >= oneDay) {
                                                    inputDate.setDate(inputDate.getDate() + 2);
                                                }
                                            }
                                            setEditedEnd(inputDate);
                                            setEndEdited(true);
                                        }}
                                    />
                                </p>
                            </>
                        ) : (
                            <>
                                <p>
                                    <strong>Start: </strong>{' '}
                                    {selectedEvent.start ? (
                                        selectedEvent.allDay
                                            ? new Date(selectedEvent.start).toLocaleDateString()
                                            : new Date(selectedEvent.start).toLocaleString(undefined, {
                                                month: 'numeric',
                                                day: 'numeric',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                hour12: true,
                                            })
                                    ) : (
                                        "No start date"
                                    )}
                                </p>
                                <p>
                                    <strong>End: </strong>{' '}
                                    {selectedEvent.end ? (
                                        selectedEvent.allDay
                                            ? new Date(new Date(selectedEvent.end).getTime() - 86400000).toLocaleDateString()
                                            : new Date(selectedEvent.end).toLocaleString(undefined, {
                                                month: 'numeric',
                                                day: 'numeric',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                hour12: true,
                                            })
                                    ) : (
                                        "No end date"
                                    )}
                                </p>
                            </>
                        )}
                        {/* Below Button in Modal */}
                        <div className="modal-buttons">
                            <button
                                onClick={() => {
                                    setEvents((prev: EventInput[]) =>
                                        prev.filter((evt: EventInput) => evt.id !== selectedEvent.id)
                                    );

                                    selectedEvent.remove();

                                    const start = new Date(selectedEvent.startStr);
                                    const end = new Date(selectedEvent.endStr);

                                    const diff = Number(end) - Number(start);
                                    //Convert the difference from milliseconds to hours
                                    const diffHours = (diff / (1000 * 60 * 60)) / 3;

                                    setHoursOff(hoursOff ?? 0 - diffHours);
                                    setShowModal(false);
                                    setSelectedEvent(null);
                                    unsavedChangesToPage(true);
                                }}
                            >
                                Delete
                            </button>

                            {isEditingTitle && (
                                <button
                                    onClick={() => {
                                        selectedEvent.setProp('title', editedTitle);
                                        selectedEvent.setStart(editedStart);
                                        selectedEvent.setEnd(editedEnd);
                                        selectedEvent.setAllDay(isAllDay);

                                        if (startEdited) {
                                            selectedEvent.setStart(editedStart);
                                        }
                                        if (endEdited) {
                                            selectedEvent.setEnd(editedEnd);
                                        }

                                        setEvents((prev: EventInput[]) =>
                                            prev.map((evt: EventInput) =>
                                                evt.id === selectedEvent.id
                                                    ? {
                                                        ...evt,
                                                        title: editedTitle,
                                                        start: startEdited ? editedStart : evt.start,
                                                        end: endEdited ? editedEnd : evt.end,
                                                        allDay: isAllDay,
                                                    }
                                                    : evt
                                            )
                                        );

                                        unsavedChangesToPage(true);
                                        setIsEditingTitle(false);
                                    }}
                                >
                                    Save
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    setShowModal(false);
                                    setSelectedEvent(null);
                                }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}