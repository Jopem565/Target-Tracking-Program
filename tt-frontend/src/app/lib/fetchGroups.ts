interface Group {
    displayName: string,
    id: string,
    "@odata.type": string,
}

//fetching groups server side, which will then be used to derive role 
export const fetchGroups = async (
    access_token: string): Promise<{ status: number, message: string, groups: string[] }> => {

    //user has no access
    if (!access_token) {
        return {
            status: 400,
            message: "no access token",
            groups: []
        }
    }

    //if user has access token, fetch the user's group from microsoft graph 
    const response = await fetch("https://graph.microsoft.com/v1.0/me/memberOf", {
        headers: {
            Authorization: `Bearer ${access_token}`,
        },
    });


    //if request to get user's group fails, return error 
    if (!response.ok) {
        const res = await response.json();

        return ({
            status: res.status,
            message: res.error.message,
            groups: []
        })
    }

    //if user's group is successfully received 
    const userData = await response.json();
    const graphGroups = userData.value;

    //filters groups to only include relevant roles ('Linda', 'Team Lead', 'Employee')
    const groups: string[] = graphGroups.filter(
        (group: Group) => group["@odata.type"] === "#microsoft.graph.group")
        .map((group: Group) => group.displayName);

    return {
        status: response.status,
        message: "group(s) successfully retrieved",
        groups: groups || []
    }
};