// karma.conf.js
module.exports = function(config) {
  config.set({
    files: [
      'CodePrinter.js',
      'CodePrinter.css',
      'mode/*.js',
      'tests/test.js',
      'tests/css.js',
      'tests/html.js',
      'tests/javascript.js',
      'tests/json.js',
      'tests/markdown.js'
    ],
    frameworks: ['jasmine'],
    reporters: ['progress'],
    browsers: ['PhantomJS'],
    logLevel: config.LOG_INFO,
    port: 9876,
    colors: true,
    autoWatch: true,
    singleRun: false
  });
}
