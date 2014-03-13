#!/usr/bin/python
import requests
import StringIO

# This example will create a CSV with some extra columns: one extra for each
# event type. The value of the column is an integer that indicates the number
# of events of that type at that instant in time.

# Event to get data for. Change to suit.
datasetId = '2aaf71a8-18c0-2956-c4ae-b87d26d8f6b0'
outputFilename = datasetId + '-eventAnnotatedPanel.csv'
 
# This example does not do any error checking to make sure that a resource is
# actually returned (and not just an empty array). Production applications need
# to make sure that valid data is received.
 
# Make the HTTP request, parse it as JSON, and get the first element in the 
# result array.
events = requests.get('http://api.redninesensor.com/event/?datasetId=' + datasetId ).json()


# eventTypes is an array whose index corresponds to the order of events in the
# output file. Each entry is a different event type.
eventColumnsHeader = ""
eventTypes = []


for event in events:
	eventTime = {'startTime':int(event['startTime']),'endTime':int(event['endTime'])}
	found = False
	
	for eventType in eventTypes:
		if eventType['type'] == event['type']:
			found = True
			eventType['time'].append(eventTime)
	if found == False:
		# Each event type stores the start and end times of each of the events
		# of that type. This allows us to detect multiple events of the same
		# type, possibly overlapping.
		eventTypes.append({'type':event['type'], 'time':[eventTime]})
		# And let's go ahead and make a CSV string for the first row output
		eventColumnsHeader += ',' + event['type']

# We need to get the headPanelId
dataset = requests.get('http://api.redninesensor.com/dataset/' + datasetId).json()[0]

# Request the panel
panelUrl = 'http://api.redninesensor.com/panel/' + dataset['headPanelId'] + '/body?format=csv'
panel = requests.get(panelUrl)

# The panel comes back as a big CSV. It's easiest to parse this line by line.
panelBuffer = StringIO.StringIO(panel.text)

with open(outputFilename, 'w') as outputFile:
	# First row is the column titles
	columns = panelBuffer.readline().rstrip() + eventColumnsHeader;
	outputFile.write(columns + '\n')

	# Do something with the CSV panel data.
	for row in panelBuffer:
		# Subsequent rows are CSV column values
		timeString, values = row.rstrip().split(',', 1)
		time = int(timeString)
		
		eventTypesValues = "" # string placeholder for the event columns
		for eventType in eventTypes:
			eventsFound = 0
			for eventTime in eventType['time']: # for each event instance of eventType
				#print str(eventTime['startTime']) + ' <= ' + str(time) + ' and ' + str(time) + ' <= ' + str(eventTime['endTime'])
				if eventTime['startTime'] <= time and time <= eventTime['endTime']:
					eventsFound += 1
			eventTypesValues += ',' + str(eventsFound)
		
		outputFile.write(str(time) + ',' + values + eventTypesValues + '\n')
		
