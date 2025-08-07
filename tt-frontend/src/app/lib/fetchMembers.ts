interface Group {
    displayName: string,
    id: string,
}

//fetching memebrs. Team Lead's fetched members depend on what group they are a part of
export const fetchMembers = async (access_token: string, team_lead_name: string):
    Promise<{ status: number, message: string, members: string[] }> => {

    const team_lead_name_string = team_lead_name.split(' ');
    const team_lead_first_name = team_lead_name_string[0];
    const team_lead_last_name = team_lead_name_string[1];

    //user has no access
    if (!access_token) {
        return {
            status: 400,
            message: "no access token",
            members: []
        }
    }

    //find team lead group 
    const groupUrl: string = "https://graph.microsoft.com/v1.0/groups";

    const groupResponse = await fetch(groupUrl, {
        headers: {
            Authorization: `Bearer ${access_token}`
        }
    });

    //groups were fetched successfully 
    if (groupResponse.ok) {
        const res = await groupResponse.json();
        const allGroups = res.value;

        //looping thorugh each group to find the team lead one
        const teamLeadGroup: Group[] = [];

        for (const group of allGroups) {
            if (group.displayName === "TT_Team_" + team_lead_first_name + "_" + team_lead_last_name) {
                teamLeadGroup.push(group);
            }
        }

        //get the group id of that team lead group 
        const groupId: string = (teamLeadGroup[0].id) as string;

        //now have to fetch members of the team_lead_group now that we have group id 
        const url: string = "https://graph.microsoft.com/v1.0/groups/" + groupId + "/members/microsoft.graph.user";

        const fetchMembersResponse = await fetch(url, {
            headers: {
                Authorization: `Bearer ${access_token}`
            }
        });

        //if fetch was successful
        if (fetchMembersResponse.ok) {

            const response = await fetchMembersResponse.json();
            const res = response.value;

            //fetch each member
            const members: string[] = [];

            for (const member of res) {
                members.push(member.displayName);
            }

            return ({
                status: fetchMembersResponse.status,
                message: "team members successfully fetched",
                members: members
            })
        }

        //if fetchMembersResponse did not go well 
        const response = await fetchMembersResponse.json();

        return ({
            status: response.status,
            message: response.error.message,
            members: []
        })
    }

    //if group response fetch went wrong 
    const res = await groupResponse.json();

    return ({
        status: res.status,
        message: res.error.message,
        members: []
    })
};
