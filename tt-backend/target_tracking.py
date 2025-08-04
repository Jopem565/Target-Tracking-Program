import pandas as pd
from datetime import datetime, date
import boto3
import io
import json

USERNAME = ""
PASSWORD = ""

DYNAMO_TABLE = "target-tracking-concrete"
BUCKET_NAME = 'target-tracking-selenium'
REPORT_PREFIX = "Reports/"
TARGET_PREFIX = "Targets/"
AUTO_PREFIX = "Auto/"
NAME_PREFIX = "Names/"

s3 = boto3.client('s3')
dynamodb = boto3.client('dynamodb')
secrets = boto3.client('secretsmanager')

def get_secret():
    secret_name = "target-tracking-unanet-login"
    region_name = "us-east-1"

    # Create a Secrets Manager client
    session = boto3.session.Session()
    client = session.client(
        service_name='secretsmanager',
        region_name='us-east-1'
    )

    try:
        get_secret_value_response = client.get_secret_value(
            SecretId='target-tracking-unanet-login'
        )
    except Exception as e:
        raise e

    secret = get_secret_value_response['SecretString']
    return secret

def getDynamoIDs():
    partition_key = 'ID'
    all_ids = []
    emp_ids = []
    last_evaluated_key = None

    projection_expression = partition_key

    while True:
        scan_params = {
            'TableName': DYNAMO_TABLE,
            'ProjectionExpression': projection_expression
        }
        if last_evaluated_key:
            scan_params['ExclusiveStartKey'] = last_evaluated_key

        response = dynamodb.scan(**scan_params)

        for item in response.get('Items', []):
            # Extract and store the primary key
            primary_key = {}
            primary_key[partition_key] = item[partition_key]
            all_ids.append(primary_key)

        last_evaluated_key = response.get('LastEvaluatedKey')
        if not last_evaluated_key:
            break

    for i in range(len(all_ids)):
        employeeID = all_ids[i]['ID']['S']

        # We don't include the Unanet/Microsoft name discrepency dict
        if employeeID == 'names':
            continue

        emp_ids.append(employeeID)
    
    return emp_ids

def getDynamoYTD(year):

    employeeTotals = {}
    namesDict = getCorrectNames()
    reversedNameDict = {value: key for key, value in namesDict.items()}

    employeeIDs = getDynamoIDs()

    for employee in employeeIDs:
        # The YTD logic compares based on Unanet names. Convert the Microsoft names to Unanet names
        employeeName = splitID(employee)
        employeeName = employeeName[0] + " " + employeeName[1][:-4]
        if employeeName in reversedNameDict:
            employeeName = reversedNameDict[employeeName].split(" ")
            employeeName = employeeName[0] + employeeName[1] + str(year)
        else:
            employeeName = employee

        response = dynamodb.get_item(TableName=DYNAMO_TABLE, Key={'ID': {'S': employee} })
        if employee not in employeeTotals:
            employeeTotals[employeeName] = {'Direct': 0.0, 'Indirect': 0.0}
        addDirect = 0.0
        addIndirect = 0.0
        prevWeek = date.today().isocalendar()[1] - 1
        if prevWeek == 0:
            return employeeTotals
        for i in range(prevWeek):
            try:
                addDirect += float(response['Item']['Direct' + str(i+1)]['N'])
            except:
                pass
            try:
                addIndirect += float(response['Item']['Indirect' + str(i+1)]['N'])
            except:
                pass
            employeeTotals[employeeName]['Direct'] = round(addDirect, 2)
            employeeTotals[employeeName]['Indirect'] = round(addIndirect, 2)

    return employeeTotals

def updateHours(employeeID, key, hours):
    try:
        response = dynamodb.update_item(
                TableName=DYNAMO_TABLE,
                Key={"ID": {'S': employeeID}},
                UpdateExpression='SET #' + str(key) +'= :' + str(key), 
                ExpressionAttributeNames={'#' + str(key): str(key)},
                ExpressionAttributeValues={
                    ':' + str(key): {'N': str(hours)},
                    # ':empID': {'S': str(employeeID)}
                },
                # ConditionExpression='ID = :empID',
                ReturnValues='UPDATED_NEW'
            )
        if (str(response['ResponseMetadata']['HTTPStatusCode']) == "200"):
            return "Success!"
        else:
            print("ERROR:\n\n" + str(response['ResponseMetadata']['HTTPStatusCode']))
            return ("ERROR:\n\n" + str(response['ResponseMetadata']['HTTPStatusCode']))
    except Exception as e:
        print(e)
        return e

def getHours(prefix):
    try:
        # Read the file from S3
        response = s3.list_objects_v2(Bucket=BUCKET_NAME, Prefix=prefix, MaxKeys=5)
        # Check if the 'Contents' key is present in the response
        if 'Contents' in response:
            # Get the file under the Reports/ folder
            file_name = response['Contents'][1]['Key']
        response = s3.get_object(Bucket=BUCKET_NAME, Key=file_name)
        file_content = response['Body'].read().decode('utf-8')

        reportCSV = pd.read_csv(io.StringIO(file_content))
    except Exception as e:
        print(e)

    # Create a dataframe for the csv file
    reportDF = pd.DataFrame(reportCSV)

    reportEndDate = datetime.strptime(str(file_name).split('/')[1].split('.')[0], '%Y-%m-%d')
    currYear = reportEndDate.year

    # Get the week the report information belongs to
    current_week = reportEndDate.isocalendar()[1]

    # Last week of the year is "53rd" week. Do not overwrite the first week of the year
    if reportEndDate.month == 12 and current_week == 1:
        current_week = 53

    emp_ids = getDynamoIDs()

    emp_data = {}

    namesDict = getCorrectNames()

    for row in reportDF.index:
        # Get employee name / ID information
        employeeName = reportDF.loc[row, 'Person']
        # If employee has a different name in Microsoft, use that name
        firstname = employeeName.replace(",", "").split(" ")[1]
        lastname = employeeName.replace(",", "").split(" ")[0]
        fullname = firstname + " " + lastname
        employeeID = str(firstname) + str(lastname) + str(currYear)

        # If there is a Unanet/Microsoft name discrepency, we use the Microsoft name
        if fullname in namesDict:
            employeeID = namesDict[fullname].split(" ")
            employeeID = employeeID[0] + employeeID[1] + str(currYear)
        
        # Create emp data instance
        if employeeID not in emp_data:
            emp_data[employeeID] = {"Direct": 0, "Indirect": 0}

        response = dynamodb.get_item(TableName=DYNAMO_TABLE, Key={'ID': {'S': employeeID} })
        target = None

        # Check if employee already has an entry in the database for the given year
        if "Item" not in response:
            employeeID = employeeID[:-4] + str(currYear-1)
            # Check if employee has an entry for the previous year
            response = dynamodb.get_item(TableName=DYNAMO_TABLE, Key={'ID': {'S': employeeID} })
            # If employee has target from previous year use it for this year
            if "Item" in response:
                if "Target" in response["Item"]:
                    target = response["Item"]["Target"]["N"]
                    i = 2
                    # Get the latest target
                    while True:
                        if "Target" + str(i) in response["Item"]:
                            target = response["Item"]["Target" + str(i)]["N"]
                            i += 1
                        else:
                            break

        employeeID = employeeID[:-4] + str(currYear)
        # Employee had a target from previous year, use it for current year here
        if target is not None:
            err = addItem(employeeID, target, "N", "Target")
            if (err != "Success!"):
                print(err)
    
        # Check if they already have hours populated for the given week
        # If they do, we overwrite them with the new data
        try:
            direct = float(response['Item']['Direct' + str(current_week)])
            if (direct > 0):
                print("OVERRIDING DIRECT HOURS FOR " + str(employeeID) + " FOR WEEK " + str(current_week))
        except:
            pass
        try:
            indirect = float(response['Item']['Indirect' + str(current_week)])
            if (indirect > 0):
                print("OVERRIDING INDIRECT HOURS FOR " + str(employeeID) + " FOR WEEK " + str(current_week))
        except:
            pass

        if 'OH_BR' in reportDF.loc[row, 'Project'] or 'BEREAVEMENT' in reportDF.loc[row, 'Project'] or 'PARENTAL' in reportDF.loc[row, 'Project']:
            emp_data[employeeID]['Indirect'] += float(reportDF.loc[row, 'Hours'])
        elif 'FLEX_TIME' in reportDF.loc[row, 'Project']:
            continue
        else:
            emp_data[employeeID]['Direct'] += float(reportDF.loc[row, 'Hours'])

        # Add the direct hours to the database
        key = "Direct" + str(current_week)

        err = updateHours(employeeID, key, round(emp_data[employeeID]['Direct'], 2))
        if (err != "Success!"):
            print(err)
        
        # Add the indirect hours to the database
        key = "Indirect" + str(current_week)
        err = updateHours(employeeID, key, round(emp_data[employeeID]['Indirect'], 2))
        if (err != "Success!"):
            print(err)

def deleteS3(s3_prefix):
    try:
        # Remove old report(s)
        objects = s3.list_objects_v2(Bucket=BUCKET_NAME, Prefix=s3_prefix)

        if 'Contents' in objects:
            for obj in objects['Contents']:
                if (obj['Key'] != s3_prefix):
                    response = s3.delete_object(
                        Bucket=BUCKET_NAME, 
                        Key=obj['Key']
                    )
        return {
                    'statusCode': 200,
                    'body': 'Successfully removed S3 files'
                }
    except Exception as e:
        return {
                    'statusCode': 500,
                    'body': str(e)
                }

def getTargets():
    try:
        # Read the file from S3
        response = s3.list_objects_v2(Bucket=BUCKET_NAME, Prefix=TARGET_PREFIX, MaxKeys=5)
        # Check if the 'Contents' key is present in the response
        if 'Contents' in response:
            # Get the file under the Targets/ folder
            file_name = response['Contents'][1]['Key']
        response = s3.get_object(Bucket=BUCKET_NAME, Key=file_name)
        file_content = response['Body'].read().decode('utf-8')

        targetCSV = pd.read_csv(io.StringIO(file_content))
    except Exception as e:
        print(e)

    # Create a dataframe for the csv file
    targetDF = pd.DataFrame(targetCSV)

    employeeTargets = {}
    currYear = datetime.now().year

    namesDict = getCorrectNames()

    for row in targetDF.index:
        # Get employee name / ID information
        employeeName = targetDF.loc[row, 'Person']
        # If employee has a different name in Microsoft, use that name
        if employeeName in namesDict:
            employeeName = namesDict[employeeName]
        # Skip empty rows
        if not isinstance(employeeName, str):
            continue
        firstlast = employeeName.replace(" ", "")
        employeeID = str(firstlast) + str(currYear)

        target = targetDF.loc[row, 'Target']
        target2 = targetDF.loc[row, 'Target2']

        addItem(employeeID, target, "N", "Target")
        # If the employee has multiple targets, add the new one with an initial or given description
        if target != target2:
            addItem(employeeID, target2, "N", "Target2")
            description = targetDF.loc[row, 'Description']
            if isinstance(description, str):
                if len(description) == 0:
                    description = "Initial entry"
            else:
                description = "Initial entry"
            addItem(employeeID, description, "S", "Description")
            dateChanged2 = str(datetime.now())
            addItem(employeeID, dateChanged2, "S", "dateChanged2")

    deleteS3(TARGET_PREFIX) 

def addItem(employeeID, data, datatype, header):
    try:
        response = dynamodb.update_item(
                TableName=DYNAMO_TABLE,
                Key={"ID": {'S': str(employeeID)}},
                UpdateExpression='SET #' + str(header) + '= :' + str(header), 
                ExpressionAttributeNames={'#' + str(header): header},
                ExpressionAttributeValues={':' + str(header): {str(datatype): str(data)}}, 
                ReturnValues='UPDATED_NEW'
            )
        if (str(response['ResponseMetadata']['HTTPStatusCode']) == "200"):
            return "Success!"
        else:
            print("ERROR:\n\n" + str(response['ResponseMetadata']['HTTPStatusCode']))
            return ("ERROR:\n\n" + str(response['ResponseMetadata']['HTTPStatusCode']))
    except Exception as e:
        print(e)
        return e

def setCorrectNames():
    try:
        # Read the file from S3
        response = s3.list_objects_v2(Bucket=BUCKET_NAME, Prefix=NAME_PREFIX, MaxKeys=5)
        # Check if the 'Contents' key is present in the response
        if 'Contents' in response:
            # Get the file under the Names/ folder
            file_name = response['Contents'][1]['Key']
        response = s3.get_object(Bucket=BUCKET_NAME, Key=file_name)
        file_content = response['Body'].read().decode('utf-8')

        nameCSV = pd.read_csv(io.StringIO(file_content))
    except Exception as e:
        print(e)

    # Create a dataframe for the csv file
    nameDF = pd.DataFrame(nameCSV)

    nameDict = {}
    
    for row in nameDF.index:
        unanetName = nameDF.loc[row, 'Unanet Name']
        microsoftName = nameDF.loc[row, 'Microsoft Name']

        if not isinstance(unanetName, str) or not isinstance(microsoftName, str):
            continue
        nameDict[unanetName] = microsoftName

    # Add the dictionary of Unanet/Microsoft name values to DynamoDB under the ID "names"
    addItem("names", json.dumps(nameDict), "S", "UnanetKey")
    
    deleteS3(NAME_PREFIX)

def getCorrectNames():
    try:
        # Get the dictionary of names
        response = dynamodb.get_item(TableName=DYNAMO_TABLE, Key={'ID': {'S': "names"} })
        if not 'Item' in response:
            return {}
        dict = json.loads(response['Item']['UnanetKey']['S'])
        return dict
    except Exception as e:
        print(e)
        return e

def splitID(s):
    capitalCount = 0
    splitPos = -1

    for i, char in enumerate(s):
        if char.isupper():
            capitalCount += 1
            if capitalCount == 2:
                splitPos = i
                break

    if splitPos != -1:
        return [s[:splitPos], s[splitPos:]]
    else:
        return [s]

def lambda_handler(event, context):
    try:
        # Lambda function was triggered by S3 bucket
        if 'Records' in event:
            # Report was generated locally
            if (event['Records'][0]['s3']['object']['key'].split("/")[0] == "Reports"):
                getHours(REPORT_PREFIX)
            # Report was generated by step function
            elif (event['Records'][0]['s3']['object']['key'].split("/")[0] == "Auto"):
                print("Something went wrong with the auto report trigger")
                raise Exception("Something went wrong with the auto report trigger")
                return
            # Updating Unanet/Microsoft name discrepency dictionary
            elif (event['Records'][0]['s3']['object']['key'].split("/")[0] == "Names"):
                setCorrectNames()
            # Initial target settings
            else:
                getTargets()
            return {
                'statusCode': 200,
                'body': 'File read successfully!'
            }
        elif 'tt-auto' in event:
            if event['username'] == USERNAME and event['password'] == PASSWORD:
                getHours(AUTO_PREFIX)
                return {
                    'statusCode': 200,
                    'body': 'File read successfully!'
                }
            else:
                return {
                    'statusCode': 500,
                    'body': 'Invalid credentials'
                }
        elif 'login' in event:
            if event['username'] == USERNAME and event['password'] == PASSWORD:
                return get_secret()
            else:
                return {
                    'statusCode': 500,
                    'body': 'Invalid credentials'
                }
        elif 'getDynamoYTD' in event:
            if event['username'] == USERNAME and event['password'] == PASSWORD:
                return getDynamoYTD(event['getDynamoYTD'])
            else:
                return {
                    'statusCode': 500,
                    'body': 'Invalid credentials'
                }
        elif 'deleteS3' in event:
            if event['deleteS3'] == "AUTO":
                return deleteS3(AUTO_PREFIX)
            elif event['username'] == USERNAME and event['password'] == PASSWORD:
                return deleteS3(REPORT_PREFIX)
            else:
                return {
                    'statusCode': 500,
                    'body': 'Invalid credentials'
                }
        else:
            print("ERROR: Unknown event")
            return {
                'statusCode': 500,
                'body': 'Unknown event'
            }
    except Exception as e:
        print("Something went wrong: " + str(e))
        return {
            'statusCode': 500,
            'body': 'Error running lambda function'
        }

