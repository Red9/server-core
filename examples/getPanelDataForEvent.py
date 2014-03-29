#!/usr/bin/python
import requests
import StringIO
 
# Event to get data for. Change to suit.
eventId = '2819eb3a-2d43-ab1a-7f31-525b4dcf97d8'
 
# A resource response is an array of resources, even when accessing a single
# resource.
 
# This example does not do any error checking to make sure that a resource is
# actually returned (and not just an empty array). Production applications need
# to make sure that valid data is received.
 
# Make the HTTP request, parse it as JSON, and get the first element in the 
# result array.
event = requests.get('http://api.redninesensor.com/event/' + eventId ).json()[0]
 
# Pull the panel constraints from the event
datasetId = event['datasetId']
event_start_time = event['startTime']
event_end_time = event['endTime']

dataset = requests.get('http://api.redninesensor.com/dataset/' + datasetId).json()[0]
headPanelId = dataset['headPanelId']
 
# Request the panel within the start and end times
panelUrl = 'http://api.redninesensor.com/panel/' + headPanelId \
	+ '/body/?startTime=' + str(event_start_time) \
	+ '&endTime=' + str(event_end_time)
panel = requests.get(panelUrl)

# The panel comes back as a big CSV. It's easiest to parse this line by line.
panelBuffer = StringIO.StringIO(panel.text)
 
# First row is the column titles
columns = panelBuffer.readline()
 
# Do something with the CSV panel data.
for row in panelBuffer:
	# Subsequent rows are CSV column values
	print row
