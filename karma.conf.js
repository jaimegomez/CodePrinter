// karma.conf.js
const webpackConfig = require('./webpack.config.js');

module.exports = config => {
  config.set({
    files: [
      'tests.js',
    ],
    frameworks: ['jasmine'],
    reporters: ['spec'],
    browsers: ['Chrome'],
    preprocessors: {
      'tests.js': ['webpack', 'sourcemap'],
    },
    webpack: {
      devtool: 'inline-source-map',
      module: webpackConfig.module,
      resolve: webpackConfig.resolve,
    },
    webpackMiddleware: {
      stats: 'errors-only'
    },
    logLevel: config.LOG_INFO,
    port: 9876,
    colors: true,
    autoWatch: true,
    singleRun: false
  });
}
