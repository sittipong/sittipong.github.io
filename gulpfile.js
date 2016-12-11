var gulp = require('gulp'),
  watch = require('gulp-watch'),
  stripDebug = require('gulp-strip-debug'),
  minifyCss = require('gulp-minify-css'),
  sourcemaps = require('gulp-sourcemaps'),
  concat = require('gulp-concat'),
  connect = require('gulp-connect'),
  jade = require('gulp-jade'),
  uglify = require('gulp-uglify'),
  stylus = require('gulp-stylus'),
  nib = require('nib'),
  bootstrap = require('bootstrap3-stylus'),
  imagemin = require('gulp-imagemin'),
  pngquant = require('imagemin-pngquant'),
  browserSync = require('browser-sync').create(),
  inject = require('gulp-inject-string')

var dest = {
  base: 'dist'
}
var src = {
  base: 'src/'
}
var server = {
  port: 1212
}
var reload = browserSync.reload


src.view = src.base + 'views/**/*.jade'
src.script = ['!' + src.base + 'scripts/load.js', src.base + 'scripts/**/*.js']
src.style = src.base + 'styles/**/*.styl'
src.image = src.base + 'images/**/*'

dest.view = dest.base
dest.script = dest.base + '/scripts/'
dest.style = dest.base + '/styles/'
dest.image = dest.base + '/images/'

var serverTask = function () {
  connect.server({
    root: dest,
    port: server.port,
    fallback: 'index.html'
  })
}
var viewTask = function () {
  return gulp.src(src.view)
    .pipe(jade())
    .pipe(gulp.dest(dest.view))
}
var styleTaskDev = function () {
  return gulp.src(src.style)
    .pipe(stylus({
      use: [nib(), bootstrap()]
    }))
    .pipe(gulp.dest(dest.style))
}
var scriptTaskDev = function () {
  return gulp.src(src.script)
    .pipe(concat('default.js'))
    .pipe(gulp.dest(dest.script))
}
var imageTaskProd = function () {
  return gulp.src(src.image)
    .pipe(imagemin({
      progressive: true,
      svgoPlugins: [{removeViewBox: false}],
      use: [pngquant()]
    }))
    .pipe(gulp.dest(dest.image))
}
var imageTaskDev = function () {
  return gulp.src(src.image)
    .pipe(gulp.dest(dest.image))
}

/** build task **/
var buildTask = function () {
  return gulp.src(src.script)
    .pipe(concat('default.js'))
    .pipe(stripDebug())
    .pipe(uglify())
    .pipe(gulp.dest(dest.script))
    .on('end', function () {
      return gulp.src(src.style)
        .pipe(stylus({
          use: [nib(), bootstrap()]
        }))
        .pipe(minifyCss({compatibility: 'ie8'}))
        .pipe(gulp.dest(dest.style))
    })
}
var devInjectTask = function () {
  gulp.src(src.loadScript)
    .pipe(gulp.dest(dest.script))
  gulp.src(src.loadStyle)
    .pipe(stylus({
      use: [nib(), bootstrap()]
    }))
    .pipe(gulp.dest(dest.style))
}
var deployTask = function () {
  var publisher = awspublish.create({
    params: {
      Bucket: argv.bucket
    },
    region: conf.s3.region,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  })
  var headers = { 'Cache-Control': 'max-age=315360000, no-transform, public' }
  return gulp.src(conf.buildSrc)
    .pipe(awspublish.gzip())
    .pipe(publisher.publish(headers))
    .pipe(publisher.cache())
    .pipe(awspublish.reporter())
}

gulp.task('connect', serverTask)
gulp.task('viewTask', viewTask)
gulp.task('styleTaskDev', styleTaskDev)
gulp.task('scriptTaskDev', scriptTaskDev)
gulp.task('imageTaskProd', imageTaskProd)
gulp.task('imageTaskDev', imageTaskDev)

gulp.task('watch', function () {
  gulp.watch(src.view, ['viewTask'])
  gulp.watch(src.script, ['scriptTaskDev'])
  gulp.watch(src.style, ['styleTaskDev'])
  gulp.watch(src.image, ['imageTaskDev'])
})

gulp.task('browserSync', function () {
  browserSync.init({
    port: server.port,
    fallback: 'index.html',
    minify: true,
    server: {
      baseDir: dest.base,
      index: 'index.html'
    }
  })
  gulp.watch('dist/*').on('change', reload);
})

gulp.task('deployTask', deployTask)
gulp.task('serve', ['watch', 'viewTask', 'scriptTaskDev', 'styleTaskDev', 'imageTaskDev', 'browserSync'])
gulp.task('build', ['viewTask', 'imageTaskProd'], function () {
  return buildTask()
})
