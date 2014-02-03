exports.get = function(req, res, next) {
    var type = req.param('type');

    //TODO(SRLM): Validate ID for correct HTML
    var id = req.param('id');


    if (type === 'eventlist') {
        res.render('lenses/eventlist', {
            layout: false,
            id: id
        });

    } else if (type === 'googlemap') {
        res.render('lenses/googlemap', {
            layout: false,
            id: id
        });
    } else {
        next();
    }


};