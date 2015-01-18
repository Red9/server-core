### 2015-01-18

- The `fields` option is temporarily removed.

### 2015-01-17

- Changes to all resources:
    - Changed `id` from a UUID to an incrementing integer in all resources. Important: this means that clients can no longer assumer that `id` is a string. Instead, it may be an integer.
    - Changed key `createTime` to `createdAt` in all resources
    - Added key `updatedAt` to all resources
- Changes to the dataset resource:
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

