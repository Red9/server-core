module.exports = function (grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        shell: {
            build: {
                // This last make is to prepare for the later tests.
                command: "mkdir -p build; cd build; cmake ..; make check; make"
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

    grunt.registerTask('build', 
        [
            'shell:build'
        ]);

    grunt.registerTask('default',
        [
            'shell'
        ]);
};
