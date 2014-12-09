module.exports = function (grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        shell: {
            runUnitTests: {
                command: "mkdir -p build; cd build; cmake ..; make check; make" // This last make is to prepare for the later tests.
            },
            runIntegrationTests: {
                command: "./bats/bin/bats --pretty tests-integration/rncprocessor.sh"
            }
        },
        watch: {
            files: ['*.cpp', 'src/**/*', 'tests/**/*', 'include/**/*', 'tests-integration/**/*'],
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