define(['vendor/jquery'], function($) {

    function summaryStatistics(sandbox, tile, configuration, doneCallback) {
        tile.addListener('totalState-resource-focused', resourceFocused);
        tile.setTitle('summary statistics');
        setStatistics('', '', {});
        doneCallback();
        


        function setStatistics(type, title, statistics) {
            sandbox.requestTemplate('summarystatistics', function(template) {
                tile.place.html(template(
                        {
                            type: type,
                            title: title,
                            summaryStatistics: statistics
                        }
                ));
            });
        }

        function resourceFocused(event, parameters) {
            if (parameters.type === 'dataset') {
                setStatistics('dataset', parameters.resource.title, parameters.resource.headPanel.summaryStatistics);
            } else if (parameters.type === 'event') {
                setStatistics('event', parameters.resource.type, parameters.resource.summaryStatistics);
            } else {
                setStatistics('', '', {});
            }
        }
    }
    return summaryStatistics;
});