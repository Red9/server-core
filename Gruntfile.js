'use strict';

module.exports = function (grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        hub: {
            all: {
                src: ['*/**/Gruntfile.js', '!*/**/node_modules/**/*.js', '!node_modules/**/*.js'],
                tasks: ['default']
            }
        }
    });

    grunt.loadNpmTasks('grunt-hub');

    grunt.registerTask('default',
        [
            'hub'
        ]);
};

