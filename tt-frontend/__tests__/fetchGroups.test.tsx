//test class for fetchGroups method 

import { fetchGroups } from "../src/app/lib/fetchGroups";

describe ("Testing fetchGroups method for", () => {
    let employeeAccessToken = "abcd";
    let faultyAccessToken = "J0eXAiOiJKV1QiLCJub25jZSI6Il9N";
    let undefinedAccessToken = undefined as unknown as string;


    //testing group fetching for employee
    test("Employee with valid access token", async () => {
        const employeeGroup = await fetchGroups(employeeAccessToken);

        await expect(employeeGroup.message).toMatch("group(s) successfully retrieved");
        await expect(employeeGroup.groups).toContain("TT_Interns");

    });

    //testing for anyone with invalid access token 
    test("anyone with invalid access token", async () => {
        const group = await fetchGroups(faultyAccessToken);
        await expect(group.groups.length).toEqual(0);
    })
    
    //testing for anyone with undefined access token 
    test("anyone with invalid access token", async () => {
        const group = await fetchGroups(undefinedAccessToken);
        await expect(group.groups.length).toEqual(0);
    })

})