import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { GetCommand, UpdateCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const ddbDocClient = DynamoDBDocumentClient.from(client);

//name of the DynamoDB table 
const TABLE_NAME = 'target-tracking-concrete';

//api GET function. Gets the employee's target from the target-tracking-concrete DB
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ID = searchParams.get('ID');

  if (!ID) {
    return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
  }

  // Finds the employee's target based on ID and iterates through the table
  try {
    const command = new GetCommand({
      TableName: TABLE_NAME,
      Key: { ID },
    });

    const result = await ddbDocClient.send(command);

    if (!result.Item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    let targetNum = 2;
    while (result['Item']['Target' + targetNum]) {
      targetNum++;
    }
    if (targetNum == 2) {
      const data = {
        "Target": result['Item']['Target'],
        "NumTargets": 1
      }
      return NextResponse.json(data);
    }
    else {
      const data = {
        "Target": result['Item']['Target' + (targetNum - 1)],
        "NumTargets": targetNum - 1
      }
      return NextResponse.json(data)
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error: ' + error }, { status: 500 });
  }
}

//api POST function. Sends information to DynamoDB
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ID, description, newTarget, targetNum } = body;
    let descHeader = "Description" + targetNum
    let targetHeader = "Target" + targetNum
    const dateHeader = "dateChanged" + targetNum

    if (!ID || !description || !targetNum || typeof newTarget !== 'number') {
      return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 });
    }

    let command
    // First time target entry
    if (description == "Initial entry") {
      targetHeader = "Target"
      descHeader = "Description"
      command = new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { ID },
        UpdateExpression: `SET #desc = :desc, #target = :target`,
        ExpressionAttributeNames: {
          '#desc': descHeader,
          '#target': targetHeader,
        },
        ExpressionAttributeValues: {
          ':desc': description,
          ':target': newTarget,
        },
      });
    }
    else {
      // Person already has a target entered
      command = new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { ID },
        UpdateExpression: `SET #desc = :desc, #target = :target, #date = :date`,
        ExpressionAttributeNames: {
          '#desc': descHeader,
          '#target': targetHeader,
          '#date': dateHeader,
        },
        ExpressionAttributeValues: {
          ':desc': description,
          ':target': newTarget,
          ':date': (new Date()).toString(),
        },
      });
    }

    await ddbDocClient.send(command);

    return NextResponse.json({ message: 'Item saved successfully' }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save item: ' + error }, { status: 500 });
  }
}