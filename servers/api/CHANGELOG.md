### 2015-01-XX

- Fixed the dataset POST not returning in metadata format.

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

