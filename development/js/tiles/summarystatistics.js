define(['vendor/jquery', 'sandbox'], function($, sandbox) {

    function summaryStatistics(myPlace, configuration, doneCallback) {
        this.myPlace = myPlace;
        $(sandbox).on('totalState.resource-focused', $.proxy(this.resourceFocused, this));

        this.setStatistics('', '', {});

        doneCallback();

    }

    summaryStatistics.prototype.setStatistics = function(type, title, statistics) {
        var self = this;
        sandbox.requestTemplate('summarystatistics', function(template) {
            self.myPlace.html(template(
                    {
                        type: type,
                        title: title,
                        summaryStatistics: statistics
                    }
            ));
        });
    };


    summaryStatistics.prototype.resourceFocused = function(event, parameters) {
        if (parameters.type === 'dataset') {
            this.setStatistics('dataset', parameters.resource.title, parameters.resource.headPanel.summaryStatistics);
        } else if (parameters.type === 'event') {
            this.setStatistics('event', parameters.resource.type, parameters.resource.summaryStatistics);
        } else {
            this.setStatistics('', '', {});
        }
    };

    return summaryStatistics;
});