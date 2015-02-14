This is the API documentation.

All JSON results are sent from the server unformatted. For easier manual exploration of the API, install (https://github.com/callumlocke/json-formatter)[JSON Formatter].

## General API Structure

### Resources, and relationships
Datasets, events, videos, comments, users.

## Technical Details

### `null` Values

A `null` value indicates "no data". `undefined` is not an option is JSON.

### Timestamps

All timestamps are milliseconds since Unix Epoch in UTC time. It is the client's responsibility to convert that to the appropriate local time (either user local or dataset local, depending on the resource and field).

### Metadata

All responses* come wrapped in a meta data object. A general response looks like this:


```json
{
  meta: {
     responseTime: 123    // milliseconds
     ...                  // other meta data keys, values
  },
  data: {                 // Array for searches, object for all other requests
     <response here>
  }
}
```

To get only the resource data you have two solutions:

1. Always go for the `data` key of the response.
2. Include the `?meta=none` option.

The `meta` option has three values:
- `none`: no metadata. Only send the resources requested
- `default`: include both metadata and resources
- `only`: only send metadata with the response

\* at this time a few responses are not wrapped. That may change in the future.

## Universal GET Query Parameters

There are a few GET query options that operate across most resources.

For searches, these options will work on each item in the result list.

### Related Resource Expansion

You can request that the server eagerly load associated resources in a single request by including the expand CSV option. For example, a dataset has a number of events associated with it. By include `?expand=event` in your query string you instruct the server to get the dataset and all events with the matching `datasetId`, and put the results under a new `events` key in the dataset.

Note that a hasMany relationship will result in an array, while a belongsTo relationship will result in an object.

### Result Field Selection

A specific request may not need every value in a particular resource. Therefore, to reduce the download size, you can request that the server only send a whitelist of keys.

### Result Sorting and Paging

You can choose an order for your results, with optional paging. Sorting and paging are only available on resource searches.

key           | description
--------------|------------
sort          | Choose a sort by key. Each route has a specific set of sortable keys (or meta-keys). See the particular route documentation for a list of options.
sortDirection | `asc` (ascending) or `desc` (descending). Defaults to `desc`.
offset        | Start location within the result set for paginated returs. This is the zero-based ordinal number of the search return, not the number of the page. To see the second page of 10 results per page, specify 10, not 1. Ranges are specified with a starting index and a number of results (`count`) to return. The default value is 0.
limit         | The number of results to return.



## Authorization

All calls to the API are authenticated using a cookie. If you're using a web browser then the browser will automatically send the cookie with every request. If you're using a program to access the API you'll need to explicitly provide the cookie and send it. An example of this is given below.

Note that cookies expire on a regular basis. Your code should test for 401 errors and take appropriate action.

### Programmatic Access

First, you'll need to get your cookie value.* To do that follow these steps:

\* The cookie shown below is an example, and expired. You'll need to use your own cookie.

1. Using Chrome, log into [http://my.redninesensor.com/](http://my.redninesensor.com/)
2. Go to [http://api.redninesensor.com/documentation](http://api.redninesensor.com/documentation) (this page)
3. Press CTRL+SHIFT+I to open developer tools
4. Click on the resources tab
5. On the left, open the Cookies drop down, select api.redninesensor.com
6. On the list of cookies find the "r9session" line. Click to highlight.
7. Press CTRL+C to copy.
8. Use that cookie value stored in your clipboard for your programatic access to the API.

## Statistics

### Location Statistics

Information on where this particular resource is located, and the accuracy of that location.

```json
"boundingCircle": {
    "latitude": -2.0646685897435897,
    "longitude": 99.54325538461538
},
"boundingBox": {
    "east": 99.54326333333333,
    "north": -2.06464,
    "south": -2.064695,
    "west": 99.54323833333333
},
"gpsLock": {
    "invalidTime": 0,
    "percentOn": 100,
    "validTime": 1196
}
```

### Summary Statistics

Summary statistics are a reduction of the raw data into a few numbers of particular significance. Minimums, maximums, averages, etc.

An object, with whose keys use the format of:

```
[ Measurement Type ]: {
    [ Axis ]: {number} or [ Bounded Object ]
}

[ Bounded Object ] = {
    "minimum": {number}
    "maximum": {number}
    "average": {number}
    "count"  : {number}
}
```

Example (some repeated structure removed for clarity):

```json
"summaryStatistics": {
    "distance": {
        "path": 8.121016572921675,
        "greatCircle": 6.724645202710428
    },
    "speed": {
        "path": {
            "minimum": 6.584404274900702,
            "maximum": 6.692456746471921,
            "average": 6.647155840450804,
            "count": 12
        }
    },
    "acceleration": {
        "x": {
            "minimum": -18.69840022176504,
            "maximum": 16.581600196659565,
            "average": -2.4287495024894414,
            "count": 190
        },
        "y": {
            "minimum": -33.28080039471388,
            "maximum": 26.224800311028957,
            "average": -4.192749523410671,
            "count": 190
        },
        "z": {
            "minimum": -3.1752000376582146,
            "maximum": 51.86160061508417,
            "average": 20.545958138414118,
            "count": 190
        }
    }
    ...
```

### Aggregate Statistics

Aggregate statistics are the combination of some set of summary statistics, plus some fields such as resource start and end times. Thus, aggregate statistics have two components: a compound summary statistics component, and a temporal component.

#### Compound Component

Compound statistics are a straight reduction of summary statistics. Essentially, it's as if summary statistics were calculated across each of the input resources.

```
[ Measurement Type ] : {
    [ Axis ]: {
        "count": {number}
        "average": {number}
        "minimum": {
            "value": {number}
            "id": {id of resource}
        },
        "maximum": {
            "value": {number}
            "id": {id of resource}
        }
    }
}
```

Example, repetitive fields removed:

```
"distance": {
    "path": {
        "count": 11,
        "average": 86.93517546839364,
        "sum": 956.28693015233,
        "minimum": {
            "value": 0,
            "id": "e9f865c9-5359-d6a6-4b25-2bb587965238"
        },
        "maximum": {
            "value": 160.95032252062634,
            "id": "0dfa1ec3-a314-b17f-4bb7-ce715ecee079"
        }
    },
    "greatCircle": {
        "count": 11,
        "average": 75.55922907765779,
        "sum": 831.1515198542356,
        "minimum": {
            "value": 0,
            "id": "e9f865c9-5359-d6a6-4b25-2bb587965238"
        },
        "maximum": {
            "value": 151.7243486945222,
            "id": "06dc8de1-5e92-d39a-153c-fa3282ba35df"
        }
    }
},
"speed": {
    "path": {
        "count": 1205,
        "average": 0.0003678743540208665,
        "duration": 0,
        "minimum": {
            "value": 0.060279418329340646,
            "id": "7e031efb-27a6-2fbf-fd7f-831fb4e05adb"
        },
        "maximum": {
            "value": -1.7976931348623157e+308,
            "id": "e9f865c9-5359-d6a6-4b25-2bb587965238"
        }
    }
},
"acceleration": {
    "x": {
        "count": 2045,
        "average": 0.0003852709251042424,
        "duration": 0,
        "minimum": {
            "value": -22.579200267791748,
            "id": "077e6981-3751-e6bb-158f-32518a624912"
        },
        "maximum": {
            "value": 8.584800101816654,
            "id": "69af1389-36c2-9d9d-3feb-489e8c5525d1"
        }
    },
    "y": {
        "count": 2045,
        "average": 0.002001029512303915,
        "duration": 0,
        "minimum": {
            "value": -41.51280049234629,
            "id": "7d10303b-b0ce-95a6-daf3-8065f63c8dd8"
        },
        "maximum": {
            "value": 15.993600189685822,
            "id": "b957ec50-3e4b-8737-b31c-7e8e44d3706a"
        }
    },
    "z": {
        "count": 2045,
        "average": 0.014876835824410167,
        "duration": 0,
        "minimum": {
            "value": -56.33040066808462,
            "id": "61d751d6-f3be-4f3c-d983-2dc60e11eece"
        },
        "maximum": {
            "value": 35.280000418424606,
            "id": "1fae5530-5a29-593f-9eeb-c319d9810fce"
        }
    }
}
```


#### Temporal Component

The temporal component of aggregate statistics describes the time relation of the resources. All times are in milliseconds.

```json
"temporalStatistics": {
    "interval": {
        "sum": 3939451,
        "minimum": 1735,
        "maximum": 1103385,
        "average": 218858.38888888888
    },
    "duration": {
        "sum": 25176,
        "minimum": 701,
        "maximum": 2269,
        "average": 1325.0526315789473
    },
    "coveredTime": 3964627,
    "dutyCycle": 0.0063501560171990955,
    "frequency": 4.792380216348222e-9
}
```


## Resource Notes

### User

`displayName`: If set to 'unknown', it will automatically be updated with their Google display name.

`email`: Considered a "second" primary key for a user. So no changes.


### Event

An event is immutable after creation.


## API Examples

### Python

#### Get Dataset Title

`getDatasetTitle.py`

```python
#!/usr/bin/python
from __future__ import print_function
import sys
import requests
import argparse

def PrepareArgs():
    parser = argparse.ArgumentParser()
    parser.add_argument('--id', help='Specify the dataset id', type=str)
    parser.add_argument('--cookie', help='Specify the r9session cookie value', type=str)
    args = parser.parse_args()
    return args

def ParseCookie(args):
    if not args.cookie:
        print('Must specify a cookie', file=sys.stderr)
        sys.exit(1)
    else:
        return dict(r9session=args.cookie)

def ParseId(args):
    if not args.id:
        print('Must specify a dataset id', file=sys.stderr)
        sys.exit(1)
    else:
        return args.id

#-------------------------------------------------------------------------------
args = PrepareArgs()
datasetId = ParseId(args)
cookies = ParseCookie(args)

# Specify the API domain to connect to.
host = 'http://api.redninesensor.com'

# Make the HTTP request
r = requests.get(host + '/dataset/' + datasetId, cookies=cookies)

if r.status_code != 200:
    print('Error status code: ' + str(r.status_code), file=sys.stderr)
    print('Message: ' + r.text)
else:
    # Get the response, and interpret as JSON
    # Make sure that you get the resource itself (and not the metadata) by using the ['data'] key.
    dataset = r.json()['data']
    # Access the individual 'title' field in the dataset.
    print('Dataset title: "' + dataset['title'] + '"')
```

First, get your current cookie. Then run your code with a command like this:

```
srlm@laptop:~$ ./getDatasetTitle.py --id 39c07736-0c2a-4f3e-b216-03bab1e8c864 --cookie Fe26.2**265dd66c4af6d1532c447dd6300d96cc8a40d54d76b248e1f83a87ac04ec0cd6*QNWE96N1TJM21-rQ9jQiWw*UV5IBNyszaiimZGLWZbnQ0Xtk2RbzKKk8_1j66zWqi2osqJKeOAqOLR21BBUShYf**62e58378d08dea95d974f187e6013973377291682e7983b4ba5994fb1b436a57*tPL3lD_RKaOJv5uwUOm2GZ0BgNti1Xaf_P10ARI6vpY
Dataset title: "MP-25"
```

That's a bit wordy, so the format is:

```
./getDatasetTitle.py --id [id] --cookie [cookie]
```

Just replace `[id]` and `[cookie]` with the appropriate values.


