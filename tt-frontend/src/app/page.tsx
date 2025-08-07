import "./styles/globals.css";
import Image from "next/image";
import SignInButton from "../app/Components/signInComponent";
import styles from "../app/login.module.css";
import {auth} from "@/app/lib/auth";
import EmployeeHomePage from "../app/Home/page";
import LindaSearch from "./Search/Company/page";
import TeamLeadSearch from "./Search/Team/page";

//this function gets the landing page for users. If a user is logged in,
//the home page is assigned based on role. If not logged in, login screen
export default async function Home() {
  //get user session
  const session = await auth();

    //if session exists and user is logged in 
    if (session && session?.user) {

    //if user is an employee, render their timesheet 
      if (session.user.role?.includes("employee")){
        return (
          <EmployeeHomePage/>
        )
      }
    //if a user is a team lead, their search page is rendered
    else if (session.user.role?.includes("team_lead")){
      return (
        <TeamLeadSearch/>
      )
    }
    //if a user is an admin, their search page is rendered
    else if (session.user.role?.includes("admin")){
      return (
        <LindaSearch/>
      )
    }
  }
  
  //if user is not logged in yet 
  return (
    <div className = {styles.containerLogin}>

      <div className = {styles.contentLogin}>

        {/* ByteRatio Logo */}
        <label className = "byteratio-logo">
            <Image 
            src = "/ByteRatio_Logo.jpg"
            alt = "byteratio"
            width = {350}
            height = {350}
            /> 
        </label>
        
        <br/>
        <h1>Welcome to Target Tracker!</h1>
        <br/>

        {/* Sign-In button */}
        <SignInButton/>
      </div>

    </div>
  )
}
