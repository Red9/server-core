
var database = require('./../support/database').database;

exports.get = function(req, res) {
    var parameters = {title: "Available Datasets", datasets: []};

    database.execute("SELECT id,data,name,submit_date,event_type FROM dataset",
            function(err, result) {
                if (err) {
                    console.log("Error: ", err);
                } else {
                    for (var i = 0; i < result.rows.length; i++) {
                        parameters.datasets.push({
                            id: result.rows[i].get('id'),
                            data: result.rows[i].get('data'),
                            name: result.rows[i].get('name'),
                            submit_date: result.rows[i].get('submit_date'),
                            event_type: result.rows[i].get('event_type')
                        });
                    }
                }
                res.render('view_data_index', parameters);
            });


}

