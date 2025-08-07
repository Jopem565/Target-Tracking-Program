import { NextResponse } from 'next/server';
import AWS from 'aws-sdk';
import { idToDisplayName, isValidEmployeeId, parseEmployeeId } from '@/app/utils/formatName';
import { auth } from '@/app/lib/auth';
import { getWeek } from 'date-fns';

//sets the region, access key id, and secret access key in the javascript code
//updates the global configuration object settings for environment
AWS.config.update({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const dynamodb = new AWS.DynamoDB();

// Helper: count weekdays between two dates
function countWeekdaysBetween(startDate: Date, endDate = new Date()): number {
  const start = startDate;
  const end = new Date(endDate);

  const currDate = new Date();

  let count = 0;
  const current = new Date(start);
  
  while(getWeek(end) == getWeek(currDate) || end.getDay() != 5) {
    end.setDate(end.getDate() - 1);
  }

  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

// DynamoDB AttributeValue shape (simplified)
type AttributeValue =
  | { S: string }
  | { N: string }
  | { BOOL: boolean }
  | { NULL: true }
  | { M: Record<string, AttributeValue> }
  | { L: AttributeValue[] };

// Our item type from DynamoDB scan results (allows dynamic keys)
interface DynamoDBItem {
  ID: AttributeValue & { S: string };
  Description?: AttributeValue & { S: string };
  [key: string]: AttributeValue | undefined; // dynamic keys like 'Target', 'Direct1', etc.
}

//api GET function. Gets the data from DynamnoDB
export async function GET() {
    const session = await auth();
    const roles = session?.user?.role ?? [];
    const currentYear = new Date().getFullYear();
  
    /**
     * Retrieve the number of weeks in the current year. 
     * A week in the current year starts from Friday to Friday.
     * @param year the year to retrieve number of weeks from.
     * @returns the number of weeks in the current year. 
     */
    function getNumberOfFridayToFridayWeeks(year: number): number {
        // Start from Jan 1st
        const date = new Date(year, 0, 1);

        // Advance to the first Friday
        while (date.getDay() !== 5) {
          date.setDate(date.getDate() + 1);
        }

        let count = 0;
        // Count every Friday-to-Friday week that starts in the same year
        while (date.getFullYear() === year) {
          count++;
          date.setDate(date.getDate() + 7);
        }

        return count;
    }

    //Get total number of weeks in the current year
    const numWeeks = getNumberOfFridayToFridayWeeks(new Date().getFullYear());

  try {
    const directCols = Array.from({ length: numWeeks }, (_, i) => `Direct${i + 1}`);
    const indirectCols = Array.from({ length: numWeeks }, (_, i) => `Indirect${i + 1}`);

    const data = await dynamodb
      .scan({
        TableName: 'target-tracking-concrete',
      })
      .promise();

    const items: DynamoDBItem[] = (data.Items ?? []) as DynamoDBItem[];

    // filtering if id is valid
    const filteredItems = items.filter((item) => {
      const rawId = item.ID?.S;
      return isValidEmployeeId(rawId, currentYear);
    });

    // filtering employees based on role and members
    const employees = filteredItems.filter((item) => {
      const name = idToDisplayName(item.ID.S);

      // Normalize session.user.members to display names if present
      if (roles.includes('team_lead')) {
        if (!Array.isArray(session?.user?.members)) return false;
        const allowedNames = new Set(
          session.user.members.map((m: string) => {
            const { yearNum } = parseEmployeeId(m);
            return Number.isNaN(yearNum) ? m : idToDisplayName(m);
          })
        );
        return allowedNames.has(name);
      }
      if (roles.includes('employee')) {
        return name === session?.user?.name;
      }
      if (roles.includes('admin')) {
        return true;
      }
      return false;
    });

    // Helper to safely get number from AttributeValue
    function getNumber(item: DynamoDBItem, key: string): number {
      const val = item[key];
      return val && 'N' in val ? Number(val.N) : 0;
    }

    // Helper to get string value safely
    function getString(item: DynamoDBItem, key: string): string | undefined {
      const val = item[key];
      if (val && 'S' in val) {
        return val.S;
      }
      return undefined;
    }

    const mappedEmployees = employees.map((item) => {
      const name = idToDisplayName(item.ID.S);

      // Determine target and which targetN is valid
      const ogTarget = getNumber(item, 'Target');
      let target = ogTarget;
      let targetNum = 2;

      while (getNumber(item, `Target${targetNum}`) !== 0) {
        targetNum++;
      }

      if (targetNum === 2) {
        target = getNumber(item, 'Target');
        targetNum = 1;
      } else {
        targetNum--;
        target = getNumber(item, `Target${targetNum}`);
      }

      if (target === undefined) {
        target = 0;
        targetNum = 0;
      }

      // Calculate totals
      let totalDirect = 0;
      let totalIndirect = 0;
      let midYearTotal = 0;
      let firstWeek = 0;

      //Initialize arrays to hold hours
      const directHours: number[] = Array(numWeeks).fill(null); // index 1-numWeeks used
      const indirectHours: number[] = Array(numWeeks).fill(null);

      // Track first billing week for direct hours
      let firstValue = false;
      let i = 1;
      let firstWeekDirect = 0;
      for (const col of directCols) {
        const val = getNumber(item, col);
        if (val !== null) {
          if (!firstValue) {
            firstWeekDirect = i;
            firstValue = true;
          }
          directHours[i] = val;
          totalDirect += val;
          if (i <= 26) midYearTotal += val;
        } else {
          directHours[i] = 0;
        }
        i++;
      }

      // Track first billing week for indirect hours
      firstValue = false;
      let firstWeekIndirect = 0;
      i = 1;
      for (const col of indirectCols) {
        const val = getNumber(item, col);
        if (val) {
          if (!firstValue) {
            firstWeekIndirect = i;
            firstValue = true;
          }
          indirectHours[i] = val;
          totalIndirect += val;
          if (i <= 26) midYearTotal += val;
        } else {
          indirectHours[i] = 0;
        }
        i++;
      }

      firstWeek = Math.min(firstWeekDirect, firstWeekIndirect);

      const totalHours = totalDirect + totalIndirect;
      let leaveHours = 2080 - target;
      let midGoal = target / 2;
      let endGoal = target;
      let timeOff = 0;

      const currYear =  new Date().getFullYear();
      let startDate: Date | undefined;

      if (target < 1776) {
        // Parse start date from description
        const desc = getString(item, 'Description');
        const startDateStr = desc?.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/);
        if (startDateStr && startDateStr[1]) {
          startDate = new Date(startDateStr[1]);
        }
        const april = new Date(currYear, 3, 1);
        if (startDate && startDate < april) {
          midGoal = target - ogTarget / 2;
          endGoal = target;
        } else {
          midGoal = 0;
          endGoal = target;
        }
        if (startDate) {
          const weekdaysSince = countWeekdaysBetween(startDate);
          const possibleHours = weekdaysSince * 8;
          timeOff = possibleHours - totalHours;
          leaveHours = 2080 - target - timeOff;
        }
      } else if (target >= 1776) {
        const jan = new Date(currYear, 0, 1);
        const weekdaysSince = countWeekdaysBetween(jan);
        const possibleHours = weekdaysSince * 8;
        timeOff = possibleHours - totalHours;
        leaveHours = 2080 - target - timeOff;
      }

      const hoursRemaining = target - totalHours;

      const weekNumber = getWeek(new Date(), {
        weekStartsOn: 6,
      }) - 1;

      let numWeeksYear: number;
      if (!startDate) {
        numWeeksYear = 52;
      } else {
        numWeeksYear = 52 - getWeek(startDate) + 1;
      }

      const avgHoursEnd = hoursRemaining / (52 - weekNumber);
      const avgHoursMid =
        weekNumber < numWeeks/2
          ? (midGoal - midYearTotal) / (26 - weekNumber)
          : 0;

      const pacingEnd =
        totalHours - (target / numWeeksYear) * (numWeeksYear - (52 - weekNumber));

      const pacingMid =
        weekNumber > 26
          ? midYearTotal - midGoal
          : midYearTotal -
            (midGoal / (numWeeksYear / 2)) * ((numWeeksYear / 2) - (26 - weekNumber));

      return {
        name,
        pacingEnd,
        pacingMid,
        target,
        targetNum,
        firstWeek,
        totalDirect,
        totalIndirect,
        totalHours,
        midGoal,
        endGoal,
        midYearTotal,
        directHours,
        indirectHours,
        leaveHours,
        hoursRemaining,
        avgHoursEnd,
        avgHoursMid,
        timeOff,
        ogTarget
      };
    });

    return NextResponse.json(mappedEmployees);
    
  } catch (error) {
    console.error('Error:', error);
    return new NextResponse('Error fetching employees', { status: 500 });
  }
}