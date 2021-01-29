/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable no-undef */
// @ts-nocheck
'use strict';

// パッケージ
const { src, dest, series, watch, parallel } = require('gulp');
// リネーム機能
const rename = require('gulp-rename');
// EJS コンパイル
const ejs = require('gulp-ejs');
const fs = require('fs');
// HTML 整形
const prettify = require('gulp-prettify');
// Sass / SCSS コンパイル
const sass = require('gulp-sass');
// ベンダープレフィックス付与
const autoPrefixer = require('gulp-autoprefixer');
// 画像
const imagemin = require('gulp-imagemin');
const changed = require('gulp-changed');
const pngquant = require('imagemin-pngquant');
const mozjpeg = require('imagemin-mozjpeg');
// ブラウザリロード
const browserSync = require('browser-sync').create();
// エラー停止防御 / デスクトップ通知
const plumber = require('gulp-plumber');
const notify = require('gulp-notify');
// HTML 圧縮
const htmlmin = require('gulp-htmlmin');

// コマンド引数で分岐
const minimist = require('minimist');

// 引数を格納するための変数の記述
const options = minimist(process.argv.slice(2), {
    string: 'env',
    default: {
        env: 'dev', // 引数の初期値
    },
});
const cmdArg = options.env;

// バンドル用
const webpackStream = require('webpack-stream');
const webpack = require('webpack');
const webpackConfig = require('./webpack.' + cmdArg);

// 削除用
const del = require('del');

// W3C HTML Validator
const htmlValidator = require('gulp-w3c-html-validator');

// json データ取得
const data = require('gulp-data');

// ディレクトリ
const root = {
    src: 'src',
    dest: 'dist',
};
const PATHS = {
    ejs: {
        src: root.src + '/ejs/**/!(_)*.ejs',
        _src: root.src + '/ejs/**/*.ejs', // アンダースコア付きも含める
        dest: root.dest,
    },
    styles: {
        src: root.src + '/scss/**/!(_)*.scss',
        _src: root.src + '/scss/**/*.scss', // アンダースコア付きも含める
        dest: root.dest + '/css',
    },
    scripts: {
        src: root.src + '/ts/**/*.ts',
        dest: root.dest + '/js',
        bundle: root.dest + '/js/bundle.js',
    },
    image: {
        src: root.src + '/img/**/*.{jpg,jpeg,png,gif,svg}',
        dest: root.dest + '/img',
    },
    font: {
        src: root.src + '/fonts/**',
        dest: root.dest + '/fonts',
    },
    data: root.src + '/_data',
};

// methods
const errorHandler = (err, stats) => {
    if (err || (stats && stats.compilation.errors.length > 0)) {
        const error = err || stats.compilation.errors[0].error;
        notify.onError({ message: '<%= error.message %>' })(error);
        this.emit('end');
    }
};

// EJS コンパイル
const ejsFiles = () => {
    // JSONファイル読み込み
    let result;
    let json = '/' + cmdArg + '.json';
    result = src(PATHS.ejs.src)
        .pipe(plumber({ errorHandler: errorHandler }))
        .pipe(
            ejs({
                site: JSON.parse(fs.readFileSync(PATHS.data + json)),
            })
        )
        .pipe(prettify())
        .pipe(rename({ extname: '.html' }));
    if (cmdArg === 'prod') {
        // prod のときだけ圧縮
        result.pipe(
            htmlmin({
                // 余白を除去する
                collapseWhitespace: true,
                // HTMLコメントを除去する
                removeComments: true,
            })
        );
    }
    return result.pipe(dest(PATHS.ejs.dest));
};
// const ejsFiles = () => {
//     let result;

//     result = src(PATHS.ejs.src)
//         .pipe(
//             data((file) => {
//                 const absolutePath = `/${file.path
//                     .split(root.src)
//                     [file.path.split(root.src).length - 1].replace(
//                         '.ejs',
//                         '.html'
//                     )
//                     .replace(/index\.html$/, '')}`;
//                 const relativePath = '../'.repeat([
//                     absolutePath.split('/').length - 2,
//                 ]);
//                 return {
//                     absolutePath,
//                     relativePath,
//                 };
//             })
//         )
//         .pipe(
//             ejs({
//                 site: JSON.parse(fs.readFileSync(PATHS.data + '/site.json')),
//             })
//         )
//         .pipe(rename({ extname: '.html' }))
//         .pipe(plumber({ errorHandler: errorHandler }));

//     if (cmdArg === 'prod') {
//         // prod のときだけ圧縮
//         result.pipe(
//             htmlmin({
//                 // 余白を除去する
//                 collapseWhitespace: true,
//                 // HTMLコメントを除去する
//                 removeComments: true,
//             })
//         );
//     }
//     return result.pipe(dest(PATHS.ejs.dest));
// };

// SCSS コンパイル
const styles = () => {
    let output = 'expanded';
    if (cmdArg === 'prod') {
        // prod のときだけ圧縮
        output = 'compressed';
    }
    return src(PATHS.styles.src)
        .pipe(plumber({ errorHandler: errorHandler }))
        .pipe(
            sass({
                outputStyle: output,
            })
        )
        .pipe(autoPrefixer())
        .pipe(dest(PATHS.styles.dest));
};

// 画像圧縮
const image = () => {
    return src(PATHS.image.src)
        .pipe(plumber({ errorHandler: errorHandler }))
        .pipe(changed(PATHS.image.dest))
        .pipe(
            imagemin([
                pngquant({
                    quality: [0.65, 0.8],
                    speed: 1,
                    floyd: 0,
                }),
                mozjpeg({
                    quality: 85,
                    progressive: true,
                }),
                imagemin.svgo(),
                imagemin.optipng(),
                imagemin.gifsicle(),
            ])
        )
        .pipe(dest(PATHS.image.dest));
};

// font
const font = () => {
    return src(PATHS.font.src)
        .pipe(plumber({ errorHandler: errorHandler }))
        .pipe(dest(PATHS.font.dest));
};

// バンドル
const bundle = () => {
    return webpackStream(webpackConfig, webpack)
        .pipe(plumber({ errorHandler: errorHandler }))
        .pipe(dest(PATHS.scripts.dest));
};

// ファイル削除
const crean = (done) => {
    if (cmdArg === 'prod') {
        del([
            PATHS.ejs.dest + '/**/*',
            '!' + PATHS.scripts.dest,
            '!' + PATHS.styles.dest,
        ]);
    }
    done();
};

// ファイルの変更を監視
const watchFiles = (done) => {
    // prod じゃないときだけ監視
    if (cmdArg !== 'prod') {
        watch(PATHS.ejs._src, series(crean, ejsFiles, reload, validateHtml));
        watch(PATHS.styles._src, series(styles, reload));

        watch(PATHS.image.src, series(image, reload));

        watch(PATHS.scripts.src, series(bundle));
        watch(PATHS.scripts.bundle, series(reload));

        watch(PATHS.font.src, series(font, reload));
    }
    done();
};

// ローカルサーバ設定
const browserSyncOption = {
    open: false,
    port: 3000,
    ui: {
        port: 3001,
    },
    server: {
        baseDir: PATHS.ejs.dest, // output directory,
        index: 'index.html',
    },
};
const server = (done) => {
    // prod じゃないときだけ起動
    if (cmdArg !== 'prod') {
        browserSync.init(browserSyncOption);
    }
    done();
};

// browser reload
const reload = (done) => {
    browserSync.reload();
    done();
    console.info('Browser reload completed');
};

const validateHtml = () => {
    return src(PATHS.ejs.dest + '/**/*.html')
        .pipe(plumber({ errorHandler: errorHandler }))
        .pipe(htmlValidator())
        .pipe(htmlValidator.reporter());
};
// commands
exports.default = series(
    series(crean),
    parallel(bundle, ejsFiles, styles, image, font),
    series(server, watchFiles, validateHtml)
);
