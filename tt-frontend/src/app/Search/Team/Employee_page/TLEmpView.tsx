'use client'

import React from 'react';
import "./style.css";

import { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { FaRegCalendarAlt } from 'react-icons/fa';

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
  isBefore
} from 'date-fns';

import { getWeek } from 'date-fns';
import { FaArrowRight, FaArrowLeft } from "react-icons/fa";
import { FaToggleOff } from "react-icons/fa";
import { FaToggleOn } from "react-icons/fa";
import { ToastBar, Toaster } from 'react-hot-toast';
import { CheckCircle } from 'lucide-react';

type CurrentHours = {
  week: string;
  indirect_hrs: number;
  direct_hrs: number;
  total: number;
};


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


export function TLEmpView({ searchName }: { searchName: string }) {

  const [employees, setEmployees] = useState<Employee[]>([]);

  interface Employee {
    name: string;
    totalHours: number;
    directHours: number[];
    indirectHours: number[];
    midYearTotal: number;
    leaveHours: number;
    pacingMid: number;
    target: number;
    pacingEnd: number;
  }

  useEffect(() => {
    fetch('/api/hours')
      .then(res => res.json())
      .then(data => setEmployees(data))
      .catch(err => console.error('Error fetching employees:', err));
  }, []);


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


      //Fill in the table 

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
          <button
          onClick={toggleYearView}
          className={`flex gap-2 {selectedEndDate ? 'active-toggle' : 'inactive-toggle'}`}
        >
          {selectedEndDate ? (
          <>
          <span>Month View</span>
          <FaToggleOn className="text-2xl"/>
          </>
          ) : (
          <>
          <span>Year View</span>
          <FaToggleOff className="text-2xl"/>
          </>
        )}
        </button>
        </div>
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


  return (

    <div className="p-6 sm:p-10 bg-lightblue min-h-screen">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="text-center">
          <h1 className="text-3xl font-bold">{searchName}&apos;s Overview</h1>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          <div className="bg-[#2589A9] p-4 rounded shadow">
            <h2 className="text-lg font-semibold text-white">Selected Target</h2>
            <p className="text-xl text-white">

              {match ? `${Math.round(match.target * 10) / 10} hours` : "Loading..."}

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

        <section>
          <div className="flex items-center justify-center">
              <div className="flex flex-col items-start px-4">
                <Table />
              </div>
            </div>
        </section>
      </div>
    </div>

  );
}
