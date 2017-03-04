'use strict';

const path = require('path');
const SRC_PATH = path.resolve(__dirname, './src');
const DIST_PATH = path.resolve(__dirname, './dist');
const IS_DEV = process.env.NODE_ENV === 'development';

module.exports = {
  context: SRC_PATH,
  devtool: IS_DEV ? '#cheap-module-eval-source-map' : false,
  entry: {
    CodePrinter: './index.js',
  },
  output: {
    path: DIST_PATH,
    filename: '[name].js',
    library: 'CodePrinter',
  },
  resolve: {
    modules: [SRC_PATH, 'node_modules']
  },
  devServer: {
    contentBase: __dirname,
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        loaders: ['style-loader', 'css-loader', 'postcss-loader']
      }
    ]
  }
};
