import unittest
import sys
from datetime import datetime, date
from unittest.mock import patch
import json
import os
import csv
import time
from moto import mock_aws
import boto3
import target_tracking as ttlambda

USERNAME = "username"
PASSWORD = "admin"

DYNAMO_TABLE = "target-tracking-concrete"
BUCKET_NAME = 'target-tracking-selenium'
REPORT_PREFIX = "Reports/"
TARGET_PREFIX = "Targets/"
AUTO_PREFIX = "Auto/"
NAME_PREFIX = "Names/"
WAIT = 5

class TestSuite(unittest.TestCase):

    def updateItem(self, existingValues):
        update_expression_parts = []
        expression_attribute_names = {}
        expression_attribute_values = {}
        primary_key_value = ""

        for i, (key, value) in enumerate(existingValues.items()):
            if key == 'ID':
                primary_key_value = value
                i = i -1
                continue
            placeholder_name = f'#attr{i}'
            placeholder_value = f':val{i}'
            update_expression_parts.append(f'{placeholder_name} = {placeholder_value}')
            expression_attribute_names[placeholder_name] = key
            expression_attribute_values[placeholder_value] = value

        update_expression = 'SET ' + ', '.join(update_expression_parts)

        try:
            response = self.dynamodb.update_item(
                TableName=DYNAMO_TABLE,
                Key={
                    'ID': primary_key_value
                },
                UpdateExpression=update_expression,
                ExpressionAttributeNames=expression_attribute_names,
                ExpressionAttributeValues=expression_attribute_values,
                ReturnValues='ALL_NEW'
            )
            if (str(response['ResponseMetadata']['HTTPStatusCode']) == "200"):
                return "Success!"
            else:
                return ("ERROR:\n\n" + str(response['ResponseMetadata']['HTTPStatusCode']))
        except Exception as e:
            return e

    @classmethod
    def setUp(self):
        # Change global creds
        ttlambda.USERNAME = USERNAME
        ttlambda.PASSWORD = PASSWORD

        self.mock_aws = mock_aws()
        self.mock_aws.start()

        self.dynamodb = boto3.client('dynamodb', region_name ='us-east-1')
        key_schema = [{'AttributeName': 'ID', 'KeyType': 'HASH'}]
        attribute_definitions = [{'AttributeName': 'ID', 'AttributeType': 'S'}]
        provisioned_throughput = {'ReadCapacityUnits': 5, 'WriteCapacityUnits': 5}

        self.dynamodb.create_table(
            TableName=DYNAMO_TABLE,
            KeySchema=key_schema,
            AttributeDefinitions=attribute_definitions,
            ProvisionedThroughput=provisioned_throughput
        )

        JohnDoe = { "ID": { "S": "JohnDoe2025" }, "Direct1": { "N": "21" }, "Direct10": { "N": "43.75" }, "Direct11": { "N": "43" }, "Direct12": { "N": "41.75" }, "Direct13": { "N": "46" }, "Direct14": { "N": "44.25" }, "Direct15": { "N": "40.5" }, "Direct16": { "N": "29" }, "Direct17": { "N": "42" }, "Direct18": { "N": "35" }, "Direct19": { "N": "43" }, "Direct2": { "N": "51.5" }, "Direct20": { "N": "42.75" }, "Direct21": { "N": "41.5" }, "Direct22": { "N": "32" }, "Direct23": { "N": "42.5" }, "Direct24": { "N": "43" }, "Direct25": { "N": "43.5" }, "Direct26": { "N": "42" }, "Direct27": { "N": "23.5" }, "Direct28": { "N": "15" }, "Direct29": { "N": "13.75" }, "Direct3": { "N": "46" }, "Direct4": { "N": "42.5" }, "Direct5": { "N": "47.5" }, "Direct6": { "N": "50.25" }, "Direct7": { "N": "51" }, "Direct8": { "N": "44" }, "Direct9": { "N": "44" }, "Indirect1": { "N": "0" }, "Indirect10": { "N": "0" }, "Indirect11": { "N": "0" }, "Indirect12": { "N": "0" }, "Indirect13": { "N": "0" }, "Indirect14": { "N": "0" }, "Indirect15": { "N": "0" }, "Indirect16": { "N": "0" }, "Indirect17": { "N": "0" }, "Indirect18": { "N": "0" }, "Indirect19": { "N": "0" }, "Indirect2": { "N": "0" }, "Indirect20": { "N": "0" }, "Indirect21": { "N": "0" }, "Indirect22": { "N": "0" }, "Indirect23": { "N": "0" }, "Indirect24": { "N": "0" }, "Indirect25": { "N": "0" }, "Indirect26": { "N": "0" }, "Indirect27": { "N": "0" }, "Indirect28": { "N": "0" }, "Indirect29": { "N": "0" }, "Indirect3": { "N": "0" }, "Indirect4": { "N": "0" }, "Indirect5": { "N": "0" }, "Indirect6": { "N": "0" }, "Indirect7": { "N": "0" }, "Indirect8": { "N": "0" }, "Indirect9": { "N": "0" }}
        PeterParker = { "ID": { "S": "PeterParker2025" }, "dateChanged2": { "S": "2025-07-10 14:10:39.965331" }, "Description": { "S": "Initial entry" }, "Direct1": { "N": "16.5" }, "Direct10": { "N": "40.6" }, "Direct11": { "N": "20.5" }, "Direct12": { "N": "42.2" }, "Direct13": { "N": "29" }, "Direct14": { "N": "45.5" }, "Direct15": { "N": "38.1" }, "Direct16": { "N": "30.5" }, "Direct17": { "N": "33.5" }, "Direct18": { "N": "33" }, "Direct19": { "N": "44.8" }, "Direct2": { "N": "24" }, "Direct20": { "N": "43" }, "Direct21": { "N": "42.5" }, "Direct22": { "N": "21.5" }, "Direct23": { "N": "40.5" }, "Direct24": { "N": "45.8" }, "Direct25": { "N": "41.7" }, "Direct26": { "N": "32.6" }, "Direct28": { "N": "27.5" }, "Direct29": { "N": "7" }, "Direct3": { "N": "28.5" }, "Direct4": { "N": "34" }, "Direct5": { "N": "28.3" }, "Direct6": { "N": "32.8" }, "Direct7": { "N": "19" }, "Direct8": { "N": "38.9" }, "Direct9": { "N": "0" }, "Indirect1": { "N": "0" }, "Indirect10": { "N": "1.5" }, "Indirect11": { "N": "5.5" }, "Indirect12": { "N": "1.2" }, "Indirect13": { "N": "12" }, "Indirect14": { "N": "2.6" }, "Indirect15": { "N": "5.7" }, "Indirect16": { "N": "2.5" }, "Indirect17": { "N": "1.5" }, "Indirect18": { "N": "3" }, "Indirect19": { "N": "0" }, "Indirect2": { "N": "0" }, "Indirect20": { "N": "2" }, "Indirect21": { "N": "1.5" }, "Indirect22": { "N": "3.5" }, "Indirect23": { "N": "8" }, "Indirect24": { "N": "3.2" }, "Indirect25": { "N": "2" }, "Indirect26": { "N": "3.4" }, "Indirect28": { "N": "1" }, "Indirect29": { "N": "1.5" }, "Indirect3": { "N": "0" }, "Indirect4": { "N": "5" }, "Indirect5": { "N": "4.7" }, "Indirect6": { "N": "2" }, "Indirect7": { "N": "1.5" }, "Indirect8": { "N": "2.5" }, "Indirect9": { "N": "40" }, "Target": { "N": "1776" }, "Target2": { "N": "1860" } }
        DocHudson = { "ID": { "S": "DocHudson2025" }, "Direct1": { "N": "17.5" }, "Direct10": { "N": "36.5" }, "Direct11": { "N": "29.5" }, "Direct12": { "N": "15.5" }, "Direct13": { "N": "33.5" }, "Direct14": { "N": "28.5" }, "Direct15": { "N": "37" }, "Direct16": { "N": "12.5" }, "Direct17": { "N": "35.5" }, "Direct18": { "N": "36.5" }, "Direct19": { "N": "41" }, "Direct2": { "N": "9.75" }, "Direct20": { "N": "37.5" }, "Direct21": { "N": "38" }, "Direct22": { "N": "31" }, "Direct23": { "N": "29.5" }, "Direct24": { "N": "36" }, "Direct26": { "N": "41" }, "Direct27": { "N": "25" }, "Direct28": { "N": "30.5" }, "Direct29": { "N": "8" }, "Direct3": { "N": "42.75" }, "Direct4": { "N": "34.75" }, "Direct5": { "N": "37" }, "Direct6": { "N": "38.5" }, "Direct7": { "N": "37" }, "Direct8": { "N": "40.5" }, "Direct9": { "N": "40.5" }, "Indirect1": { "N": "0" }, "Indirect10": { "N": "0" }, "Indirect11": { "N": "6" }, "Indirect12": { "N": "0" }, "Indirect13": { "N": "2.5" }, "Indirect14": { "N": "0" }, "Indirect15": { "N": "3.5" }, "Indirect16": { "N": "0" }, "Indirect17": { "N": "4" }, "Indirect18": { "N": "3" }, "Indirect19": { "N": "0" }, "Indirect2": { "N": "4" }, "Indirect20": { "N": "0" }, "Indirect21": { "N": "0" }, "Indirect22": { "N": "2.5" }, "Indirect23": { "N": "5.5" }, "Indirect24": { "N": "4.5" }, "Indirect26": { "N": "4.5" }, "Indirect27": { "N": "8" }, "Indirect28": { "N": "10" }, "Indirect29": { "N": "3" }, "Indirect3": { "N": "0" }, "Indirect4": { "N": "5.5" }, "Indirect5": { "N": "5.5" }, "Indirect6": { "N": "0" }, "Indirect7": { "N": "1.5" }, "Indirect8": { "N": "0" }, "Indirect9": { "N": "0" }, "Target": { "N": "1776" } }
        RyanReynolds = { "ID": { "S": "RyanReynolds2025" }, "dateChanged2": { "S": "2025-07-10 14:10:39.845379" }, "Description": { "S": "(pro-rated - start date 5/18/25)" }, "Direct21": { "N": "31" }, "Direct22": { "N": "32" }, "Direct23": { "N": "36.5" }, "Direct24": { "N": "36" }, "Direct25": { "N": "35" }, "Direct26": { "N": "38.5" }, "Direct27": { "N": "33" }, "Direct28": { "N": "40" }, "Indirect21": { "N": "0" }, "Indirect22": { "N": "0" }, "Indirect23": { "N": "0" }, "Indirect24": { "N": "2" }, "Indirect25": { "N": "1" }, "Indirect26": { "N": "0" }, "Indirect27": { "N": "0" }, "Indirect28": { "N": "0" }, "Target": { "N": "1824" }, "Target2": { "N": "1132" } }
        self.updateItem(self, JohnDoe)
        self.updateItem(self, PeterParker)
        self.updateItem(self, DocHudson)
        self.updateItem(self, RyanReynolds)
    
    def tearDown(self):
        self.mock_aws.stop()
    
    def something(self):
        response = self.dynamodb.get_item(
            TableName=DYNAMO_TABLE,
            Key={
                'ID': {'S': 'RyanReynolds2025'}
            }
        )
        print("\n\n" + str(response) + "\n\n")

    def test_get_dynamo_ids(self):
        response = ttlambda.getDynamoIDs()
        expectedValues = ['JohnDoe2025', 'DocHudson2025', 'PeterParker2025', 'RyanReynolds2025']
        self.assertEqual(set(response), set(expectedValues))
    
    def test_get_dynamo_ytd(self):
        response = ttlambda.getDynamoYTD()
        expectedResponse = {
            'JohnDoe2025': {
                "Direct": 1145.5,
                "Indirect": 0.0
            },
            'DocHudson2025': {
                'Direct': 880.75,
                'Indirect': 73.5
            },
            'PeterParker2025': {
                'Direct': 881.8,
                'Indirect': 117.3
            },
            'RyanReynolds2025': {
                'Direct': 282.0,
                'Indirect': 3.0
            }
        }
        self.assertEqual(response, expectedResponse)

    def test_update_hours_existing_emp(self):
        response = self.dynamodb.get_item(
            TableName=DYNAMO_TABLE,
            Key={
                'ID': {'S': 'PeterParker2025'}
            }
        )
        self.assertIn("Item", response)
        self.assertEqual(response["Item"]["Direct23"]["N"], '40.5')

        empID = "PeterParker2025"
        key = "Direct23"
        hours = 99
        response = ttlambda.updateHours(empID, key, hours)
        if response != "Success!":
            self.fail("Could not update employee hours")

        response = self.dynamodb.get_item(
            TableName=DYNAMO_TABLE,
            Key={
                'ID': {'S': 'PeterParker2025'}
            }
        )
        self.assertIn("Item", response)
        self.assertEqual(response["Item"]["Direct23"]["N"], '99')

    def test_update_hours_not_existing_emp(self):
        response = self.dynamodb.get_item(
            TableName=DYNAMO_TABLE,
            Key={
                'ID': {'S': 'JackBlack2025'}
            }
        )
        self.assertNotIn("Item", response)

        empID = "JackBlack2025"
        key = "Direct49"
        hours = 23.5
        response = ttlambda.updateHours(empID, key, hours)
        if response != "Success!":
            self.fail("Could not update employee hours")

        response = self.dynamodb.get_item(
            TableName=DYNAMO_TABLE,
            Key={
                'ID': {'S': 'JackBlack2025'}
            }
        )
        self.assertIn("Item", response)
        self.assertEqual(response["Item"]["Direct49"]["N"], '23.5')

    def test_add_item_existing_emp(self):
        response = self.dynamodb.get_item(
            TableName=DYNAMO_TABLE,
            Key={
                'ID': {'S': 'JohnDoe2025'}
            }
        )
        self.assertIn("Item", response)
        self.assertNotIn("Target", response["Item"])

        empID = "JohnDoe2025"
        data = 1840
        datatype = "N"
        header = "Target"
        response = ttlambda.addItem(empID, data, datatype, header)
        if response != "Success!":
            self.fail("Could not add employee")
        
        response = self.dynamodb.get_item(
            TableName=DYNAMO_TABLE,
            Key={
                'ID': {'S': 'JohnDoe2025'}
            }
        )
        self.assertIn("Item", response)
        self.assertEqual(response["Item"]["Target"]["N"], "1840")

    def test_add_item_not_existing_emp(self):
        response = self.dynamodb.get_item(
            TableName=DYNAMO_TABLE,
            Key={
                'ID': {'S': 'ClarkKent2025'}
            }
        )
        self.assertNotIn("Item", response)

        empID = "ClarkKent2025"
        data = 1776
        datatype = "N"
        header = "Target2"
        response = ttlambda.addItem(empID, data, datatype, header)
        if response != "Success!":
            self.fail("Could not add employee")
        
        response = self.dynamodb.get_item(
            TableName=DYNAMO_TABLE,
            Key={
                'ID': {'S': 'ClarkKent2025'}
            }
        )
        self.assertIn("Item", response)
        self.assertEqual(response["Item"]["Target2"]["N"], "1776")

    def test_get_correct_names_exists(self):
        dict = '{"PeterParker": "PeteParker"}'
        response = ttlambda.addItem("names", json.dumps(dict), "S", "Dict")
        if response != "Success!":
            self.fail("Unable to add name dict")
        response = ttlambda.getCorrectNames()
        self.assertEqual(response, dict)
        

    def test_get_correct_names_not_exists(self):
        response = ttlambda.getCorrectNames()
        self.assertEqual(response, {})

if __name__ == '__main__':
    unittest.main()