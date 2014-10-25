//var datasetResource = requireFromRoot('support/resources/dataset');
//var eventResource = requireFromRoot('support/resources/event');


/** We do initial checks to make sure that the requested resource actually exists.
 * If it doesn't we'll redirect to the 404 page.
 *
 */

exports.getDataset = function (req, res, next) {
    res.render('spa', {spa: true});
};
//
//exports.getEvent = function (req, res, next) {
//    eventResource.get({id: req.param('id')}, function (events) {
//        if (events.length === 1) {
//            res.render('spa', {spa: true});
//        } else {
//            next();
//        }
//    });
//};