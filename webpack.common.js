// @ts-nocheck
const path = require('path');

module.exports = {
    entry: path.resolve(__dirname, 'src/ts/index.ts'), // バンドル前のエントリポイント
    output: {
        // バンドル先
        filename: 'bundle.js',
        path: path.join(__dirname, 'dist/js'),
    },
    module: {
        rules: [
            {
                // 拡張子 .ts の場合
                test: /\.ts$/,
                use: [
                    {
                        // Babel を利用する
                        loader: 'babel-loader',
                        // Babel のオプションを指定する
                        options: {
                            presets: [
                                // プリセットを指定することで、ES2020 を ES5 に変換
                                '@babel/preset-env',
                                '@babel/preset-typescript',
                            ],
                        },
                    },
                ],
            },
        ],
    },
    // ES5(IE11等)向けの指定
    target: ['web', 'es5'],
};
