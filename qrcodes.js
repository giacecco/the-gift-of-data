var async = require('async'),
	Canvas = require('canvas'),
	QRCode = require('qrcode'),
	_ = require('underscore');

var MAX_QR_CODE_CAPACITY = 1268; // "level H" QR codes should support up to 1273 characters, but I have seen the qrcode library failing beyond 1268

/* This is a wrapper to QRCode.draw. As QRCode at the moment does not allow
   much control over the size of the QR code being generated, this function 
   shortens the text being encoded until it fits in the target size. */
exports.draw = function (sourceText, options, callback) {
	options = options || { };
	options.targetSize = options.targetSize || null; 
	var	img = undefined,
		canvas = undefined,
		shortenedText = sourceText.substring(0, Math.min(sourceText.length, MAX_QR_CODE_CAPACITY));
	async.doWhilst(function (callback) {
		QRCode.draw(shortenedText, undefined, function (err, qrCanvas) {
			canvas = qrCanvas;
			img = new Canvas.Image;
			img.src = canvas.toBuffer();
			callback(null);
		});
	}, function () {
		var found = _.isNull(options.targetSize) || (img.width <= options.targetSize);
		if (!found) {
			// text is shortened proportionally to the square of the QR code 
			// dimension, as my expectation is that they are directly 
			// proportional
			shortenedText = shortenedText.substring(0, Math.floor(shortenedText.length * Math.pow(options.targetSize, 2) / Math.pow(img.width, 2)));
		} 
		return !found;
	}, function (err) {
		callback(err, shortenedText, canvas);
	});
};
