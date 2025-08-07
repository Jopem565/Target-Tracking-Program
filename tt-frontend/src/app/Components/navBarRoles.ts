//define structs
export type NavLinks = {
    label: string;
    href: string;
};
//set up navbar labels and links for each role
const navRoleConfig: Record<string, Record<string, NavLinks[]>> = {
    employee: {
        '/': [
            { label: 'Profile', href: '/Home' },
            { label: 'Plan Ahead', href: '/Home/Plan_Ahead' },
            { label: 'Logout', href: '/' }
        ],
    },
    team_lead: {
        '/': [
            { label: 'Profile', href: '/Home' },
            { label: 'Plan Ahead', href: '/Home/Plan_Ahead' },
            { label: 'Dashboard', href: '/Search/Team' },
            { label: 'Logout', href: '/' }
        ],
    },
    admin: {
        '/': [
            { label: 'Search', href: '/Search/Company' },
            { label: 'Dashboard', href: '/Search/Company/Dashboard'},
            { label: 'Logout', href: '/' }
        ],
    },
};
//fetch roles and the links corresponded to the roles
export const getNavByRole = (role: string, pathname: string): NavLinks[] => {
    const roleConfig = navRoleConfig[role] || {};
    const match = Object.keys(roleConfig).find((key) => pathname.startsWith(key));
    return match ? roleConfig[match] : [{ label: "Loading...", href: '/' }];
}

