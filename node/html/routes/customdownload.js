
var log = requireFromRoot('support/logger').log;

var panelResource = requireFromRoot('support/resources/panel');

exports.get = function(req, res, next){
    if (typeof req.params.uuid === "undefined") {
        next();
    }
    
    panelResource.get({id:req.params.uuid}, function(content){
        if(content.length !== 1){
            next();
        }else{
            // TODO(SRLM): This isn't very clean...
            var panel = content[0];
            panel["page_title"] = "Custom Download";
            res.render("customdownload", panel);
        }
    });
};

