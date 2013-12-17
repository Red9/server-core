var database = require('./../support/database');
var log = require('./../support/logger');


function AddToTree(uuid, callback) {
    database.GetRow("event", "id", uuid, function(row) {

        if (typeof row !== "undefined") {
            var node = {
                name: row.type,
                id: row.id
            };

            if (row.children) {
                node["children"] = []

                for (var i = 0; i < row.children.length; i++) {

                    AddToTree(row.children[i], function(child) {
                        node["children"].push(child);
                        if (node["children"].length === row.children.length) {
                            if (callback) {
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
        database.GetRow("event", "id", root_id, function(row) {

            // If node has parent then include that in the graph.
            if (row.parent) {
                database.GetRow("event", "id", row.parent, function(parent) {
                    var tree = {
                        name: parent.type,
                        id: parent.id,
                        children: []
                    };
                    AddToTree(root_id, function(tree2) {
                        tree2["primary"] = true;
                        tree.children.push(tree2);
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
};