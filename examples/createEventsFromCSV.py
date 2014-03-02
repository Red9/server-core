#!/usr/bin/python
from __future__ import print_function
import sys
import requests
import argparse
import csv
import json
 
# Takse a CSV file of events and adds them to a dataset.
# CSV must be in the following format:
# <type>,<startTime>,<endTime>
# An example CSV:
#------------------------------
# Duck Dive,10,100
# Wave,252,987
# Stationary,1000,15030
#------------------------------
# Note no header row, and times are relative to dataset startTime.
 
def CreateEvent(datasetId, eventType, eventStartTime, eventEndTime):
	
	newEvent = {'datasetId':datasetId,
				'type':eventType,
				'startTime':eventStartTime,
				'endTime':eventEndTime
				}
	
	print('Creating event ' + str(newEvent))
	
	# Dump dictionary to JSON string so that it's not automatically form-encoded
	# SRLM: removed. Apparently, the current API version doesn't take JSON.
	#r = requests.post(host + '/event/', data=json.dumps(newEvent))
	
	r = requests.post(host + '/event/', data=newEvent)
	
	# Print the server response. Will respond with created event if success,
	# message if failure.
	print(r.text)
 
def ParseArgs():
	parser = argparse.ArgumentParser()
	parser.add_argument('--id', help='Specify the dataset id', type=str)
	parser.add_argument('--csv', help='The CSV of events to upload, in format "type,startTime,endTime" where startTime and endTime are relative to dataset startTime', type=str)
	args = parser.parse_args()
	
	if not args.id:
		print('Must specify a dataset id', file=sys.stderr)
		sys.exit(1)
	if not args.csv:
		print('Must specify a CSV file', file=sys.stderr)
		sys.exit(1)
	return {'datasetId':args.id, 'csvName':args.csv}
 
# Get the dataset ID and CSV filename
args = ParseArgs()
datasetId = args['datasetId']
csvName = args['csvName']
 
# Specify the API domain to connect to.
host = 'http://api.redninesensor.com'
 
# A resource response is an array of resources, even when accessing a single
# resource.
 
# This example does not do any error checking to make sure that a resource is
# actually returned (and not just an empty array). Production applications need
# to make sure that valid data is received.
 
# Make the HTTP request, parse it as JSON, and get the first element in the 
# result array.
dataset = requests.get(host + '/dataset/' + datasetId ).json()[0]
 
# Access the individual 'title' field in the dataset.
print('Adding events to dataset "' + dataset['title'] + '"')
 
datasetStartTime = dataset['startTime']
 
with open(csvName, 'rU') as f:
	reader = csv.reader(f)
	for row in reader:
		eventType = row[0]
		eventStartTime = int(row[1]) + datasetStartTime
		eventEndTime = int(row[2]) + datasetStartTime
		
		CreateEvent(datasetId, eventType, eventStartTime, eventEndTime)




