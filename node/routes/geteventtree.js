var database = require('./../support/database');
var log = require('./../support/logger');


function AddToTree(uuid, callback) {
    database.GetRow("event", "id", uuid, function(row) {

        if (typeof row !== "undefined") {
            //console.log("Row info: ", row);
            /*var node = {
             name: row.type,
             id: row.id
             };*/
            var node = row;

            if (node["children"]) {
                //node["children"] = []
                var newchildren = [];

                for (var i = 0; i < node["children"].length; i++) {

                    AddToTree(node["children"][i], function(child) {
                        newchildren.push(child);
                        if (node["children"].length === newchildren.length) {
                            if (callback) {
                                node["children"] = newchildren;
                                callback(node);
                            }
                        }
                    });

                }
            } else {
                if (callback) {
                    callback(node);
                }
            }
        } else {
            log.error("Error! Row undefined. id: '" + uuid + "'");
        }

    });
}


exports.get = function(req, res, next) {
    var root_id = req.params.uuid;
    if (typeof root_id === "undefined") {
        next();
    } else {
        database.GetEventTree(root_id, function(root) {
            root["primary"] = true;
            // If node has parent then include that in the graph.
            if (root["parent"] !== null) {
                database.GetRow("event", "id", root["parent"], function(parent) {
                    parent["children"] = [root];
                    res.json(parent);
                });
            } else {
                res.json(root);
            }
        });
    }
};

/*
 exports.get = function(req, res, next) {
 var root_id = req.params.uuid;
 if (typeof root_id === "undefined") {
 next();
 } else {
 database.GetRow("event", "id", root_id, function(row) {
 
 // If node has parent then include that in the graph.
 if (row.parent) {
 database.GetRow("event", "id", row.parent, function(parent) {
 /*var tree = {
 name: parent.type,
 id: parent.id,
 children: []
 };*//*
  
  var tree = row;
  
  AddToTree(root_id, function(tree2) {
  tree2["primary"] = true;
  tree["children"] = [tree2];
  res.json(tree);
  });
  });
  } else {
  AddToTree(root_id, function(tree) {
  tree["primary"] = true;
  res.json(tree);
  });
  }
  });
  
  
  
  
  }
  };*/