var async = require('async'),
	Canvas = require('canvas'),
	QRCode = require('qrcode');

var MAX_QR_CODE_CAPACITY = 1270; // "level H" QR codes should support up to 1273 characters, but I have seen the qrcode library failing beyond 1270

/* This is a wrapper to QRCode.draw. As QRCode at the moment does not allow
   much control over the size of the QR code being generated, this function 
   shortens the text being encoded until it fits in the target size. */
exports.makeQRCodeImage = function (sourceText, targetSize, callback) {
	var	img = undefined,
		shortenedText = sourceText.substring(0, Math.min(sourceText.length, MAX_QR_CODE_CAPACITY));
	async.doWhilst(function (callback) {
		QRCode.draw(shortenedText, undefined, function (err, qrCanvas) {
			img = new Canvas.Image;
			img.src = qrCanvas.toBuffer();
			callback(null);
		});
	}, function () {
		var found = img.width <= targetSize;
		if (!found) shortenedText = shortenedText.substring(0, Math.floor(shortenedText.length * Math.pow(targetSize, 2) / Math.pow(img.width, 2)));
		return !found;
	}, function (err) {
		callback(err, shortenedText, img);
	});
};
