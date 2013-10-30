var async = require('async'),
	fs = require('fs'),
	Canvas = require('canvas'),
	QRCode = require('qrcode')
	argv = require('optimist') 
		.usage('Usage: $0 --in inputFile --out outputPngFile')
		.demand([ 'in', 'out' ])
		.alias('in', 'i')
		.alias('out', 'o')
		.argv;

var CARD_SIZE_X = 1795,
	CARD_SIZE_Y = 1287, 
	MAX_QR_CODE_CAPACITY = 1270;

var makeQRCodeImage = function (sourceText, targetSize, callback) {
	var	canvas = new Canvas(CARD_SIZE_X, CARD_SIZE_Y),
		ctx = canvas.getContext('2d'),
		img = undefined;
	sourceText = sourceText.substring(0, Math.min(sourceText.length, MAX_QR_CODE_CAPACITY)),
	async.doWhilst(function (callback) {
		console.log("Trying with " + sourceText.length);
		QRCode.draw(sourceText, undefined, function (err, qrCanvas) {
			img = new Canvas.Image;
			img.src = qrCanvas.toBuffer();
			callback(null);
		});
	}, function () {
		var found = img.width <= targetSize;
		if (!found) sourceText = sourceText.substring(0, Math.floor(sourceText.length * targetSize / img.width));
		return !found;
	}, function (err) {
		callback(err, sourceText, img);
	});
};

var sourceText = fs.readFileSync(argv.in, { encoding: 'utf8' });
makeQRCodeImage(sourceText, 550, function (err, text, image) {
	console.log("Text is long: " + text.length);
	var	canvas = new Canvas(CARD_SIZE_X, CARD_SIZE_Y),
		ctx = canvas.getContext('2d');
	ctx.drawImage(image, 0, 0);
	canvas.toBuffer(function (err, buf) {
		fs.writeFileSync(argv.out, buf);
	});
});
