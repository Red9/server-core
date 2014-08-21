module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    clean: ['release/'],
    copy: {
        main: {
            files: [
                // Copy the Non JS assets over
                {expand: true, src: ['static/css/**'], dest: 'release/css/'},
                {expand: true, src: ['static/fonts/**'], dest: 'release/fonts/'},
                {expand: true, src: ['static/images/**'], dest: 'release/images/'},
                {expand: true, src: ['static/partials/**'], dest: 'release/partials/'},
                {expand: true, src: ['static/templates/**'], dest: 'release/templates/'}
            ]
        }
    },
    concat: {
      options: {
        separator: ';'
      },
      mainapp: {
        src: ['static/js/singlepage/*.js'],
        dest: 'release/js/singlepage/apprelease.js'
      },
      vendor: {
        src: ['static/js/vendor/*.js'],
        dest: 'release/js/vendor/vendor.js'
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
                    ext: '.annotated.js',
                    extDot: 'last'
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
      },
        mainapp: {
            files: [
                {
                    expand: true,
                    src: ['release/**/*.annotated.js'],
                    ext: '.min.js',
                    extDot: 'last'
                }
            ]
        }
    },
//    qunit: {
//      files: ['test/**/*.html']
//    },
    jshint: {
      files: ['Gruntfile.js', 'static/**/*.js'],
      options: {
        // options here to override JSHint defaults
        globals: {
          jQuery: true,
          console: true,
          document: true,
          angular:true,
          window:true
        },
        ignores: ['static/js/vendor/*.js', 'static/js/vendor_old/*.js'],
        laxbreak: true // don't warn about putting operators on the next line.
      }
      

    }
/*    watch: {
      files: ['<%= jshint.files %>'],
      tasks: ['jshint', 'qunit']
    }*/
  });

  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jshint');
//  grunt.loadNpmTasks('grunt-contrib-qunit');
//  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-ng-annotate');

  grunt.registerTask('test', ['jshint']);

  grunt.registerTask('default', ['clean', 'copy', 'jshint', 'concat', 'ngAnnotate', 'uglify']);

  grunt.registerTask('copydir', ['clean', 'copy']);

};
