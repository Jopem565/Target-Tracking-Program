'use client';

import "./style.css";
import EmpCalendar from "./components/Calendar";
import React, { useState, useEffect } from "react";
import TableView from "./components/TableView";
import { getWeek } from 'date-fns';
import { EventInput } from "@fullcalendar/core/index.js";
import { useSession } from "next-auth/react";
import { Checkbox } from "../Plan_Ahead/components/Checkbox"
import { useHoursStore } from '@/app/store/hoursStore';
import { useLoadingStore } from '@/app/store/isLoading';
import { useHypotheticalData } from '@/app/store/hypotheticalData'
import { useEvents } from '@/app/store/events'
import { useIndirectHoursHyp } from '@/app/store/indirectHoursHyp'
import { useDirectHoursHyp } from '@/app/store/directHoursHyp'
import { formatID } from '@/app/utils/formatID';
import { CheckCircle } from "lucide-react";
import toast, { ToastBar, Toaster } from "react-hot-toast";
import RedirectPrompt from "./components/redirectPrompt";

interface Match {
  name: string,
  timeOff: number,
  hoursRemaining: number,
  avgHoursMid: number,
  avgHoursEnd: number,
  firstWeek: number,
  totalHours: number,
  target: string,
  midYearTotal: number
}

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
  indirectHoursHyp: number[],
  directHoursHyp: number[],
  firstWeek: number,
  lastWeek: number
}

//this function creates the Leave Planning (aka Plan Ahead) page
export default function Plan_Ahead() {
  const { data: session } = useSession();
  const [employees, setEmployees] = useState<Match[]>([]);

  const events = useEvents((state) => state.events);
  const setEvents = useEvents((state) => state.setEvents);

  const [firstWeek, setFirstWeekOff] = useState(0);
  const [lastWeek, setLastWeekOff] = useState(0);

  const firstWeekToPage = (value: number) => {
    setFirstWeekOff(value);
  }

  const lastWeekToPage = (value: number) => {
    setLastWeekOff(value);
  }

  const [isTableView, setIsTableView] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<() => void>(() => { });
  const [modalMessage, setModalMessage] = useState('');
  const [resetModal, setResetModal] = useState(false);

  const hypotheticalData = useHypotheticalData((state) => state.hypotheticalData);
  const setHypotheticalData = useHypotheticalData((state) => state.setHypotheticalData);

  const [activeTab, setActiveTab] = useState("calendar");
  const [pendingTab, setPendingTab] = useState<string | null>(null);

  //varibales for unsaved changes in dashboard
  const { showRedirectModal, confirmNav, cancelNav, saveNav } = RedirectPrompt({ when: unsavedChanges });

  //for the select all checkbox
  const [isChecked, setIsChecked] = useState(false);

  //handles the select all logic for the holiday checkboxes
  const handleSelectAll = () => {
    const newSelectAll = !isChecked;
    setIsChecked(newSelectAll);

    const currentTime = new Date().getTime();
    //Disables past holidays in the checkboxes
    const updatedHolidayEvents = holidayEvents.map((holiday) => {
      const holidayStartTime = new Date(holiday.start as string).getTime();
      if (holidayStartTime >= currentTime) {
        return {
          ...holiday,
          holidayActivated: newSelectAll,
        };
      }
      return holiday;
    });
    setUnsavedChanges(true);
    setHolidayEvents(updatedHolidayEvents);
  };

  //toast success notification message
  const notifySuccess = () => {
    toast.success("Your planning session has been saved successfully.");
  }
  //toast error notification message
  const notifyError = () => {
    toast.error("Your planning session has not been saved successfully.");
  }

  //need the current year for the holidays
  const curYr = new Date().getFullYear();

  //federal holidays
  const holidays: EventInput[] = [
    { id: "ny-day", classNames: ['ny-day'], title: "New Year's Day", start: `${curYr}-01-01`, end: `${curYr}-01-02`, isHoliday: true, holidayActivated: false },
    { id: "mlk-day", classNames: ['mlk-day'], title: "MLK Day", start: `${curYr}-01-20`, end: `${curYr}-01-21`, isHoliday: true, holidayActivated: false },
    { id: "pres-day", classNames: ['pres-day'], title: "President's Day", start: `${curYr}-02-17`, end: `${curYr}-02-18`, isHoliday: true, holidayActivated: false },
    { id: "mem-day", classNames: ['mem-day'], title: "Memorial Day", start: `${curYr}-05-26`, end: `${curYr}-05-27`, isHoliday: true, holidayActivated: false },
    { id: "juneteenth", classNames: ['juneteenth'], title: "Juneteenth", start: `${curYr}-06-19`, end: `${curYr}-06-20`, isHoliday: true, holidayActivated: false },
    { id: "ind-day", classNames: ['ind-day'], title: "Independence Day", start: `${curYr}-07-04`, end: `${curYr}-07-05`, isHoliday: true, holidayActivated: false },
    { id: "lab-day", classNames: ['lab-day'], title: "Labor Day", start: `${curYr}-09-01`, end: `${curYr}-09-02`, isHoliday: true, holidayActivated: false },
    { id: "indigenous-day", classNames: ['indigenous-day'], title: "Indigenous People's Day", start: `${curYr}-10-13`, end: `${curYr}-10-14`, isHoliday: true, holidayActivated: false },
    { id: "vet-day", classNames: ['vet-day'], title: "Veteran's Day", start: `${curYr}-11-11`, end: `${curYr}-11-12`, isHoliday: true, holidayActivated: false },
    { id: "thanks-day", classNames: ['thanks-day'], title: "Thanksgiving Day", start: `${curYr}-11-27`, end: `${curYr}-11-28`, isHoliday: true, holidayActivated: false },
    { id: "cmas-day", classNames: ['cmas-day'], title: "Christmas Day", start: `${curYr}-12-25`, end: `${curYr}-12-26`, isHoliday: true, holidayActivated: false }
  ];

  //Creates an event for each holiday in the calendar
  const currentDay = new Date().getTime();

  const newYears = holidays.find((item: EventInput) => {
    return item.id === "ny-day"
  });
  const newYearsTime = (new Date(newYears?.start as string)).getTime();

  const MLK = holidays.find((item: EventInput) => {
    return item.id === "mlk-day"
  });
  const MLKTime = (new Date(MLK?.start as string)).getTime();

  const presidentsDay = holidays.find((item: EventInput) => {
    return item.id === "pres-day"
  });
  const presidentsDayTime = (new Date(presidentsDay?.start as string)).getTime();

  const memorialDay = holidays.find((item: EventInput) => {
    return item.id === "mem-day"
  });
  const memorialDayTime = (new Date(memorialDay?.start as string)).getTime();

  const juneteenthDay = holidays.find((item: EventInput) => {
    return item.id === "juneteenth"
  });
  const juneteenthTime = (new Date(juneteenthDay?.start as string)).getTime();

  const independenceDay = holidays.find((item: EventInput) => {
    return item.id === "ind-day"
  });
  const independenceDayTime = (new Date(independenceDay?.start as string)).getTime();

  const laborDay = holidays.find((item: EventInput) => {
    return item.id === "lab-day"
  });
  const laborDayTime = (new Date(laborDay?.start as string)).getTime();

  const indigenousDay = holidays.find((item: EventInput) => {
    return item.id === "indigenous-day"
  });
  const indigenousDayTime = (new Date(indigenousDay?.start as string)).getTime();

  const veteransDay = holidays.find((item: EventInput) => {
    return item.id === "vet-day"
  });
  const veteransDayTime = (new Date(veteransDay?.start as string)).getTime();

  const thanksgivingDay = holidays.find((item: EventInput) => {
    return item.id === "thanks-day"
  });
  const thanksgivingDayTime = (new Date(thanksgivingDay?.start as string)).getTime();

  const christmasDay = holidays.find((item: EventInput) => {
    return item.id === "cmas-day"
  });
  const christmasDayTime = (new Date(christmasDay?.start as string)).getTime();

  const [holidayEvents, setHolidayEvents] = useState<EventInput[]>([]);

  const checkboxToPage = (holidayEventsUpdated: EventInput[]) => {
    //if changes made to holidays, make sure to update saved changes modal 
    setUnsavedChanges(true);
    setHolidayEvents(holidayEventsUpdated);
  }

  const eventsToPage = (events: EventInput[]) => {
    setEvents(events);
  }

  useEffect(() => {
    sessionStorage.setItem("unsavedChanges", unsavedChanges.toString());
  }, [unsavedChanges]);


  //fetches the api hour information 
  useEffect(() => {
    fetch('/api/hours')
      .then(res => res.json())
      .then(data => setEmployees(data))
      .catch(err => console.error('Error fetching employees:', err));
  }, []);

  const match: Match | undefined = employees.find((emp) => {
    return emp.name === session?.user.name;
  });

  //Displays your target in dropdown
  useEffect(() => {
    const matchTarget = match?.target as string;
    setStartingTarget(matchTarget);
    setTarget(matchTarget);

    if (target != startingTarget) {
      setTargetChange(true);
    } else {
      setTargetChange(false);
    }

    if (startingTarget === '0') {
      setTarget('1860');
      // setStartingTarget('1860');
    }
    
  }, [employees])

  //fetching the planAhead api information
  useEffect(() => {
    fetch('/api/planAhead')
      .then(res => res.json())
      .then(data => setHypotheticalData(data))
      .catch(err => console.error('Error fetching plan ahead data:', err));
  }, []);

  //once hypothetical data is retrieved, update UI to have values from saved session, if no saved session, display real info
  useEffect(() => {
    if (!hypotheticalData || !hypotheticalData['Holiday Events'] || (hypotheticalData['Holiday Events'].length === 0)) {
      //no changes to holiday event selections, then render default selections
      const arrayEvents: EventInput[] = holidays.map((holiday: EventInput) => {
        return {
          id: holiday.id,
          title: holiday.title,
          start: holiday.start,
          end: holiday.end,
          containsWeekend: false,
          allDay: true,
          isHoliday: holiday.isHoliday,
          holidayActivated: holiday.holidayActivated
        }
      });
      setHolidayEvents(arrayEvents);
      setTarget(match?.target as string || "1860");
      if (target != startingTarget) {
        setTargetChange(true);
      } else {
        setTargetChange(false);
      }
    }

    if (hypotheticalData && hypotheticalData['Hours Off'] && hypotheticalData['Holiday Events']) {
      setHolidayEvents(hypotheticalData['Holiday Events']);

      //if their planning target is saved
      if (hypotheticalData['Target']) {
        setTarget(hypotheticalData['Target']);
      }
      //if not, default to their actual target hours
      else {
        setTarget(match?.target as string || "1776");
        setTargetChange(target != startingTarget);
      }
    }
  }, [hypotheticalData]);

  //for handling the saving
  const handleSave = () => {
    setUnsavedChanges(false);
    postPlanAhead();
  };

  const hoursOff = useHoursStore((state) => state.hoursOff);

  //Populating current target and checking match to throw error
  const [target, setTarget] = useState("");
  const [targetChange, setTargetChange] = useState(false);
  const [startingTarget, setStartingTarget] = useState<string>("");

  // Total amount of hours OFF in table
  const [tableViewHoursOff, setTableViewHoursOff] = useState(0);
  const [hypotheticalTimeTakenOff, setHypotheticalTimeTakenOff] = useState(0);

  //retrieving hypothetical hours taken off from table view to display 
  const tableViewHoursOffToPage = (value: number) => {
    setTableViewHoursOff(value);
  }
  const setTableViewHoursOffPlannedToPage = (value: number) => {
    setHypotheticalTimeTakenOff(value);
  }


  // The hypothetical direct and indirect hours for this employee, stored in global arrays of length 52.
  const indirectHoursHyp = useIndirectHoursHyp((state) => state.indirectHoursHyp);
  const directHoursHyp = useDirectHoursHyp((state) => state.directHoursHyp);
  const [leaveHoursCalendarView, setLeaveHoursCalendarView] = useState(0);
  const [leaveHoursTableView, setLeaveHoursTableView] = useState(0);

  //everytime planned hours off is changed, rerender calculations (calendar view)
  useEffect(() => {
    if (match) {
      setLeaveHoursCalendarView((2080 - Number(target) - match.timeOff) - (hoursOff ?? 0));
    }
    else {
      setLeaveHoursCalendarView(0);
    }
  }, [hoursOff, employees, target, setTarget]);

  useEffect(() => {
    if (match) {
      setLeaveHoursTableView((2080 - Number(target) - tableViewHoursOff));
    }
  }, [tableViewHoursOff, target]);

  // Average Hours for Mid and End Goal logic
  const [avgHoursEndGoal, setAvgHoursEndGoal] = useState(0);
  const [avgHoursMidGoal, setAvgHoursMidGoal] = useState(0);

  //Get the week number of the start date
  const weekNumber = getWeek(new Date(), {
    weekStartsOn: 6,
  });

  // Avg hours calculation
  useEffect(() => {
    if (match && (hoursOff || tableViewHoursOff)) {
      const numWeeks = 52;
      let hoursRemaining = parseFloat(match.target);
      if (isTableView) {
        hoursRemaining -= match.totalHours + tableViewHoursOff;
      }
      else {
        if (hoursOff && events.length == 0 && !isHolidayEvent(holidayEvents)) {
          hoursRemaining -= match.totalHours;
        }
        else {
          if (hoursOff) {
            hoursRemaining = hoursRemaining - match.totalHours + hoursOff;
          }
          else {
            hoursRemaining = hoursRemaining - match.totalHours;
          }
        }
      }
      setAvgHoursEndGoal(hoursRemaining / (numWeeks - weekNumber + 1));

      const val =
        weekNumber < numWeeks / 2
          ? ((parseFloat(match.target) / 2) - match.midYearTotal) / (numWeeks / 2 - weekNumber)
          : 0;
      setAvgHoursMidGoal(val);
    }

    else {
      setAvgHoursEndGoal(match ? match.avgHoursEnd : 0);
      setAvgHoursMidGoal(match ? match.avgHoursMid : 0);
    }

  }, [hoursOff, tableViewHoursOff, employees, isTableView]);

  const isLoading = useLoadingStore((state) => state.isLoading);
  const setIsLoading = useLoadingStore((state) => state.setIsLoading);

  /**
   * Function send POST request to the hypothetical API.
   * @param hypotheticalData the data we want to fill the database with once the user clicks Save.
   */
  const postPlanAhead = async () => {
    setIsLoading(true);
    setUnsavedChanges(false);
    let ID = "";
    //Convert their name to an ID with year at the end
    if (match) {
      ID = formatID(match.name);
    }
    //Week number for the starting week of the current month
    const startWeek = firstWeek;
    //Week number for the last week of the current month
    const endWeek = lastWeek;

    const updated: UpdatedData = {
      ['ID']: ID,
      ['Hours Off']: hoursOff,
      ['Target']: target,
      ['Leave Hours']: (isTableView ? leaveHoursTableView : leaveHoursCalendarView),
      ['Average Hours for Mid Goal']: avgHoursMidGoal,
      ['Average Hours for End Goal']: avgHoursEndGoal,
      ['Events']: events,
      ['Holiday Events']: holidayEvents,
      indirectHoursHyp: indirectHoursHyp,
      directHoursHyp: directHoursHyp,
      firstWeek: startWeek,
      lastWeek: endWeek,
    };

    let res = null;

    //Fill in the database for each week in the month
    for (let i = startWeek; i <= endWeek; i++) {
      res = await fetch('/api/planAhead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ID: ID,
          hoursOff: hoursOff,
          target: target,
          leaveHours: (isTableView ? leaveHoursTableView : leaveHoursCalendarView),
          avgHoursMidGoal: avgHoursMidGoal,
          avgHoursEndGoal: avgHoursEndGoal,
          events: events,
          holidayEvents: holidayEvents,
          indirectHoursHyp: indirectHoursHyp,
          directHoursHyp: directHoursHyp,
          firstWeek: startWeek,
          lastWeek: endWeek
        }),
      });

      updated[`Indirect ${i}`] = indirectHoursHyp[i - 1];
      updated[`Direct ${i}`] = directHoursHyp[i - 1];
    }

    //Update the hypothetical data with the inputted data
    setHypotheticalData(updated);

    if (res) {
      setIsLoading(false);
      if (res.ok) {
        notifySuccess();
      }
      else {
        notifyError();
      }
    }
  };

  /**
   * Handles the Reset Inputted Data button.
   * @param hypotheticalData the data that the user has entered on the webpage. 
  */
  const resetData = async () => {
    setIsLoading(true);
    let ID = "";
    //Convert their name to an ID with year at the end
    if (match) {
      ID = formatID(match.name);
    }

    //Week number for the starting week of the current month
    const startWeek = firstWeek;
    //Week number for the last week of the current month
    const endWeek = lastWeek;

    const updated: UpdatedData = {
      ['ID']: ID,
      ['Hours Off']: null,
      ['Target']: null,
      ['Leave Hours']: null,
      ['Average Hours for Mid Goal']: null,
      ['Average Hours for End Goal']: null,
      ['Events']: [],
      ['Holiday Events']: [],
      indirectHoursHyp: indirectHoursHyp,
      directHoursHyp: directHoursHyp,
      firstWeek: 0,
      lastWeek: 53
    };

    let res = null;

    //Clear the database
    for (let i = startWeek; i <= endWeek; i++) {
      res = await fetch('/api/planAhead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ID: ID,
          hoursOff: null,
          target: null,
          leaveHours: null,
          avgHoursMidGoal: null,
          avgHoursEndGoal: null,
          events: [],
          holidayEvents: [],
          indirectHoursHyp: [],
          directHoursHyp: [],
          firstWeek: 0,
          lastWeek: 53
        }),
      });

      updated[`Indirect ${i}`] = null;
      updated[`Direct ${i}`] = null;
    }

    //Update the hypothetical data with the cleared data
    setHypotheticalData(updated);

    if (res) {
      setIsLoading(false);
      if (res.ok) {
        notifySuccess();
      }
      else {
        notifyError();
      }
    }
    else {
      notifyError();
    }
  };

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  /**
   * Function to check there is an existing event in the events array containing the given month.
   * @param month the month to see if there is an event in.
   * @returns true if there is an event in this month, false otherwise. 
   */
  function hasEvent(month: string) {
    for (const event of events) {
      //Ensure its a string
      const startStr = String(event.start);
      // Case 1: ISO format "YYYY-MM-DD"
      if (startStr.includes("-") && startStr.length <= 15) {

        //Split it up between the '-'
        const parts = startStr.split("-");
        //Get the month number from the string
        const eventMonth = parts[1];
        const monthMap: { [key: string]: string } = {
          "01": "January",
          "02": "February",
          "03": "March",
          "04": "April",
          "05": "May",
          "06": "June",
          "07": "July",
          "08": "August",
          "09": "September",
          "10": "October",
          "11": "November",
          "12": "December",
        };

        //If the month contains an event
        if (monthMap[eventMonth] === month) {
          return true;
        }
      }
      //Case 2: Short format like "Wed Mar 5"
      else if (startStr.length >= 7) {

        //Get 5th-7th chars
        const monthAbbrev = startStr.substring(4, 7); //5th–7th chars

        const abbrevToFull: { [key: string]: string } = {
          Jan: "January",
          Feb: "February",
          Mar: "March",
          Apr: "April",
          May: "May",
          Jun: "June",
          Jul: "July",
          Aug: "August",
          Sep: "September",
          Oct: "October",
          Nov: "November",
          Dec: "December",
        };

        if (abbrevToFull[monthAbbrev] === month) {
          return true;
        }
      }
    }

    //Now check the holiday events
    for (const event of holidayEvents) {
      //if the event doesn't pass these checks, do not include it
      if (event.allDay && event.isHoliday && event.holidayActivated) {
        //Ensure its a string
        const startStr = String(event.start);
        // Case 1: ISO format "YYYY-MM-DD"
        if (startStr.includes("-") && startStr.length <= 15) {

          //Split it up between the '-'
          const parts = startStr.split("-");

          //Get the month number from the string
          const eventMonth = parts[1];
          const monthMap: { [key: string]: string } = {
            "01": "January",
            "02": "February",
            "03": "March",
            "04": "April",
            "05": "May",
            "06": "June",
            "07": "July",
            "08": "August",
            "09": "September",
            "10": "October",
            "11": "November",
            "12": "December",
          };

          //If the month contains an event
          if (monthMap[eventMonth] === month) {
            return true;
          }
        }

        //Case 2: Short format like "Wed Mar 5"
        else if (startStr.length >= 7) {
          //Get 5th-7th chars
          const monthAbbrev = startStr.substring(4, 7); //5th–7th chars
          const abbrevToFull: { [key: string]: string } = {
            Jan: "January",
            Feb: "February",
            Mar: "March",
            Apr: "April",
            May: "May",
            Jun: "June",
            Jul: "July",
            Aug: "August",
            Sep: "September",
            Oct: "October",
            Nov: "November",
            Dec: "December",
          };

          if (abbrevToFull[monthAbbrev] === month) {
            return true;
          }
        }
      }
    }
    return false;
  }

  /**
   * Function to see whether or not there is at least one existing event that is a holiday.
   * @param events 
   * @returns 
   */
  function isHolidayEvent(events: EventInput[]) {
    for (const event of events) {
      if (event.holidayActivated) {
        return true;
      }
    }
    return false;
  }

  // function for the changing tooltips
  function TabAwareTooltip({ activeTab }: { activeTab: string }) {
    return (
      <div className="tooltip-one">
        <span className="question-mark-one">?</span>
        {activeTab === 'calendar' ? <CalendarTooltipText /> : <WeeklyTooltipText />}
      </div>
    );
  }

  //text for the calendar tooltip
  function CalendarTooltipText() {
    return (
      <div className="tooltiptext">
        <strong>Creating Calendar Events:</strong>
        <br></br>
        Click on the day you wish to take off and give it a title.
        <br></br>
        To create an event that spans across many days, choose a start day, then click, hold, and drag
        your mouse until you reach the desired end date.
        <br></br>
        <br></br>
        If you want to take some time off (but not a full 8 hour day), go to the week view in the top right corner. From there,
        an event can be created by clicking and dragging from one time slot to another. When you switch back to the month view on the calendar, the event will appear
        <br></br>
        <br></br>
        <strong>Editing Calendar Events:</strong>
        <br></br>
        You can click on a created event, and through the popup, edit the dates and times with the edit button in the top right corner.
        <br></br>
        An event can be moved around by clicking, holding, and dragging it across the calendar.
        Additionally, you can hover on the edge of a created event until you see double arrows, click and drag that to extend the dates.
      </div>
    );
  }

  //text for the weekly tool tooltip
  function WeeklyTooltipText() {
    return (
      <div className="tooltiptext">
        <strong>Entering Hours in Weekly Tool:</strong>
        <br></br>
        Simply add hours that you are working/planning to work into either the direct or indirect columns.
        <br></br>
        The numbers will be automatically calculated into the totals in the box to the left.
        <br></br><br></br>
        Make sure to save what you input!
        <br></br><br></br>
        <strong>Calculation Explanation:</strong>
        <br></br>
        The standard we are using for the calculations is 40 hours per week (indirect + direct hours).
        <br></br>
        If someone inputs a total of more than 40 hours, the hours off column
        should be negative since its &quot;making up&quot; for future leave or past leave of some sort.
      </div>
    );
  }

  //html for the Leave Planning Page
  return (
    <div>
      {/* this is the HTML for the unsaved changes on navbar clicks popup */}
      {showRedirectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded shadow-lg">
            <h2 className="text-xl font-bold mb-4">Unsaved Changes</h2>
            <p className="mb-6 text-gray-700">
              You have unsaved changes. Are you sure you want to leave this page?
            </p>
            <div className="flex justify-end space-x-4">
              <button
                className="px-4 py-2 bg-gray-300 rounded"
                onClick={cancelNav}
              >
                Stay on Page
              </button>
              <button
                className="px-4 py-2 bg-red-500 text-white rounded"
                onClick={confirmNav}
              >
                Leave Page
              </button>
              <button
                className="px-4 py-2 bg-green-500 text-white rounded"
                onClick={() => {
                  handleSave();
                  saveNav();
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* toaster notification html */}
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

      <div className="header-container">
        {/* this structures the Reset Inputs button and its reset reminder pop-up */}
        <button className="header-button" onClick={() => setResetModal(true)}> Delete All Inputted Values </button>
        {resetModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded shadow-lg">
              <h2 className="text-xl font-bold mb-4">Are you sure?</h2>
              <p>This will reset all values inputted into the Calendar and/or Table.</p>
              <div className="mt-4 flex justify-end space-x-2">
                <button onClick={() => setResetModal(false)} className="px-4 py-2 bg-gray-300 rounded">
                  Cancel
                </button>
                <button className="px-4 py-2 bg-red-500 text-white rounded"
                  onClick={() => {
                    setResetModal(false);
                    resetData();
                    location.reload();
                  }}
                >
                  Confirm Reset
                </button>
              </div>
            </div>
          </div>
        )}
        {/* HTML for the popup when there is unsaved changes */}
        {showUnsavedModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded shadow-lg">
              <h2 className="text-xl font-bold mb-4">Unsaved Changes</h2>
              <p className="mb-6 text-gray-700">{modalMessage}</p>
              <div className="flex justify-end space-x-4">
                <button
                  className="px-4 py-2 bg-gray-300 rounded"
                  onClick={() => {
                    setShowUnsavedModal(false);
                    setPendingTab(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 bg-red-500 text-white rounded"
                  onClick={() => {
                    if (pendingTab == 'calendar') {
                      setEvents([]);
                      setShowUnsavedModal(false);
                      setUnsavedChanges(false);
                      pendingAction();
                    } else {
                      setShowUnsavedModal(false);
                      setUnsavedChanges(false);
                      pendingAction();
                    }
                  }}
                >
                  Continue
                </button>
                <button
                  className="px-4 py-2 bg-green-500 text-white rounded"
                  onClick={() => {
                    handleSave();
                    setShowUnsavedModal(false);
                    pendingAction();
                  }}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Styling and Alignment for the Loading Buffer Symbol*/}
        <>
          <style>{`
          .spinner-wrapper {
            position: fixed;
            top: 0;
            left: 0;
            height: 100vh;
            width: 100vw;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255, 255, 255, 0.8);
            z-index: 9999;
          }

          .spinner {
            width: 40px;
            height: 40px;
            border: 5px solid #ccc;
            border-top: 5px solid #333;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>

          {isLoading && (
            <div className="spinner-wrapper">
              <div className="spinner"></div>
            </div>
          )}
        </>

        {/* This is for the structure for the Leave Planning title and the tooltip next of it */}
        <div className="app-container card">
          <span className="header-title text-semibold">Leave Planning</span>

          {/* tooltip is conditional on which tab is active */}
          <TabAwareTooltip activeTab={activeTab}></TabAwareTooltip>
        </div>
        {/* this is for the save button */}
        <div className="flex justify-end">
          <button className="header-button" onClick={handleSave} >
            Save Changes
          </button>
        </div>
      </div>

      {/* Left side inot panel attributes */}
      <div className="calendar-and-info">
        <section className="calendar-section">
          {/* Tabs above different tools */}
          <div className="tabsWrapper">
            <div className="tabsContainer">
              <button
                className={`tab ${activeTab === 'calendar' ? 'active' : ''}`}
                onClick={() => {
                  if (unsavedChanges) {
                    setPendingTab('calendar');
                    setModalMessage("You have changes that haven't been saved. Are you sure you want to switch views before saving?");
                    setPendingAction(() => () => {
                      setActiveTab('calendar');
                      setIsTableView(false);
                    });
                    setShowUnsavedModal(true);
                  } else {
                    setActiveTab('calendar');
                    setIsTableView(false);
                  }
                }}
              >
                Calendar Tool
              </button>
              <button
                className={`tab ${activeTab === 'table' ? 'active' : ''}`}
                onClick={() => {
                  if (unsavedChanges) {
                    setPendingTab('table');
                    setModalMessage("You have changes that haven't been saved. Are you sure you want to switch views before saving?");
                    setPendingAction(() => () => {
                      setActiveTab('table');
                      setIsTableView(true);
                    });
                    setShowUnsavedModal(true);
                  } else {
                    setActiveTab('table');
                    setIsTableView(true);
                  }
                }}
              >
                Weekly Tool
              </button>
            </div>
          </div>
          {/* Display the calendar or table */}
          <div className="view-content">
            {isTableView ? (
              <TableView
                setUnsavedChanges={setUnsavedChanges}
                tableViewHoursOffToPage={tableViewHoursOffToPage}
                tableViewHoursOffPlannedToPage={setTableViewHoursOffPlannedToPage}
                firstWeekToPage={firstWeekToPage}
                lastWeekToPage={lastWeekToPage}
              />
            ) : (
              <EmpCalendar
                holidayEventsChange={holidayEvents}
                unsavedChangesToPage={setUnsavedChanges}
                eventsToPage={eventsToPage}
                hypotheticalDataChange={hypotheticalData}
              />
            )}
          </div>
        </section>

        {/* this section is for the info shown on the left side */}
        <div className="info-panel">
          {/* this is for the info in teh top box */}
          <div className="stats">
            <section className="hour-options">
              <h2>Change Target Hours: </h2>
              <select
                value={target}
                onChange={(e) => {
                  const newTarget = e.target.value;
                  setTarget(newTarget);
                  if (newTarget != startingTarget) {
                    setTargetChange(true);
                  } else {
                    setTargetChange(false);
                  }
                }}
                className="Target Hours border-2 border-black bg-[#F3FBFD] h-10"
              >
                {["1776", "1824", "1840", "1860"].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
                {!["1776", "1824", "1840", "1860"].includes(String(startingTarget)) && (
                  <option value={startingTarget}>{startingTarget}</option>
                )}
              </select>
              {targetChange && <p className="text-red-600 pl-2 font-semibold text-lg">YOUR ACTUAL TARGET HOUR IS NOT SELECTED!</p>}
            </section>
          </div>
          {/* Stats on Left Side */}
          <section className="stats">
            <p>Leave hours remaining:{' '}
              <strong>
                {isTableView && match
                  ? `${Number(leaveHoursTableView).toFixed(2)} hours`
                  : !isTableView && match
                    ? `${Number(leaveHoursCalendarView).toFixed(2)} hours`
                    : '0 hours'}
              </strong>
            </p>

            <p>Total Hours Taken Off:{' '}
              <strong>
                {isTableView && match
                  ? (tableViewHoursOff
                    ? `${Math.round(tableViewHoursOff * 100) / 100} hours`
                    : "0 hours")
                  : !isTableView && match
                    ?
                    `${Math.round((hoursOff! + match.timeOff) * 100) / 100} hours`
                    : "Loading..."
                }
              </strong>
            </p>

            <p>Planned Hours Taken Off:{' '}
              <strong>
                {isTableView && match
                  ? (hypotheticalTimeTakenOff
                    ? `${Math.round(hypotheticalTimeTakenOff * 100) / 100} hours`
                    : "0 hours")
                  : !isTableView && match
                    ? (hoursOff
                      ? `${Math.round(hoursOff * 100) / 100} hours`
                      : "0 hours")
                    : "Loading..."
                }
              </strong>
            </p>

            <p>Past Hours Already Taken Off:{' '}
              <strong>{match ? `${Math.round(match.timeOff * 100) / 100} hours` : "Loading..."}</strong>
            </p>

            <p>Avg Hours per Week for Mid-Year Target:{' '}
              <strong>{match ? `${Math.round(avgHoursMidGoal * 100) / 100} hours` : "Loading..."}</strong>
            </p>

            <p>Avg Hours per Week to Reach Year Target:{' '}
              <strong>{match ? `${Math.round(avgHoursEndGoal * 100) / 100} hours` : "Loading..."}</strong>
            </p>
          </section>

          {/* List of Months to Show which have events */}
          {activeTab === 'calendar' && (
            <section className="event-reminder">
              <div className="h2-title flex mb-1">
                <h2>Calendar Event Reminder</h2>
                {/* html for tooltip by Calendar Event Reminder */}
                <div className="tooltip-two pt-1">
                  <span className="questionmark-two">?</span>
                  <div className="tooltiptext"> This component reminds you if you have created an event in a certain month.
                    <br></br><br></br>
                    When you create an event, the corresponding month below will become highlighted.
                  </div>
                </div>
              </div>
              <div className="flex flex-row flex-wrap gap-3">
                {months.map((month, index) => (
                  <div
                    key={index}
                    className={`cursor-pointer px-2 py-1 rounded 
                      ${hasEvent(month) ? "bg-[#3C6778] text-white" : "hover:bg-gray-200"}`}
                  >
                    {month}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* this section is for the structure of the info in the bottom box */}
          {activeTab === 'calendar' && (
            <section className="holidays">
              <div>
                {/* this part is for the Federal Holidays label and the tooltip beside it */}
                <div className="flex mb-1">
                  <h2>Federal Holidays</h2>
                  {/* html for tooltip */}
                  <div className="tooltip-two pt-1">
                    <span className="questionmark-two">?</span>
                    <div className="tooltiptext"> Checking a box for a federal holiday means that you will be taking that day off.
                      <br></br>
                      Time is taken off for a full (8 hour) work day.
                      <br></br><br></br>
                      If you want to take a different amount of time off, you must create an event on the calendar manually for that day.
                    </div>
                  </div>
                  {/* For the Select All Checkbox */}
                  <div className="select-all-check">
                    <input type="checkbox" checked={isChecked} onChange={handleSelectAll}></input>
                    <label> Select All</label>
                  </div>
                </div>

                {/* these are the checkboxes for fed. holidays */}
                <Checkbox holidayName="New Year's Day" holidays={holidayEvents} checked={
                  holidayEvents.find((item: EventInput) => item.title === "New Year's Day")?.holidayActivated || false
                } checkboxToPage={checkboxToPage} disabled={newYearsTime < currentDay} />

                <Checkbox holidayName="MLK Day" holidays={holidayEvents} checked={holidayEvents.find((item: EventInput) => item.title === "MLK Day")?.holidayActivated || false} checkboxToPage={checkboxToPage} disabled={MLKTime < currentDay} />

                <Checkbox holidayName="President's Day" holidays={holidayEvents} checked={holidayEvents.find((item: EventInput) => item.title === "President's Day")?.holidayActivated || false} checkboxToPage={checkboxToPage} disabled={presidentsDayTime < currentDay} />

                <Checkbox holidayName="Memorial Day" holidays={holidayEvents} checked={holidayEvents.find((item: EventInput) => item.title === "Memorial Day")?.holidayActivated || false} checkboxToPage={checkboxToPage} disabled={memorialDayTime < currentDay} />

                <Checkbox holidayName="Juneteenth" holidays={holidayEvents} checked={holidayEvents.find((item: EventInput) => item.title === "Juneteenth")?.holidayActivated || false} checkboxToPage={checkboxToPage} disabled={juneteenthTime < currentDay} />

                <Checkbox holidayName="Independence Day" holidays={holidayEvents} checked={holidayEvents.find((item: EventInput) => item.title === "Independence Day")?.holidayActivated || false} checkboxToPage={checkboxToPage} disabled={independenceDayTime < currentDay} />

                <Checkbox holidayName="Labor Day" holidays={holidayEvents} checked={holidayEvents.find((item: EventInput) => item.title === "Labor Day")?.holidayActivated || false} checkboxToPage={checkboxToPage} disabled={laborDayTime < currentDay} />

                <Checkbox holidayName="Indigenous People's Day" holidays={holidayEvents} checked={holidayEvents.find((item: EventInput) => item.title === "Indigenous People's Day")?.holidayActivated || false} checkboxToPage={checkboxToPage} disabled={indigenousDayTime < currentDay} />

                <Checkbox holidayName="Veteran's Day" holidays={holidayEvents} checked={holidayEvents.find((item: EventInput) => item.title === "Veteran's Day")?.holidayActivated || false} checkboxToPage={checkboxToPage} disabled={veteransDayTime < currentDay} />

                <Checkbox holidayName="Thanksgiving Day" holidays={holidayEvents} checked={holidayEvents.find((item: EventInput) => item.title === "Thanksgiving Day")?.holidayActivated || false} checkboxToPage={checkboxToPage} disabled={thanksgivingDayTime < currentDay} />

                <Checkbox holidayName="Christmas Day" holidays={holidayEvents} checked={holidayEvents.find((item: EventInput) => item.title === "Christmas Day")?.holidayActivated || false} checkboxToPage={checkboxToPage} disabled={christmasDayTime < currentDay} />
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}