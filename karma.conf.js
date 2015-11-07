// karma.conf.js
module.exports = function(config) {
  config.set({
    files: [
      'CodePrinter.js',
      'CodePrinter.css',
      'addons/*.js',
      'mode/*.js',
      'tests/codeprinter.js',
      'tests/document.js',
      'tests/caret.js',
      'tests/commands.js',
      'tests/mode/javascript.js',
      'tests/mode/jsx.js',
      'tests/mode/css.js',
      //'tests/mode/*.js'
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
