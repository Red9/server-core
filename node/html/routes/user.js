var userResource = requireFromRoot('support/resources/user');

exports.get = function(req, res, next) {
    
    userResource.get({id:req.params.uuid}, function(userList) {
        if (userList.length === 0) {
            next();
        } else {
            var user = userList[0];
            var properties = {
                title: "User " + user.displayName,
                user: user
            };
            res.render("user", properties);
        }
    });
};

exports.search = function(req, res, next){
    res.status(501).json(JSON.parse('{"message":"Function not implemented yet."}'));
};

exports.update = function(req, res, next){
    res.status(501).json(JSON.parse('{"message":"Function not implemented yet."}'));
};