'use strict';

var exec = require('child_process').exec;

/*
	Image class
	@filename {String}
	@imageMagick {Boolean} :: default false
*/
function Image(filename, imageMagick) {
	this.builder = [];
	this.filename = filename;
	this.isIM = imageMagick || false;

	if (!filename)
		throw new Error('Image filename is undefined.');
}

/*
	Clear all filter
	return {Image}
*/
Image.prototype.clear = function() {
	var self = this;
	self.builder = [];
	return self;
};

/*
	Execute all filters and save image
	@filename {String}
	@callback {Function} :: optional
	return {Image}
*/
Image.prototype.save = function(filename, callback) {

	var self = this;

	if (typeof(filename) === 'function') {
		callback = filename;
		filename = null;
	}

	filename = filename || self.filename;

	var command = self.cmd(self.filename, filename);
	if (self.builder.length > 0) {
		exec(command, function(error, stdout, stderr) {
			self.clear();
			if (callback) {
				if (error)
					callback(error, '');
				else
					callback(null, filename);
			}
		});
	} else {
		if (callback)
			callback(null, filename);
	}
	return self;
};

/*
	Internal function
	@filenameFrom {String}
	@filenameTo {String}
	return {String}
*/
Image.prototype.cmd = function(filenameFrom, filenameTo) {

	var self = this;
	var cmd = '';

	self.builder.sort(function(a, b) {
		if (a.priority > b.priority)
			return 1;
		else
			return -1;
	});

	self.builder.forEach(function(o) {
		cmd += (cmd.length > 0 ? ' ' : '') + o.cmd;
	});

	return (self.isIM ? 'convert' : 'gm -convert') + ' "' + filenameFrom + '"' + ' ' + cmd + ' "' + filenameTo + '"';
};

/*
	Identify image
	cb {Function} :: function(err, info) {} :: info.type {String} == 'JPEG' | 'PNG', info.width {Number}, info.height {Number}
	return {Image}
*/
Image.prototype.identify = function(cb) {
	var self = this;

	exec((self.isIM ? 'identify' : 'gm identify') + ' "' + self.fileName + '"', function(error, stdout, stderr) {

		if (error) {
			cb(error, null);
			return;
		}

		var arr = stdout.split(' ');
		var size = arr[2].split('x');
		var obj = {
			type: arr[1],
			width: utils.parseInt(size[0]),
			height: utils.parseInt(size[1])
		};

		cb(null, obj);
	});

	return self;
};

/*
	Append filter to filter list
	@key {String}
	@value {String}
	@priority {Number}
	return {Image}
*/
Image.prototype.push = function(key, value, priority) {
	var self = this;
	self.builder.push({ cmd: key + (value ? ' "' + value + '"' : ''), priority: priority });
	return self;
};

/*
	@w {Number}
	@h {Number}
	@options {String}
	http://www.graphicsmagick.org/GraphicsMagick.html#details-resize
*/
Image.prototype.resize = function(w, h, options) {
	options = options || '';

	var self = this;
	var size = '';

	if (w && h)
		size = w + 'x' + h;
    else if (w && !h)
		size = w;
    else if (!w && h)
		size = 'x' + h;

	return self.push('-resize', size + options, 1);
};

/*
	@w {Number}
	@h {Number}
*/
Image.prototype.resizeCenter = function(w, h) {
	return this.resize(w, h, '^').align('center').crop(w, h);
};

/*
	@w {Number}
	@h {Number}
	@options {String}
	http://www.graphicsmagick.org/GraphicsMagick.html#details-scale
*/
Image.prototype.scale = function(w, h, options) {
	options = options || '';

	var self = this;
	var size = '';

	if (w && h)
		size = w + 'x' + h;
    else if (w && !h)
		size = w;
    else if (!w && h)
		size = 'x' + h;

	return self.push('-scale', size + options, 1);
};

/*
	@w {Number}
	@h {Number}
	@x {Number}
	@y {Number}
	http://www.graphicsmagick.org/GraphicsMagick.html#details-crop
*/
Image.prototype.crop = function(w, h, x, y) {
	return this.push('-crop', w + 'x' + h + '+' + (x || 0) + '+' + (y || 0), 4);
};

/*
	@percentage {Number}
	http://www.graphicsmagick.org/GraphicsMagick.html#details-quality
*/
Image.prototype.quality = function(percentage) {
    return this.push('-quality', percentage || 80, 5);
};

/*
	@type {String}
*/
Image.prototype.align = function(type) {

	var output = '';

	switch (type.toLowerCase().replace('-', '')) {
		case 'left top':
		case 'top left':
			output = 'NorthWest';
			break;
		case 'left bottom':
		case 'bottom left':
			output = 'SouthWest';
			break;
		case 'right top':
		case 'top right':
			output = 'NorthEast';
			break;
		case 'right bottom':
		case 'bottom right':
			output = 'SouthEast';
			break;
		case 'left center':
		case 'center left':
		case 'left':
			output = 'West';
			break;
		case 'right center':
		case 'center right':
		case 'right':
			output = 'East';
			break;
		case 'bottom center':
		case 'center bottom':
		case 'bottom':
			output = 'South';
			break;
		case 'top center':
		case 'center top':
		case 'top':
			output = 'North';
			break;
		case 'center center':
		case 'center':
			output = 'Center';
			break;
		default:
			output = type;
			break;
	}

	return this.push('-gravity', output, 3);
};

/*
	@type {String}
*/
Image.prototype.gravity = function(type) {
	return this.align(type);
};

/*
	@radius {Number}
	http://www.graphicsmagick.org/GraphicsMagick.html#details-blur
*/
Image.prototype.blur = function(radius) {
    return this.push('-blur', radius, 10);
};

Image.prototype.normalize = function() {
	return this.push('-normalize', null, 10);
};

/*
	@deg {Number}
	http://www.graphicsmagick.org/GraphicsMagick.html#details-rotate
*/
Image.prototype.rotate = function(deg) {
	return this.push('-rotate', deg || 0, 8);
};

// http://www.graphicsmagick.org/GraphicsMagick.html#details-flip
Image.prototype.flip = function() {
	return this.push('-flip', null, 10);
};

// http://www.graphicsmagick.org/GraphicsMagick.html#details-flop
Image.prototype.flop = function() {
	return this.push('-flop', null, 10);
};

// http://www.graphicsmagick.org/GraphicsMagick.html
Image.prototype.minify = function() {
	return this.push('-minify', null, 10);
};

Image.prototype.grayscale = function() {
	return this.push('-modulate 100,0', null, 10);
};

/*
	@color {String}
*/
Image.prototype.background = function(color) {
	return this.push('-background', color, 2);
};

Image.prototype.sepia = function() {
	return this.push('-modulate 115,0,100 \\ -colorize 7,21,50', null, 10);
};

/*
	@cmd {String}
	@priority {Number}
*/
Image.prototype.command = function(cmd, priority) {
	return this.push(cmd, null, priority || 10);
};

exports.Image = Image;
exports.Picture = Image;

/*
	Init image class
	@filename {String}
	@imageMagick {Boolean} :: default false
*/
exports.init = function(filename, imageMagick) {
	return new Image(filename, imageMagick);
};

exports.load = function(filename, imageMagick) {
	return new Image(filename, imageMagick);
};