module.exports = function (grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        shell: {
            runUnitTests: {
                command: "cd build; cmake ..; make check"
            }
        },
        watch: {
            files: ['main.cpp', 'src/**/*', 'tests/**/*', 'include/**/*'],
            tasks: ['shell']
        }
    });

    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-shell');


    grunt.registerTask('default',
        [
            'shell'
        ]);
};