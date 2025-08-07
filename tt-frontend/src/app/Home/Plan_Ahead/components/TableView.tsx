'use client'

import React, { useRef } from "react";
import { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { useSession } from "next-auth/react";
import { useHypotheticalData } from '@/app/store/hypotheticalData';
import { useIndirectHoursHyp } from '@/app/store/indirectHoursHyp';
import { useDirectHoursHyp } from '@/app/store/directHoursHyp';
import { useLoadingStore } from "@/app/store/isLoading";
import { FaRegCalendarAlt } from "react-icons/fa";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  addDays,
  format,
  isBefore,
  endOfYear,
  getISOWeek,
  getWeek
} from 'date-fns';

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

type CurrentHours = {
  week: string;
  indirect_hrs: number;
  direct_hrs: number;
  off: number;
  total: number;
  holidays?: string[],
};

type TableViewProps = {
  setUnsavedChanges: (unsaved: boolean) => void,
  tableViewHoursOffToPage: (value: number) => void,
  tableViewHoursOffPlannedToPage: (value: number) => void,
  firstWeekToPage: (value: number) => void,
  lastWeekToPage: (value: number) => void
}

//the view for the table
export default function TableView({ tableViewHoursOffToPage, tableViewHoursOffPlannedToPage, firstWeekToPage, lastWeekToPage, setUnsavedChanges }: TableViewProps) {

  const [unsavedTableChanges, setTableUnsavedChanges] = useState(false);
  const curYr = new Date().getFullYear();
  const holidaysList = [
    { date: new Date(`${curYr}-01-01`), name: "New Year's Day" },
    { date: new Date(`${curYr}-01-20`), name: "MLK Day" },
    { date: new Date(`${curYr}-02-17`), name: "President's Day" },
    { date: new Date(`${curYr}-05-26`), name: "Memorial Day" },
    { date: new Date(`${curYr}-06-19`), name: "Juneteenth" },
    { date: new Date(`${curYr}-07-04`), name: "Independence Day" },
    { date: new Date(`${curYr}-09-01`), name: "Labor Day" },
    { date: new Date(`${curYr}-10-13`), name: "Indigenous People's Day" },
    { date: new Date(`${curYr}-11-11`), name: "Veteran's Day" },
    { date: new Date(`${curYr}-11-27`), name: "Thanksgiving Day" },
    { date: new Date(`${curYr}-12-25`), name: "Christmas Day" },
  ];

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const isLoading = useLoadingStore((state) => state.isLoading);
  const setIsLoading = useLoadingStore((state) => state.setIsLoading);

  //fetches information from the hours api
  useEffect(() => {
    fetch('/api/hours')
      .then(res => res.json())
      .then(tableData => setEmployees(tableData))
      .catch(err => console.error('Error fetching employees:', err));
  }, []);
  //Fetch correct data for each employee
  const { data: session } = useSession();
  const match = employees.find((emp) => {
    const fullName = emp.name;
    return fullName === session?.user.name;
  });

  let firstWeek = 0;

  //get employee real time taken off already 
  if (match) {
    firstWeek = match.firstWeek;
  }

  const hypotheticalData = useHypotheticalData((state) => state.hypotheticalData);
  const setHypotheticalData = useHypotheticalData((state) => state.setHypotheticalData);

  // The hypothetical direct and indirect hours for this employee, stored in global arrays of length 52.
  const indirectHoursHyp = useIndirectHoursHyp((state) => state.indirectHoursHyp);
  const directHoursHyp = useDirectHoursHyp((state) => state.directHoursHyp)

  //calculate total hours off my adding match.timeoff (past time off) to off hours from current month and future weeks
  function calculateTotalHoursOff(selectedMonth: CurrentHours[]) {
    const firstWeekCalendar = weekNums[0];
    const lastWeek = weekNums[weekNums.length - 1];

    //getting hours off from entire year, subtracting it from match.time off to see how much planned time off they have
    const array = getFutureWeeksSkippingCurrentMonth(firstWeekCalendar, lastWeek);

    let hypotheticalHours = 0;
    for (let i = 0; i < array.length; i++) {
      if (array[i].off && array[i].off !== 0) {
        hypotheticalHours += array[i].off;
      }
    }

    let currentMonthHours = 0;
    const today = new Date();

    for (let j = 0; j < selectedMonth.length; j++) {
      const weekRange = selectedMonth[j].week;
      const startDateStr = weekRange.split(" - ")[0];
      const weekStart = new Date(startDateStr);

      // Include only if the week is today or in the future
      if (weekStart >= startOfWeek(today, { weekStartsOn: 6 })) {
        if (selectedMonth[j].off && selectedMonth[j].off !== 0) {
          currentMonthHours += selectedMonth[j].off;
        }
      }
    }

    if (match && match.timeOff) {
      tableViewHoursOffToPage(hypotheticalHours + currentMonthHours + match.timeOff);
      tableViewHoursOffPlannedToPage(hypotheticalHours + currentMonthHours);
    }
  }
  //Allow entering into the table for indirect hours
  const IndirectHoursInput = ({
    initialValue,
    rowIndex,
    data,
    setData,
    indirectValues,
    setTableUnsavedChanges,
    calculateTotalHoursOff,
    setUnsavedChanges,
  }: {
    initialValue: number;
    rowIndex: number;
    data: CurrentHours[];
    setData: (d: CurrentHours[]) => void;
    indirectValues: React.MutableRefObject<{ [key: number]: number }>;
    setTableUnsavedChanges: (v: boolean) => void;
    calculateTotalHoursOff: (d: CurrentHours[]) => void;
    setUnsavedChanges: (val: boolean) => void;

  }) => {
    const [inputValue, setInputValue] = useState(initialValue.toString());
    const handleBlur = () => {
      let newValue = parseFloat(inputValue) || 0;
      const updated = [...data];
      if (newValue > 100) newValue = 100;
      if (newValue < 0) newValue = 0;
      indirectValues.current[rowIndex] = newValue;

      if (!updated[rowIndex].direct_hrs) {
        updated[rowIndex].direct_hrs = 0;
      }

      updated[rowIndex] = {
        ...updated[rowIndex],
        indirect_hrs: newValue,
        off: Math.round((40 - (updated[rowIndex].direct_hrs + newValue)) * 100) / 100,
        total: Math.round((newValue + updated[rowIndex].direct_hrs) * 100) / 100
      };

      setData(updated);
      setTableUnsavedChanges(true);
      calculateTotalHoursOff(updated);
      setUnsavedChanges(true);
    };

    return (
      <input
        type="number"
        placeholder="0"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleBlur();
          }
        }}
        className="w-24 px-2 py-1 border rounded [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
    );
  };
  //Allow entering into the table for direct hours
  const DirectHoursInput = ({
    initialValue,
    rowIndex,
    data,
    setData,
    directValues,
    setTableUnsavedChanges,
    calculateTotalHoursOff,
    setUnsavedChanges,
  }: {
    initialValue: number;
    rowIndex: number;
    data: CurrentHours[];
    setData: (d: CurrentHours[]) => void;
    directValues: React.MutableRefObject<{ [key: number]: number }>;
    setTableUnsavedChanges: (v: boolean) => void;
    calculateTotalHoursOff: (d: CurrentHours[]) => void;
    setUnsavedChanges: (val: boolean) => void;
  }) => {
    const [inputValue, setInputValue] = useState(initialValue.toString());
    const handleBlur = () => {
      let newValue = parseFloat(inputValue) || 0;
      const updated = [...data];

      if (newValue > 100) newValue = 100;
      if (newValue < 0) newValue = 0;

      directValues.current[rowIndex] = newValue;

      if (!updated[rowIndex].indirect_hrs) {
        updated[rowIndex].indirect_hrs = 0;
      }

      updated[rowIndex] = {
        ...updated[rowIndex],
        direct_hrs: newValue,
        off: Math.round((40 - (updated[rowIndex].indirect_hrs + newValue)) * 100) / 100,
        total: Math.round((newValue + updated[rowIndex].indirect_hrs) * 100) / 100,
      };

      setData(updated);
      setTableUnsavedChanges(true);
      calculateTotalHoursOff(updated);
      setUnsavedChanges(true);
    };

    return (
      <input
        type="number"
        placeholder="0"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleBlur();
          }
        }}
        className="w-24 px-2 py-1 border rounded [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
    );
  };
  //Establish the Table
  const columnHelper = createColumnHelper<CurrentHours>();
  const getColumns = (
    data: CurrentHours[],
    setData: React.Dispatch<React.SetStateAction<CurrentHours[]>>,
  ) => [
      columnHelper.accessor("week", {
        header: "Weeks",
        cell: (info) => {
          const value = info.getValue() as string;
          const [range, holidays] = value.split('\n');

          return (
            <div style={{ whiteSpace: 'pre-line' }}>
              <div>{range}</div>
              {holidays && (
                <div style={{ color: 'rgb(191, 35, 35)', fontWeight: 'bold' }}>
                  {holidays}
                </div>
              )}
            </div>
          );
        },
      }),

      columnHelper.accessor("indirect_hrs", {
        header: "Indirect Hours",
        cell: ({ row, getValue }) => {
          return (
            <IndirectHoursInput
              initialValue={getValue()}
              rowIndex={row.index}
              data={data}
              setData={setData}
              indirectValues={indirectValues}
              setTableUnsavedChanges={setTableUnsavedChanges}
              calculateTotalHoursOff={calculateTotalHoursOff}
              setUnsavedChanges={setUnsavedChanges}
            />
          );
        },
      }),

      columnHelper.accessor("direct_hrs", {
        header: "Direct Hours",
        cell: ({ row, getValue }) => {
          return (
            <DirectHoursInput
              initialValue={getValue()}
              rowIndex={row.index}
              data={data}
              setData={setData}
              directValues={directValues}
              setTableUnsavedChanges={setTableUnsavedChanges}
              calculateTotalHoursOff={calculateTotalHoursOff}
              setUnsavedChanges={setUnsavedChanges}
            />
          );
        },
      }),

      columnHelper.accessor("off", {
        header: "Hours Taking Off",
        cell: (info) => {
          const value = info.getValue();
          return isNaN(value) ? "0" : value.toString();
        },
      }),

      columnHelper.accessor("total", {
        header: "Total Working Hours",
        cell: (info) => {
          const value = info.getValue();
          return isNaN(value) ? "0" : value.toString();
        },
      }),
    ];
  // Fetch from hypothetical database
  useEffect(() => {
    fetch('/api/planAhead')
      .then(res => res.json())
      .then(data => setHypotheticalData(data))
      .catch(err => console.error('Error fetching employees:', err));
  }, []);

  /**
    * These dictionaries are for the values specifically on this table view,
    * the ones that are edited by the user, not any of the constant values that are
    * pulled from either database.
    * 
    * We need these dictionaries to access any modified data on this table view that the user inputs
    * whenever they use the arrows in the textbox.
    * 
    * Key is the week number 1-4 of the month, value is the input. 
    */
  const directValues = useRef<{ [key: number]: number }>({});
  const indirectValues = useRef<{ [key: number]: number }>({});

  //Keep track of thes starting week number for each week
  //The first and last element of this array are necessary for the data savings
  const weekNums: number[] = [];


  /* Populates the Payroll Weeks for each Month*/
  const getWeeks = (date: Date): CurrentHours[] => {
    const start = startOfWeek(startOfMonth(date), { weekStartsOn: 6 });
    const end = endOfMonth(date);
    const result: CurrentHours[] = [];
    let current = new Date(start);

    //Get the week number of the start date
    const weekNumber = getWeek(start, {
      weekStartsOn: 6,
    });

    //Start from the first week, shift the index by 1 for clean array storages
    let i = weekNumber - 1;
    //let i = weekNumber;

    //Track the number of weeks in this month
    let weekCount = 0;

    while (isBefore(current, end) || format(current, 'MM-dd-yyyy') === format(end, 'MM-dd-yyyy')) {
      const weekStart = new Date(current);
      weekNums.push(getISOWeek(weekStart));
      const weekEnd = addDays(weekStart, 6);
      const weekLabel = `${format(weekStart, 'M/d/yyyy')} - ${format(weekEnd, 'M/d/yyyy')}`;

      //disregard week prior to employee's first week
      if (i < firstWeek - 1) {
        i++;
        weekCount++;
        current = addDays(current, 7);
        continue;
      }
      const holidays = holidaysList
        .filter(h => h.date >= weekStart && h.date <= weekEnd)
        .map(h => h.name);

      const weekWithHolidays = holidays.length
        ? `${weekLabel}\n(${holidays.join(', ')})`
        : weekLabel;

      let direct_hrs = 0;
      let indirect_hrs = 0;

      //Ensure the direct hours array is valid
      if (hypotheticalData &&
        Array.isArray(hypotheticalData.directHoursHyp) &&
        i - 1 >= 0 &&
        i - 1 < hypotheticalData.directHoursHyp.length && hypotheticalData.directHoursHyp[i - 1]) {

        //Add hours to the displayed hypothetical table
        direct_hrs = hypotheticalData.directHoursHyp[i - 1];
        directHoursHyp[i - 1] = direct_hrs;

        //Undefined checker
        if (directValues.current[weekCount] != undefined) {
          //Add hours to the database
          directHoursHyp[i - 1] = directValues.current[weekCount];
        }
      }

      else {
        if (match) {
          if (match.directHours[i + 1] != 0) {
            direct_hrs = Number(match.directHours[i + 1]);
            if (directValues.current[weekCount] != undefined) {
              directHoursHyp[i - 1] = directValues.current[weekCount];
            }
          }
          else {
            direct_hrs = Number(match.directHours[i + 1]);
            if (directValues.current[weekCount] != undefined) {
              directHoursHyp[i - 1] = directValues.current[weekCount];
            }
          }
        }
      }

      //Ensure the indirect hours array is valid        
      if (hypotheticalData &&
        Array.isArray(hypotheticalData.indirectHoursHyp) &&
        i - 1 >= 0 &&
        i - 1 < hypotheticalData.indirectHoursHyp.length && hypotheticalData.indirectHoursHyp[i - 1]) {

        //Add hours to the displayed hypothetical table
        indirect_hrs = hypotheticalData.indirectHoursHyp[i - 1];
        indirectHoursHyp[i - 1] = indirect_hrs;

        //Undefined checker
        if (indirectValues.current[weekCount] != undefined) {
          //Add hours to the database
          indirectHoursHyp[i - 1] = indirectValues.current[weekCount];
        }
      }

      else {
        if (match) {
          if (match.indirectHours[i + 1] != 0) {
            indirect_hrs = Number(match.indirectHours[i + 1]);
            if (indirectValues.current[weekCount] != undefined) {
              indirectHoursHyp[i - 1] = indirectValues.current[weekCount];
            }
          }
          else {
            indirect_hrs = Number(match.indirectHours[i + 1]);
            if (indirectValues.current[weekCount] != undefined) {
              indirectHoursHyp[i - 1] = indirectValues.current[weekCount];
            }
          }
        }
      }

      let off = 0;
      if (direct_hrs !== 0 || indirect_hrs !== 0) {
        off = 40 - (Number(indirect_hrs) + Number(direct_hrs))
      }

      //If the start of the week is in the future or if this is the present week
      if (weekStart > new Date()) {
        result.push({
          week: weekWithHolidays,
          indirect_hrs: indirect_hrs,
          direct_hrs: direct_hrs,
          off: Math.round(off * 100) / 100,
          total: Number(indirect_hrs) + Number(direct_hrs),
        });
      } else {
        off = 40 - (Number(indirect_hrs) + Number(direct_hrs))
        const today = new Date();

        //checking if current week
        if (weekStart <= today && today <= weekEnd) {
          result.push({
            week: weekWithHolidays,
            indirect_hrs: indirect_hrs,
            direct_hrs: direct_hrs,
            off: Math.round(off * 100) / 100,
            total: Number(indirect_hrs) + Number(direct_hrs),
          });
        } else {
          //Display all values on the table columns  
          result.push({
            week: weekWithHolidays,
            indirect_hrs: indirect_hrs,
            direct_hrs: direct_hrs,
            off: Math.round(off * 100) / 100,
            total: Number(indirect_hrs) + Number(direct_hrs),
          });
        }
      }
      //Increment pointers
      i++;
      weekCount++;
      //Iterate to the next week
      current = addDays(current, 7);
    }
    return result;
  };

  const getFutureWeeks = (): CurrentHours[] => {
    const today = new Date();
    //const nextWeek = addDays(today, 7);
    const start = startOfWeek(today, { weekStartsOn: 6 });
    const end = endOfYear(new Date());
    const result: CurrentHours[] = [];
    let current = new Date(start);
    const weekNumber = getWeek(current, { weekStartsOn: 6 });

    let i = weekNumber - 1;
    let weekCount = 0;
    while (isBefore(current, end)) {
      //disregard weeks prior to employee's first week
      if (i < firstWeek - 1) {
        i++;
        weekCount++;
        current = addDays(current, 7);
        continue;
      }

      const weekStart = new Date(current);
      const weekEnd = addDays(weekStart, 6);

      let indirect_hrs = 0;
      let direct_hrs = 0;

      //Ensure the direct hours array is valid
      if (hypotheticalData &&
        Array.isArray(hypotheticalData.directHoursHyp) &&
        i - 1 >= 0 &&
        i - 1 < hypotheticalData.directHoursHyp.length && hypotheticalData.directHoursHyp[i - 1]) {
        //Add hours to the displayed hypothetical table
        direct_hrs = hypotheticalData.directHoursHyp[i - 1];
        directHoursHyp[i - 1] = direct_hrs;

        //Undefined checker
        if (directValues.current[weekCount] != undefined) {
          //Add hours to the database
          directHoursHyp[i - 1] = directValues.current[weekCount];
        }
      } else {
        if (match) {
          if (match.directHours[i + 1] != 0) {
            direct_hrs = Number(match.directHours[i + 1]);
            if (directValues.current[weekCount] != undefined) {
              directHoursHyp[i - 1] = directValues.current[weekCount];
            }
          }
          else {
            direct_hrs = Number(match.directHours[i + 1]);
            if (directValues.current[weekCount] != undefined) {
              directHoursHyp[i - 1] = directValues.current[weekCount];
            }
          }
        }
      }

      //Ensure the indirect hours array is valid        
      if (hypotheticalData &&
        Array.isArray(hypotheticalData.indirectHoursHyp) &&
        i - 1 >= 0 &&
        i - 1 < hypotheticalData.indirectHoursHyp.length && hypotheticalData.indirectHoursHyp[i - 1]) {
        //Add hours to the displayed hypothetical table
        indirect_hrs = hypotheticalData.indirectHoursHyp[i - 1];
        indirectHoursHyp[i - 1] = indirect_hrs;

        //Undefined checker
        if (indirectValues.current[weekCount] != undefined) {
          //Add hours to the database
          indirectHoursHyp[i - 1] = indirectValues.current[weekCount];
        }
      } else {
        if (match) {
          if (match.indirectHours[i + 1] != 0) {
            indirect_hrs = Number(match.indirectHours[i + 1]);
            if (indirectValues.current[weekCount] != undefined) {
              indirectHoursHyp[i - 1] = indirectValues.current[weekCount];
            }
          } else {
            indirect_hrs = Number(match.indirectHours[i + 1]);
            if (indirectValues.current[weekCount] != undefined) {
              indirectHoursHyp[i - 1] = indirectValues.current[weekCount];
            }
          }
        }
      }

      let off = 0;
      if (direct_hrs !== 0 || indirect_hrs !== 0) {
        off = 40 - (Number(indirect_hrs) + Number(direct_hrs))
      }
      //If the start of the week is in the future or if this is the present week
      if (weekStart > new Date()) {

        result.push({
          week: "",
          indirect_hrs: indirect_hrs,
          direct_hrs: direct_hrs,
          off: off,
          total: Number(indirect_hrs) + Number(direct_hrs),
        });
      } else {
        const today = new Date();
        //checking if current week
        if (weekStart <= today && today <= weekEnd) {
          const off = 0;
          result.push({
            week: "",
            indirect_hrs: indirect_hrs,
            direct_hrs: direct_hrs,
            off: Math.round(off * 100) / 100,
            total: Number(indirect_hrs) + Number(direct_hrs),
          });
        } else {
          const off = 40 - (Number(indirect_hrs) + Number(direct_hrs));
          //Display all values on the table columns  
          result.push({
            week: "",
            indirect_hrs: indirect_hrs,
            direct_hrs: direct_hrs,
            off: Math.round(off * 100) / 100,
            total: Number(indirect_hrs) + Number(direct_hrs),
          });
        }
      }
      i++;
      weekCount++;
      current = addDays(current, 7);
    }
    return result;
  }
  //Obtain data past the current month
  const getFutureWeeksSkippingCurrentMonth = (firstWeekIndex: number, lastWeekIndex: number): CurrentHours[] => {
    const today = new Date();
    const start = startOfWeek(today, { weekStartsOn: 6 }); // Saturday-start
    const end = endOfYear(today);
    const result: CurrentHours[] = [];
    let current = new Date(start);

    const weekNumber = getWeek(current, { weekStartsOn: 6 });
    let i = weekNumber - 1;
    let weekCount = 0;

    while (isBefore(current, end)) {
      if (i < firstWeek - 1) {
        i++;
        weekCount++;
        current = addDays(current, 7);
        continue;
      }
      // Skip weeks inside the currentMonth range
      if (i >= firstWeekIndex && i <= lastWeekIndex) {
        i++;
        weekCount++;
        current = addDays(current, 7);
        continue;
      }

      let direct_hrs = 0;
      let indirect_hrs = 0;

      if (hypotheticalData &&
        Array.isArray(hypotheticalData.directHoursHyp) &&
        i - 1 >= 0 &&
        i - 1 < hypotheticalData.directHoursHyp.length &&
        hypotheticalData.directHoursHyp[i - 1]) {
          direct_hrs = hypotheticalData.directHoursHyp[i - 1];
          if (directValues.current[weekCount] !== undefined) {
            directHoursHyp[i - 1] = directValues.current[weekCount];
          }
      } else if (match) {
        direct_hrs = Number(match.directHours[i + 1] || 0);
        if (directValues.current[weekCount] !== undefined) {
          directHoursHyp[i - 1] = directValues.current[weekCount];
        }
      }

      if (hypotheticalData &&
        Array.isArray(hypotheticalData.indirectHoursHyp) &&
        i - 1 >= 0 &&
        i - 1 < hypotheticalData.indirectHoursHyp.length &&
        hypotheticalData.indirectHoursHyp[i - 1]) {
          indirect_hrs = hypotheticalData.indirectHoursHyp[i - 1];
          if (indirectValues.current[weekCount] !== undefined) {
            indirectHoursHyp[i - 1] = indirectValues.current[weekCount];
          }
      } else if (match) {
        indirect_hrs = Number(match.indirectHours[i + 1] || 0);
        if (indirectValues.current[weekCount] !== undefined) {
          indirectHoursHyp[i - 1] = indirectValues.current[weekCount];
        }
      }

      let off = 0;
      if (direct_hrs !== 0 || indirect_hrs !== 0) {
        off = 40 - (Number(direct_hrs) + Number(indirect_hrs));
      }

      result.push({
        week: "",
        indirect_hrs,
        direct_hrs,
        off: Math.round(off * 100) / 100,
        total: Number(indirect_hrs) + Number(direct_hrs),
      });

      i++;
      weekCount++;
      current = addDays(current, 7);
    }
    return result;
  };

  useEffect(() => {
    if (isLoading) {
      setTableUnsavedChanges(false);
      directValues.current = {};
      indirectValues.current = {};
    }
  }, [isLoading])

  const [data, setData] = useState<CurrentHours[]>(getWeeks(selectedDate!));

  useEffect(() => {
    setSelectedDate(new Date());
    setIsLoading(true);

    const newTableData = getWeeks(selectedDate!);
    setData(newTableData);

    const array = getFutureWeeks();
    directValues.current = {};
    indirectValues.current = {};

    let hypotheticalHours = 0;
    for (let i = 0; i < array.length; i++) {
      if (array[i].off && array[i].off !== 0) {
        hypotheticalHours += array[i].off;
      }
    }

    if (match) {
      tableViewHoursOffToPage(hypotheticalHours + match.timeOff);
      tableViewHoursOffPlannedToPage(hypotheticalHours);
    }

    calculateTotalHoursOff(data);
    setIsLoading(false);

  }, [employees])

  useEffect(() => {
    const newData = getWeeks(selectedDate!);
    setData(newData);

    const firstWeekCalendar = weekNums[0];
    const lastWeek = weekNums[weekNums.length - 1];
    firstWeekToPage(firstWeekCalendar);
    lastWeekToPage(lastWeek);

    directValues.current = {};
    indirectValues.current = {};
    setTableUnsavedChanges(false);

  }, [selectedDate]);

  const table = useReactTable({
    data,
    columns: getColumns(data, setData),
    getCoreRowModel: getCoreRowModel(),
  });

  const [pendingDate, setPendingDate] = useState<Date | null>(null);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  /* Generates the Table */
  const Table = () => {
    /* HTML Table Component */
    return (
      <div className="flex flex-col items-start">
        <h2><strong>Table View</strong></h2>
        <div className="flex items-center gap-4 mb-4">
          <label htmlFor="month-picker" className="text-base font-semibold">
            Select Month:
          </label>
          <DatePicker
            id="month-picker"
            selected={selectedDate}
            onChange={(date) => {
              if (date && unsavedTableChanges) {
                setShowUnsavedModal(true); 
                setPendingDate(date);
              }
              else if (date && !unsavedTableChanges) {
                setSelectedDate(date);
              }
            }}
            dateFormat="MMMM yyyy"
            showMonthYearPicker
            popperPlacement="right-end"
            className="border border-black rounded px-3 py-2 min-w-[200px] w-auto"
          />
          <FaRegCalendarAlt
            className="absolute mt-4 ml-76 transform -translate-y-1/2 text-black pointer-events-none"
          />
        </div>
        {/* Unsaved Changes between months HTML */}
        {showUnsavedModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-white p-6 rounded shadow-md text-center max-w-sm w-full">
              <p className="mb-4 font-semibold">
                You have unsaved changes. Are you sure you want to switch months?
                To save your hypothetical data, you must save one month at a time.
              </p>
              <div className="flex justify-center gap-4">
                <button
                  className="bg-red-500 text-white px-4 py-2 rounded"
                  onClick={() => setShowUnsavedModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="bg-blue-600 text-white px-4 py-2 rounded"
                  onClick={() => {
                    if (pendingDate) {
                      setSelectedDate(pendingDate); 
                      setPendingDate(null);         
                      setShowUnsavedModal(false); 
                    }
                  }}
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}
        {/* HTML for table */}
        <table className="min-w-full border text-left border-collapse bg-white">
          <thead className="bg-blue-100">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="border px-4 py-2">
                    {!header.isPlaceholder &&
                      flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel()?.rows?.map((row) => (
              <tr key={row.id} className="even:bg-blue-50">
                {row?.getVisibleCells()?.map((cell) => (
                  <td key={cell.id} className="border px-4 py-2">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );

  };

  useEffect(() => {
    fetch('/api/planAhead')
      .then(res => res.json())
      .then(data => setHypotheticalData(data))
      .catch(err => console.error('Error fetching plan ahead data:', err));
  }, []);

  return (
    <>
      {/* Styling and Alignment for the Loading Buffer Symbol */}
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
            background: rgba(255, 255, 255, 0.8); /* optional overlay */
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
          }`}
      </style>

      {isLoading && (
        <div className="spinner-wrapper">
          <div className="spinner"></div>
        </div>
      )}
      <Table />
    </>
  );
}