/* 
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */


function RequestQueue(parameters, dataset) {
    this.cache = [];
    this.apiUrl = parameters.apiUrl;
    this.dataset = dataset;
}


//-----------------------------------------------------------------------------
// Private
//-----------------------------------------------------------------------------

RequestQueue.prototype.addToCache = function(minimumTime, maximumTime, callback) {
    console.log("RequestQueue.addToCache");
    var requestUrl = this.apiUrl + '/dataset/' + this.dataset.id + '/panel/'
            + '?minmax'
            + '&format=json'
            + '&start_time=' + minimumTime
            + '&end_time=' + maximumTime
            + '&buckets=1000';

    $.ajax({
        type: 'GET',
        url: requestUrl,
        dataType: 'json',
        success: $.proxy(function(panel) {
            panel.minimumTime = minimumTime;
            panel.maximumTime = maximumTime;
            
            this.cache.push(panel);
            callback(panel);
            
        }, this)
    });
};

RequestQueue.prototype.trimPanel = function(panel, axes){
    
    // Figrue out the indicies of the requested axes.
    var indicies = [];
    var updatedAxes = [];
    updatedAxes.push("time");
        
    var classInstance = this;
    _.each(axes, function(column_title){
       var index = $.inArray(column_title, classInstance.dataset.column_titles);
       if(index !== -1){
           indicies.push(index + 1); //+1 for time in 0 position of panel
           updatedAxes.push(column_title);
       }
    });
    
    
    
    // Trim the dataset to include only the requested axes.
    // May include reordering the axes!
    var values = [];
   
    _.each(panel.values, function(row){
        var newRow = [];
        
        var time = moment(row[0]).toDate();
        newRow.push(time); 
        _.each(indicies, function(index){
            newRow.push(row[index]);
        });
        values.push(newRow);
    });
    
    
    
    //console.log('panel labels: ' + JSON.stringify(updatedAxes));
    var updatedPanel = {
        labels:updatedAxes,
        values:values,
        minimumTime:panel.minimumTime,
        maximumTime:panel.maximumTime
    };
    
    return updatedPanel;
    
};


//-----------------------------------------------------------------------------
// Public
//-----------------------------------------------------------------------------

RequestQueue.prototype.requestPanel = function(minimumTime, maximumTime, axes, callback) {    
    var classInstance = this;
    this.addToCache(minimumTime, maximumTime, function(panel){
       
       var trimmedPanel = classInstance.trimPanel(panel, axes);
       callback(trimmedPanel);
    });
};


