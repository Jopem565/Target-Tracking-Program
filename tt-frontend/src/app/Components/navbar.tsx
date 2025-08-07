'use client';

import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { getNavByRole, type NavLinks } from './navBarRoles';
import { useEffect, useState } from 'react';
import Link from 'next/link';

//this sets up the different navbars for the different views
const NavBar = () => {

    //Define session variables
    const pathname = usePathname();
    const { data: session } = useSession();

    //obtains the role of the logged in user 
    const role = Array.isArray(session?.user?.role) ? session.user.role[0] : session?.user?.role || 'guest';
    const [links, setLinks] = useState<NavLinks[]>([]);

    const [timeUntilExpiration, setTimeUntilExpiration] = useState(10000);

    //obtains correct links for each role
    useEffect(() => {
        const updateLink = getNavByRole(role, pathname);
        setLinks(updateLink);
    }, [pathname, role]);


    // if logged in establish the time before auto logout
    useEffect(() => {
        const interval = setInterval(() => {
            if (session) {
                const timeLeft = session.accessTokenExpires - Date.now();
                setTimeUntilExpiration(timeLeft);

                if (timeLeft <= 0) {
                    clearInterval(interval);
                    signOut({ callbackUrl: "/" });
                    return;
                }
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [session]);


    //hide navbar on login
    if (role == 'guest') {
        return null;
    }

    //html for the navbar
    return (
        <main style={{ paddingTop: '80px' }}>
            <nav className="bg-white dark:bg-gray-900 fixed w-full z-20 position-fixed top-0 start-0 border-b border-gray-200">
                <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto pt-5 p-3">
                    {/* ByteRatio Logo and Title Links */}
                    <Link href="/" className="flex items-center space-x-10 rtl:space-x-reverse">
                        <img src="/ByteRatio_Logo.jpg" alt="ByteRatio Logo" className="h-10 bg-white rounded pr-2 pl-2 pt-1 pb-1" />
                        <span className="self-center text-xl font-semibold whitespace-nowrap dark:text-white">Target Tracker</span>
                    </Link>

                    <div className="items-center justify-between hidden w-full md:flex md:w-auto md:order-1" id="navbar-default">
                        <ul className="font-medium flex flex-col p-4 md:p-0 mt-4 border border-gray-100 rounded-lg bg-gray-50 md:flex-row md:space-x-8 rtl:space-x-reverse md:mt-0 md:border-0 md:bg-white dark:bg-gray-800 md:dark:bg-gray-900 dark:border-gray-700">
                            {/* Logout button functionality */}
                            {links.map((item) => (
                                <li key={item.label}>
                                    {item.label === 'Logout' ? (
                                        <div>
                                            <button className="text-base font-medium underline text-black hover:text-[#2CAEE0] dark:text-gray-300 dark:hover:text-white"
                                                onClick={() =>
                                                    signOut({
                                                        callbackUrl: process.env.NEXT_PUBLIC_CALLBACK_URL || '/',
                                                    })
                                                }
                                            >
                                                {item.label}
                                            </button>
                                        </div>
                                    ) : (
                                        // Populate the rest of the navlinks
                                        <Link href={item.href} className="text-base font-medium text-black underline hover:text-[#2CAEE0] dark:text-gray-300 dark:hover:text-white">
                                            {item.label}
                                        </Link>
                                    )}
                                </li>
                            ))}
                            {/* Display the logout timer  */}
                            <span className={`ml-4 inline-flex items-center space-x-2 px-3 py-1 rounded-lg text-sm font-mono border shadow-sm
                                        ${timeUntilExpiration < 120000
                                        ? 'bg-red-100 text-red-700 border-red-400 animate-pulse dark:bg-red-900 dark:text-red-200 dark:border-red-600'
                                        : 'bg-gray-100 text-black border-gray-300 dark:bg-gray-800 dark:text-white dark:border-gray-700'
                                    }`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${timeUntilExpiration < 120000 ? 'text-red-500' : 'text-[#2CAEE0]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>
                                    {Math.floor(timeUntilExpiration / 1000 / 60)}:
                                    {(Math.floor(timeUntilExpiration / 1000) % 60).toString().padStart(2, '0')}
                                </span>
                            </span>
                        </ul>
                    </div>
                </div>
            </nav>
        </main>
    );
};

export default NavBar;

