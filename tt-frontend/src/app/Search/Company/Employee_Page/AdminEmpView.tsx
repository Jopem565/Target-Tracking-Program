'use client'

import React from 'react';
import "./style.css";
import { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
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
import { FaArrowRight, FaArrowLeft, FaRegCalendarAlt, FaToggleOff, FaToggleOn } from "react-icons/fa";
import toast, { ToastBar, Toaster } from "react-hot-toast";
import { CheckCircle } from "lucide-react";


type CurrentHours = {
  week: string;
  indirect_hrs: number;
  direct_hrs: number;
  total: number;
};

interface Employee {
  name: string;
  midGoal: number,
  endGoal: number
  directHours: number[],
  indirectHours: number[],
  midYearTotal: number,
  totalHours: number,
  leaveHours: number,
  pacingMid: number,
  pacingEnd: number,
  target: string
}
// Render table
const columnHelper = createColumnHelper<CurrentHours>();
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

//Pass in the name searched via the dashboard or search to populate the page
export function AdminEmpView({ searchName }: { searchName: string }) {

  const [employees, setEmployees] = useState<Employee[]>([]);
  //retrieves each employee's information from the database
  const fetchEmployees = () => {
    fetch('/api/hours')
      .then(res => res.json())
      .then(data => setEmployees(data))
      .catch(err => console.error('Error fetching employees:', err));
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  //Matches the emoloyee data to the searched name
  const match = employees.find((emp) => {
    return emp.name === searchName;
  });

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

    let i = weekNumber;

    while (isBefore(current, end) || format(current, 'MM-dd-yyyy') == format(end, 'MM-dd-yyyy')) {
      const weekStart = new Date(current);
      const weekEnd = addDays(weekStart, 6);
      const weekLabel = `${format(weekStart, 'M/d/yyyy')} - ${format(weekEnd, 'M/d/yyyy')}`;
      let indirect_hrs = 0;
      let direct_hrs = 0;

      //Fills in the table with the correct data
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

  /* Generates the Table */
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
            {/* HTML for selecting different months */}
            <div className="flex">
              <DatePicker
                id="month-picker"
                selected={selectedStartDate}
                onChange={(date) => date && setSelectedStartDate(date)}
                dateFormat="MMMM yyyy"
                showMonthYearPicker
                popperPlacement="right-end"
                className="border border-black rounded px-3 py-2 pr-10 min-w-[250px] w-full"
              />
              {/* HTML for calendar icon */}
              <FaRegCalendarAlt
                className="absolute mt-5 ml-55 transform -translate-y-1/2 text-black pointer-events-none"
              />
            </div>
          </div>
          {/* HTML for switching between year and month view on the table */}
          <button
            onClick={toggleYearView}
            className={`flex gap-2 {selectedEndDate ? 'active-toggle' : 'inactive-toggle'}`}>
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
        {/* HTML for notifications for target change */}
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
        {/* HTML for arrows to iterate through the months */}
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
          {/* Rendering of the table */}
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

  // Target Added and Change Logic
  const [showTargetChangeForm, setShowTargetChangeForm] = useState(false);
  const [targetData, setTarget] = useState<{ Target: string; NumTargets: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isValidEmp, setIsValidEmp] = useState<{ valid: boolean; } | null>(null);

  const currYear = (new Date().getFullYear()).toString()

  useEffect(() => {
    const fetchData = async () => {
      if (!searchName?.includes(" ")) {
        toast.error("Invalid employee")
        setIsValidEmp({ valid: false })
        return;
      }

      try {
        const res = await fetch('/api/target?ID=' + searchName?.replace(" ", "") + currYear);
        const result = await res.json();
        if (!res.ok) throw new Error(result.error);
        setTarget(result);
        fetchEmployees();
        setError(null);
      } catch (err) {
        setError("" + err?.toString());
      }
    };

    fetchData();
  }, [refreshTrigger]);

  useEffect(() => {
    if (error) {
      if (error == "Error: Item not found") {
        toast.error("The selected employee does not exist in the database")

        setIsValidEmp({ valid: false })
      }
      else {
        toast.error(error.toString())
      }
    }
  }, [error]);

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  async function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  const toggleTargetChangeFormVisibility = () => {
    if (isValidEmp == null || isValidEmp.valid) {
      setShowTargetChangeForm(!showTargetChangeForm);
    }
  };

  const changeTarget = async (formData: FormData) => {
    const isFirstTarget = (targetData === null || targetData === undefined || targetData?.['Target'] === undefined)
    const newTarget = Number(formData.get('newTarget'));
    let description
    if (isFirstTarget) {
      description = "Initial entry"
    }
    else {
      description = formData.get('changeReason');
    }

    if (typeof newTarget !== 'number') {
      toast.error("Missing target input.")
      return;
    }
    if (typeof description !== 'string') {
      toast.error("Missing description input.")
      return;
    }
    if (targetData?.['NumTargets']) {
      postTarget(searchName?.replace(" ", "") + currYear, description, newTarget, Number(targetData?.['NumTargets']) + 1);
    }
    else {
      toast.error("Unable to change target.")
    }
    setShowTargetChangeForm(false);
    await sleep(1000)
    handleRefresh()
  };

  const postTarget = async (id: string, description: string, newTarget: number, targetNum: number) => {
    const res = await fetch('/api/target', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ID: id,
        description: description,
        newTarget: newTarget,
        targetNum: targetNum
      }),
    });

    const data = await res.json();

    if (res.ok) {
      toast.success("Target updated successfully.")
    } else {
      toast.error(data.error)
    }

    if (match && targetData?.Target) {
      match.target = targetData?.Target;
    }
  };
  // HTML for page 
  return (
    <div className="p-6 sm:p-10 bg-lightblue min-h-screen">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="text-center">
          <h1 className="text-3xl font-bold">{searchName}&apos;s Overview</h1>
        </header>
        {/* HTML for stats at top of page */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          <div className="bg-[#2589A9] p-4 rounded shadow">
            <h2 className="text-lg font-semibold text-white">Selected Target</h2>
            <p className="text-xl text-white">
              {targetData?.Target}
            </p>
          </div>
          <div className="bg-[#2589A9] p-4 rounded shadow">
            <h2 className="text-lg font-semibold text-white">Mid-Year Total</h2>
            <p className="text-xl text-white">
              {match ? `${Math.round(match.midYearTotal * 10) / 10} hours` : "Loading..."}
            </p>
          </div>
          <div className="bg-[#2589A9] p-4 rounded shadow">
            <h2 className="text-lg font-semibold text-white">Year Total</h2>
            <p className="text-xl text-white">
              {match ? `${Math.round(match.totalHours * 10) / 10} hours` : "Loading..."}
            </p>
          </div>
          <div className="bg-[#2589A9] p-4 rounded shadow">
            <h2 className="text-lg font-semibold text-white">Leave Remaining</h2>
            <p className="text-xl text-white">
              {match ? `${Math.round(match.leaveHours * 10) / 10} hours` : "Loading..."}
            </p>
          </div>
          <div className="bg-[#2589A9] p-4 rounded shadow">
            <h2 className="text-lg font-semibold text-white">Mid-Year Pacing</h2>
            <p className="text-xl text-white">
              {match ? `${Math.round(match.pacingMid * 10) / 10} hours` : "Loading..."}
            </p>
          </div>
          <div className="bg-[#2589A9] p-4 rounded shadow">
            <h2 className="text-lg font-semibold text-white">End-Year Pacing</h2>
            <p className="text-xl text-white">
              {match ? `${Math.round(match.pacingEnd * 10) / 10} hours` : "Loading..."}
            </p>
          </div>
        </section>
        {/* HTML for adding and updating target hour */}
        <section>
          {showTargetChangeForm && (
            <form className="bg-[#2589A9] p-6 rounded-lg shadow-md max-w-md mx-auto text-white" action={changeTarget}>
              <h2 className="text-2xl font-bold text-center mb-6">{(targetData === null || targetData === undefined || targetData?.['Target'] === undefined) ? "Set Target" : "Edit Target"}</h2>
              <div className="mb-4">
                <label htmlFor="newTarget" className="block mb-2 font-medium">{(targetData === null || targetData === undefined || targetData?.['Target'] === undefined) ? "Initial Target" : "New Target"}</label>
                <input
                  type="text"
                  id="newTarget"
                  name="newTarget"
                  placeholder="1860"
                  className="w-full px-4 py-2 rounded text-black bg-white border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>

              {!(targetData === null || targetData === undefined || targetData?.['Target'] === undefined) && (
                <div className="mb-6">
                  <label htmlFor="changeReason" className="block mb-2 font-medium">Reason for Change</label>
                  <input
                    type="text"
                    id="changeReason"
                    name="changeReason"
                    placeholder="Description (Prorated Target)"
                    className="w-full px-4 py-2 rounded text-black bg-white border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
              )}
              <div className="flex justify-center gap-4">
                <button onClick={toggleTargetChangeFormVisibility} className="bg-white text-[#2589A9] font-semibold py-2 px-4 rounded hover:bg-gray-100 transition">Cancel</button>
                <button type="submit" className="bg-white text-[#2589A9] font-semibold py-2 px-4 rounded hover:bg-gray-100 transition">Submit</button>
              </div>
            </form>
          )}
          {/* HTML of page for positioning of table */}
          {!showTargetChangeForm && (
            <>
              <div className="flex items-center justify-center">
                <div className="flex flex-col items-start px-4">
                  <Table />
                </div>
              </div>
            </>
          )}
        </section>
        {/* HTML for edit target button */}
        <div className="flex justify-center items-center gap-10 text-center">
          <button className="button button1" onClick={toggleTargetChangeFormVisibility}>Edit Target Hour</button>
        </div>
      </div>

      {/* toaster notification */}
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
    </div>
  );
}