import os
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options as ChromeOptions
from tempfile import mkdtemp

from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

from datetime import date, datetime, timedelta
import json
import boto3
import pandas as pd

LOCAL_USERNAME = ""
LOCAL_PASSWORD = ""

# This is how long in seconds we will wait for any action to take place
WAIT = 5
# This is just for the Lambda function parsing
LAMBDA_VALUE = "LambdaUseOnly"
# Name of the target-tracking Lambda function
LAMBDA_FUNCTION = "target-tracking"
# This is where the report file gets downloaded to
DOWNLOAD_DIR = "/tmp/Downloads"
# This is the name of the downloaded report
FILE_NAME = "report.csv"
# This is where YTD report files get downloaded
YTD_DIR = "/tmp/YTD"
# The s3 bucket name
TT_BUCKET = "target-tracking-selenium"

AWS_ACCESS_KEY_ID = ""
AWS_SECRET_ACCESS_KEY = ""

global TT_username
global TT_password

lambda_client = boto3.client(
    "lambda",
    aws_access_key_id = AWS_ACCESS_KEY_ID,
    aws_secret_access_key = AWS_SECRET_ACCESS_KEY,
    region_name="us-east-1"
)
s3_client = boto3.client(
    "s3",
    aws_access_key_id = AWS_ACCESS_KEY_ID,
    aws_secret_access_key = AWS_SECRET_ACCESS_KEY
)

def generateReport(start_date, end_date, folder):
    currDir = os.getcwd()
    downloadPath = os.path.join(currDir, folder)

    chrome_options = ChromeOptions()
    chrome_options.add_argument("--headless=new")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--disable-dev-tools")
    chrome_options.add_argument("--no-zygote")
    chrome_options.add_argument("--single-process")
    chrome_options.add_argument(f"--user-data-dir={mkdtemp()}")
    chrome_options.add_argument(f"--data-path={mkdtemp()}")
    chrome_options.add_argument(f"--disk-cache-dir={mkdtemp()}")
    chrome_options.add_argument("--remote-debugging-pipe")
    chrome_options.add_argument("--verbose")
    chrome_options.add_argument("--log-path=/tmp")
    chrome_options.binary_location = "/opt/chrome/chrome-linux64/chrome"

    chrome_options.add_experimental_option(
        "prefs", {"download.default_directory": downloadPath,
                "download.prompt_for_download": False,
                "credentials_enable_service": False,
                "profile.password_manager_enabled": False,
        }
    )

    service = Service(
        executable_path="/opt/chrome-driver/chromedriver-linux64/chromedriver",
        service_log_path="/tmp/chromedriver.log"
    )

    driver = webdriver.Chrome(
        service=service,
        options=chrome_options
    )
    
    driver.get("https://attainit-byteratio.unanet.biz/attainit-byteratio/action/home")

    global TT_username
    global TT_password

    username_XPATH = '//*[@id="username"]'
    # Locate the login field
    try:
        WebDriverWait(driver, WAIT).until(
            EC.visibility_of_any_elements_located((By.XPATH, username_XPATH))
        )[0]
        # Enter the login
        driver.find_element(By.XPATH, username_XPATH).send_keys(str(TT_username))
    except Exception as e:
        return e

    password_XPATH = '//*[@id="password"]'
    try:
        # Locate the login field
        WebDriverWait(driver, WAIT).until(
            EC.visibility_of_any_elements_located((By.XPATH, password_XPATH))
        )[0]
        # Enter the login
        driver.find_element(By.XPATH, password_XPATH).send_keys(str(TT_password))
    except Exception as e:
        return e

    loginBtn_XPATH = '//*[@id="button_ok"]'
    try:
        # Clicking login
        WebDriverWait(driver, WAIT).until(
            EC.visibility_of_any_elements_located((By.XPATH, loginBtn_XPATH))
        )[0].click()
    except Exception as e:
        return e

    report_XPATH = '//*[@id="my_reports"]/ul/li/a'
    try:
        # Clicking the saved report
        WebDriverWait(driver, WAIT).until(
            EC.visibility_of_any_elements_located((By.XPATH, report_XPATH))
        )[0].click()
    except Exception as e:
        return e

    criteria_XPATH = '//*[@id="nav-links-top"]/a[1]'
    try:
        # Clicking the criteria
        WebDriverWait(driver, WAIT).until(
            EC.visibility_of_any_elements_located((By.XPATH, criteria_XPATH))
        )[0].click()
    except Exception as e:
        return e
    
    startDate_XPATH = '//*[@id="range"]/input[1]'
    try:
        WebDriverWait(driver, WAIT).until(
            EC.visibility_of_any_elements_located((By.XPATH, startDate_XPATH))
        )[0]
        driver.find_element(By.XPATH, startDate_XPATH).clear()
        driver.find_element(By.XPATH, startDate_XPATH).send_keys(start_date) 
    except Exception as e:
        return e

    endDate_XPATH = '//*[@id="range"]/input[2]'
    try:
        WebDriverWait(driver, WAIT).until(
            EC.visibility_of_any_elements_located((By.XPATH, endDate_XPATH))
        )[0]
        driver.find_element(By.XPATH, endDate_XPATH).clear()
        driver.find_element(By.XPATH, endDate_XPATH).send_keys(end_date) 
    except Exception as e:
        return e

    RT_XPATH = '//*[@id="body"]/div/form[2]/table/tbody/tr[9]/td[2]/select/option[12]'
    try:
        WebDriverWait(driver, WAIT).until(
            EC.visibility_of_any_elements_located((By.XPATH, RT_XPATH))
        )[0].click()
    except Exception as e:
        return e

    # Use the upper button because Selenium can't track the bottom one
    download_XPATH = '//*[@id="body"]/div/form[2]/table/tbody/tr[1]/td/a[2]'
    try:
        WebDriverWait(driver, WAIT).until(
            EC.visibility_of_any_elements_located((By.XPATH, download_XPATH))
        )[0].click()
    except Exception as e:
        return e

    # Need to make sure the file actually got saved locally
    start_time = time.time()
    while not os.path.exists(folder + "/" + FILE_NAME):
        if time.time() - start_time > WAIT * 2:
            driver.quit()
            return Exception(f"File not found within {WAIT * 2} seconds: {folder}/{FILE_NAME}")
        time.sleep(0.2)
    
    # Despite saving locally, Selenium has a delay in processing the download
    # This sleep prevents a "cancel download" prompt caused by that
    time.sleep(0.5)
    driver.quit()
    return "Success"

# This function invokes the target-tracking lambda function with the given payload
def invoke_lambda_function(payload):

    try:
        response = lambda_client.invoke(
            FunctionName=LAMBDA_FUNCTION,
            InvocationType='RequestResponse',
            Payload=json.dumps(payload)
        )
        response_payload = json.loads(response['Payload'].read().decode("utf-8"))
        return response_payload
    except Exception as e:
        return {'statusCode': 500, 'body': 'Error invoking target-tracking lambda: ' + str(e)}
    
# This function replaces the current s3 csv file with the newly generated one
def uploadTimecardFile(end_date):
    try:
        payload = {
            "deleteS3": "AUTO",
            "username": LOCAL_USERNAME,
            "password": LOCAL_PASSWORD
        }
        result = invoke_lambda_function(payload)
        if result['statusCode'] == 500:
            return "An error occurred in the target-tracking lambda function"
        
        # Add new report
        end_date = (datetime.strptime(end_date, "%m/%d/%Y")).strftime("%Y-%m-%d")
        s3_file_path = "Auto/" + str(end_date) + ".csv"

        s3_client.upload_file(DOWNLOAD_DIR + "/" + FILE_NAME, TT_BUCKET, str(s3_file_path))

        # Since this script runs in the state machine, we need to trigger the second lambda function manually to catch errors
        payload = {
            "tt-auto": LAMBDA_VALUE,
            "username": LOCAL_USERNAME,
            "password": LOCAL_PASSWORD
        }
        result = invoke_lambda_function(payload)
        if result['statusCode'] == 500:
            return "An error occurred in the target-tracking lambda function"
    except Exception as e:
        return e
    
    return "Success"

# This function corrects discrepencies in Dynamo and Unanet's YTD reports starting from the current pay period and working backwards
# It will preemptively end once the correction has been made
def fixDynamoYTD(report_date):
    # Check if we need to replace the file
    removeFiles(YTD_DIR)

    reportYear = datetime.strptime(report_date, "%m/%d/%Y").year

    start_date = date(reportYear, 1, 1)
    end_date = datetime.now().date() - timedelta(days=1) # subtract one day for Friday testing

    # Generating YTD for the previous year
    if end_date.year != reportYear:
        end_date = date(reportYear, 12, 31)
    # Get the Friday for the last pay period
    else:
        while end_date.weekday() != 4:
            end_date -= timedelta(days=1)
    
    err = generateReport(start_date.strftime("%m/%d/%Y"), end_date.strftime("%m/%d/%Y"), YTD_DIR)
    if err != 'Success':
        return err

    dynamoTotals = getDynamoYTD(reportYear)

    if dynamoTotals == "ERROR":
        return "Error getting DynamoDB YTD totals"
    
    reportTotals = getReportYTD()

    # Totals already match. No need to generate reports
    err = compareYTDTotals(dynamoTotals, reportTotals)
    if err == 0:
        return "YTD records already match!"

    firstDay = date(reportYear, 1, 1)
    
    start_date = end_date
    while start_date.weekday() != 5:
        start_date -= timedelta(days=1)

    removeFiles(DOWNLOAD_DIR)

    # Generate the first report of the year which could end on any day of the week

    err = generateReport(start_date.strftime("%m/%d/%Y"), end_date.strftime("%m/%d/%Y"), DOWNLOAD_DIR)
    if err != 'Success':
        return err

    err = uploadTimecardFile(end_date.strftime("%m/%d/%Y"))
    if err != 'Success':
        return err
    
    # This is a check for when the end date is not a Friday (when we generate on 12/31) so we don't generate the same report twice
    if end_date.weekday() != 4:
        while end_date.weekday() != 4:
            end_date -= timedelta(days=1)
    else:
        end_date = end_date - timedelta(days=7)
    start_date = end_date - timedelta(days=6)

    iterations = 0

    # Go backwards from the current time period until the first day of the year
    while start_date > firstDay:
        iterations += 1

        removeFiles(DOWNLOAD_DIR)

        err = generateReport(start_date.strftime("%m/%d/%Y"), end_date.strftime("%m/%d/%Y"), DOWNLOAD_DIR)
        if err != 'Success':
            return err

        err = uploadTimecardFile(end_date.strftime("%m/%d/%Y"))
        if err != 'Success':
            return err

        start_date -= timedelta(days=7)
        end_date -= timedelta(days=7)

        # Every two weeks, check if YTD has been corrected. If it has, no need to generate more reports
        if iterations%2 == 0:
            dynamoTotals = getDynamoYTD(reportYear)

            if dynamoTotals == "ERROR":
                return "Error getting DynamoDB YTD totals"

            reportTotals = getReportYTD()
            
            mismatches = compareYTDTotals(dynamoTotals, reportTotals)
            if mismatches == 0:
                return "Success"
            
    # Still need to generate the report running from Jan 1 to the first Friday
    nextFriday = firstDay
    while nextFriday.weekday() != 4:
        nextFriday += timedelta(days=1)
    
    start_date = firstDay
    end_date = nextFriday

    removeFiles(DOWNLOAD_DIR)
    # Generate the last report here since it may not match Saturday to Friday period
    err = generateReport(start_date.strftime("%m/%d/%Y"), end_date.strftime("%m/%d/%Y"), DOWNLOAD_DIR)
    if err != 'Success':
        return err

    err = uploadTimecardFile(end_date.strftime("%m/%d/%Y"))
    if err != 'Success':
        return err

    return "Success"

# This function removes everything from a directory
def removeFiles(directory):
    for file in os.listdir(directory + "/"):
        os.remove(directory + "/" + file)

# This function totals employee direct and indirect hours from data in DynamoDB
def getDynamoYTD(year):

    payload = {
        "getDynamoYTD": year,
        "username": LOCAL_USERNAME,
        "password": LOCAL_PASSWORD
    }
    result = invoke_lambda_function(payload)
    if 'statusCode' in result:
        return "ERROR"
    return result

# This function totals employee direct and indirect hours from data in Unanet
def getReportYTD():
    reportFile = YTD_DIR + "/" + FILE_NAME

    currYear = str(datetime.now().year)

    # Make sure report has been uploaded
    start_time = time.time()
    while not os.path.exists(YTD_DIR + "/" + FILE_NAME):
        if time.time() - start_time > WAIT * 2:
            return TimeoutError(f"File not found within {WAIT * 2} seconds: {YTD_DIR}/{FILE_NAME}")
        time.sleep(0.2)
        
    # Creating a dataframe from the report
    reportCSV = pd.read_csv(reportFile)
    reportDF = pd.DataFrame(reportCSV)

    totalHoursDict = {}

    # Totaling everyone's direct and indirect hours from the report
    for row in reportDF.index:
        employeeName = reportDF.loc[row,'Person']
        firstname = employeeName.replace(",", "").split(" ")[1]
        lastname = employeeName.replace(",", "").split(" ")[0]
        employeeID = str(firstname) + str(lastname) + str(currYear)

        if employeeID not in totalHoursDict.keys():
            totalHoursDict[employeeID] = {'Indirect':0.0, 'Direct':0.0}

        if 'OH_BR' in reportDF.loc[row, 'Project'] or 'BEREAVEMENT' in reportDF.loc[row, 'Project'] or 'PARENTAL' in reportDF.loc[row, 'Project']:
            totalHoursDict[employeeID]['Indirect'] += float(reportDF.loc[row, 'Hours'])
        elif 'FLEX_TIME' in reportDF.loc[row, 'Project']:
            continue
        else:
            totalHoursDict[employeeID]['Direct'] += float(reportDF.loc[row, 'Hours'])
        
    return totalHoursDict

# This function compares the DynamoDB and Unanet data for mismatches
def compareYTDTotals(dynamoTotals, reportTotals):
    mismatches = 0
    for employee in reportTotals:
        # Comparing each employee and writing to an output
        try:
            if round(dynamoTotals[employee]['Direct'], 2) == round(reportTotals[employee]['Direct'], 2) and round(dynamoTotals[employee]['Indirect'], 2) == round(reportTotals[employee]['Indirect'], 2):
                pass
            else:
                fullname = splitID(str(employee))
                fullname = fullname[0] + " " + fullname[1][:-4]
                mismatches += 1
        except KeyError:
            mismatches += 1
    return mismatches

# This function splits the DynamoDB ID into a firstname, lastname format
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

def getCreds():
    global TT_username
    global TT_password

    payload = {
    "login": LAMBDA_VALUE,
    "username": LOCAL_USERNAME,
    "password": LOCAL_PASSWORD
    }
    result = invoke_lambda_function(payload)

    # Sometimes the return is already in json format, sometimes it is not
    try:
        if "statusCode" in result:
            raise Exception("Error invoking target-tracking lambda function\n")
        else:
            TT_username = result['username']
            TT_password = result['password']
    except TypeError:
        result = json.loads(result)
        TT_username = result['username']
        TT_password = result['password']

def lambda_handler(event, context):
    getCreds()

    # Get the start and end date for the current pay period
    end_date = datetime.now().date() - timedelta(days=1) # subtract one day for Friday testing
    end_date_2 = None
    start_date_2 = None
    
    while end_date.weekday() != 4:
        end_date -= timedelta(days=1)
    start_date = end_date - timedelta(days=6)

    if start_date.year != end_date.year:
        end_date_2 = date(start_date.year, 12, 31)
        start_date_2 = date(end_date.year, 1, 1)

    start_date = start_date.strftime("%m/%d/%Y")
    end_date = end_date.strftime("%m/%d/%Y")

    os.makedirs("/tmp/Downloads", exist_ok=True)
    os.makedirs("/tmp/YTD", exist_ok=True)

    # Lambda function might have a "warm start" in which data can carry over
    # Remove any files that may exist from a previous iteration
    removeFiles(DOWNLOAD_DIR)

    # We need to generate a report from the previous year and the current year
    if end_date_2 is not None:
        end_date_2 = end_date_2.strftime("%m/%d/%Y")
        start_date_2 = start_date_2.strftime("%m/%d/%Y")
        
        # Previous year
        err = generateReport(start_date, end_date_2, DOWNLOAD_DIR)
        if err != "Success":
            raise Exception("An error occurred: " + str(err))
        
        # Upload the report to the S3 bucket where the target-tracking Lambda function will take over parsing
        err = uploadTimecardFile(end_date_2)
        if err != "Success":
            raise Exception("Unable to upload timecard. Error: " + str(err))
        
        removeFiles(DOWNLOAD_DIR)

        # Current year
        err = generateReport(start_date_2, end_date, DOWNLOAD_DIR)
        if err != "Success":
            raise Exception("An error occurred: " + str(err))
        
        # Upload the report to the S3 bucket where the target-tracking Lambda function will take over parsing
        err = uploadTimecardFile(end_date)
        if err != "Success":
            raise Exception("Unable to upload timecard. Error: " + str(err))
        
        time.sleep(2)
        # Previous year
        err = fixDynamoYTD(end_date_2)
        if not (err == "Success" or err == "YTD records already match!"):
            raise Exception("An error occurred while fixing YTD totals: " + str(err))

        # Current year
        err = fixDynamoYTD(end_date)
        if not (err == "Success" or err == "YTD records already match!"):
            raise Exception("An error occurred while fixing YTD totals: " + str(err))
    # Only generate information for the current year
    else:
        err = generateReport(start_date, end_date, DOWNLOAD_DIR)
        if err != "Success":
            raise Exception("An error occurred: " + str(err))
        
        # Upload the report to the S3 bucket where the target-tracking Lambda function will take over parsing
        err = uploadTimecardFile(end_date)
        if err != "Success":
            raise Exception("Unable to upload timecard. Error: " + str(err))

        err = fixDynamoYTD(end_date)
        if not (err == "Success" or err == "YTD records already match!"):
            raise Exception("An error occurred while fixing YTD totals: " + str(err))