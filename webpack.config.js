const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const HTMLWebpackPlugin = require('html-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const isProduction = process.env.NODE_ENV === 'production';
const { version } = require('./package.json');
// const semver = require('semver');
// const { major } = semver.parse(version);

module.exports = {
    entry: './src/app.js',
    mode: isProduction ? 'production' : 'development',

    // devtool: 'inline-source-map',
    optimization: {
        minimize: isProduction ? true : false,
        minimizer: [
            new TerserPlugin({
                extractComments: false,
            }),
        ],
    },

    output: {
        // path: path.resolve(__dirname, 'dist', `v${major}`),
        path: path.resolve(__dirname, 'dist'),
        // filename: `firelin.widget.${version}${isProduction ? '.min' : ''}.js`,
        filename: `firelin${isProduction ? '.min' : ''}.js`,
        clean: true,
        environment: {
            // Support for older browsers
            arrowFunction: false
        }
    },

    watchOptions: {
        poll: 1000,
        ignored: /node_modules/
    },

    devServer: {
        static: [
            {
                directory: path.resolve(__dirname, 'src')
            },
            {
                directory: path.resolve(__dirname, 'dist')
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
                        presets: ['@babel/preset-env', {
                            // With older browser suppor in arrow functions we can't use esmodules.
                            // targets: { esmodules: true }
                        }]
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
                filename: 'example.html',
                template: path.resolve(__dirname, 'src/index.html'),
            })
            : null,
        new webpack.HotModuleReplacementPlugin(),
        isProduction
            ? {
                apply(compiler) {
                    compiler.hooks.afterEmit.tapAsync('CopyAssets', (_compilation, cb) => {
                        const distDir = path.resolve(__dirname, 'dist');
                        fs.copyFile(path.resolve(__dirname, 'LICENSE'), path.join(distDir, 'LICENSE'), (err) => {
                            if (err) return cb(err);
                            fs.cp(
                                path.resolve(__dirname, 'src/public'),
                                path.join(distDir, 'public'),
                                { recursive: true },
                                cb
                            );
                        });
                    });
                }
            }
            : null,
    ].filter(Boolean),
};
