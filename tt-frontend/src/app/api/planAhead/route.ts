import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { GetCommand, UpdateCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { formatID } from '@/app/utils/formatID';
import { auth } from "@/app/lib/auth";

const client = new DynamoDBClient({ region: 'us-east-1' });
const ddbDocClient = DynamoDBDocumentClient.from(client);

//name of the database from DynamoDB 
const TABLE_NAME = 'target-tracking-hypothetical';

//api GET function. Gets the needed data from the target-tracking-hypothetical database
export async function GET() {

  const session = await auth();
  const name = session?.user.name;
  const ID = formatID(name);

  if (!ID) {
    return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
  }

  try {
    const command = new GetCommand({
      TableName: TABLE_NAME,
      Key: { ID },
    });

    const result = await ddbDocClient.send(command);

    if (!result.Item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const item = result.Item;
    const indirectHours: number[] = [];
    const directHours: number[] = [];

    //Iterate through each week
    for (let i = 1; i <= 53; i++) {
      indirectHours.push(item[`Indirect ${i}`] ?? 0);
      directHours.push(item[`Direct ${i}`] ?? 0);
    }

    const data = {
      "ID": ID,
      "Hours Off": item['Hours Off'],
      "Leave Hours": item['Leave Hours'],
      "Average Hours for Mid Goal": item['Average Hours for Mid Goal'],
      "Average Hours for End Goal": item['Average Hours for End Goal'],
      "Events": item["Events"],
      "Holiday Events": item["Holiday Events"],
      indirectHoursHyp: indirectHours,
      directHoursHyp: directHours,
    };
    return NextResponse.json(data);

  }
  catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

//api POST function. Used for sending information to the database
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ID, hoursOff, target, leaveHours,
      avgHoursMidGoal, avgHoursEndGoal,
      events, holidayEvents, indirectHoursHyp, directHoursHyp, firstWeek, lastWeek
    } = body;

    //Week number for the starting week of the current month
    const startWeek = firstWeek;

    //Week number for the last week of the current month
    const endWeek = lastWeek;

    for (let i = startWeek; i <= endWeek; i++) {
      const indirectKey = `Indirect ${i}`;
      const directKey = `Direct ${i}`;

      //Updates the target-tracking-hypothetical database
      const command = new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { ID },
        UpdateExpression: `
          SET #hoursOff = :hoursOff,
          #target = :target,
          #leaveHours = :leaveHours,
          #avgHoursMidGoal = :avgHoursMidGoal,
          #avgHoursEndGoal = :avgHoursEndGoal,
          #events = :events,
          #holidayEvents = :holidayEvents,
          #${indirectKey.replace(/\s/g, "")} = :indirectHrs,
          #${directKey.replace(/\s/g, "")} = :directHrs`,
          
        ExpressionAttributeNames: {
          '#hoursOff': 'Hours Off',
          '#target': 'Target',
          '#leaveHours': 'Leave Hours',
          '#avgHoursMidGoal': 'Average Hours for Mid Goal',
          '#avgHoursEndGoal': 'Average Hours for End Goal',
          '#events': 'Events',
          '#holidayEvents': 'Holiday Events',
          [`#${indirectKey.replace(/\s/g, "")}`]: indirectKey,
          [`#${directKey.replace(/\s/g, "")}`]: directKey,
        },

        ExpressionAttributeValues: {
          ':hoursOff': hoursOff,
          ':target': target,
          ':leaveHours': leaveHours,
          ':avgHoursMidGoal': avgHoursMidGoal,
          ':avgHoursEndGoal': avgHoursEndGoal,
          ':events': events,
          ':holidayEvents': holidayEvents,
          ':indirectHrs': indirectHoursHyp[i - 1] ? indirectHoursHyp[i - 1] : 0,
          ':directHrs': directHoursHyp[i - 1] ? directHoursHyp[i - 1] : 0,
        },
      });
      await ddbDocClient.send(command);
    }
    return NextResponse.json({ message: 'Changes saved successfully' }, { status: 201 });
  }

  catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to save item' }, { status: 500 });
  }
}
