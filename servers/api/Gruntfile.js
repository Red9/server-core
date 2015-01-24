'use strict';

module.exports = function (grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        jshint: {
            files: [
                '*.js',
                '*/**/*.js',
                '!node_modules/**/*',
                '!reports/**/*.js'
            ],
            options: {
                // options here to override JSHint defaults
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
            coverage: true,
            minCoverage: 88,
            color: true
        },
        watch: {
            files: ['<%= jshint.files %>', '*/**/*.json'],
            tasks: [
                'jshint',
                'jscs',
                'lab'
            ]
        },
        plato: {
            general: {
                options: {
                    jshint: false
                },
                files: {
                    'reports': ['<%= jshint.files %>']
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-lab');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-jscs');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-plato');

    grunt.registerTask('default',
        [
            'jshint',
            'jscs',
            'lab',
            'plato'
        ]);
};
