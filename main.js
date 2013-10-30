var CARD_SIZE_X = 1795,
	CARD_SIZE_Y = 1287, // the final artwork size is 109mm x 152mm
	QR_CODE_CAPACITY = 1273, 
	QR_CODE_SIZE = 200,  
	FOOTER_FONT_SIZE = 30,
	FOOTER_HEIGHT = FOOTER_FONT_SIZE * 2,
	ROWS_PER_PAGE = Math.floor((CARD_SIZE_Y - FOOTER_HEIGHT) / QR_CODE_SIZE),
	COLS_PER_PAGE = Math.floor(CARD_SIZE_X / QR_CODE_SIZE),
	QRS_PER_PAGE = ROWS_PER_PAGE * COLS_PER_PAGE;

var async = require('async'),
	fs = require('fs'),
	Canvas = require('canvas'),
	QRCode = require('qrcode')
	_ = require('underscore'),
	argv = require('optimist') 
		.usage('Usage: $0 --out [output folder]')
		.demand([ 'out' ])
		.alias('out', 'o')
		.argv;

var sourceText = fs.readFileSync("hamlet.txt", { encoding: 'utf8' }),
	textChunks = sourceText.match(new RegExp(".{1," + QR_CODE_CAPACITY + "}", "g")),
	totPages = Math.ceil(textChunks.length / QRS_PER_PAGE),
	horizontalSpacing = Math.floor((CARD_SIZE_X - QR_CODE_SIZE * COLS_PER_PAGE) / (COLS_PER_PAGE + 1)),
	verticalSpacing = Math.floor((CARD_SIZE_Y - QR_CODE_SIZE * ROWS_PER_PAGE - FOOTER_HEIGHT) / (ROWS_PER_PAGE + 1));
async.each(_.range(1, totPages + 1), function (page, pageCallback) {
	var	canvas = new Canvas(CARD_SIZE_X, CARD_SIZE_Y),
		ctx = canvas.getContext('2d'),
		footerSize = ctx.measureText('Footer');
	ctx.fillStyle="#FFFFFF";
	ctx.fillRect(0, 0, CARD_SIZE_X, CARD_SIZE_Y);
	async.each(_.range(ROWS_PER_PAGE), function (row, rowCallback) {
		async.each(_.range(COLS_PER_PAGE), function (col, colCallback) {
			var text = textChunks[(page - 1) * QRS_PER_PAGE + row * ROWS_PER_PAGE + col];
			if (text)
				QRCode.draw(text, undefined, function (err, qrCanvas) {
					var img = new Canvas.Image;
					img.src = qrCanvas.toBuffer();
					ctx.drawImage(img, horizontalSpacing + col * (QR_CODE_SIZE + horizontalSpacing), verticalSpacing + row * (QR_CODE_SIZE + verticalSpacing), QR_CODE_SIZE, QR_CODE_SIZE);
					colCallback(null);
				})
			else
				colCallback(null);
		}, rowCallback);
	},
	function (err) {
		ctx.fillStyle="#000000";
		ctx.font = FOOTER_FONT_SIZE + 'px Arial';
		ctx.fillText('Page ' + page + ' of ' + totPages, Math.floor((CARD_SIZE_X - footerSize.width) / 2), CARD_SIZE_Y - FOOTER_HEIGHT + Math.floor((FOOTER_HEIGHT - FOOTER_FONT_SIZE) / 2));
		canvas.toBuffer(function (err, buf) {
			fs.writeFile(argv.out + '/page' + page + '.png', buf);
			pageCallback(null);
		});
	});
});
