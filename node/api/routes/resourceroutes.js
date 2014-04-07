var event = {
    simplifyOutput: [
        'summaryStatistics'
    ],
    resource: 'event',
    root: '/event/',
    allowed:[
        'create',
        'search',
        'describe',
        'get',
        'update',
        'delete'
    ]
};

var comment = {
    resource: 'comment',
    root: '/comment/',
    allowed:[
        'create',
        'search',
        'describe',
        'get',
        'update',
        'delete'
    ]
};

var video = {
    resource: 'video',
    root: '/video/',
    allowed:[
        'create',
        'search',
        'describe',
        'get',
        'update',
        'delete'
    ]
};

var dataset = {
    simplifyOutput: [
        'source'
    ],
    resource: 'dataset',
    root: '/dataset/',
    allowed:[
        'search',
        'describe',
        'get',
        'update',
        'delete'
    ]
};

var user = {
    resource: 'user',
    root: '/user/',
    allowed:[
        'search',
        'describe',
        'get',
        'update'
    ]
};

var panel = {
    resource: 'panel',
    root: '/panel/',
    allowed:[
        'create',
        'search',
        'describe',
        'get',
        'update',
        'delete'
    ],
    extraRoutes:[
        {
            method:'get',
            path: '/panel/:id/body',
            handler:requireFromRoot('api/routes/panelextra').getBody
        },
        {
            method:'put',
            path: '/panel/:id/body',
            handler:requireFromRoot('api/routes/panelextra').updateBody
        }
    ]
            
};

module.exports.event = event;
module.exports.dataset = dataset;
module.exports.user = user;
module.exports.panel = panel;
module.exports.comment = comment;
module.exports.video = video;