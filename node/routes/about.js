exports.get = function(req, res, next){
    var parameters = {
        title: "about"
    };
    res.render("about", parameters)
}
