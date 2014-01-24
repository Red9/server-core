
exports.get = function(req, res) {
    var parameters = {page_title: "Login"};
    if (typeof req.param("failed_login") !== "undefined"
            && req.param("failed_login") === "true") {
        parameters["failed_login"] = "true";
    }
    res.render('login', parameters);
};

