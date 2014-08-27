module.exports = function(grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        jshint: {
            files: ['Gruntfile.js', 'test/**/*.js', 'lib/**/*.js', '!lib/oldfiles/**/*'],
            options: {
                // options here to override JSHint defaults
                globals: {
                    //jQuery: true,
                    console: true
                },
                ignores: [],
                laxbreak: true, // don't warn about putting operators on the next line.
                sub: true // For the "is better written in dot notation" warning. Should really just restrict this to the unit tests.
            }
        },
        nodeunit: {
            all: ['test/**/test-*.js']
        },
        watch: {
            files: ['<%= jshint.files %>'],
            tasks: ['jshint', 'nodeunit']
        }
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-nodeunit');
    grunt.loadNpmTasks('grunt-contrib-watch');

    grunt.registerTask('default',
            [
                'jshint',
                'nodeunit'
            ]);
};