//@ts-check

"use strict";

const path = require("path");

const HtmlWebpackPlugin = require("html-webpack-plugin");
const HtmlInlineScriptPlugin = require("html-inline-script-webpack-plugin");

//@ts-check
/** @typedef {import('webpack').Configuration} WebpackConfig **/

/** @type WebpackConfig */
const extensionConfig = {
  target: "web",
  mode: "none", // this leaves the source code as close as possible to the original (when packaging we set this to 'production')

  entry: "./webview/src/index.tsx",
  output: {
    // the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
    path: path.resolve(__dirname, "dist/webview"),
    filename: "index.js",
  },
  resolve: {
    // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
    extensions: [".ts", ".tsx", ".js", ".jsx"],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "ts-loader",
            options: {
              // Keep package builds focused on extension entry dependencies.
              onlyCompileBundledFiles: true,
              configFile: path.resolve(__dirname, "webview/tsconfig.json"),
            },
          },
        ],
      },
    ],
  },
  devtool: "nosources-source-map",
  plugins: [
    new HtmlWebpackPlugin({
      template: "webview/src/index.html",
    }),
    new HtmlInlineScriptPlugin(),
  ],
};
module.exports = [extensionConfig];
