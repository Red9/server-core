module.exports = function (grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        jshint: {
            files: ['Gruntfile.js', 'index.js', 'routes/**/*.js', 'support/**/*.js'],
            options: {
                // options here to override JSHint defaults
                globals: {
                    console: true
                },
                ignores: [],
                laxbreak: true, // don't warn about putting operators on the next line.
                sub: true, // For the "is better written in dot notation" warning. Should really just restrict this to the unit tests.
                node: true
            }
        },
        lab: {
            color: true,
            coverage: true
        },
        watch: {
            files: ['<%= jshint.files %>'],
            tasks: ['jshint', 'lab']
        }
    });

    grunt.loadNpmTasks('grunt-lab');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-watch');

    grunt.registerTask('default',
        [
            'jshint',
            'lab'
        ]);
};