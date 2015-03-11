var gulp 		 = require('gulp'),
	sass 		 = require('gulp-ruby-sass'),
	minifycss 	 = require('gulp-minify-css')
	autoprefixer = require('gulp-autoprefixer'),
	rename		 = require('gulp-rename'),
	uglify		 = require('gulp-uglify'),
	imagemin	 = require('gulp-imagemin');

/*
	Styles tasks
*/
gulp.task('styles_sass', function(){

	console.log('Start styles task....', Date().toString());

	return sass('sass/main.scss', {sourcemap: true, style: 'expanded'})
			.pipe(autoprefixer('last 2 version','safari 5','ie 8','ie 9','opera 12.1'))
			.pipe(gulp.dest('css'))
			.pipe(rename( { suffix: '.min'} ))
			.pipe(minifycss())
			.pipe(gulp.dest('_build/css'))

	console.log('End styles task....', Date().toString());
});

gulp.task('styles_css', function() {

	console.log('Start styles task....', Date().toString());
	return gulp.src('css/font/*')
			.pipe(rename({ suffix: '.min'}))
			.pipe(minifycss())
			.pipe(gulp.dest('_build/css'))
});

/*
	JavaScript tasks
*/

gulp.task('scripts', function(){

	console.log('Start scripts task....', Date().toString());

	return gulp.src('js/*.js')
			.pipe(rename({ suffix: '.min' }))
			.pipe(uglify())
			.pipe(gulp.dest('_build/js'))

	console.log('Finished scripts task....', Date().toString());
});

gulp.task('scripts_libs', function(){

	console.log('Start scripts task....', Date().toString());

	return gulp.src('js/libs/*.js')
			.pipe(rename({ suffix: '.min' }))
			.pipe(uglify())
			.pipe(gulp.dest('_build/js/libs'))

	console.log('Finished scripts task....', Date().toString());
});


/*
	Images optimizer
*/
gulp.task('images_opt', function () {
	console.log('Start images optimizer task....', Date().toString());
    gulp.src('img/*.*')
        .pipe(imagemin())
        .pipe(gulp.dest('_build/img'));
});

/*
	Task Started
*/
gulp.task('default',['scripts','scripts_libs','styles_sass', 'styles_css','images_opt']);