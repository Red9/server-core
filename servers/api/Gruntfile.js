module.exports = function (grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        jshint: {
            files: ['Gruntfile.js', 'index.js', 'routes/**/*.js', 'support/**/*.js', 'test/**/*.js', 'resources/**/*.js', 'panel/*.js'],
            options: {
                // options here to override JSHint defaults
                laxbreak: true, // don't warn about putting operators on the next line.
                //sub: true, // For the "is better written in dot notation" warning. Should really just restrict this to the unit tests.
                node: true
            }
        },
        lab: {
            color: true,
            coverage: true
        },
        watch: {
            files: ['<%= jshint.files %>'],
            tasks: ['default']
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



//shell: {
//    prepareTestDataDir: {
//        command: "rm -rf testdata_temp; mkdir testdata_temp"
//    },
//    cleanupTestDataDir: {
//        command: "rm -rf testdata_temp"
//    }
//},
//nodeunit: {
//    all: ['test/**/test-*.js'],
//        options: {
//        reporter: 'grunt'
//    }
//},
//watch: {
//    files: ['<%= jshint.files %>'],
//        tasks: ['jshint', 'shell:prepareTestDataDir', 'nodeunit', 'shell:cleanupTestDataDir']
//}
//});
//
//grunt.loadNpmTasks('grunt-contrib-jshint');
//grunt.loadNpmTasks('grunt-contrib-nodeunit');
//grunt.loadNpmTasks('grunt-contrib-watch');
//grunt.loadNpmTasks('grunt-shell');
//
//grunt.registerTask('default',
//    [
//        'jshint',
//        'shell:prepareTestDataDir',
//        'nodeunit',
//        'shell:cleanupTestDataDir'
//    ]);