import {
    ALLOWED_EMPLOYEE_ROUTES,
    ALLOWED_ADMIN_ROUTES,
    ALLOWED_TEAM_LEAD_ROUTES,
    PUBLIC_ROUTES
    } from './app/lib/routes';

import {auth} from '@/app/lib/auth'
import { NextResponse } from "next/server";
import { NextURL } from "next/dist/server/web/next-url";
import type { NextRequest } from "next/server";


const authentication = async (req : NextRequest) => {

const session = await auth();
const { pathname, origin }  = req.nextUrl;

//if user is trying to access public route (login page)
if (PUBLIC_ROUTES.includes(pathname)){
return NextResponse.next();
}

//if user is not logged in redirect to sign in page
if (!session) {
const loginUrl = new NextURL("/", origin);
return NextResponse.redirect(loginUrl);
}

//user is logged in
else if (session){

//user is an employee
if (session.user.role?.includes("employee")){
   //employee can only access login, home, and planning page

   //if employee trying to access any other page  
   if (!(ALLOWED_EMPLOYEE_ROUTES.includes(pathname))) {
       return NextResponse.redirect(new NextURL('/404', req.url));
   }

   //employee accesses authorized page
   else {
       return NextResponse.next();
   }
}

//user is a team lead
else if (session.user.role?.includes("team_lead")) {
   //team_lead can access routes in allowed_team_lead_routes
   //each team lead can only access their team members timesheet
   //will need dynamic routing


   //if team lead is trying to access another employee's timesheet
   if ((pathname.includes("/Search/Team/Employee_page")) && req.nextUrl.searchParams.has('name')){

       //get employee name person is trying to access
       const {searchParams} = req.nextUrl;
       const name = searchParams.get('name');

       //logic to see if that employee is in their team
       if (name && session.user.members?.includes(name)){
           //allow request
           return NextResponse.next();
       }

       //employee is not in their team
       else {
           return NextResponse.redirect(new NextURL('/404', req.url));
       }
   }

   //team_lead tries to access unauthorized page
   if (!(ALLOWED_TEAM_LEAD_ROUTES.includes(pathname))){
       return NextResponse.redirect(new NextURL('/404', req.url));
   }

   //team_lead accesses authorized page
   else {
       return NextResponse.next();
   }
}

//user is an admin
else if (session.user.role?.includes("admin")){
   //admin can access routes in allowed_admin_routes

   //admin can access anyone timesheet
   if (pathname.includes("Company/Employee_Page")){
       return NextResponse.next();
   }

   //admin tries to access unauthorized page
   if (!(ALLOWED_ADMIN_ROUTES.includes(pathname))) {
       return NextResponse.redirect(new NextURL('/404', req.url));
   }

   else {
       return NextResponse.next();
   }
}

}

return NextResponse.redirect(new NextURL('/404', req.url));

};

export default authentication;

export const config = {
    matcher: ['/((?!api/auth|_next|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|css|js)).*)'],
};