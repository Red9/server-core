/** End to end testing with a live database.
 *
 *
 *
 */
var _ = require('underscore')._;
var path = '../lib/resource';

/** Allows us to do a subsequent deepEqual test without worrying about what the dynamic fields include.
 *
 * @param schema
 * @param resource
 * @returns resource without any fields marked dynamic in the schema
 */
function removeDynamicFields(schema, resource) {
    return _.reduce(schema, function (memo, parameters, key) {
        if (!parameters.dynamic) {
            memo[key] = resource[key];
        }
        return memo;
    }, {});
}

function runEndToEnd(self, test, name, inputResource, modifyKey, modifyValue) {
    test.expect(11);
    self.sut.create(inputResource, function (err, createdEvent) {
        test.strictEqual(err, null);
        self.sut.find({id: createdEvent.id}, null,
            function (searchResult) {
                test.deepEqual(removeDynamicFields(self.sut.schema, searchResult), createdEvent, 'search result should match created ' + name);
            },
            function (err, rowCount) {
                test.strictEqual(err, null);
                test.strictEqual(rowCount, 1, 'should get only one result');

                var updateValue = {};
                updateValue[modifyKey] = modifyValue;

                self.sut.update(createdEvent.id, updateValue, function (err) {
                    test.strictEqual(err, null);
                    self.sut.find({id: createdEvent.id}, null,
                        function (event) {
                            test.strictEqual(event[modifyKey], modifyValue);
                        },
                        function (err, rowCount) {
                            test.strictEqual(err, null);
                            test.strictEqual(rowCount, 1, 'should get only one result');

                            self.sut.delete(createdEvent.id, function (err) {
                                test.strictEqual(err, null);
                                self.sut.find({id: createdEvent.id}, null, null,
                                    function (err, rowCount) {
                                        test.strictEqual(err, null);
                                        test.strictEqual(rowCount, 0, 'should not get any rows after delete');
                                        test.done();
                                    });
                            });
                        });
                });

            });

    });
}

exports['resource CRUD tests'] = {
    'event': function (test) {
        var inputEvent = {"datasetId": "ead038a6-f069-8515-4d2f-8dc6154fed2e", "endTime": 1409040125393, "startTime": 1409040110033, "type": "Wave", };
        this.sut = require(path).event;
        runEndToEnd(this, test, 'event', inputEvent, 'startTime', 12345473);
    },
    'user': function (test) {
        var inputUser = {email: 'thisismyname@redninesensor.com', displayName: 'me', givenName: 'm', familyName: 'e'};
        this.sut = require(path).user;
        runEndToEnd(this, test, 'user', inputUser, 'displayName', 'WAT');
    },
    'comment': function (test) {
        var inputComment = {author: '46ed9537-a782-431f-8746-445e8aa28d9c', resourceType: 'dataset', resource: 'f6a3db1a-0d8e-43ec-bc3d-65d27cffed76', body: 'Hello, World!'};
        this.sut = require(path).comment;
        runEndToEnd(this, test, 'comment', inputComment, 'body', 'Goodbye World!');
    },
    'video': function(test){
        var inputVideo = {dataset: '0aa4053d-72a5-4ddb-96c3-18f1e47279da', host: 'YouTube', hostId: '12DB3ER7', startTime: 1234};
        this.sut = require(path).video;
        runEndToEnd(this, test, 'video', inputVideo, 'startTime', 999999);
    },
    'layout': function(test){
        var inputLayout = {title: 'hello', description: 'world', layout: {}, for: {}};
        this.sut = require(path).layout;
        runEndToEnd(this, test, 'layout', inputLayout, 'title', 'new title');
    },
    'dataset': function(test){
        var inputDataset = {title: 'new Dataset', owner: '13a334d2-1483-4bb1-b9d8-358afe79a33c'};
        this.sut = require(path).dataset;
        runEndToEnd(this, test, 'dataset', inputDataset, 'title', 'new title');
    }
};
