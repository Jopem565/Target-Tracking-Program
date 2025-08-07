'use client';

import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import "./style.css";

interface Employee {
    name: string;
    totalHours: number,
    midGoal: number,
    endGoal: number,
    pacingEnd: number
}

export default function Dashboard() {
    //Router necessary for directing routes to next pages
    const router = useRouter();

    const [employees, setEmployees] = useState([]);
    const [hours, setHours] = useState<Employee[]>([]);
    //useEffect is used to fetch infomration about each employee
    useEffect(() => {
        fetch('/api/employees')
            .then(res => res.json())
            .then(data => setEmployees(data))
            .catch(err => console.error('Error fetching employees:', err));
    }, []);

    useEffect(() => {
        fetch('/api/hours')
            .then(res => res.json())
            .then(data => setHours(data))
            .catch(err => console.error('Error fetching employees:', err));
    }, []);

    //For sorting the table. Default sorts employees alphabetically
    const [sortConfig, setSortConfig] = useState<{ key: 'mid' | 'end' | 'pacing' | null, direction: 'asc' | 'desc' }>({
        key: null,
        direction: 'asc'
    });
    //sorting of columns in table based on negative and positive values
    const sortedEmployees = [...hours].sort((a, b) => {
        if (!sortConfig.key) return a.name.localeCompare(b.name);

        let aVal: number;
        let bVal: number;

        switch (sortConfig.key) {
            case 'mid':
                aVal = a.totalHours - a.midGoal;
                bVal = b.totalHours - b.midGoal;
                break;

            case 'end':
                aVal = a.totalHours - a.endGoal;
                bVal = b.totalHours - b.endGoal;
                break;

            case 'pacing':
                aVal = a.pacingEnd;
                bVal = b.pacingEnd;
                break;

            default:
                aVal = 0;
                bVal = 0;
        }

        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
    });
    //handles the sorting specified for each column when clicked on the frontend
    const handleSort = (key: 'mid' | 'end' | 'pacing') => {
        setSortConfig((prev) => {
            if (prev.key === key) {
                return {
                    key,
                    direction: prev.direction === 'asc' ? 'desc' : 'asc'
                };
            }
            return {
                key,
                direction: 'asc'
            };
        });
    };

    return (
        <main className="p-6 sm:p-10 bg-lightblue min-h-screen">
            <div className="max-w-6xl mx-auto space-y-10">
                <header className="text-center">
                    <div className="h1center text-5xl font-bold">Company Overview</div>
                </header>
                {/* HTML for three overview boxes */}
                <section className="text-center">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="bg-white p-4 rounded shadow">
                            <h3 className="text-lg font-semibold">Total Employees</h3>
                            <p className="text-xl text-blue-600">{employees.length}</p>
                        </div>

                        <div className="bg-white p-4 rounded shadow">
                            <h3 className="text-lg font-semibold">Mid-Year Goal Met</h3>
                            <p className="text-xl text-green-600">
                                {hours.filter(emp => emp.totalHours >= emp.midGoal).length}
                            </p>
                        </div>
                        <div className="bg-white p-4 rounded shadow">
                            <h3 className="text-lg font-semibold">End-Year Goal Met</h3>
                            <p className="text-xl text-green-600">
                                {hours.filter(emp => emp.totalHours >= emp.endGoal).length}
                            </p>
                        </div>
                    </div>
                </section>
                {/* HTML for overall table */}
                <section className="overflow-hidden">
                    <table className="sortable min-w-full bg-white border border-gray-200 shadow rounded">
                        <thead className="bg-blue-100 text-gray-700">
                            <tr className="bg-info">
                                <th className="px-4 py-2 border">Employee Name</th>
                                <th className={`px-4 py-2 border sortable ${sortConfig.key === 'mid'
                                    ? sortConfig.direction === 'asc'
                                        ? 'dir-u'
                                        : 'dir-d'
                                    : ''
                                    }`}
                                    onClick={() => handleSort('mid')}
                                >
                                    Hit Mid-Year Goal
                                </th>
                                <th className={`px-4 py-2 border sortable ${sortConfig.key === 'end'
                                    ? sortConfig.direction === 'asc'
                                        ? 'dir-u'
                                        : 'dir-d'
                                    : ''
                                    }`}
                                    onClick={() => handleSort('end')}
                                >
                                    Hit End-Year Goal
                                </th>
                                <th className={`px-4 py-2 border sortable ${sortConfig.key === 'pacing'
                                    ? sortConfig.direction === 'asc'
                                        ? 'dir-u'
                                        : 'dir-d'
                                    : ''
                                    }`}
                                    onClick={() => handleSort('pacing')}
                                >
                                    End-Year Pacing
                                </th>
                            </tr>
                        </thead>
                        {/* HTML for table values, color coordinating */}
                        <tbody id="myTable">
                            {sortedEmployees.map((emp, index) => {
                                const total = emp.totalHours;
                                const mid = emp.midGoal;
                                const end = emp.endGoal;
                                const pacingEnd = emp.pacingEnd;

                                //Round to the nearest tenth for each difference
                                const midDiff = Math.round((total - mid) * 10) / 10;
                                const endDiff = Math.round((total - end) * 10) / 10;

                                //NOTE: rounded to show the first decimal place,
                                //but in employees profiles it is rounded to the whole number.
                                const pacing = Math.round((pacingEnd) * 10) / 10;

                                //Modify Employee ID to only contain First and Last Name
                                return (
                                    <tr key={index} className="even:bg-blue-50">
                                        <td
                                            className="px-4 py-2 border text-blue-600 font-bold cursor-pointer hover:underline hover:bg-gray-200"
                                            onClick={() =>
                                                router.push('/Search/Company/Employee_Page?name=' + emp.name)
                                            }>
                                            {emp.name}
                                        </td>

                                        <td className={`px-4 py-2 border ${total - mid < 0
                                            ? 'text-red-600 font-bold border-red-600'
                                            : total - mid > 0
                                                ? 'text-green-400 font-bold border-green-600'
                                                : 'text-gray-600'
                                            }`}>
                                            {total - mid === 0
                                                ? 'Success'
                                                : `${total - mid > 0 ? '+' : ''}${midDiff} hours`}
                                        </td>

                                        <td className={`px-4 py-2 border ${total - end < 0
                                            ? 'text-red-600 font-bold border-red-600'
                                            : total - end > 0
                                                ? 'text-green-400 font-bold border-green-600'
                                                : 'text-gray-600'
                                            }`}>
                                            {total - end === 0
                                                ? 'Success'
                                                : `${total - end > 0 ? '+' : ''}${endDiff} hours`}
                                        </td>

                                        <td className={`px-4 py-2 border ${pacing < 0
                                            ? 'text-red-600 font-bold border-red-600'
                                            : pacing > 0
                                                ? 'text-green-400 font-bold border-green-600'
                                                : 'text-gray-600'
                                            }`}>
                                            {pacing === 0
                                                ? 'Success'
                                                : `${pacing > 0 ? '+' : ''}${pacing}`}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </section>
            </div>
        </main>
    );
}
