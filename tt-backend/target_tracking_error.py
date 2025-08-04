import json
import boto3
from datetime import datetime, timedelta, timezone

SNS_ARN = 'arn:aws:sns:us-east-1:248226241757:target-tracking-error'
LOG_GROUP = '/aws/vendedlogs/states/target-tracking-Logs'
sns = boto3.client('sns')
cloudwatch = boto3.client('logs')

def lambda_handler(event, context):
    try:
        # Filters logs from the past hour
        end_time = datetime.now(timezone.utc).replace(minute=59, second=59, microsecond=0)
        start_time = end_time - timedelta(hours=1)
            
        start_time_ms = int(start_time.timestamp() * 1000)
        end_time_ms = int(end_time.timestamp() * 1000)

        # Paginate through the log events
        paginator = cloudwatch.get_paginator('filter_log_events')
        
        pages = paginator.paginate(
                logGroupName=LOG_GROUP,
                startTime=start_time_ms,
                endTime=end_time_ms
        )
        err = "An error occurred while running the automated report generation, but we were unable to retrieve the error. Please check CloudWatch."
        response = {}
        if pages:
            for page in pages:
                for event in page['events']:
                    if 'message' in event:
                        response = event['message']
                    else:
                        pass
                    if 'details' in response:
                        if isinstance(response, str):
                            response = json.loads(response)
                        response = response['details']
                    else:
                        pass
                    if 'cause' in response:
                        if isinstance(response, str):
                            response = json.loads(response)
                        response = response['cause']
                    else:
                        pass
                    # This should be the latest error message before we hit the fail state
                    if 'stackTrace' in response:
                        if isinstance(response, str):
                            response = json.loads(response)
                        err = response['stackTrace']

        timeFailed = str(datetime.now(timezone.utc))
        sns_message = f"Target Tracking Error Summary:\n----------------------------------------\nTime of Failure: {timeFailed}\n\nStack Trace: {err}\n----------------------------------------"
        sns.publish(
            TopicArn=SNS_ARN, 
            Message=sns_message,
            Subject="Target Tracking Error"
        )

        return {
            'statusCode': 200,
            'body': json.dumps('Execution check complete')
        }
    except Exception as e:
        print("The following error occurred while parsing the auto report generation logs: " + str(e))
        timeFailed = str(datetime.now(timezone.utc))
        err = "The auto report generation failed, but an error occured while trying to parse the CloudWatch logs."
        sns_message = f"Target Tracking Error Summary:\n----------------------------------------\nTime of Failure: {timeFailed}\n\nError Message: {err}\n----------------------------------------"
        sns.publish(
            TopicArn=SNS_ARN, 
            Message=sns_message,
            Subject="Target Tracking Error"
        )
