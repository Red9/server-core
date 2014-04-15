exports.get = function(req, res) {
    var parameters = {
        page_title: "RNC Upload"
    };
    res.render('upload', parameters);
};
