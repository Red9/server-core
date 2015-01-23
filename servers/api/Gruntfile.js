'use strict';

module.exports = function (grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        jshint: {
            files: ['*.js', '*/**/*.js', '!node_modules/**/*'],
            options: {
                // options here to override JSHint defaults
                laxbreak: true, // don't warn about putting operators on the next line.
                node: true
            }
        },
        jscs: {
            files: ['<%= jshint.files %>'],
            options: {
                config: 'google.json'
            }
        },
        lab: {
            files: ['test/**/*.js', '!test/utilities.js'],
            //coverage: true,
            color: true
        },
        watch: {
            files: ['<%= jshint.files %>', '*/**/*.json'],
            tasks: ['default']
        }
    });

    grunt.loadNpmTasks('grunt-lab');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-jscs');
    grunt.loadNpmTasks('grunt-contrib-watch');

    grunt.registerTask('default',
        [
            'jscs',
            'jshint',
            'lab'
        ]);
};
