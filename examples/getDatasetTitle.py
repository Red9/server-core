#!/usr/bin/python
from __future__ import print_function
import sys
import requests
import argparse
 
def ParseArgs():
	parser = argparse.ArgumentParser()
	parser.add_argument('--id', help='Specify the dataset id', type=str)
	args = parser.parse_args()

	if args.id:
		return args.id
	else:
		print('Must specify a dataset id', file=sys.stderr)
		sys.exit(1)
 
# Get the dataset ID
datasetId = ParseArgs()
 
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
print('Dataset title: "' + dataset['title'] + '"')
