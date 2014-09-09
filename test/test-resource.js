var _ = require('underscore')._;

var path = '../lib/resource';

exports['resource event end to end tests with live database'] = {
    setUp: function (callback) {
        this.sut = require(path).event;
        callback();
    },
    'basic': function (test) {

        var inputEvent = {"datasetId": "ead038a6-f069-8515-4d2f-8dc6154fed2e", "endTime": 1409040125393, "startTime": 1409040110033, "type": "Wave", };
        var self = this;
        var newStartTime = 12345473;
        test.expect(11);

        self.sut.create(inputEvent, function (err, createdEvent) {
            test.ok(!err);
            self.sut.find({id: createdEvent.id}, null,
                function (searchResult) {
                    test.deepEqual(searchResult, createdEvent, 'search result should match created event');
                },
                function (err, rowCount) {
                    test.ok(!err);
                    test.strictEqual(rowCount, 1, 'should get only one result');
                    self.sut.update(createdEvent.id, {startTime: newStartTime}, function (err) {
                        test.ifError(err);
                        self.sut.find({id: createdEvent.id}, null,
                            function (event) {
                                test.strictEqual(event.startTime, newStartTime);
                            },
                            function (err, rowCount) {
                                test.ok(!err);
                                test.strictEqual(rowCount, 1, 'should get only one result');

                                self.sut.delete(createdEvent.id, function (err) {
                                    test.ok(!err);
                                    self.sut.find({id: createdEvent.id}, null, null,
                                        function (err, rowCount) {
                                            test.ok(!err);
                                            test.strictEqual(rowCount, 0, 'should not get any rows after delete');
                                            test.done();
                                        });
                                });
                            });
                    });

                });

        });
    }
};