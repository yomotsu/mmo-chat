'use strict';

var es           = require( 'event-stream' );
var browserSync  = require( 'browser-sync' ).create();
var reload       = browserSync.reload;

var gulp         = require( 'gulp' );
var concat       = require( 'gulp-concat' );
var minifyCSS    = require( 'gulp-minify-css' );
var plumber      = require( 'gulp-plumber' );
var rename       = require( 'gulp-rename' );
var sass         = require( 'gulp-sass' );
var uglify       = require( 'gulp-uglify' );
var watch        = require( 'gulp-watch' );

var runSequence  = require( 'run-sequence' ).use( gulp );

gulp.task( 'browser-sync', function () {

  browserSync.init({
    server: {
      baseDir: './',
      directory: true
    }
  } );

} );


gulp.task( 'js', function () {

  return gulp.src( [
          './js/src/MOC.js',
          './js/src/util.js',
          './js/src/map-client.js'
         ] )
         .pipe( plumber() )
         .pipe( concat( 'map-client.js' ) )
         .pipe( gulp.dest( './js/' ) )
         .pipe( uglify() )
         .pipe( rename( { extname: '.min.js' } ) )
         .pipe( gulp.dest( './js/' ) );

} );


gulp.task( 'sass', function () {

  return gulp.src( './css/src/map-client.scss' )
         .pipe( sass( { bundleExec: true } ) )
         .pipe( gulp.dest( './css/' ) )
         .pipe( rename( { extname: '.min.css' } ) )
         .pipe( minifyCSS() )
         .pipe( gulp.dest( './css/' ) );

} );


gulp.task( 'watch', function () {

  watch( [ './js/src/*.js' ], function () {
    runSequence( 'js', browserSync.reload );
  } );

  watch( [ './css/src/*.scss' ], function () {
    runSequence( 'sass', browserSync.reload );
  } );

} );

gulp.task( 'default', function( callback ) {

  runSequence( 'browser-sync', 'js', 'sass', 'watch', callback );

} );

gulp.task( 'build', function( callback ) {

  runSequence( 'js', 'sass', callback );

} );

