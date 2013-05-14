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

    rsync: {
      production: {
        src: '.',
        dest: '/nodeapps/verold-airhockey/',
        host: 'node@nodeapp.net',
        recursive: true,
        exclude: [ 'node_modules', '.git' ],
        delete: true
      }
    }
  });

  grunt.loadNpmTasks('grunt-regarde');
  grunt.loadNpmTasks('grunt-contrib-livereload');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-express-server');
  grunt.loadNpmTasks('grunt-rsync');

  grunt.registerTask('default', [ 'jshint' ]);
  grunt.registerTask('server', [ 'livereload-start', 'express-server', 'regarde'  ]);
  grunt.registerTask('watch',  [ 'jshint', 'livereload-start', 'regarde' ]);
};
