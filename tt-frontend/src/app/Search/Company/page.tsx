'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface Employee {
    name: string
}

export default function AdminSearch() {

    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [employees, setEmployees] = useState<Employee[]>([]);

    // Obtain the data from the databse
    useEffect(() => {
        fetch('/api/employees')
            .then(res => res.json())
            .then(data => setEmployees(data))
            .catch(err => console.error('Error fetching employees:', err));
    }, []);
    // Search functionality - search via first and last name
    const filteredEmployees = employees
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

    return (
        <main className="min-h-screen bg-lightblue pt-12 px-4">
            {/* HTML for Logo */}
            <div className="flex justify-center mb-8">
                <Image
                    src="/ByteRatio_Logo.jpg"
                    alt="ByteRatio Logo"
                    width={350}
                    height={350}
                    className="rounded w-70"
                />
            </div>

            <div className="text-center mb-8">
                <div className="text-5xl font-bold text-[#00344A]">Employee Search</div>
            </div>
            {/* HTML for Search Bar */}
            <div className="flex justify-center">
                <div className="relative w-full max-w-md">
                    <div className="bg-white rounded-lg shadow-md w-full max-w-md mb-4 flex items-center pl-3 border border-gray-300 focus-within:ring-2 focus-within:ring-blue-500">
                        <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true" fill="none" viewBox="0 0 20 20">
                            <path stroke="currentColor" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search Employees..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="flex-1 px-4 py-2 border-gray-300 rounded focus:outline-none"
                        />
                    </div>
                    {/* HTML for the dropdown of linked(clickable) names to get each employee page */}
                    {searchQuery && (
                        <div className="flex justify-center mb-10">
                            <ul className="bg-white border border-gray-500 rounded shadow w-full max-w-md p-4 space-y-2 mb-auto">
                                {filteredEmployees.map((emp, index) => {
                                    const fullName = emp.name;
                                    return (<li key={index}>
                                        <a className="px-4 py-2 text-blue-600 cursor-pointer hover:underline hover:bg-gray-200"
                                            onClick={() => router.push('/Search/Company/Employee_Page?name=' + fullName)}
                                        >
                                            {fullName}
                                        </a></li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </main >
    );
}
