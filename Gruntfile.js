module.exports = function(grunt) {
  grunt.initConfig({
    server: {
      script: 'app.js'
    },

    jshint: {
      options: {
        jshintrc: '.jshintrc'
      },
      source: [ 'client/**/*.js', 'server/**/*.js', 'common/**/*.js' ]
    },

    regarde: {
      js: {
        files: [ 'client/**/*.js', 'server/**/*.js', 'common/**/*.js' ],
        tasks: [ 'express-server', 'livereload' ]
      }
    },

    cafemocha: {
      all: {
        src: 'test/**.test.js',
        options: {
          ui: 'bdd',
          reporter: 'nyan',
          bail: false,
          require: [
          ],
          globals: [
            'uuid'
          ]
        },
      }
    },

    copy: {
      requirejs: {
        expand: true,
        cwd: 'build/client/',
        src: [
          'site.js',
          'depths.js'
        ],
        dest: 'public/javascripts/client/'
      }
    },

    rsync: {
      production: {
        src: '.',
        dest: '/nodeapps/verold-airhockey/',
        host: 'node@airhockey.nodeapp.net',
        recursive: true,
        exclude: [ 'node_modules', '.git' ],
        delete: true
      }
    }
  });

  grunt.loadNpmTasks('grunt-regarde');
  grunt.loadNpmTasks('grunt-contrib-livereload');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-cafe-mocha');
  grunt.loadNpmTasks('grunt-express-server');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-rsync');

  grunt.registerTask('default', [ 'jshint', 'cafemocha' ]);
  grunt.registerTask('server', [ 'livereload-start', 'express-server', 'regarde'  ]);
  grunt.registerTask('watch',  [ 'jshint', 'cafemocha', 'livereload-start', 'regarde' ]);
};
