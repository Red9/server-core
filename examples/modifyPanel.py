#!/usr/bin/python
from __future__ import print_function

import sys
import json
import requests
from cStringIO import StringIO
import argparse

#
#
#
# Example showing how to download a panel, modify it, and upload it back to the
# server.
#
# Example:
# $> python modifyPanel.py --apiDomain http://api.redninesensor.com --datasetId ef2ef6fa-6a5a-bed7-b60a-0180bcd7ad42
#

def ParseArgs():
	parser = argparse.ArgumentParser()
	parser.add_argument('--apiDomain', help='Specify the domain for API requests', type=str)
	parser.add_argument('--datasetId', help='Specify the dataset to adjust.', type=str)
	args = parser.parse_args()

	if not args.apiDomain:
		print('Must specify an apiDomain', file=sys.stderr)
		sys.exit(1)
	elif not args.datasetId:
		print('Must specify an datasetId', file=sys.stderr)
		sys.exit(1)
	else:
		return args


args = ParseArgs()
host = args.apiDomain
datasetId = args.datasetId

dataset = requests.get(host + '/dataset/' + datasetId ).json()[0]

# Get the panel definition (meta)
oldPanel = requests.get(host + '/panel/' + dataset['headPanelId']).json()[0]
oldPanelId = oldPanel['id']

# Create a new panel to write to.
newPanel = requests.post(host + '/panel/', data={'datasetId':oldPanel['datasetId']})
newPanelId = newPanel.json()[0]['id']
print('new panel id = ' + newPanelId, file=sys.stderr)

# Request the original panel body within the start and end times
panelUrl = host + '/panel/' + oldPanelId + '/body/?format=csv'
panel = requests.get(panelUrl)
panelBuffer = StringIO(panel.text)

result = StringIO()

# Do something with the CSV panel data.
# First row is the column titles
# Make sure to write them to the new panel!
columns = panelBuffer.readline()
result.write(columns)

columnList = columns.strip().split(',');

for row in panelBuffer:
	# Subsequent rows are CSV column values
	timeString, valueString = row.strip().split(',', 1)
	valueStringList = valueString.split(',')
	time = int(timeString)
	result.write(str(time))
	
	for index, v in enumerate(valueStringList):
		value = float(v)
		
		# Do some manipulation on the values. For example...
		if columnList[index + 1] == "acceleration:z":
			value += 20.0
			
		result.write(',')
		result.write(str(value))
	
	result.write('\n')


# Upload the new panel
headers = {'content-type':'text/*'}
temp = requests.put(
	url=host+'/panel/' + newPanelId + '/body/',
	data=result.getvalue(),
	headers=headers,
	timeout=60000)

# We now have to update the dataset to use the new panel.
print('Switching panels', file=sys.stderr)
requests.put(url=host + '/dataset/' + datasetId, data={'headPanelId':newPanelId})

# And delete the old panel
requests.delete(host + '/panel/' + oldPanelId)

