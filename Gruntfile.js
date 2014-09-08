module.exports = function (grunt) {

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
        shell: {
          setupUnittestDatabase: {
              command: "cqlsh -e \"DESCRIBE KEYSPACE dev;\" | sed -e 's/CREATE KEYSPACE dev/DROP KEYSPACE unittest;\\nCREATE KEYSPACE unittest/' | sed -e \"s/USE dev/USE unittest/\" | cqlsh"
          }
        },
        nodeunit: {
            all: ['test/**/test-*.js'],
            options: {
                reporter: 'grunt'
            }
        },
        watch: {
            files: ['<%= jshint.files %>'],
            tasks: ['jshint', 'shell', 'nodeunit']
        }
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-nodeunit');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-shell');


    grunt.registerTask('default',
        [
            'jshint',
            'shell',
            'nodeunit'
        ]);
};