define(['vendor/underscore'], function(_) {
    function sandboxUtilities(sandbox) {
        // Utilities
        sandbox.truncateStringAtWord = function(string, maximumCharacters) {
            // Modified from http://stackoverflow.com/a/1199420
            var tooLong = string.length > maximumCharacters,
                    s_ = tooLong ? string.substr(0, maximumCharacters - 1) : string;
            s_ = tooLong ? s_.substr(0, s_.lastIndexOf(' ')) : s_;
            return  tooLong ? s_ + '&hellip;' : s_;
        };

        sandbox.createHumanAxesString = function(axesList) {
            var axes = {};
            _.each(axesList, function(axis) {
                var t = axis.split(':');
                var type = t[0];
                var direction = t[1];

                if (_.has(axes, type) === false) {
                    axes[type] = [];
                }
                axes[type].push(direction);
            });


            var axisIndex = 0;
            return _.reduce(axes, function(memo, axisValues, axisName) {
                if (axisIndex > 0) {
                    memo += ' and ';
                }
                memo += axisName + ' ';
                _.each(axisValues, function(v, i) {
                    if (i > 0) {
                        memo += ',';
                    }
                    memo += v;
                });
                axisIndex++;
                return memo;
            }, '');

        };


        var mappings = {
            "gps:altitude": "#FF6347",
            "gps:speed": "#8B4513",
            "gps:satellite": "#4B0082",
            "gps:hdop": "#228B22",
            "rotationrate:x": "#C71585",
            "rotationrate:y": "#32CD32",
            "rotationrate:z": "#4169E1",
            "magneticfield:x": "#FF4500",
            "magneticfield:y": "#3CB371",
            "magneticfield:z": "#191970",
            "pressure:pressure": "#2E8B57",
            "pressure:temperature": "#F4A460",
            "acceleration:x": "#FFA500",
            "acceleration:y": "#6B8E23",
            "acceleration:z": "#0000CD"
        };

        var additionalColors = [
            "#DA70D6",
            "#CD853F",
            "#B0E0E6",
            "#9ACD32"
        ];

        var additionalColorsIndex = 0;

        sandbox.colorMap = function(axis) {
            if (_.has(mappings, axis) === false) {
                mappings[axis] = additionalColors[additionalColorsIndex];
                additionalColorsIndex = (additionalColorsIndex + 1) % additionalColors.length;
            }
            return mappings[axis];
        };


        sandbox.calculateZoom = function(zoomDirection) {


            var datasetStartTime = sandbox.focusState.minStartTime;
            var datasetEndTime = sandbox.focusState.maxEndTime;
            var currentStartTime = sandbox.focusState.startTime;
            var currentEndTime = sandbox.focusState.endTime;

            var result = {};
            var currentDuration = currentEndTime - currentStartTime;
            var zoomInTime = Math.floor(currentDuration / 3);

            if (zoomDirection === 'outfull') {
                return {};
            } else if (zoomDirection === 'left') {
                if (typeof currentStartTime === 'undefined'
                        || typeof currentEndTime === 'undefined') {
                    // Zoom left and don't know where from
                    return {};
                }

                result = {
                    startTime: currentStartTime - zoomInTime,
                    endTime: currentEndTime - zoomInTime
                };
            } else if (zoomDirection === 'right') {
                if (typeof currentStartTime === 'undefined'
                        || typeof currentEndTime === 'undefined') {
                    // Zoom right and don't know where from
                    return {};
                }

                result = {
                    startTime: currentStartTime + zoomInTime,
                    endTime: currentEndTime + zoomInTime
                };
            } else if (zoomDirection === 'in') {
                if (typeof currentStartTime === 'undefined'
                        || typeof currentEndTime === 'undefined') {
                    // Zoom in and don't know where from
                    return {};
                }


                result = {
                    startTime: currentStartTime + zoomInTime,
                    endTime: currentEndTime - zoomInTime
                };
            } else { // Zoom direction === 'out'
                if (typeof currentStartTime === 'undefined'
                        || typeof currentEndTime === 'undefined'
                        || typeof datasetStartTime === 'undefined'
                        || typeof datasetEndTime === 'undefined') {
                    // Zoom out to we don't know where.
                    return {};
                }

                result = {
                    startTime: currentStartTime - currentDuration,
                    endTime: currentEndTime + currentDuration
                };
            }

            // Make sure the difference isn't too small.
            if (result.endTime <= result.startTime) {
                result.endTime = result.startTime + 1;
            }

            // Make sure they're not too big
            if (result.startTime < datasetStartTime) {
                delete result.startTime;
            }

            if (result.endTime > datasetEndTime) {
                delete result.endTime;
            }

            return result;
        };
    }

    return sandboxUtilities;

});