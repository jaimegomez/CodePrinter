module.exports = function(grunt) {
  
  grunt.initConfig({
    karma: {
      unit: {
        options: {
          files: [
            'CodePrinter.js',
            'CodePrinter.css',
            'mode/JavaScript.js',
            'tests/test.js',
            'tests/javascript.js'
          ],
          frameworks: ['jasmine'],
          reporters: ['progress'],
          browsers: ['PhantomJS'],
          logLevel: 'INFO',
          port: 9876,
          colors: true,
          autoWatch: true,
          singleRun: true
        }
      }
    }
  });
  
  grunt.loadNpmTasks('grunt-karma');
  grunt.registerTask('default', ['karma']);
};
