"use strict";

var Joi = require('joi');
var validators = require('../../support/validators');
var _ = require('underscore')._;
var Boom = require('boom');
var nconf = require('nconf');

var fs = require('fs');

var datasetRoute = require('../models/dataset');

var videoTypes = {
    'GoPro_720p_59.94hz': {
        name: 'GoPro    720p   59.94Hz',
        numerator: 1001,
        denominator: 60000,
        framesPerVideo: 71623552,
        pixels: {
            width: 1280,
            height: 720
        }
    },
    'standard_1080p_29.97hz': {
        name: 'Standard    1080p   29.97Hz',
        numerator: 1001,
        denominator: 30000,
        framesPerVideo: 71623552 * 10,
        pixels: {
            width: 1920,
            height: 1080
        }
    },
    'standard_720p_59.97hz': {
        name: 'Standard    720p    59.97Hz',
        numerator: 1001,
        denominator: 60000,
        framesPerVideo: 71623552 * 20,
        pixels: {
            width: 1280,
            height: 720
        }
    }
};

exports.init = function (server, models) {
    server.views({
        engines: {
            fcpxml: require('handlebars')
        },
        path: 'views/fcpxml',
        helpersPath: 'views/helpers'
    });

    var templates = _.map(fs.readdirSync('views/fcpxml'), function (filename) {
        return filename.substr(0, filename.lastIndexOf('.'));
    });

    server.route({
        method: 'GET',
        path: '/dataset/{id}/fcpxml/options',
        handler: function (request, reply) {

            models.dataset
                .findOne({
                    include: [models.event, models.video],
                    where: {id: request.params.id}
                })
                .then(function (dataset) {
                    reply({
                        template: templates,
                        videoType: videoTypes,
                        eventType: _.chain(dataset.events).pluck('type').uniq().value()
                    });
                })
                .catch(function (err) {
                    request.log(['error'], 'Error in fcpxml options: ' + err);
                });
        },
        config: {
            validate: {
                params: {
                    id: datasetRoute.model.id.required()
                }
            },
            description: 'Get FCXML options',
            notes: 'Get the detailed options that are available to a GET /dataset/{id}/fcpxml',
            tags: ['api']/*,
             auth: {
             scope: 'admin'
             }*/

        }
    });

    server.route({
        method: 'GET',
        path: '/dataset/{id}/fcpxml',
        handler: function (request, reply) {
            // TODO(SRLM): Update this to use sequelize
            resources.dataset.findByIdOptions(request.params.id, {$expand: ['event', 'video']}, function (err, dataset) {
                if (err) {
                    reply(err);
                    return;
                } else if (dataset.video.length === 0) {
                    reply(Boom.badRequest('No videos associated with this dataset. Cannot generate FCPXML.'));
                    return;
                } else if (dataset.event.length === 0) {
                    reply(Boom.badRequest('No events associated with this dataset. Cannot generate FCPXML.'));
                    return;
                }

                var fcpParameters = calculateParameters(
                    videoTypes[request.query.videoType],
                    request.query.files.split(','),
                    request.query.titleDuration,
                    request.query.eventType,
                    dataset.event,
                    dataset.video[0],
                    dataset
                );

                reply.view('original', fcpParameters)
                    .header('content-disposition', 'attachment; filename=' + dataset.id + '.xml')
                    .header('content-type', 'text/xml; charset=utf-8');
            });

        },
        config: {
            validate: {
                params: {
                    id: datasetRoute.model.id.required()
                },
                query: {
                    template: Joi.string().valid(templates).required().description('The template to use for output'),
                    videoType: Joi.string().valid(Object.keys(videoTypes)).required().description('The type of video to generate for'),
                    files: Joi.string().required().description('CSV list of file paths to the video'),
                    eventType: Joi.string().required().description('Restrict output to events of specified type'),
                    titleDuration: Joi.number().integer().min(0).default(3).description('The number of seconds to display the title at the beginning of an event. 0 removes titles entirely.')
                }
            },
            description: 'Dataset defined FCPXML file',
            notes: 'Get an FCPXML video file for this dataset.',
            tags: ['api']/*,
             auth: {
             scope: 'admin'
             }*/
        }
    });
};

function calculateParameters(videoDefinition, files, titleDurationGiven, eventType, eventList, video, dataset) {
    var framesPerVideo = videoDefinition.framesPerVideo;
    var numerator = videoDefinition.numerator;
    var denominator = videoDefinition.denominator;
    var pixels = videoDefinition.pixels;

    // Frames are on the 1001 boundary, so make sure that we're there.
    function frameCorrected(value) {
        return Math.floor(value / numerator) * numerator;
    }

    var assets = _.map(files, function (filename, index) {
        return {
            ref: 'r' + (index + 3),
            source: filename.replace(/ /g, '%20'),
            start: index * framesPerVideo,
            duration: framesPerVideo
        };
    });

    // Reverse so that the matching of clip to video uses the video that
    // is "rightmost"
    assets.reverse();

    var titleReferenceCounter = 1;
    var titleDuration = frameCorrected(titleDurationGiven * denominator);

    var runningOffset = 0;
    var clips =
        _.chain(eventList)
            // Only include events who meet the minimum staring requirements.
            .filter(function (event) {
                return (eventType === event.type);
            })
            .sortBy(function (event) {
                return event.startTime;
            })
            .map(function (event, index, list) {
                var durationFrames = frameCorrected((event.endTime - event.startTime) / 1000 * denominator);
                var startFramesTotal = frameCorrected((event.startTime - video.startTime) / 1000 * denominator);

                // Find the asset. The list must be reversed for this
                // to work correctly.
                var asset = _.find(assets, function (asset) {
                    return asset.start <= startFramesTotal;
                });

                var startFrames = startFramesTotal - asset.start;

                var distance = 'unknown';
                try {
                    //console.log('event.summaryStatistics.distance: ' + JSON.stringify(event.summaryStatistics.distance, null, '  '));
                    distance = Math.round(event.summaryStatistics.distance.path);
                } catch (e) {
                }

                var result = {
                    offsetFrames: runningOffset,
                    durationFrames: durationFrames,
                    startFrames: startFrames,
                    video: asset,
                    denominator: denominator,
                    event: event,
                    index: index + 1,
                    total: list.length
                };

                if (titleDuration !== 0) {
                    result.title = {
                        textARef: 'ts' + (titleReferenceCounter++),
                        textBRef: 'ts' + (titleReferenceCounter++),
                        offset: startFrames,
                        duration: titleDuration
                    };
                }

                runningOffset += durationFrames;
                return result;
            })
            .value();

    assets.reverse(); // Mostly for aesthetic reasons in the result.

    var parameters = {
        asset: assets,
        clip: clips,
        numerator: numerator,
        denominator: denominator,
        pixels: pixels,
        eventType: eventType,
        dataset: dataset
    };

    return parameters;
}