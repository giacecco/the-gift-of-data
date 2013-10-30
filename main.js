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

var sourceText = fs.readFileSync("luke.txt", { encoding: 'utf8' }),
	textChunks = sourceText.match(new RegExp(".{1," + QR_CODE_CAPACITY + "}", "g")),
	page = 1,
	row = 0,
	col = 0,
	canvas = new Canvas(CARD_SIZE_X, CARD_SIZE_Y),
	ctx = canvas.getContext('2d');
console.log(textChunks.length + " chunks for " + (textChunks.length / QRS_PER_PAGE) + " pages");
async.each(textChunks, function (text, callback) {
	QRCode.draw(text, undefined, function (err, qrCanvas) {
		var img = new Canvas.Image;
		img.src = qrCanvas.toBuffer();
		ctx.drawImage(img, col * QR_CODE_SIZE, row * QR_CODE_SIZE, QR_CODE_SIZE, QR_CODE_SIZE);
		col++;
		if (col == COLS_PER_PAGE) {
			row++;
			col = 0;
		}
		if (row == ROWS_PER_PAGE) {
			canvas.toBuffer(function (err, buf) {
				fs.writeFile(argv.out + '/page' + page + '.png', buf);
				page++;
				row = 0;
				canvas = new Canvas(CARD_SIZE_X, CARD_SIZE_Y);
				ctx = canvas.getContext('2d');
				callback (null);
			});
		} else {
			callback(null);
		}
	});
}, function (err) {
	console.log("Finished");
});


