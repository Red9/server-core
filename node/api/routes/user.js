var userResource = requireFromRoot('support/resources/user');

function simplifyOutput(eventArray) {
    underscore.each(eventArray, function(element, index, list) {
        // Nothing to simplify, for now.
    });
    return eventArray;
}


exports.search = function(req, res, next) {
    var simpleOutput = false;
    if (typeof req.query['simpleoutput'] !== 'undefined') {
        delete req.query['simpleoutput'];
        simpleOutput = true;
    }

    // At this point, req.query has constraints.
    userResource.getUsers(req.query, function(results) {
        if (simpleOutput) {
            results = simplifyOutput(results);
        }
        res.json(results);
    });
};

exports.get = function(req, res, next) {
    var simpleOutput = false;
    if (typeof req.query['simpleoutput'] !== 'undefined') {
        delete req.query['simpleoutput'];
        simpleOutput = true;
    }

    // At this point, req.query has constraints.
    userResource.getUsers({id:req.param('id')}, function(results) {
        if (simpleOutput) {
            results = simplifyOutput(results);
        }
        res.json(results);
    });
};

exports.create = function(req, res, next) {
    res.status(501).json(JSON.parse('{"message":"Function not implemented yet."}'));
};

exports.update = function(req, res, next) {
    res.status(501).json(JSON.parse('{"message":"Function not implemented yet."}'));
};

exports.delete = function(req, res, next) {
    res.status(501).json(JSON.parse('{"message":"Function not implemented yet."}'));
};
