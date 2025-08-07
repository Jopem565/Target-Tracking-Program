//global routes for what different groups (employee, team lead, admin) are allowed to see
export const ALLOWED_EMPLOYEE_ROUTES = ['/', '/Home', '/Home/Plan_Ahead', '/api/employees','/api/hours', '/api/notify', '/api/planAhead'];
export const ALLOWED_TEAM_LEAD_ROUTES = ['/', '/Home', '/Home/Plan_Ahead', '/Search/Team', '/Search/Team/Dash', '/Search/Company/Employee_page', '/api/employees', '/api/hours', '/api/notify,' , '/api/planAhead'];
export const ALLOWED_ADMIN_ROUTES = ['/', '/Search/Company', '/Search/Company/Dashboard', '/Search/Company/Employee_Page', '/Company/YTD', '/api/employees', '/api/hours', '/api/target'];
export const PUBLIC_ROUTES = ['/'];