var CARD_SIZE_X = 1795,
	CARD_SIZE_Y = 1287, // the final artwork size is 109mm x 152mm
	QR_CODE_CAPACITY = 1273, 
	QR_CODE_SIZE = 300,  
	ROWS_PER_PAGE = Math.floor(CARD_SIZE_Y / QR_CODE_SIZE),
	COLS_PER_PAGE = Math.floor(CARD_SIZE_X / QR_CODE_SIZE),
	QRS_PER_PAGE = ROWS_PER_PAGE * COLS_PER_PAGE;

var async = require('async'),
	fs = require('fs'),
	Canvas = require('canvas'),
	QRCode = require('qrcode')
	_ = require('underscore'),
	argv = require('optimist') // https://github.com/substack/node-optimist
		.usage('Usage: $0 --out [output folder]')
		.demand([ 'out' ])
		.alias('out', 'o')
		.argv;

var sourceText = fs.readFileSync("luke.txt", { encoding: 'utf8' });

async.mapLimit(
	sourceText.match(new RegExp(".{1," + QR_CODE_CAPACITY + "}", "g")), 
	5, 
	function (text, callback) {
		QRCode.draw(text, undefined, function (err, qrCanvas) {
			var img = new Canvas.Image;
			img.src = qrCanvas.toBuffer();
			callback(null, img);
	});
}, function (err, images) {
	var totalPages = Math.floor(images.length / QRS_PER_PAGE);
	async.each(_.range(totalPages), function (page, callback) {
		var canvas = new Canvas(CARD_SIZE_X, CARD_SIZE_Y),
		  	ctx = canvas.getContext('2d');
		ctx.font = '30px Impact';
		ctx.fillText("Page " + page, 50, 100); 
		for(var row = 0; row < ROWS_PER_PAGE; row++) {
			for(var col = 0; col < COLS_PER_PAGE; col++) {
				ctx.drawImage(images[(page - 1) * QRS_PER_PAGE + row * COLS_PER_PAGE + col], col * QR_CODE_SIZE, row * QR_CODE_SIZE, QR_CODE_SIZE, QR_CODE_SIZE);
			}
		} 
		canvas.toBuffer(function (err, buf) {
  			if (err) throw err;
			fs.writeFile(argv.out + '/page' + page + '.png', buf);
			callback (null);
		});
	}, function (err) {
		console.log("Finished");
	});
});

