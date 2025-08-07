import appConfig from "../../../config/config";
import {fetchGroups} from "../lib/fetchGroups";
import {fetchMembers} from "../lib/fetchMembers";

import NextAuth, {DefaultSession} from "next-auth"
import type {Account} from "next-auth"
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
//defining access tokens for sessions
declare module "next-auth"{
    interface Session {
    accessToken? : string,
    accessTokenExpires : number,
    expires : string,
    error : string,
    account?: Account,
    //defining user field to include role
    user : {
      email? : string,
      id? : number,
      name? : string,
      role? : string[],
      //team leads will have their members 
      members? : string[]
    } & DefaultSession['user']
  }

  interface JWT {
    accessToken? : string,
    account? : Account,
    isMemberOf? : string[]
  }
}

//microsoft entra id authentication 2.0
export const {handlers, signIn, signOut, auth} = NextAuth({
  providers: [MicrosoftEntraID({
    clientId : process.env.AZURE_AD_CLIENT_ID as string,
    clientSecret : process.env.AZURE_AD_CLIENT_SECRET as string,
    issuer : process.env.AZURE_AD_ISSUER as string,
  }),
],

  callbacks: {
    async jwt ({ token, account, user}){
      //if account exists with jwt
      if (account && user){
        token.accessToken = account.access_token;
        token.account = account;

        //get expiration time of access token
        const decodedAccessToken = JSON.parse(Buffer.from((token.accessToken as string).split(".")[1], "base64").toString());

        if (decodedAccessToken) {
          token.accessTokenExpires = decodedAccessToken["exp"] * 1000;
        }
         
        //are roles enabled?
        if (appConfig.roles.enabled){
          token.isMemberOf = (await fetchGroups((token.accessToken as string) || ""))?.groups;
        }
      }

      //token is still valid
      if (token.accessTokenExpires && (Date.now() < Number(token.accessTokenExpires))){
        return token;
      }
      return {
        ...token,
        error : "AccessTokenError"
      }
    },

    async session ({ session, token}){
      session.accessToken = token.accessToken as string;
      session.account = token.account as Account;

      //are roles enabled
      if (appConfig.roles.enabled){
        const role: string[] = [];


        //mapping each group to an assignable role 
        Object.entries(appConfig.roles.types).forEach(([type, groupName]) => {
          if ((token.isMemberOf as string[]).includes("Team Leads") && (token.isMemberOf as string[]).includes("Back Office")) {
            role.push("admin")
          }
          else if (groupName && token.isMemberOf && (token.isMemberOf as string[]).includes(groupName)){
            role.push(type);
          }
        });

        //lack of role, therefore they are an employee
        if (role.length === 0){
          role.push("employee");
        }
        //change name in if statement to push different roles
        if (session.user.name?.split(" ")[0] === "Zoe") {
          role.length = 0;
          //push different roles here, roles are "team_lead", "admin", "employee"
          role.push("team_lead");
        }

        //if person is a team_lead, fetch their members 
        if (role.includes("team_lead")){
          //to push team_lead updated attribute to (session.accessToken || "Theo Tran", "Theo Tran")
          // session.user.members = (await fetchMembers(session.accessToken || "Theo Tran", session.user.name!)).members;  
          session.user.members = (await fetchMembers(session.accessToken || "Theo Tran", "Theo Tran")).members;        

        }
        session.user.role = role;
      }
      return {
        ...session,
        accessToken : token.accessToken as string,
        accessTokenExpires : token.accessTokenExpires as number,
        error : token.error,
      }
    }
  }
});
