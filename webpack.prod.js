// @ts-nocheck
const { merge } = require('webpack-merge'); // webpack-merge
const common = require('./webpack.common.js'); // 汎用設定をインポート
const TerserPlugin = require('terser-webpack-plugin');

// common設定とマージする
module.exports = merge(common, {
    mode: 'production', // 本番モード
    optimization: {
        minimize: true,
        minimizer: [
            new TerserPlugin({
                terserOptions: {
                    ecma: 6,
                    compress: { drop_console: true },
                    output: {
                        comments: false,
                        beautify: false,
                    },
                },
            }),
        ],
    },
});
