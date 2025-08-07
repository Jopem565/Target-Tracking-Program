import { NextResponse } from 'next/server';
import AWS from 'aws-sdk';
import { auth } from '@/app/lib/auth';
import { isValidEmployeeId, parseEmployeeId, idToDisplayName } from '@/app/utils/formatName';
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { AttributeValue } from "@aws-sdk/client-dynamodb";

interface UnmarshalledItem {
  ID: string;
}

const dynamodb = new AWS.DynamoDB();

//sets the region, access key id, and secret access key in the javascript code
//updates the global configuration object settings for environment
AWS.config.update({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

//this function gets the needed data of employees depending on user role
export async function GET() {
  const session = await auth();
  //getting the current year for filtering
  const currentYear = new Date().getFullYear();

  try {
    const data = await dynamodb.scan({
      TableName: 'target-tracking-concrete',
      ProjectionExpression: 'ID',
    }).promise();

    const allItems: UnmarshalledItem[] = (data.Items ?? []).map((item) =>
      unmarshall(item as Record<string, AttributeValue>) as UnmarshalledItem
    );

    //filtering out prior-year IDs
    const currentYearItems = allItems.filter(({ ID }) => 
      isValidEmployeeId(ID, currentYear)
    );

    // Build [{id, name}]
    const currentYearEmployees = currentYearItems.map(({ ID }) => ({
      id: ID,
      name: idToDisplayName(ID),
    }));

    // Dedupe by name (in case table accidentally has two same-year rows)
    const dedupedByName = Array.from(
      new Map(currentYearEmployees.map((e) => [e.name, e])).values()
    );

    //if user is a team lead but not admin, only fetch their team members' info 
    if (
      session?.user?.role?.includes("team_lead") &&
      Array.isArray(session.user?.members)
    ) {
      // Make sure the session's `members` list is in the same display-name format
      const allowedNames = new Set(
        session.user.members.map((m) => {
          const { yearNum } = parseEmployeeId(m);
          return Number.isNaN(yearNum) ? m : idToDisplayName(m);
        })
        );
      const employees = dedupedByName.filter((e) => allowedNames.has(e.name));
      return NextResponse.json(employees);
    }

    //if user is an admin, fetch all employees
    else if (session?.user?.role?.includes("admin")) {
      return NextResponse.json(dedupedByName);
    }

  } 
  catch (error) {
    console.error('Error:', error);
    return new NextResponse('Error fetching employees', { status: 500 });
  }
}
