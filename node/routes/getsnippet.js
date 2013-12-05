exports.get = function(req, res, next) {
    var snippet_type = req.params.type;

    var start_time, end_time, parent;

    if (typeof req.param("startTime") !== "undefined") {
        start_time = req.param("startTime");
    }

    if (typeof req.param("endTime") !== "undefined") {
        end_time = req.param("endTime");
    }

    if (typeof req.param("parent") !== "undefined") {
        parent = req.param("parent");
    }


    if (snippet_type === "createeventmodal") {
        var parameters = {
            layout: false,
            start_time: start_time,
            end_time: end_time,
            parent: parent,
            EventType: [
                {name:"Wave: Left"},
                {name:"Wave: Right"},
                {name:"Wave"},
                {name:"Drop In"},
                {name:"Bottom Turn"},
                {name:"Snap"},
                {name:"Snap: Closeout"},
                {name:"Air Drop"},
                {name:"Cutback"},
                {name:"Floater"},
                {name:"Carve"},
                {name:"Tail Slide"},
                {name:"Pump"},
                {name:"360"},
                {name:"Reverse"},
                {name:"Air"},
                {name:"Paddle for Wave"},
                {name:"Paddle Out"},
                {name:"Paddle"},
                {name:"Duck Dive"}
            ]
        };
        res.render('snippets/createeventmodal', parameters);

    } else if (snippet_type === "eventtree") {

        if (typeof req.param("id") !== "undefined") {

            var parameters = {
                layout: false,
                event: {
                    id: req.param("id")
                }

            };


            res.render('snippets/eventtree', parameters);
        }

    } else {



        next();
    }



};


//res.render('report', {
//       title : 'My report'
//    , layout : false
//});

