const path = require('path');
const webpack = require('webpack');
const HTMLWebpackPlugin = require('html-webpack-plugin');
const isProduction = process.env.NODE_ENV === 'production';
const { version } = require('./package.json');
const semver = require('semver');
const { major } = semver.parse(version);

module.exports = {
    entry: './src/app.js',
    mode: isProduction ? 'production' : 'development',

    // devtool: 'inline-source-map',
    // optimization: { minimize: false },

    output: {
        path: path.resolve(__dirname, 'dist', `v${major}`),
        filename: `firelin.widget${isProduction ? '.min' : ''}.js`,
        clean: true,
        environment: {
            arrowFunction: false
        }
    },

    devServer: {
        static: [
            {
                directory: path.resolve(__dirname, 'dist')
            },
            {
                directory: path.resolve(__dirname, 'src')
            }
        ],
        port: 3333,
        open: true,
        hot: true,
        compress: true,
        historyApiFallback: true
    },

    module: {
        rules: [
            {
                test: /\.css$/i,
                exclude: /node_modules/,
                type: 'asset/source'
            },
            {
                test: /\.(js)$/,
                exclude: /node_modules/,
                use: [{
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env']
                    }
                }],
            },
            {
                test: /\.html?$/i,
                loader: "html-loader",
                options: { sources: false }
            }
        ]
    },

    plugins: [
        isProduction
            ? new HTMLWebpackPlugin({
                title: 'Firelin Terminal Example',
                filename: 'index.html',
                template: path.resolve(__dirname, 'src/index.html'),
            })
            : null,
        new webpack.HotModuleReplacementPlugin(),
    ].filter(Boolean),
};
