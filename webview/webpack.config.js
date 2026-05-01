//@ts-check

'use strict';

const path = require('path');

const HtmlWebpackPlugin = require('html-webpack-plugin');

const VIEWS = ['Editor', 'OtherView'];

//@ts-check
/** @typedef {import('webpack').Configuration} WebpackConfig **/

/** @type WebpackConfig */
const extensionConfig = {
  target: 'web',
  mode: 'none', // this leaves the source code as close as possible to the original (when packaging we set this to 'production')
  entry: Object.fromEntries(VIEWS.map((view) => [view, `./src/${view}.tsx`])),
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true,
  },
  resolve: {
    // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              // Keep package builds focused on extension entry dependencies.
              onlyCompileBundledFiles: true,
            },
          },
        ],
      },
    ],
  },
  devtool: 'nosources-source-map',
  plugins: VIEWS.map(
    (view) =>
      new HtmlWebpackPlugin({
        filename: `${view}.html`,
        template: 'src/template.html',
        chunks: [view],
        templateParameters: {
          title: view,
        },
      }),
  ),
};
module.exports = [extensionConfig];
