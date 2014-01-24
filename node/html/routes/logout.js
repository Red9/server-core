
exports.get = function(req, res) {
    req.logout();
    res.render('logout', {page_title:"Logout"});
};
