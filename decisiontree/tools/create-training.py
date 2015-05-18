#!/usr/bin/python

# This program is intended to make decision tree testing easier for Akhil. Based
# on a configuration JSON, it will download events and panels for a given set of
# datasets and write files of the appropriate format for passing to decision
# tree phase 1 testing.

from __future__ import print_function
import sys
import requests
import argparse
import json
import os


def PrepareArgs():
    parser = argparse.ArgumentParser()
    parser.add_argument('--outputpath',
                        help='Folder to save results to. Contents may be overwritten.')
    parser.add_argument('--configpath', help='Path to the config JSON.',
                        type=str)
    parser.add_argument('--cookie', help='The r9session cookie value',
                        type=str)
    parser.set_defaults(manualevents=False)

    args = parser.parse_args()
    return args


def ParseCookie(args):
    if not args.cookie:
        print('ERROR: Must specify a cookie', file=sys.stderr)
        sys.exit(1)
    else:
        return dict(r9session=args.cookie)


def ParseOutputPath(args):
    if not args.outputpath:
        print('ERROR: Must specify a path', file=sys.stderr)
        sys.exit(1)
    else:
        return args.outputpath


def ParseConfigPath(args):
    if not args.configpath:
        print('ERROR: Must specify a config path', file=sys.stderr)
        sys.exit(1)
    else:
        return args.configpath


def HitAPI(path, cookies):
    # Specify the API domain to connect to.
    host = 'https://api.redninesensor.com'
    r = requests.get(host + path, cookies=cookies)
    if r.status_code != 200:
        print('Error status code: ' + str(r.status_code), file=sys.stderr)
        print('Message: ' + r.text)
        sys.exit(1)
    return r

# -------------------------------------------------------------------------------
# Get the command arguments
args = PrepareArgs()
cookies = ParseCookie(args)
config_path = ParseConfigPath(args)
output_path = ParseOutputPath(args)

# Read the configuration file for the data to download.
with open(config_path) as config_file:
    config = json.load(config_file)
    manual_events = config['manualEvents']

# Loop through each datasetId in the list
for id in config['idList']:
    print('###########')
    print('Getting events and panel from dataset ' + str(id))

    # Read the events
    r = HitAPI('/event/?datasetId=' + str(id), cookies)
    event_list = []
    for event in r.json()['data']:
        if not manual_events or event['source']['type'] == 'manual':
            min_event = {}
            min_event['id'] = event['id']
            min_event['type'] = event['type']
            min_event['startTime'] = event['startTime']
            min_event['endTime'] = event['endTime']
            event_list.append(min_event)
    print('Prepared ' + str(len(event_list)) + ' events')

    # Read the panel
    r = HitAPI('/dataset/' + str(id) + '/csv', cookies)
    panel = r.text
    panelLines = panel.count('\n') - 1  # First row is the header

    # Prepare and write output
    output_json = {}
    output_json['evens'] = event_list
    output_json['rowCount'] = panelLines
    output_filename = os.path.join(output_path, str(id) + '.txt')
    with open(output_filename, 'w') as output_file:
        output_file.write(json.dumps(output_json))
        output_file.write('\n')
        output_file.write(panel)

    print('Lines in panel: ' + str(panelLines))
    print('Wrote training data to ' + output_filename)
