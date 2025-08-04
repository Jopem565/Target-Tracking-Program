// defines the configuration object for the application
const appConfig = {
    roles : {
        enabled: process.env.NEXT_PUBLIC_ROLES_ENABLED,

        types : {
            admin : process.env.ADMIN_GROUP,
            team_lead : process.env.TEAM_LEAD_GROUP
        },
    }
};

export default appConfig;