from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

import os
from dotenv import load_dotenv
import sys
from datetime import datetime, date, timedelta
import time
import pandas as pd
import boto3
import json

from PyQt5 import QtCore
from PyQt5.QtWidgets import QApplication, QWidget, QCalendarWidget, QPushButton, QGridLayout, QLabel, QMessageBox, QLineEdit, QSpacerItem, QSizePolicy, QProgressBar
from PyQt5.QtCore import Qt, QObject, QThread, pyqtSignal
from PyQt5.QtGui import QPalette, QTextCharFormat, QIcon, QFont

DEBUG = True
# Wait at most 5 seconds for any Selenium action to occur
WAIT = 5
# This is where the downloaded reports get saved
REPORT_FOLDER = "Reports"
# This is the file path to the report
FILE_PATH_CURRENT = "Reports/report.csv"
# This is a backup file saved from the last report generation
FILE_PATH_BACKUP = "Reports/report_old.csv"
# This is where error reports get saved
ERROR_FOLDER = "Errors"
# This is the path to the error report
ERROR_PATH = "Errors/errors.txt"
# This is where the downloaded YTD reports get saved
YTD_FOLDER = "YTD"
# This is the path to the YTD report
YTD_PATH = "YTD/report.csv"
# The s3 bucket name
TT_BUCKET = "target-tracking-selenium"

LAMBDA_FUNCTION = "target-tracking"
# This is a filler value. We just need a key to know what function to run in lambda
LAMBDA_VALUE = "LambdaUseOnly"

global TT_username
global TT_password

global local_username
global local_password

load_dotenv()

s3_client = boto3.client(
    "s3",
    aws_access_key_id = os.getenv('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key = os.getenv('AWS_SECRET_ACCESS_KEY')
)

lambda_client = boto3.client(
    "lambda",
    aws_access_key_id = os.getenv('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key = os.getenv('AWS_SECRET_ACCESS_KEY'),
    region_name="us-east-1"
)

# This class runs functions in the background to avoid UI buffering
class BackgroundFunctions(QObject):
    # We signal an error or success message to the main thread once the functions complete
    finished = pyqtSignal(str)
    progress = pyqtSignal(int)

    def __init__(self, data):
        super().__init__()
        self.data = data

    # This function checks the login credentials. The lambda function returns the Unanet creds if correct
    def checkCredentials(self):  
        global TT_username
        global TT_password

        global local_username
        global local_password
        payload = {
            "login": LAMBDA_VALUE,
            "username": self.data[0],
            "password": self.data[1]
        }
        result = invoke_lambda_function(payload)

        # Sometimes the return is already in json format, sometimes it is not
        try:
            if "statusCode" in result:
                self.finished.emit(result['body'])
                return
            else:
                TT_username = result['username']
                TT_password = result['password']
                local_username = self.data[0]
                local_password = self.data[1]
                self.finished.emit("Success")
        except TypeError:
            result = json.loads(result)
            TT_username = result['username']
            TT_password = result['password']
            local_username = self.data[0]
            local_password = self.data[1]
            self.finished.emit("Success")

    # This function generates the Unanet report for the provided week
    def gen_report(self):
        self.progress.emit(10)
        # Parse the data to get the start and end dates for the report period
        dates = self.data.split("#")
        self.start_date = dates[0]
        self.end_date = dates[1]

        replaceTimecardFiles()
        self.progress.emit(30)
        err = generateReport(self.start_date, self.end_date, REPORT_FOLDER)
        self.progress.emit(90)
        if err != 'Success':
            message = "ERROR!"
            writeError(err)
            self.finished.emit(message)
            return

        err = uploadTimecardFile(self.end_date)
        self.progress.emit(100)
        if err != 'Success':
            message = "ERROR!"
            writeError(err)
            self.finished.emit(message)
            return
        
        message = "Success!"

        self.finished.emit(message)
    
    # This function corrects Dynamo for YTD
    def gen_YTD(self):
        end_date = datetime.now().date()
        err = fixDynamoYTD(self, end_date)
        if not (err == 'Success' or err == "YTD records already match!"):
            message = "ERROR!"
            writeError(err)
            self.finished.emit(message)
            return

        self.finished.emit(err)

    # This function compares Dynamo and Unanet YTD reports
    def compare_YTD(self):
        self.progress.emit(10)
        replaceYTDFile()
        # Start on the first day of the year
        start_date = date(datetime.now().year, 1, 1)
        # Finish on the Friday of the current pay period
        lastFriday = datetime.now() - timedelta(days=1) # subtract one day for Friday testing
        while lastFriday.weekday() != 4:
            lastFriday -= timedelta(days=1)
        end_date = lastFriday

        err = generateReport(start_date.strftime("%m/%d/%Y"), end_date.strftime("%m/%d/%Y"), YTD_FOLDER)
        self.progress.emit(60)
        if err != 'Success':
            message = "ERROR!"
            writeError(err)
            self.finished.emit(message)
            return

        dynamoTotals = getDynamoYTD(datetime.now().year)

        if dynamoTotals == "ERROR":
            message = "Error connecting to\nlambda function!"
            writeError(message)
            self.finished.emit(message)
            return
        
        reportTotals = getReportYTD()

        err = compareYTDTotals(dynamoTotals, reportTotals)
        self.progress.emit(100)
        if err > 0:
            message = "ERROR: There were " + str(err) + "\nYTD mismatches"
            writeError(message)
            self.finished.emit(message)
            return
        
        message = "Success!"
        self.finished.emit(message)

# This class allows for multi-day selection using the calendar widget
class CalenderX(QCalendarWidget):
    def __init__(self):
        super().__init__()
        self.from_date = None
        self.to_date = None

        self.highlighter_format = QTextCharFormat()
        # Get the calendar default highlight setting
        self.highlighter_format.setBackground(self.palette().brush(QPalette.Highlight))
        self.highlighter_format.setForeground(self.palette().color(QPalette.HighlightedText))

        # This will pass selected date value as a QDate object
        self.clicked.connect(self.select_range)

        super().dateTextFormat()

    def highlight_range(self, format):
        if self.from_date and self.to_date:
            d1 = min(self.from_date, self.to_date)
            d2 = max(self.from_date, self.to_date)
            while d1 <= d2:
                self.setDateTextFormat(d1, format)
                d1 = d1.addDays(1)

    def select_range(self, date_value):
        self.highlight_range(QTextCharFormat())

        # Check if a keyboard modifer is pressed
        if QApplication.instance().keyboardModifiers() & Qt.ShiftModifier and self.from_date:
            self.to_date = date_value
            self.highlight_range(self.highlighter_format)
        else:
            self.from_date = date_value	
            self.to_date = None

# This class is how we can create the loading bars
class ProgressBar(QObject):
    progress_updated = pyqtSignal(int)
    finished = pyqtSignal()

    def __init__(self):
        super().__init__()
        self.terminateOp = False

    # This just fakes loading time since we can't really get incremental updates from Lambda
    def loginProgress(self):
        for i in range(46):
            if self.terminateOp:
                self.terminateOp = False
                return
            time.sleep(0.05)
            self.progress_updated.emit(i * 2)
        self.finished.emit()

# This is the main PyQt class
# It inlcudes all the multithreading setup logic
class QtGUI(QWidget):
    # This function displays the login UI
    def __init__(self):
        super().__init__()
        self.window_width, self.window_height = 1200, 800
        self.setMinimumSize(self.window_width, self.window_height)
        self.setWindowTitle('Unanet Report Generator')
        self.setWindowIcon(QIcon('Calendar.ico'))	

        self.layout = QGridLayout()
        self.setLayout(self.layout)

        font = QFont("Helvetica", 48)

        label = QLabel("Report Login")
        label.setFont(font)
        self.layout.addWidget(label, 1, 0, 1, 5, QtCore.Qt.AlignCenter)

        labelFont = QFont("Helvetica", 48)
        textFont = QFont("Helvetica", 32)

        label = QLabel("Please enter credentials for Unanet report access")
        label.setFont(textFont)
        self.layout.addWidget(label, 2, 0, 1, 5, QtCore.Qt.AlignCenter)

        self.layout.addItem(QSpacerItem(0, 30, QSizePolicy.Minimum, QSizePolicy.Expanding), 2, 3)

        label = QLabel("Username: ")
        label.setFont(labelFont)
        self.layout.addWidget(label, 3, 0, 1, 2, QtCore.Qt.AlignCenter)

        self.username = QLineEdit(self)
        self.username.setFont(textFont)
        self.username.setMinimumWidth(500)
        self.layout.addWidget(self.username, 3, 2, 1, 3, QtCore.Qt.AlignLeft)

        label = QLabel("Password: ")
        label.setFont(labelFont)
        self.layout.addWidget(label, 4, 0, 1, 2, QtCore.Qt.AlignCenter)

        self.password = QLineEdit(self)
        self.password.setFont(textFont)
        self.password.setMinimumWidth(500)
        self.layout.addWidget(self.password, 4, 2, 1, 3, QtCore.Qt.AlignLeft)

        self.layout.addItem(QSpacerItem(0, 0, QSizePolicy.Minimum, QSizePolicy.Expanding), 4, 5)

        self.submitBtn = QPushButton('Submit', clicked=self.checkCreds)
        self.submitBtn.setFont(textFont)
        self.layout.addWidget(self.submitBtn, 5, 0, 1, 5, QtCore.Qt.AlignCenter)

        self.layout.addItem(QSpacerItem(0, 0, QSizePolicy.Minimum, QSizePolicy.Expanding), 5, 6)
        self.layout.addItem(QSpacerItem(0, 0, QSizePolicy.Minimum, QSizePolicy.Expanding), 0, 1)

        self.progress_bar = QProgressBar(self)
        self.progress_bar.setRange(0, 100)
        self.layout.addWidget(self.progress_bar, 6, 0, 1, 5)

        self.progress_thread = ProgressBar()
        self.progress_thread.progress_updated.connect(self.update_progress)

        self.progress_bar.hide()
        self.init_progress_thread()

    # This function displays the main UI after login
    def displayMain(self):
        label = QLabel("Select a date range")
        font = QFont("Helvetica", 32)
        label.setFont(font)
        self.layout.addWidget(label, 0, 0, 1, 3, QtCore.Qt.AlignCenter)
    
        self.reportBtn = QPushButton('Run Report', clicked=self.runReport)
        self.reportBtn.setFont(font)
        self.layout.addWidget(self.reportBtn, 2, 0, QtCore.Qt.AlignCenter)

        self.compareYTDBtn = QPushButton('Compare YTD', clicked=self.compareYTD)
        self.compareYTDBtn.setFont(font)
        self.layout.addWidget(self.compareYTDBtn, 2, 1, QtCore.Qt.AlignCenter)

        self.fixYTDBtn = QPushButton('Fix YTD', clicked=self.fixYTD)
        self.fixYTDBtn.setFont(font)
        self.layout.addWidget(self.fixYTDBtn, 2, 2, QtCore.Qt.AlignCenter)

        self.calendar = CalenderX()
        self.calendar.setGridVisible(True)
        self.calendar.setFixedSize(1000, 600)
        self.calendar.setFont(font)
        self.layout.addWidget(self.calendar, 1, 0, 1, 3, QtCore.Qt.AlignCenter)

        self.progress_bar = QProgressBar(self)
        self.progress_bar.setRange(0, 100)
        self.layout.addWidget(self.progress_bar, 3, 0, 1, 3)

        self.progress_thread = ProgressBar()
        self.progress_thread.progress_updated.connect(self.update_progress)

        self.init_progress_thread()
        self.progress_bar.setValue(0)
        self.progress_bar.hide()
    
    # This function initializes the progress bar
    def init_progress_thread(self):
        self.prog_thread = QThread()
        self.progress_worker = ProgressBar()
        self.progress_worker.moveToThread(self.prog_thread)

        self.prog_thread.started.connect(self.progress_worker.loginProgress)
        self.progress_worker.progress_updated.connect(self.update_progress)
        self.progress_worker.finished.connect(self.prog_thread.quit)

    # This function starts the progress bar thread
    def start_progress(self):
        # If there was an error the first time, we need to "restart" the progress bar thread
        if self.prog_thread.isRunning():
            self.progress_worker.terminateOp = True
            self.prog_thread.quit()
            self.prog_thread.wait()
            # Reinitialize everything
            self.init_progress_thread()
        self.progress_bar.show()
        self.prog_thread.start()

    # This function updates the value of the progress bar
    def update_progress(self, value):
        if not self.progress_bar:
            return
        try:
            self.progress_bar.setValue(value)
        except RuntimeError:
            pass

    # This sets up multithreading for comparing the Dynamo and Unanet YTD reports
    def compareYTD(self):
        # Disable the buttons to avoid accidental report generations
        self.reportBtn.setEnabled(False)
        self.reportBtn.update()
        self.fixYTDBtn.setEnabled(False)
        self.fixYTDBtn.update()
        self.compareYTDBtn.setEnabled(False)
        self.compareYTDBtn.update()

        # We use multi-threading to prevent frontend UI buffering
        self.background_thread = QThread()
        self.background = BackgroundFunctions(None)
        self.background.moveToThread(self.background_thread)
        self.background_thread.started.connect(self.background.compare_YTD)
        self.background.finished.connect(self.task_finished)
        self.background.progress.connect(self.update_progress)
        self.progress_bar.show()
        self.background_thread.start()

    # This sets up multithreading for login credential checking
    def checkCreds(self):
        self.submitBtn.setEnabled(False)

        self.start_progress()

        # We use multi-threading to prevent frontend UI buffering
        self.background_thread = QThread()
        data = [str(self.username.text()), str(self.password.text())]
        self.background = BackgroundFunctions(data)
        self.background.moveToThread(self.background_thread)
        self.background_thread.started.connect(self.background.checkCredentials)
        self.background.finished.connect(self.login_finished)
        self.background_thread.start()

    # This sets up multithreading for YTD Dynamo corrections
    def fixYTD(self):
        # Disable the buttons to avoid accidental report generations
        self.reportBtn.setEnabled(False)
        self.reportBtn.update()
        self.fixYTDBtn.setEnabled(False)
        self.fixYTDBtn.update()
        self.compareYTDBtn.setEnabled(False)
        self.compareYTDBtn.update()

        # We use multi-threading to prevent frontend UI buffering
        self.background_thread = QThread()
        self.background = BackgroundFunctions(None)
        self.background.moveToThread(self.background_thread)
        self.background_thread.started.connect(self.background.gen_YTD)
        self.background.finished.connect(self.task_finished)
        self.background.progress.connect(self.update_progress)
        self.progress_bar.show()
        self.background_thread.start()
    
    # This function sets up multithreading to run a Unanet report for a specified week
    def runReport(self):
        # Disable the buttons to avoid accidental report generations
        self.reportBtn.setEnabled(False)
        self.reportBtn.update()
        self.fixYTDBtn.setEnabled(False)
        self.fixYTDBtn.update()
        self.compareYTDBtn.setEnabled(False)
        self.compareYTDBtn.update()

        self.progress_bar.show()
        self.progress_bar.setValue(30)

        if self.calendar.from_date and self.calendar.to_date:
            start_date = min(self.calendar.from_date.toPyDate(), self.calendar.to_date.toPyDate())
            end_date = max(self.calendar.from_date.toPyDate(), self.calendar.to_date.toPyDate())

            # We use multi-threading to prevent frontend UI buffering
            self.background_thread = QThread()
            # The date format is changed to fit Unanet's standard
            self.background = BackgroundFunctions(start_date.strftime("%m/%d/%Y") + "#" + end_date.strftime("%m/%d/%Y"))
            self.background.moveToThread(self.background_thread)
            self.background_thread.started.connect(self.background.gen_report)
            self.background.finished.connect(self.task_finished)
            self.background.progress.connect(self.update_progress)
            self.background_thread.start()
        # User only selected one date
        else:
            self.progress_bar.setValue(0)
            self.progress_bar.update()
            msg = QMessageBox()
            msg.setWindowTitle("Target Tracker Notifications")
            msg.setText("Error: You must select a date range!")
            msg.setIcon(QMessageBox.Warning)
            msg.setStandardButtons(QMessageBox.Ok)
            msg.exec_()
            self.reportBtn.setEnabled(True)
            self.reportBtn.update()
            self.fixYTDBtn.setEnabled(True)
            self.fixYTDBtn.update()
            self.compareYTDBtn.setEnabled(True)
            self.compareYTDBtn.update()
        
    # This function runs when the file renaming and report generation functions complete
    def task_finished(self, message):
        self.background_thread.quit()
        self.background_thread.wait()

        self.progress_worker.terminateOp = True
        self.progress_bar.setValue(0)
        self.progress_bar.update()
        self.progress_bar.hide()
        self.prog_thread.quit()
        self.prog_thread.wait()
    
        msg = QMessageBox()
        msg.setWindowTitle("Target Tracker Notifications")
        if message == "Success!":
            msg.setText("Success!")
            msg.setIcon(QMessageBox.Information)
        else:
            msg.setText(message)
            msg.setIcon(QMessageBox.Warning)
        msg.setStandardButtons(QMessageBox.Ok)
        msg.exec_()

        self.reportBtn.setEnabled(True)
        self.reportBtn.update()
        self.fixYTDBtn.setEnabled(True)
        self.fixYTDBtn.update()
        self.compareYTDBtn.setEnabled(True)
        self.compareYTDBtn.update()
    
    # This function changes the UI on successful login or notifies the user on failed login
    def login_finished(self, message):
        self.background_thread.quit()
        self.background_thread.wait()

        self.progress_worker.terminateOp = True
        try:
            self.progress_worker.progress_updated.disconnect()
        except Exception:
            pass
        self.progress_bar.setValue(0)
        self.progress_bar.update()
        self.prog_thread.quit()
        self.prog_thread.wait()

        if message == "Success":
            self.clearQTLayout()
            self.displayMain()
        else:
            self.progress_thread.terminateOp = True
            msg = QMessageBox()
            msg.setWindowTitle("Target Tracker Notifications")
            msg.setText(message)
            msg.setIcon(QMessageBox.Warning)
            msg.setStandardButtons(QMessageBox.Ok)
            msg.exec_()
            self.submitBtn.setEnabled(True)

    # This function clears the current PyQT5 window
    def clearQTLayout(self):
        if self.layout is not None:
            while self.layout.count():
                item = self.layout.takeAt(0)
                widget = item.widget()
                if widget is not None:
                    widget.deleteLater()  # Schedule widget for deletion
                else:
                    # If the item contains another layout, recursively clear it
                    self.clearQTLayout()

# This function uses Selenium to automate the report generation on Unanet
def generateReport(start_date, end_date, folder):
    currDir = os.getcwd()
    downloadPath = os.path.join(currDir, folder)

    chrome_options = webdriver.ChromeOptions()
    # chrome_options.add_argument("start-maximized")
    chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
    chrome_options.add_experimental_option("useAutomationExtension", False)
    chrome_options.add_argument("--disable-extensions")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_experimental_option(
        "prefs", {"download.default_directory": downloadPath,
                "download.prompt_for_download": False,
                "credentials_enable_service": False,
                "profile.password_manager_enabled": False,
        }
    )
    # DISABLE THE FILE DOWNLOAD ANIMATION
    chrome_options.add_argument("--animation-duration-scale=0")
    # DISABLE GUI
    chrome_options.add_argument("--headless=new")
    # DISABLE NOTIFICATIONS
    chrome_options.add_argument("--disable-notifications")
    if DEBUG:
        # KEEP THE WINDOW OPEN
        chrome_options.add_experimental_option("detach", True)

    driver = webdriver.Chrome(options=chrome_options)
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

    # Make sure report has been uploaded
    start_time = time.time()
    while not os.path.exists(folder + "/report.csv"):
        if time.time() - start_time > WAIT:
            return TimeoutError(f"File not found within {WAIT} seconds: {folder}/report.csv")
        time.sleep(0.2)
    
    driver.quit()
    return "Success"

# This function maintains a copy of the past report and creates space for the new one locally
def replaceTimecardFiles():
    for file in os.listdir(REPORT_FOLDER + "/"):
        # Set old report to backup
        if file == "report.csv":
             os.rename(FILE_PATH_CURRENT, FILE_PATH_BACKUP)
        else:
            os.remove(REPORT_FOLDER + "/" + file)

# This function replaces the current s3 csv file with the newly generated one
def uploadTimecardFile(end_date):
    try:
        global local_username
        global local_password

        payload = {
            "deleteS3": LAMBDA_VALUE,
            "username": local_username,
            "password": local_password
        }
        result = invoke_lambda_function(payload)
        if result['statusCode'] == 500:
            return "An error occurred in\nthe lambda function"

        # Make sure report has been uploaded
        start_time = time.time()
        while not os.path.exists(FILE_PATH_CURRENT):
            if time.time() - start_time > WAIT:
                return TimeoutError(f"File not found within {WAIT} seconds: {FILE_PATH_CURRENT}")
            time.sleep(0.2)
        
        # Add new report
        end_date = (datetime.strptime(end_date, "%m/%d/%Y")).strftime("%Y-%m-%d")
        s3_file_path = REPORT_FOLDER.split("/")[0] + str("/") + str(end_date) + ".csv"

        s3_client.upload_file(FILE_PATH_CURRENT, TT_BUCKET, str(s3_file_path))
    except Exception as e:
        return e
    
    return "Success"

# This function removes the old YTD report
def replaceYTDFile():
    for file in os.listdir(YTD_FOLDER + "/"):
        os.remove(YTD_FOLDER + "/" + file)

# This function totals employee direct and indirect hours from data in DynamoDB
def getDynamoYTD(year):
    global local_username
    global local_password

    payload = {
        "getDynamoYTD": year,
        "username": local_username,
        "password": local_password
    }
    result = invoke_lambda_function(payload)
    if 'statusCode' in result:
        return "ERROR"
    return result

# This function totals employee direct and indirect hours from data in Unanet
def getReportYTD():
    reportFile = YTD_PATH

    currYear = str(datetime.now().year)

    # Make sure report has been uploaded
    start_time = time.time()
    while not os.path.exists(YTD_PATH):
        if time.time() - start_time > WAIT:
            return TimeoutError(f"File not found within {WAIT} seconds: {YTD_PATH}")
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
    outputFile = open('Discrepancies/discrepancies.txt', 'w')
    mismatches = 0
    for employee in reportTotals:
        # Comparing each employee and writing to an output
        try:
            if round(dynamoTotals[employee]['Direct'], 2) == round(reportTotals[employee]['Direct'], 2) and round(dynamoTotals[employee]['Indirect'], 2) == round(reportTotals[employee]['Indirect'], 2):
                pass
            else:
                fullname = splitID(str(employee))
                fullname = fullname[0] + " " + fullname[1][:-4]
                outputFile.write('------------HOURS DO NOT MATCH FOR: ' + str(fullname) + '------------\n')
                outputFile.write('Direct hours from Dynamo   : ' + str(round(dynamoTotals[employee]['Direct'], 2)) + '\n')
                outputFile.write('Indirect hours from Dynamo : ' + str(round(dynamoTotals[employee]['Indirect'], 2)) + '\n')
                outputFile.write('------------------------------------------\n')
                outputFile.write('Direct hours from report    : ' + str(round(reportTotals[employee]['Direct'], 2)) + '\n')
                outputFile.write('Indirect hours from report  : ' + str(round(reportTotals[employee]['Indirect'], 2)) + '\n')
                outputFile.write('------------------------------------------\n\n\n')
                mismatches += 1
        except KeyError:
            outputFile.write('CANT FIND ' + employee + ' IN REPORT\n\n\n')
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

# This function corrects discrepencies in Dynamo and Unanet's YTD reports starting from the previous pay period and working backwards
# It will preemptively end once the correction has been made
def fixDynamoYTD(self, report_date):
    # Check if we need to replace the file
    replaceYTDFile()

    start_date = date(report_date.year, 1, 1)
    end_date = datetime.now().date() - timedelta(days=1) # subtract one day for Friday testing


    # Generating YTD for the previous year
    if end_date.year != report_date.year:
        end_date = date(report_date.year, 12, 31)
    # Get the Friday for the last pay period
    else:
        while end_date.weekday() != 4:
            end_date -= timedelta(days=1)
    
    err = generateReport(start_date.strftime("%m/%d/%Y"), end_date.strftime("%m/%d/%Y"), YTD_FOLDER)
    self.progress.emit(2)
    if err != 'Success':
        return err

    dynamoTotals = getDynamoYTD(report_date.year)

    if dynamoTotals == "ERROR":
        return "Error getting DynamoDB YTD totals"
    
    reportTotals = getReportYTD()

    # Totals already match. No need to generate reports
    err = compareYTDTotals(dynamoTotals, reportTotals)
    self.progress.emit(5)
    if err == 0:
        self.progress.emit(95)
        return "YTD records already match!"

    firstDay = date(report_date.year, 1, 1)
    
    start_date = end_date
    while start_date.weekday() != 5:
        start_date -= timedelta(days=1)

    replaceTimecardFiles()

    # Generate the first report of the year which could end on any day of the week

    err = generateReport(start_date.strftime("%m/%d/%Y"), end_date.strftime("%m/%d/%Y"), REPORT_FOLDER)
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

    currentWeek = datetime.now().isocalendar()[1]
    progressInc = (int)((1 / currentWeek) * 90)

    iterations = 0

    # Go backwards from the current time period until the first day of the year
    while start_date > firstDay:
        iterations += 1

        replaceTimecardFiles()

        err = generateReport(start_date.strftime("%m/%d/%Y"), end_date.strftime("%m/%d/%Y"), REPORT_FOLDER)
        self.progress.emit(5 + iterations * progressInc)
        if err != 'Success':
            return err

        err = uploadTimecardFile(end_date.strftime("%m/%d/%Y"))
        if err != 'Success':
            return err

        start_date -= timedelta(days=7)
        end_date -= timedelta(days=7)

        # Every two weeks, check if YTD has been corrected. If it has, no need to generate more reports
        if iterations%2 == 0:
            dynamoTotals = getDynamoYTD(report_date.year)

            if dynamoTotals == "ERROR":
                return "Error getting DynamoDB YTD totals"

            reportTotals = getReportYTD()
            
            mismatches = compareYTDTotals(dynamoTotals, reportTotals)
            if mismatches == 0:
                self.progress.emit(100)
                return "Success"
            
    # Still need to generate the report running from Jan 1 to the first Friday
    nextFriday = firstDay
    while nextFriday.weekday() != 4:
        nextFriday += timedelta(days=1)
    
    start_date = firstDay
    end_date = nextFriday

    replaceTimecardFiles()
    # Generate the last report here since it may not match Saturday to Friday period
    err = generateReport(start_date.strftime("%m/%d/%Y"), end_date.strftime("%m/%d/%Y"), REPORT_FOLDER)
    if err != 'Success':
        return err

    err = uploadTimecardFile(end_date.strftime("%m/%d/%Y"))
    if err != 'Success':
        return err
    
    self.progress.emit(100)

    return "Success"

# This function writes error messages to the error file
def writeError(message): 
    error_file = open(ERROR_PATH, 'w')
    error_file.write(datetime.now().strftime("On %Y-%m-%d at %H:%M:%S") + " the following error(s) occurred:\n\n" + str(message))
    error_file.close()

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
        print(f"Error invoking Lambda: {e}")
        return {'statusCode': 500, 'body': 'Error invoking lambda'}

def main():
    app = QApplication(sys.argv)
    gui = QtGUI()
    gui.show()
    try:
        sys.exit(app.exec_())
    except SystemExit:
        print('Closing Window...')

if __name__ == "__main__":
    main()
