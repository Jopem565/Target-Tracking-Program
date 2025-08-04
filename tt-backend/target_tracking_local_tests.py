import unittest
import sys
from datetime import datetime, date
from unittest.mock import patch
import json
import os
import csv
import time

# Import the local target tracking script
local_script_path = sys.path.append(os.path.abspath('./LocalScript'))
if local_script_path not in sys.path:
    sys.path.insert(0, local_script_path)
import target_tracking_local as ttlambda

USERNAME = ""
PASSWORD = ""

LAMBDA_VALUE = "LambdaUseOnly"
REPORT_FOLDER = "LocalScript/Reports"
FILE_PATH_CURRENT = "LocalScript/Reports/report.csv"
FILE_PATH_BACKUP = "LocalScript/Reports/report_old.csv"
YTD_FOLDER = "LocalScript/YTD"
YTD_PATH = "LocalScript/YTD/report.csv"
WAIT = 5
DISCR_FOLDER = "LocalScript/Discrepencies"
DISCR_PATH = "LocalScript/Discrepencies/discrepencies.txt"

class TestSuite(unittest.TestCase):

    def __createFakeFile(self, file_path):
        fakeData = [
            ["Person Organization", "Person", "Project", "TransactionCurrency", "Hours", "TimeTC"],
            ["ByteRatio", "Flannery, Lindsay", "BYTERATIO_APPEARS G&A_BR -- G&A_BR", "USD", "450.25", "10999.98"],
            ["ByteRatio", "Flannery, Lindsay", "BYTERATIO_APPEARS OH_BR -- OH_BR", "USD", "35.20", "100.98"],
            ["ByteRatio", "Hollar, Mike", "BYTERATIO_APPEARS OH_BR -- OH_BR", "USD", "140.85", "20938.14"]
        ]
        with open(file_path, 'w', newline='') as csvfile:
            csv_writer = csv.writer(csvfile)
            csv_writer.writerows(fakeData)
        # Make sure file appears in directory
        start_time = time.time()
        while not os.path.exists(file_path):
            if time.time() - start_time > WAIT:
                return TimeoutError(f"File not found within {WAIT} seconds: {file_path}")
            time.sleep(0.2)

    @classmethod
    def setUpClass(cls):
        # Change global paths
        ttlambda.REPORT_FOLDER = REPORT_FOLDER
        ttlambda.FILE_PATH_CURRENT = FILE_PATH_CURRENT
        ttlambda.FILE_PATH_BACKUP = FILE_PATH_BACKUP
        ttlambda.YTD_FOLDER = YTD_FOLDER

        # Grants test suite access to Unanet and local username / password
        ttlambda.local_username = USERNAME
        ttlambda.local_password = PASSWORD
        payload = {
            "login": LAMBDA_VALUE,
            "username": USERNAME,
            "password": PASSWORD
        }
        result = ttlambda.invoke_lambda_function(payload)

        # Sometimes it comes json formatted, sometimes it does not
        try:
            if 'username' not in result:
                raise ValueError("Fetching Unanet credentials failed.")
            ttlambda.TT_username = result['username']
            ttlambda.TT_password = result['password']
        except TypeError:
            result = json.loads(result)
            if 'username' not in result:
                raise ValueError("Fetching Unanet credentials failed.")
            ttlambda.TT_username = result['username']
            ttlambda.TT_password = result['password']

        # Remove any existing files from report folders
        for file in os.listdir("LocalScript/Reports/"):
            os.remove("LocalScript/Reports/" + file)
        for file in os.listdir("LocalScript/YTD/"):
            os.remove("LocalScript/YTD/" + file)

    def test_splitID_ValidID(self):
        empID = "BruceBanner2025"
        response = ttlambda.splitID(empID)
        self.assertEqual(len(response), 2)
        self.assertEqual(response[0], "Bruce")
        self.assertEqual(response[1], "Banner2025")
    
    def test_splitID_InvalidID(self):
        empID = "Brucebanner2025"
        response = ttlambda.splitID(empID)
        self.assertEqual(len(response), 1)
        self.assertEqual(response[0], "Brucebanner2025")
    
    def test_report_gen_success(self):
        # Generate a report from Jan 4 to 10, 2025 since these values should not change
        start_date = date(2025, 1, 4).strftime("%m/%d/%Y")
        end_date = date(2025, 1, 10).strftime("%m/%d/%Y")
        response = ttlambda.generateReport(start_date, end_date, REPORT_FOLDER)
        self.assertEqual(response, "Success")
        for file in os.listdir(REPORT_FOLDER + "/"):
            self.assertEqual(file, "report.csv")
            os.remove(REPORT_FOLDER + "/" + file)
    
    def test_report_gen_fail(self):
        # Generate an INVALID report from Jan 10 to 4, 2025 since these values should not change
        start_date = date(2025, 1, 10).strftime("%m/%d/%Y")
        end_date = date(2025, 1, 4).strftime("%m/%d/%Y")
        response = ttlambda.generateReport(start_date, end_date, REPORT_FOLDER)
        self.assertEqual(response, "File not found within 5 seconds: LocalScript/Reports/report.csv")
    
    def test_replace_timecards_single(self):
        ttlambda.REPORT_FOLDER = REPORT_FOLDER
        ttlambda.FILE_PATH_CURRENT = FILE_PATH_CURRENT
        ttlambda.FILE_PATH_BACKUP = FILE_PATH_BACKUP

        self.__createFakeFile(FILE_PATH_CURRENT)
        ttlambda.replaceTimecardFiles()
        for file in os.listdir(REPORT_FOLDER + "/"):
            self.assertEqual(file, "report_old.csv")
            os.remove(REPORT_FOLDER + "/" + file)

    def test_replace_timecards_two(self):
        ttlambda.REPORT_FOLDER = REPORT_FOLDER
        ttlambda.FILE_PATH_CURRENT = FILE_PATH_CURRENT
        ttlambda.FILE_PATH_BACKUP = FILE_PATH_BACKUP

        self.__createFakeFile(FILE_PATH_CURRENT)
        ttlambda.replaceTimecardFiles()
        for file in os.listdir(REPORT_FOLDER + "/"):
            self.assertEqual(file, "report_old.csv")
        
        self.__createFakeFile(FILE_PATH_CURRENT)
        for file in os.listdir(REPORT_FOLDER + "/"):
            if file != "report.csv":
                self.assertEqual(file, "report_old.csv")
        ttlambda.replaceTimecardFiles()
        for file in os.listdir(REPORT_FOLDER + "/"):
            self.assertEqual(file, "report_old.csv")
            os.remove(REPORT_FOLDER + "/" + file)

    def test_replace_YTD(self):
        self.__createFakeFile(YTD_PATH)
        for file in os.listdir(YTD_FOLDER + "/"):
            self.assertEqual(file, "report.csv")
        ttlambda.YTD_FOLDER = YTD_FOLDER
        ttlambda.replaceYTDFile()
        for file in os.listdir(YTD_FOLDER + "/"):
            self.fail("YTD file should have been removed")

    def test_get_report_YTD_success(self):
        ttlambda.YTD_PATH = YTD_PATH
        self.__createFakeFile(YTD_PATH)
        for file in os.listdir(YTD_FOLDER + "/"):
            self.assertEqual(file, "report.csv")
        
        # Need to force the year to be 2025
        fakeDate = datetime(2025, 1, 1)
        with patch('target_tracking_local.datetime') as mock_datetime:
            mock_datetime.now.return_value = fakeDate
            mock_datetime.side_effect = lambda *args, **kw: datetime(*args, **kw)
        
            response = ttlambda.getReportYTD()
            expectedResponse = {
                'LindsayFlannery2025': {
                    'Indirect': 35.2,
                    'Direct': 450.25
                },
                'MikeHollar2025': {
                    'Indirect': 140.85,
                    'Direct': 0.0
                }
            }
            self.assertEqual (response, expectedResponse)
        
        for file in os.listdir(YTD_FOLDER + "/"):
            self.assertEqual(file, "report.csv")
            os.remove(YTD_FOLDER + "/" + file)
        for file in os.listdir(YTD_FOLDER + "/"):
            self.fail("YTD file should have been removed")
    
    def test_get_report_YTD_fail(self):
        fakeDate = datetime(2023, 1, 1)
        with patch('target_tracking_local.datetime') as mock_datetime:
            mock_datetime.now.return_value = fakeDate
            mock_datetime.side_effect = lambda *args, **kw: datetime(*args, **kw)
            
            response = ttlambda.getReportYTD()
            expectedResponse = "File not found within 5 seconds: YTD/report.csv"
            self.assertEqual (response, expectedResponse)
    
    def test_compare_YTD_success(self):
        ttlambda.DISCR_PATH = DISCR_PATH
        for file in os.listdir(DISCR_FOLDER + "/"):
            os.remove(DISCR_FOLDER + "/" + file)
        reportYTD = {
            'LindsayFlannery2025': {
                'Indirect': 35.2,
                'Direct': 450.25
            },
            'MikeHollar2025': {
                'Indirect': 140.85,
                'Direct': 0.0
            }
        }
        dynamoYTD = {
            'LindsayFlannery2025': {
                'Indirect': 35.2,
                'Direct': 450.25
            },
            'MikeHollar2025': {
                'Indirect': 140.85,
                'Direct': 0.0
            }
        }
        response = ttlambda.compareYTDTotals(dynamoYTD, reportYTD)
        self.assertEqual(response, 0)
        for file in os.listdir(DISCR_FOLDER + "/"):
            self.assertEqual(os.path.getsize(DISCR_FOLDER + "/" + file), 0)
    
    def test_compare_YTD_dynamo_mismatch(self):
        ttlambda.DISCR_PATH = DISCR_PATH
        for file in os.listdir(DISCR_FOLDER + "/"):
            os.remove(DISCR_FOLDER + "/" + file)
        self.__createFakeFile(YTD_PATH)
        reportYTD = {
            'LindsayFlannery2025': {
                'Indirect': 35.2,
                'Direct': 450.25
            },
            'MikeHollar2025': {
                'Indirect': 140.85,
                'Direct': 0.0
            }
        }
        dynamoYTD = {
            'LindsayFlannery2025': {
                'Indirect': 35.2,
                'Direct': 452.25 # This should be 450.25
            },
            'MikeHollar2025': {
                'Indirect': 140.85,
                'Direct': 0.0
            }
        }
        response = ttlambda.compareYTDTotals(dynamoYTD, reportYTD)
        self.assertEqual(response, 1)
        for file in os.listdir(DISCR_FOLDER + "/"):
            self.assertEqual (file, "discrepencies.txt")
            os.remove(DISCR_FOLDER + "/" + file)
            
    def test_compare_YTD_unanet_mismatch(self):
        ttlambda.DISCR_PATH = DISCR_PATH
        for file in os.listdir(DISCR_FOLDER + "/"):
            os.remove(DISCR_FOLDER + "/" + file)
        self.__createFakeFile(YTD_PATH)
        reportYTD = {
            'LindsayFlannery2025': {
                'Indirect': 35.2,
                'Direct': 450.25
            },
            'MikeHollar2025': {
                'Indirect': 143.85, # This should be 140.85
                'Direct': 0.0
            }
        }
        dynamoYTD = {
            'LindsayFlannery2025': {
                'Indirect': 35.2,
                'Direct': 450.25
            },
            'MikeHollar2025': {
                'Indirect': 140.85,
                'Direct': 0.0
            }
        }
        response = ttlambda.compareYTDTotals(dynamoYTD, reportYTD)
        self.assertEqual(response, 1)
        for file in os.listdir(DISCR_FOLDER + "/"):
            self.assertEqual (file, "discrepencies.txt")
        try:
            with open(DISCR_PATH, 'r') as file:
                content = file.read()
                errMessage = "------------HOURS DO NOT MATCH FOR: Mike Hollar------------\nDirect hours from Dynamo   : 0.0\nIndirect hours from Dynamo : 140.85\n------------------------------------------\nDirect hours from report    : 0.0\nIndirect hours from report  : 143.85\n------------------------------------------\n\n\n"
                self.assertEqual(content, errMessage)
        except FileNotFoundError:
            self.fail("Unable to locate discrepency file")
        os.remove(DISCR_PATH)

    def test_compare_YTD_missing_person_dynamo(self):
        ttlambda.DISCR_PATH = DISCR_PATH
        for file in os.listdir(DISCR_FOLDER + "/"):
            os.remove(DISCR_FOLDER + "/" + file)
        self.__createFakeFile(YTD_PATH)
        reportYTD = {
            'LindsayFlannery2025': {
                'Indirect': 35.2,
                'Direct': 450.25
            },
            'MikeHollar2025': {
                'Indirect': 140.85,
                'Direct': 0.0
            }
        }
        dynamoYTD = {
            'MikeHollar2025': {
                'Indirect': 140.85,
                'Direct': 0.0
            }
        }
        response = ttlambda.compareYTDTotals(dynamoYTD, reportYTD)
        self.assertEqual(response, 1)
        for file in os.listdir(DISCR_FOLDER + "/"):
            self.assertEqual (file, "discrepencies.txt")
        try:
            with open(DISCR_PATH, 'r') as file:
                content = file.read()
                errMessage = "CANT FIND LindsayFlannery2025 IN REPORT\n\n\n"
                self.assertEqual(content, errMessage)
        except FileNotFoundError:
            self.fail("Unable to locate discrepency file")
        os.remove(DISCR_PATH)

    def test_compare_YTD_missing_person_unanet(self):
        ttlambda.DISCR_PATH = DISCR_PATH
        for file in os.listdir(DISCR_FOLDER + "/"):
            os.remove(DISCR_FOLDER + "/" + file)
        self.__createFakeFile(YTD_PATH)
        reportYTD = {
            'MikeHollar2025': {
                'Indirect': 140.85,
                'Direct': 0.0
            }
        }
        dynamoYTD = {
            'LindsayFlannery2025': {
                'Indirect': 35.2,
                'Direct': 450.25
            },
            'MikeHollar2025': {
                'Indirect': 140.85,
                'Direct': 0.0
            }
        }
        response = ttlambda.compareYTDTotals(dynamoYTD, reportYTD)
        # We only care about information given from Unanet, so if someone is in Dynamo but not Unanet, we don't really care
        self.assertEqual(response, 0)
        for file in os.listdir(DISCR_FOLDER + "/"):
            self.assertEqual (file, "discrepencies.txt")
            self.assertEqual(os.path.getsize(DISCR_FOLDER + "/" + file), 0)
            os.remove(DISCR_PATH)

if __name__ == '__main__':
    unittest.main()