module.exports = function (grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        jshint: {
            files: ['Gruntfile.js', 'index.js', 'routes/**/*.js', 'support/**/*.js', 'test/**/*.js', 'resources/**/*.js', 'panel/*.js', 'views/**/*.js'],
            options: {
                // options here to override JSHint defaults
                laxbreak: true, // don't warn about putting operators on the next line.
                node: true
            }
        },
        lab: {
            files: ['test/**/*.js', '!test/utilities.js'],
            //coverage: true,
            color: true
        },
        watch: {
            files: ['<%= jshint.files %>'],
            tasks: ['default']
        },
        shell: {
            prepareCassandra: {
                command: 'cat ../../scripts/cassandra/create_database_test.cql ../../scripts/cassandra/create_database_common.cql ../../scripts/cassandra/test_additional.cql | cqlsh -u cassandra -p cassandra'
            },
            cleanupCassandra: {
                command: 'cat ../../scripts/cassandra/drop_database_test.cql | cqlsh -u cassandra -p cassandra'
            }
        }
    });

    grunt.loadNpmTasks('grunt-lab');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-shell');

    grunt.registerTask('default',
        [
            'jshint',
            'shell:cleanupCassandra', // cleanup first since if a previous test fails the final cleanup isn't run
            'shell:prepareCassandra',
            'lab',
            'shell:cleanupCassandra' // clean up here too because, well, it's clean.
        ]);
};