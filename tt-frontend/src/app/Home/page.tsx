'use client';

import { useState, useEffect } from 'react';
import React from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import "../styles/globals.css";
import toast, { ToastBar, Toaster } from 'react-hot-toast';
import { CheckCircle } from 'lucide-react';
import { useSession } from "next-auth/react";
import { FaArrowRight, FaArrowLeft, FaRegCalendarAlt, FaToggleOff, FaToggleOn } from "react-icons/fa";
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
  getWeek
} from 'date-fns';

type CurrentHours = {
  week: string;
  indirect_hrs: number;
  direct_hrs: number;
  total: number;
};

const columnHelper = createColumnHelper<CurrentHours>();
//headers for the cols in the table
const columns = [
  columnHelper.accessor("week", {
    header: "Weeks",
  }),

  columnHelper.accessor("indirect_hrs", {
    header: "Indirect Hours",
    cell: (info) => {
      const value = info.getValue() as number;
      return value === 0 ? "0" : value.toFixed(2);
    },
  }),

  columnHelper.accessor("direct_hrs", {
    header: "Direct Hours",
    cell: (info) => {
      const value = info.getValue() as number;
      return value === 0 ? "0" : value.toFixed(2);
    },
  }),

  columnHelper.accessor("total", {
    header: "Total Hours",
    cell: (info) => {
      const value = info.getValue() as number;
      return value === 0 ? "0" : value.toFixed(2);
    },
  }),
];

//successful notification message using toast
const notifySuccess = () => {
  toast.success("Linda has been notified of your target change request.");
}
//error notification message using toast
const notifyError = () => {
  toast.error("Unable to send target change request.");
}

export default function EmployeeHomepage() {

  const { data: session } = useSession();

  interface Employee {
    name: string;
    requestedTarget: string | undefined;
    totalHours: number;
    ogTarget: number;
    target: number;
    hoursRemaining: number;
    midYearTotal: number;
    avgHoursMid: number;
    avgHoursEnd: number;
    midGoal: number;
    endGoal: number;
    pacingMid: number;
    pacingEnd: number;
    leaveHours: number;
    directHours: number[];
    indirectHours: number[];
  }

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedStartDate, setSelectedStartDate] = useState(new Date());
  const [selectedEndDate, setSelectedEndDate] = useState<Date | undefined>(undefined);

  // Toggling for the month view vs the year view on the hours table
  function toggleYearView() {
    const today = new Date();
    if (selectedEndDate !== undefined) {
      setSelectedEndDate(undefined);
      setSelectedStartDate(today);
    }
    else {
      setSelectedEndDate(today);
      setSelectedStartDate(new Date(today.getFullYear(), 0, 1));
    }
  }

  // Go to the prev month on the hours table
  function getPrevMonth() {
    setSelectedStartDate(new Date(selectedStartDate.getFullYear(), selectedStartDate.getMonth() - 1, 1));
    if (selectedEndDate !== undefined) {
      const today = new Date();
      setSelectedEndDate(undefined);
      setSelectedStartDate(today);
    }
  }

  // Go to the next month on the hours table
  function getNextMonth() {
    setSelectedStartDate(new Date(selectedStartDate.getFullYear(), selectedStartDate.getMonth() + 1, 1));
    if (selectedEndDate !== undefined) {
      const today = new Date();
      setSelectedEndDate(undefined);
      setSelectedStartDate(today);
    }
  }

  // Go to the current month on the hours table
  function getToday() {
    setSelectedStartDate(new Date());
    if (selectedEndDate !== undefined) {
      const today = new Date();
      setSelectedEndDate(undefined);
      setSelectedStartDate(today);
    }
  }

  const [isLoading, setIsLoading] = useState(true);

  //useEffect is fetching the api information
  useEffect(() => {
    setIsLoading(true);

    fetch('/api/hours')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
        return res.json();
      })
      .then((employeeData) => {
        setEmployees(employeeData || []);
      })
      .catch((err) => {
        console.error('Error fetching employees:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);
  //used to match an employee data with their session
  const match = !isLoading && employees.find((emp: Employee) => emp.name === session?.user.name);

  const [selectedValue, setSelectedValue] = useState<string | undefined>(undefined);
  const [showConfirmButton, setShowConfirmButton] = useState(false);

  //Function for requesting a new target
  const selectedNewTarget = (event: React.ChangeEvent<HTMLSelectElement>) => {
    if (event.target) {
      const value = (event.target as HTMLSelectElement).value;
      setSelectedValue(value);
      setShowConfirmButton(value !== '');
    }
  };

  //Function for confirming the target request
  const confirmedNewTarget = () => {
    setShowConfirmButton(false);
    handleSubmit()
  };

  if (match) {
    match.requestedTarget = selectedValue;
  }

  //this handles the submission and message that is sent to Linda
  const handleSubmit = async () => {

    const messageContent = `
    =====================================
    TARGET TRACKING NOTIFICATIONS
    =====================================
    Employee: ${session?.user.name}
    Current target: ${typeof match === 'object' && match !== null ? match.target : 'N/A'}
    Requested new target: ${selectedValue}
    =====================================
    `;

    try {
      const response = await fetch('/api/notify/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: messageContent }),
      });

      if (response.ok) {
        notifySuccess();
      }
    }
    catch (error) {
      console.error(error);
      notifyError();
    }
  };

  /* Populates the Payroll Weeks for each Month  */
  const getWeeks = (start_date: Date, end_date: Date | undefined): CurrentHours[] => {
    const start = startOfWeek(startOfMonth(start_date), { weekStartsOn: 6 });
    let end = endOfMonth(start_date);
    if (end_date !== undefined) {
      end = endOfMonth(end_date);
    }
    const result: CurrentHours[] = [];
    let current = new Date(start);

    //Get the week number of the start date
    const weekNumber = getWeek(start, {
      weekStartsOn: 6,
    });

    const match = employees.find(emp => emp.name === session?.user.name);
    let i = weekNumber;

    //Populates the weeks in the table and the corresponding hours for each employee
    while (isBefore(current, end) || format(current, 'MM-dd-yyyy') == format(end, 'MM-dd-yyyy')) {
      const weekStart = new Date(current);
      const weekEnd = addDays(weekStart, 6);
      const weekLabel = `${format(weekStart, 'M/d/yyyy')} - ${format(weekEnd, 'M/d/yyyy')}`;
      let indirect_hrs = 0;
      let direct_hrs = 0;

      //Fills in the table 
      if (match && match.directHours[i]) {
        direct_hrs = match.directHours[i];
      }
      else {
        direct_hrs = 0;
      }

      if (match && match.indirectHours[i]) {
        indirect_hrs = match.indirectHours[i];
      }
      else {
        indirect_hrs = 0;
      }

      result.push({
        week: weekLabel,
        indirect_hrs,
        direct_hrs,
        total: Number(indirect_hrs) + Number(direct_hrs),
      });

      i++;
      current = addDays(current, 7);
    }
    return result;
  };

  //Set up of initial table using React
  const Table = () => {
    const [data, setData] = useState<CurrentHours[]>(getWeeks(new Date(), undefined));
    useEffect(() => {
      if (selectedEndDate == undefined) {
        setData(getWeeks(selectedStartDate, undefined));
      }
      else {
        setData(getWeeks(selectedStartDate, selectedEndDate));
      }
    }, [selectedStartDate]);

    const table = useReactTable({
      data,
      columns,
      getCoreRowModel: getCoreRowModel(),
    });

    /* HTML Table Component */
    return (
      <div className="flex flex-col w-full">
        <h2 className="text-1000xl font-bold">Current Hours</h2>
        <div className="flex items-center gap-4 justify-between">
          <div className="flex gap-2">
            <label htmlFor="month-picker" className="text-base font-semibold mt-2">Select Month:</label>
            <div className="flex">
              {/* Month popup to navigate between months */}
              <DatePicker
                id="month-picker"
                selected={selectedStartDate}
                onChange={(date) => date && setSelectedStartDate(date)}
                dateFormat="MMMM yyyy"
                showMonthYearPicker
                popperPlacement="right-end"
                className="border border-black rounded px-3 py-2 pr-10 min-w-[250px] w-full"
              />
              <FaRegCalendarAlt
                className="absolute mt-5 ml-55 transform -translate-y-1/2 text-black pointer-events-none"
              />
            </div>
          </div>
          {/* Toggle for month and year view  */}
          <button
            onClick={toggleYearView}
            className={`flex gap-2 {selectedEndDate ? 'active-toggle' : 'inactive-toggle'}`}
          >
            {selectedEndDate ? (
              <>
                <span>Month View</span>
                <FaToggleOn className="text-2xl" />
              </>
            ) : (
              <>
                <span>Year View</span>
                <FaToggleOff className="text-2xl" />
              </>
            )}
          </button>
        </div>
        {/* sets up how the toaster error notification looks */}
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
          {/* sets up how the toaster success notification looks */}
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
        {/* HTML for arrow navigation as well as the bones of the table */}
        <div>
          <div className="flex justify-between items-center mx-4 my-2">
            <button className="hover:scale-110 transition-transform" onClick={getPrevMonth}>
              < FaArrowLeft />
            </button>
            <button className="hover:scale-110 transition-transform" onClick={getToday}>
              [ Today ]
            </button>
            <button className="hover:scale-110 transition-transform" onClick={getNextMonth}>
              <FaArrowRight />
            </button>
          </div>
          <table className="min-w-full border text-left border-collapse w-160">
            <thead className="bg-[#F3FBFD]">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="border px-4 py-2">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="even:bg-[#C7DEE6]">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="border px-4 py-2">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };
  // HTML for the Profile Page
  return (
    <div className="relative min-h-screen bg-lightblue p-6 sm:p-8">
      <main>
        <div>
          <header className="mb-5 flex items-start">
            <div className="text-4xl font-bold pl-[60px] pb-3 pt-[5px]">Hello, {session?.user.name || "Guest"}</div>
            {/* Tool tip HTML */}
            <div className="tooltip pt-1 pl-5">
              <span className="question-mark">?</span>
              <div className="tooltiptext mt-11 ">
                Selected Target: The Target you have selected.
                <br></br>
                <br></br>
                Remaining Leave Hours: The amount of leave time you have available to use.
                <br></br>
                <br></br>
                Hours Remaining to Reach Target: The total number of hours you have left to work to reach your target.
              </div>
            </div>
          </header>
        </div>
        {/* HTML for Stats on left side */}
        <section className="mb-10">
          <div className="flex gap-6">
            <div className="flex flex-col items-center gap-3">
              <div className="bg-[#2589A9] p-5 rounded-lg shadow-lg text-white flex flex-col gap-4 w-full">
                <h2 className="text-sm flex justify-between">
                  <span>Selected Target:</span>
                  <strong>{isLoading ? "Loading..." : !match ? "N/A" : Math.round(match.target) + " hrs"}</strong>
                </h2>

                <h2 className="text-sm flex justify-between">
                  <span>Remaining Leave Hours:</span>
                  <strong>{isLoading ? "Loading..." : !match ? "N/A" : (Math.round(match.leaveHours * 100) / 100) + " hrs"}</strong>
                </h2>

                <h2 className="text-sm flex justify-between">
                  <span>Hours Remaining to Reach Target:</span>
                  <strong>{isLoading ? "Loading..." : !match ? "N/A" : (Math.round(match.hoursRemaining * 100) / 100) + " hrs"}</strong>
                </h2>
              </div>
              <div className="flex flex-col md:flex-row gap-3 w-full max-w-4xl">
                {/* Mid Year Card */}
                <div className="bg-[#2589A9] p-5 rounded-lg shadow-lg text-white flex flex-col gap-4 w-sm">
                  <div className="bg-[#2CAEE0]/100 backdrop-blur-sm px-4 py-2 rounded shadow-md text-center mb-1">
                    <div className="flex justify-center items-center gap-2 relative">
                      <h2 className="text-lg font-semibold tracking-wide m-auto">Mid Year</h2>
                      {/* Tooltip HTML */}
                      <div className="tooltip relative">
                        <span className="question-mark">?</span>
                        <div className="tooltiptext mt-[65] ml-[-340]">
                          Goal: The amount of hours you need to work for the first half of the year
                          <br></br><br></br>
                          Total Hours: The total amount of hours you have worked from the start of the year to mid-year.
                          <br></br><br></br>
                          Pacing: How many hours of are off your mid-year goal by for the current week.
                          <br></br><br></br>
                          Avg Hours Req: The average hours you need to work in a week to reach your mid-year goal.
                        </div>
                      </div>
                    </div>
                  </div>

                  <h2 className="text-sm flex justify-between">
                    <span>Goal:</span>
                    <strong>{isLoading ? "Loading..." : !match ? "N/A" : Math.round(match.midGoal) + " hrs"}</strong>
                  </h2>

                  <h2 className="text-sm flex justify-between">
                    <span>Total Hours:</span>
                    <strong>{isLoading ? "Loading..." : !match ? "N/A" : (Math.round(match.midYearTotal * 100) / 100) + " hrs"}</strong>
                  </h2>

                  <h2 className="text-sm flex justify-between">
                    <span>Pacing:</span>
                    <strong>{isLoading ? "Loading..." : !match ? "N/A" : (Math.round(match.pacingMid * 100) / 100) + " hrs"}</strong>
                  </h2>

                  <h2 className="text-sm flex justify-between">
                    <span>Avg Hours Req:</span>
                    <strong>{isLoading ? "Loading..." : !match ? "N/A" : (Math.round(match.avgHoursMid * 100) / 100) + " hrs"}</strong>
                  </h2>
                </div>

                {/* End Year Card */}
                <div className="bg-[#2589A9] p-5 rounded-lg shadow-lg text-white flex flex-col gap-4 w-sm">
                  <div className="bg-[#2CAEE0]/100 backdrop-blur-sm px-4 py-2 rounded shadow-md text-center mb-1">
                    <div className="flex justify-center items-center gap-2 relative">
                      <h2 className="text-lg font-semibold tracking-wide m-auto">End Year</h2>
                      {/* Tooltip HTML */}
                      <div className="tooltip relative">
                        <span className="question-mark">?</span>
                        <div className="tooltiptext mt-[65] ml-[-340]">
                          Goal: The amount of hours you need to work for the full year.
                          <br></br><br></br>
                          Total Hours: The total amount of hours you have worked in the year.
                          <br></br><br></br>
                          Pacing: How many hours of are off your end-year goal by for the current week.
                          <br></br><br></br>
                          Avg Hours Req: The average hours you need to work in a week to reach your end-year goal.
                        </div>
                      </div>
                    </div>
                  </div>

                  <h2 className="text-sm flex justify-between">
                    <span>Goal:</span>
                    <strong>{isLoading ? "Loading..." : !match ? "N/A" : Math.round(match.endGoal) + " hrs"}</strong>
                  </h2>

                  <h2 className="text-sm flex justify-between">
                    <span>Total Hours:</span>
                    <strong>{isLoading ? "Loading..." : !match ? "N/A" : (Math.round(match.totalHours * 100) / 100) + " hrs"}</strong>
                  </h2>

                  <h2 className="text-sm flex justify-between">
                    <span>Pacing:</span>
                    <strong>{isLoading ? "Loading..." : !match ? "N/A" : (Math.round(match.pacingEnd * 100) / 100) + " hrs"}</strong>
                  </h2>

                  <h2 className="text-sm flex justify-between">
                    <span>Avg Hours Req:</span>
                    <strong>{isLoading ? "Loading..." : !match ? "N/A" : (Math.round(match.avgHoursEnd * 100) / 100) + " hrs"}</strong>
                  </h2>
                </div>
              </div>
            </div>
            {/* Display of Table */}
            <div className="flex flex-col gap-4 w-1/2">
              <Table />
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-2">
                  {/* Tooltip HTML */}
                  <div className="tooltip flex items-center">
                    <span className="question-mark">?</span>
                    <div className="tooltiptext">
                      Requesting a new target will notify Linda of your desired target.
                      <br/><br/>
                      She will then reach out to you via email to discuss the potential change.
                      <br/><br/>
                      If approved, your target will be updated and your goals, leave hours, pacing, etc. will update accordingly.
                    </div>
                  </div>
                  {/* Requesting new target HTML */}
                  <div className="relative flex flex-col items-center">
                    <div className="dropdown-container flex items-center">
                      <button className="button button1 mr-2">Request New Target Hour</button>
                      <select
                        className="dropdown-select"
                        value={selectedValue ?? ''}
                        onChange={selectedNewTarget}
                      >
                        <option value="" disabled hidden>Select an option</option>
                        {typeof match === 'object' && match !== null ? match.ogTarget : 'N/A'} == 1776 &&
                        <option value="1776">1776</option>
                        <option value="1824">1824</option>
                        <option value="1840">1840</option>
                        <option value="1860">1860</option>
                      </select>
                    </div>

                    {/* popup html for the confirmation and cancel buttons */}
                    {showConfirmButton && (
                      <div className="absolute top-full left-0 mt-2 flex flex-col space-y-2">
                        <button
                          className="w-65 text-white bg-red-700 hover:bg-red-800 py-2.5 px-4 dark:bg-red-600 dark:hover:bg-red-700"
                          onClick={confirmedNewTarget}
                        >
                          Confirm Target Request: <strong>{selectedValue}</strong>
                        </button>
                        <div className="flex justify-center">
                          <button
                            className="w-max bg-gray-500 text-white py-2.5 px-4"
                            onClick={() => setShowConfirmButton(false)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}