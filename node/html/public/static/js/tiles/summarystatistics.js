define(['vendor/jquery'], function($) {

    function summaryStatistics(sandbox, tile, configuration, doneCallback) {
        function init() {
            tile.addListener('totalState-resource-focused', resourceFocused);
            tile.setTitle('summary statistics');
            if (typeof sandbox.focusState.dataset !== 'undefined') {
                setStatisticsFocus('dataset');
            } else if (typeof sandbox.focusState.event !== 'undefined') {
                setStatisticsFocus('event');
            } else {
                setStatisticsFocus('');
            }
            doneCallback();
        }

        function setStatisticsFocus(type) {
            if (type === 'dataset') {
                setStatistics('dataset',
                        sandbox.focusState.dataset.title,
                        sandbox.focusState.dataset.headPanel.summaryStatistics);
            } else if (type === 'event') {
                setStatistics('event',
                        sandbox.focusState.event.type,
                        sandbox.focusState.event.summaryStatistics);
            } else {
                setStatistics('<undefined>', '<undefined>', {});
            }
        }

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

        function resourceFocused(event, parameter) {
            setStatisticsFocus(parameter.type);
        }

        function destructor() {
            sandbox
                    = tile
                    = configuration
                    = doneCallback
                    = null;
        }

        init();
        return {
            destructor: destructor
        };

    }
    return summaryStatistics;
});