var database = require('./../../support/database');

exports.get = function(req, res, next) {
    
    database.getUser(req.params.uuid, function(userinfo) {
        if (typeof userinfo === "undefined") {
            next();
        } else {
            var properties = {
                title: "User " + userinfo["display_name"],
                user: userinfo
            };
            res.render("user", properties);
        }
    });
};