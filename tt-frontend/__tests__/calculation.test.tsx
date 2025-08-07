import {expect, jest, test} from '@jest/globals'

/* the tests in this file use the equations from 
route.ts file in api/hours as calculation logic */

/* actual employee info for testing:
   Weeks: 29
   total hours worked: 1192.5
   target: 1860 */

//the equation used in hours api for leave hours
test('Leave hours when target is 1860', () => {
  return expect(2080 - 1860).toBe(220);
});

test('Leave hours when target is 1840', () => {
  return expect(2080 - 1840).toBe(240);
});

test('Leave hours when target is 1824', () => {
  return expect(2080 - 1824).toBe(256);
});

test('Leave hours when target is 1776', () => {
  return expect(2080 - 1776).toBe(304);
});

//equation used ot get mid goal targets
test('Mid-goal for 1860 target', () => {
  return expect(1860 / 2).toBe(930);
});

test('Mid-goal for 1840 target', () => {
  return expect(1840 / 2).toBe(920);
});

test('Mid-goal for 1824 target', () => {
  return expect(1824 / 2).toBe(912);
});

test('Mid-goal for 1776 target', () => {
  return expect(1776 / 2).toBe(888);
});

//hours remaining calculation
//mock employee's indirect and direct hours for total hours
//start of year
const startTotalHours = 0;

test('Hours remaining for 1860 target', () => {
  return expect(1860 - startTotalHours).toBe(1860);
});

test('Hours remaining for 1840 target', () => {
  return expect(1840 - startTotalHours).toBe(1840);
});

test('Hours remaining for 1824 target', () => {
  return expect(1824 - startTotalHours).toBe(1824);
});

test('Hours remaining for 1776 target', () => {
  return expect(1776 - startTotalHours).toBe(1776);
});

//middle of year
test('Hours remaining for 1860 target', () => {
  const midTotalHours = 930;
  return expect(1860 - midTotalHours).toBe(930);
});

test('Hours remaining for 1840 target', () => {
  const midTotalHours = 920;
  return expect(1840 - midTotalHours).toBe(920);
});

test('Hours remaining for 1824 target', () => {
  const midTotalHours = 912;
  return expect(1824 - midTotalHours).toBe(912);
});

test('Hours remaining for 1776 target', () => {
  const midTotalHours = 888;
  return expect(1776 - midTotalHours).toBe(888);
});

//employee data on week 29
const employeeTotal = 1192.5;
test('Hours remaining for employee 1860 target', () => {
  return expect(1860 - employeeTotal).toBe(667.5);
});

test('Hours remaining for employee 1840 target', () => {
  return expect(1840 - employeeTotal).toBe(647.5);
});

test('Hours remaining for employee 1824 target', () => {
  return expect(1824 - employeeTotal).toBe(631.5);
});

test('Hours remaining for employee 1776 target', () => {
  return expect(1776 - employeeTotal).toBe(583.5);
});

//end of year
test('Hours remaining for 1860 target', () => {
  const endTotalHours = 1860;
  return expect(1860 - endTotalHours).toBe(0);
});

test('Hours remaining for 1840 target', () => {
  const endTotalHours = 1840;
  return expect(1840 - endTotalHours).toBe(0);
});

test('Hours remaining for 1824 target', () => {
  const endTotalHours = 1824;
  return expect(1824 - endTotalHours).toBe(0);
});

test('Hours remaining for 1776 target', () => {
  const endTotalHours = 1776;
  return expect(1776 - endTotalHours).toBe(0);
});

// const avgHoursEnd = hoursRemaining / (52 - weekNumber);
// checked with number in profile and they matched
test("average hours to reach the end goal using employee data", () => {
    const hoursRem = (1860 - 1192.5);
    const weeksRem = (52 - 29);
    return expect(Math.round((hoursRem / weeksRem)*100)/100).toBe(29.02);
});

// const pacingEnd = totalHours - (target / numWeeksYear) * (numWeeksYear - (52 - weekNumber));
//there are 52 weeks in 2025
const numWeeksYear = 52;
const weekNumber = 29;
test("End pacing calculation using employee data", () => {
    const avgHours = (1860 / numWeeksYear);
    const weeks = (numWeeksYear - (52 - weekNumber));
    return expect(Math.round((employeeTotal - (avgHours * weeks))*100)/100).toBe(155.19);
});

//const pacingMid = weekNumber > 26 ? midYearTotal - midGoal : midYearTotal - (midGoal / (numWeeksYear / 2)) * ((numWeeksYear / 2) - (26 - weekNumber));
//930 mid goal
test("pacing mid calculation using employee data", () => {
    const midyearTotal = 1059.1;
    const midGoal = 930;
    return expect(Math.round((midyearTotal - (midGoal / (numWeeksYear/2)) * ((numWeeksYear/2) - (26 - weekNumber)))*100)/100).toBe(21.79)

});