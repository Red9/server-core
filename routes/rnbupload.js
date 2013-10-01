/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

exports.get = function(req, res) {

    var fs = require('fs');



    fs.readFile('./private/default.cfg', function(cfg_err, default_configuration) {

        var parameters = {
            title: "File Uploader",
            textinputs: [
                {id:"title", label:"Dataset Title",description:"Chose a short, descriptive name"},
                {id:"video_url", label:"Video URL",description:"If you have a video that accompanies this data then you can link the URL here."},
                {id:"event_type", label:"Event Type",description:"What does this data describe? Please choose a short descriptive text such as 'surfing' or 'offroad dirtbiking'."},
                {id:"cross_section_frequency", label:"Cross Section Frequency", description:"Select the output frequency for the cross section. Defaults to 100Hz. Please don't choose anything too high (storage availability is limited)"}
            ],
            
            textareas: [
                {id:"description", label:"File description and notes.", description:"Input any relevant information here such as what the recorder was doing, any notable events, and so on.",default_text:""},
                {id:"config", label:"Configuration Commands",description:"Input the rnb2rnt.jar configuration here, or leave the default.",default_text:default_configuration}
            ]
        };


        res.render('form', parameters);

    });


};
