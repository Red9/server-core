### 2015-04-27

- Added a `/render/{type}` route to render certain data into images. Caching is done by Redis.
- Uploads can now include tags.
- If an uploaded RNC has a sport type of Surf it's automatically event detected.
- Added acceleration magnitude, and the option to add a low pass filter to raw panel requests.
- Removed migration and redirect servers
- Cleaned up the repository, `packages.json`, and so on.
- Upgraded to https.

### 2015-02-07

- Added `sort`, `sortDirection`, `limit`, and `offset` options for the result. See the documentation for more.

### 2015-01-30

- Cleaned up summary statistics so that all unknown values are represented as `null`. You should translate this as `NaN`.

### 2015-01-27

- Move the HTML server into clients-core. It doesn't really belong here anyways.

### 2015-01-25

- Updates on User can now set fields to null (no value). Note that this messes up the Swagger documentation.
- Removed `frequency` and `dutyCycle` from aggregateStatistics. Aggregate statistics will need a major overhaul due to critical design flaw.

### 2015-01-23

- Fixed the dataset POST not returning in metadata format.
- Added a `init.sh` script to the project root. Run it after a git clone.

### 2015-01-21

- All responses from the server are now in the following format:

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

- You can specify the response format with `?meta=[none,default,only]`.
- Aggregate statistics are available for event and dataset searches. Include the key `?aggregateStatistics=true` to calculate aggregate statistics. Statistics are calculated over the same objects that are returned, not all matching resources (eg, it won't include statistics outside of the skip and limit constraints). Optionally, calculate aggregate statistics for sets of resources grouped by a key value. Use the `?aggregateStatisticsGroupBy=<keyname>` parameter (eg, `=type` to group events by the event type).
- Removed the aggregateStatistics option for events expanded in datasets. You'll need to make an explicit call to `/event/?datasetId=:id&aggregateStatistics=true&aggregateStatisticsGroupBy=type`
- Added a search option for events: `?dataset.userId=1234`. You must also specify the `&expand[]=dataset` option for this to work.
- Dataset `title` search in a query string is now a case insensitive comparison with wild cards on either side (`*value*`).

### 2015-01-18

- The `fields` option is temporarily removed.

### 2015-01-17

- Changes to all resources:
    - Changed `id` from a UUID to an incrementing integer in all resources. Important: this means that clients can no longer assumer that `id` is a string. Instead, it may be an integer.
    - Changed key `createTime` to `createdAt` in all resources
    - Added key `updatedAt` to all resources
- Changes to the dataset resource:
    - Removed the `count` expand option
    - Changed key `ownerId` in dataset to `userId`
    - Changed key `owner` in dataset expand to `user`
    - Added plural to expand options that return a list:
       - `event` in dataset to `events`
       - `comment` in dataset to `comments`
       - `video` in dataset to `videos`
- Changes to the event resource:
    - Events are now immutable. No updates are allowed.
- Changes to the comment resource:
    - In the comment resource, removed the `resourceType` key (all comments are now on datasets) and changed `resourceId` to `datasetId`
- Migrated data:
     - Changed all `id`s in all resources. The relationships are the same, but the URLs, etc. are different.
     - All `createdAt` and `updatedAt` timestamps are relatively meaningless for existing resources. They maintain the same order as the originals, but the actual value is set to the date of migration.

