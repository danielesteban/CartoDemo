const production = process.env.NODE_ENV === 'production';
const webpack = require('webpack');
const autoprefixer = require('autoprefixer');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

const basename = process.env.BASENAME || '/';
const modulesPath = path.resolve(__dirname, 'node_modules');
const outputPath = path.resolve(__dirname, 'dist');
const srcPath = path.resolve(__dirname, 'src');

module.exports = {
  devtool: production ? 'cheap-module-source-map' : 'eval-source-map',
  entry: {
    app: [
      path.join(srcPath, 'styles'),
      'babel-polyfill',
      'whatwg-fetch',
      srcPath,
    ],
  },
  output: {
    path: outputPath,
    filename: `static/${(production ? '[hash].js' : '[name].js')}`,
    publicPath: basename,
  },
  resolve: {
    modules: [srcPath, modulesPath],
    extensions: ['.js', '.sass'],
  },
  module: {
    rules: [
      /* Transpile JS source */
      {
        test: /\.js$/,
        exclude: [/node_modules/, /\.worker\.js$/],
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [
                ['es2015', { modules: false }],
                'stage-2',
              ],
            },
          },
        ],
      },
      /* Inline workers */
      {
        test: /\.worker\.js$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'worker-loader',
            options: {
              inline: true,
              fallback: false,
              name: `static/${(production ? '[hash].js' : '[name].js')}`,
            },
          },
          {
            loader: 'babel-loader',
            options: {
              compact: false,
              presets: [
                ['es2015', { modules: false }],
                'stage-2',
              ],
            },
          },
        ],
      },
      /* Stringify shaders */
      {
        test: /\.(frag|vert|glsl)$/,
        exclude: /node_modules/,
        use: 'webpack-glsl-loader',
      },
      /* Compile styles */
      {
        test: /\.sass$/,
        exclude: /node_modules/,
        use: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: [
            {
              loader: 'css-loader',
              options: {
                importLoaders: 2,
                sourceMap: true,
              },
            },
            {
              loader: 'postcss-loader',
              options: {
                plugins: () => [autoprefixer({ browsers: ['last 2 versions'] })],
                sourceMap: true,
              },
            },
            {
              loader: 'sass-loader',
              options: {
                outputStyle: 'compressed',
                sourceMap: true,
              },
            },
          ],
        }),
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify(production ? 'production' : 'development'),
      },
      __DEVELOPMENT__: !production,
      __PRODUCTION__: production,
      __BASENAME__: JSON.stringify(basename.substr(0, basename.length - 1)),
    }),
    new ExtractTextPlugin({
      filename: `static/${(production ? '[hash].css' : '[name].css')}`,
      allChunks: true,
    }),
    new HtmlWebpackPlugin({
      title: 'Rendering Demo for Carto',
      template: path.join(srcPath, 'index.ejs'),
      minify: {
        collapseWhitespace: true,
      },
    }),
  ].concat(!production ? [
    new webpack.NamedModulesPlugin(),
    new webpack.NoEmitOnErrorsPlugin(),
  ] : [
    // new webpack.optimize.UglifyJsPlugin({
    //   compressor: {
    //     warnings: false,
    //     screw_ie8: true,
    //   },
    //   sourceMap: true,
    // }),
  ]),
};
