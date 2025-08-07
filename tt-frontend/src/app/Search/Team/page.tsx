'use client';  //Mark client as component

import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import './style.css';

interface Employee {
    name: string;
    totalHours: number,
    midGoal: number,
    endGoal: number,
    pacingEnd: number
}

interface Search {
    name: string;
}

// function for the Team Lead's dashboard page
export default function Dashboard() {

    //Router necessary for directing routes to next pages
    const router = useRouter();

    const [searchQuery, setSearchQuery] = useState("");
    const [Searchemployees, setSearchEmployees] = useState<Search[]>([]);

    const [employees, setEmployees] = useState([]);
    const [hours, setHours] = useState<Employee[]>([]);

    //fetches the information from the employees api
    useEffect(() => {
        fetch('/api/employees')
            .then(res => res.json())
            .then(data => {
                setEmployees(data);
                setSearchEmployees(data);
            })
            .catch(err => console.error('Error fetching employees:', err));
    }, []);

    //fetches information from the hours api
    useEffect(() => {
        fetch('/api/hours')
            .then(res => res.json())
            .then(data => setHours(data))
            .catch(err => console.error('Error fetching employees:', err));
    }, []);

    //handles the filtering logic for the search bar to be by first and last name
    const filteredEmployees = Searchemployees
        .filter(emp => {
            const nameParts = emp.name.toLowerCase().split(' ');
            const firstName = nameParts[0];
            const lastName = nameParts[nameParts.length - 1];
            const query = searchQuery.toLowerCase();

            return firstName.startsWith(query) || lastName.startsWith(query);
        })
        .sort((a, b) => {
            const [aFirst, , ...aRest] = a.name.toLowerCase().split(' ');
            const aLast = aRest.length ? aRest[aRest.length - 1] : '';
            const [bFirst, , ...bRest] = b.name.toLowerCase().split(' ');
            const bLast = bRest.length ? bRest[bRest.length - 1] : '';
            const query = searchQuery.toLowerCase();

            const aFirstMatch = aFirst.startsWith(query);
            const bFirstMatch = bFirst.startsWith(query);
            const aLastMatch = aLast.startsWith(query);
            const bLastMatch = bLast.startsWith(query);

            // Prioritize first name matches over last name matches
            if (aFirstMatch && !bFirstMatch) return -1;
            if (!aFirstMatch && bFirstMatch) return 1;

            // If both match or neither match by first name, fallback to last name
            if (aLastMatch && !bLastMatch) return -1;
            if (!aLastMatch && bLastMatch) return 1;

            return 0;
        });


    //For sorting the table. Default sorts employees alphabetically
    const [sortConfig, setSortConfig] = useState<{ key: 'mid' | 'end' | 'pacing' | null, direction: 'asc' | 'desc' }>({
        key: null,
        direction: 'asc'
    });

    // for the filtering logic
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

    // handling the sorting of the dashboard columns
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

    //html for the dashboard page
    return (
        <main className="p-6 sm:p-10 bg-lightblue min-h-screen">
            <div className="max-w-6xl mx-auto space-y-10">
                <header className="flex flex-col md:flex-row gap-120">
                    <div className="justify-start text-[45px] font-bold">Team Overview</div>

                    {/* html for the search bar on the dashboard page */}
                    <div className="flex justify-end">
                        <div className="relative w-[300px]">
                            <div className="bg-white rounded-lg shadow-md w-[300px] mb-4 flex items-center pl-3 border border-gray-300 focus-within:ring-2 focus-within:ring-blue-500">
                                <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" fill="none" viewBox="0 0 20 20">
                                    <path stroke="currentColor" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Search Employees..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="flex-1 px-4 py-2 border-none focus:outline-none"
                                />
                            </div>

                            {searchQuery && (
                                <ul className="absolute bg-white border border-gray-500 rounded shadow w-[350px] max-w-md p-4 space-y-2 mb-auto">
                                    {filteredEmployees.map((emp, index) => (
                                        <li key={index}>
                                            <a className="px-4 py-2 text-blue-600 cursor-pointer hover:underline hover:bg-gray-200"
                                                onClick={() => router.push('/Search/Team/Employee_page?name=' + emp.name)}
                                            >
                                                {emp.name}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </header>

                {/* html for the boxes at the top of the screen */}
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

                {/* html for the table */}
                <section className="overflow-x-auto">
                    <table className="min-w-full bg-white border border-gray-200 shadow rounded">
                        {/* table columns names */}
                        <thead className="bg-blue-100 text-gray-700">
                            <tr>
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

                        {/* table body */}
                        <tbody>

                            {sortedEmployees.map((emp, index) => {

                                const total = emp.totalHours;
                                const mid = emp.midGoal;
                                const end = emp.endGoal;
                                const pacingEnd = emp.pacingEnd;

                                //Round to the nearest tenth for each difference

                                const midDiff = Math.round((total - mid) * 10) / 10;
                                const endDiff = Math.round((total - end) * 10) / 10;
                                const pacing = Math.round((pacingEnd) * 10) / 10;

                                return (
                                    <tr key={index} className="even:bg-blue-50">
                                        <td
                                            className="px-4 py-2 border text-blue-600 font-bold cursor-pointer hover:underline hover:bg-gray-200"
                                            onClick={() =>
                                                router.push('/Search/Team/Employee_page?name=' + emp.name)
                                            }>

                                            {emp.name}
                                        </td>

                                        <td
                                            className={`px-4 py-2 border ${total - mid < 0
                                                ? 'text-red-600 font-bold border-red-600'
                                                : total - mid > 0
                                                    ? 'text-green-400 font-bold border-green-600'
                                                    : 'text-gray-600'
                                                }`}>

                                            {total - mid === 0
                                                ? 'Success'
                                                : `${total - mid > 0 ? '+' : ''}${midDiff} hours`}
                                        </td>

                                        <td
                                            className={`px-4 py-2 border ${total - end < 0
                                                ? 'text-red-600 font-bold border-red-600'
                                                : total - end > 0
                                                    ? 'text-green-400 font-bold border-green-600'
                                                    : 'text-gray-600'
                                                }`}>

                                            {total - end === 0
                                                ? 'Success'
                                                : `${total - end > 0 ? '+' : ''}${endDiff} hours`}
                                        </td>

                                        <td
                                            className={`px-4 py-2 border ${pacing < 0
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