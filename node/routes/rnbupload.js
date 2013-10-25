exports.get = function(req, res) {
    var fs = require('fs');

    fs.readFile('./private/default.cfg', function(cfg_err, default_configuration) {

        var parameters = {
            page_title: "RNB Uploader",
            textinputs: [
                {id:"title", label:"Dataset Title", description:"Chose a short, descriptive name. If not specified it will default to the filename."},
                {id:"cross_section_frequency", label:"Cross Section Frequency", description:"Select the output frequency for the cross section. Defaults to 100Hz. Please don't choose anything too high (storage availability is limited)"}
            ],
            
            textareas: [
                {id:"config", label:"Configuration Commands",description:"Input the rnb2rnt.jar configuration here, or leave the default.",default_text:default_configuration}
            ]
        };
        res.render('rnbupload', parameters);

    });


};
