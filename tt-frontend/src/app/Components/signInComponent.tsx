"use client"
import {signIn} from "next-auth/react";
import Image from "next/image";
import styles from "../login.module.css"

//Microsoft login button functionality and styling
export default function SignInButton(){
    return (
        <button className = {styles.buttonLogin} onClick = {() => signIn('microsoft-entra-id')}>
            <Image
                src = "/Outlook_Logo.jpg"
                alt = "outlook"
                width = {90}
                height = {90}
            /> Login with Outlook
        </button>
    )
}
