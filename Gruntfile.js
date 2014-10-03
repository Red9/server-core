module.exports = function(grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        clean: {
            before: ['release/'],
            after: ['.tmp/']
        },
        copy: {
            main: {
                files: [
                    // Copy assets over
                    {expand: true, src: ['static/css/**'], dest: 'release/'},
                    {expand: true, src: ['static/fonts/**'], dest: 'release/'},
                    {expand: true, src: ['static/images/**'], dest: 'release/'},
                    {expand: true, src: ['static/partials/**'], dest: 'release/'},
                    {expand: true, src: ['static/templates/**'], dest: 'release/'},
                    {expand: true, src: ['static/js/**'], dest: 'release'}
                ]
            },
            index: {
                src: 'index.html',
                dest: 'release/index.html'
            }
        },
        ngAnnotate: {
            options: {
                singleQuotes: true
            },
            mainapp: {
                files: [
                    {
                        expand: true,
                        src: ['release/**/*.js'],
                        dest: '',
                        //ext: '.annotated.js',
                        //extDot: 'last'
                    }
                ]
            }
        },
        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> <%= grunt.template.today("dd-mm-yyyy") %> */\n',
                mangle: {
                    except: ["$super"] // Don't modify the "$super" text, needed to make Rickshaw pass optimization.
                }
            }
        },
        jshint: {
            files: ['Gruntfile.js', 'static/**/*.js'],
            options: {
                // options here to override JSHint defaults
                globals: {
                    //jQuery: true,
                    console: true,
                    document: true,
                    angular: true,
                    window: true
                },
                ignores: ['static/js/vendor/*.js', 'static/js/vendor_old/*.js'],
                laxbreak: true // don't warn about putting operators on the next line.
            }


        },
        useminPrepare: {
            html: 'release/index.html',
            options: {
                dest: 'release'
            }
        },
        usemin: {
            html: 'release/index.html'
        }
    });

    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-ng-annotate');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-usemin');

    grunt.registerTask('test', ['jshint']);

    grunt.registerTask('default',
            [
                'jshint',
                'clean:before',
                'copy',
                'ngAnnotate',
                'useminPrepare',
                'concat:generated',
                'cssmin:generated',
                'uglify:generated',
                'usemin',
                'clean:after'
            ]);

    grunt.registerTask('copydir', ['clean', 'copy']);

};