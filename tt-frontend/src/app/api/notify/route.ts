import { NextRequest, NextResponse } from 'next/server';
import AWS from 'aws-sdk';
    
const sns = new AWS.SNS({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// This function is responsible notifying Linda that an employee wants to change their target hours
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { message } = body;

        if (!message) {
            return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
        }
        
        const params = {
            Message: message,
            Subject: "Target Change Request",
            TopicArn: process.env.SNS_TOPIC_ARN,
        };

        const data = await sns.publish(params).promise();

        return NextResponse.json({ message: 'Message sent successfully!', messageId: data.MessageId });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to send message: ' + error }, { status: 500 });
    }
}
