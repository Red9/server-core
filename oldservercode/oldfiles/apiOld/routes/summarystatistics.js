var summaryStatisticsResource = requireFromRoot('support/resources/summarystatistics');

exports.calculate = function(req, res, next) {
    summaryStatisticsResource.calculate(
            req.param('id'),
            req.param('startTime'),
            req.param('endTime'),
            function(statistics) {
                res.json(statistics);
            });
};