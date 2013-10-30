var async = require('async'),
	fs = require('fs'),
	Canvas = require('canvas'),
	QRCode = require('qrcode')
	_ = require('underscore'),
	argv = require('optimist') 
		.usage('Usage: $0 --in inputFile --out outputFolder] [--decompression decompression%] [--footer "footer message"]')
		.demand([ 'in', 'out' ])
		.alias('in', 'i')
		.alias('out', 'o')
		.alias('decompression', 'd')
		.alias('footer', 'f')
		.argv;

var CARD_SIZE_X = 1795,
	CARD_SIZE_Y = 1287, // the final artwork size is 109mm x 152mm
	SAFE_AREA_X = 40,
	SAFE_AREA_Y = 40, // determined experimentally by uploading the images to Moo
	QR_CODE_CAPACITY = 1270, // "level H" QR codes should support up to 1273 characters, but I have seen the qrcode library failing beyond 1270
	QR_CODE_SIZE = 550,  
	FOOTER_FONT_SIZE = 30,
	FOOTER_HEIGHT = FOOTER_FONT_SIZE * 2,
	ROWS_PER_PAGE = Math.floor((CARD_SIZE_Y - FOOTER_HEIGHT) / QR_CODE_SIZE),
	COLS_PER_PAGE = Math.floor(CARD_SIZE_X / QR_CODE_SIZE),
	QRS_PER_PAGE = ROWS_PER_PAGE * COLS_PER_PAGE;

var savePages = function (sourceText, options, callback) {
	options = options || { };
	options.decompression = 1. - (options.decompression ? parseFloat(options.decompression) / 100. : 0.);
	options.footer = options.footer ? " - " + options.footer : "";
	// the lines below reduces each QR code capacity so to fully fill the 
	// minimum number of pages is it necessary to use anyway
	var	mimimumNumberOfQRCodes = Math.ceil(sourceText.length / QR_CODE_CAPACITY / options.decompression),
		minimumNumberOfPages = Math.ceil(mimimumNumberOfQRCodes / QRS_PER_PAGE),
		qrCodeCapacity = Math.ceil(sourceText.length / minimumNumberOfPages / QRS_PER_PAGE),
		textChunks = sourceText.match(new RegExp("[\\s\\S]{1," + qrCodeCapacity + "}", "g")),
		totPages = Math.ceil(textChunks.length / QRS_PER_PAGE),
		horizontalSpacing = Math.floor((CARD_SIZE_X - SAFE_AREA_X * 2 - QR_CODE_SIZE * COLS_PER_PAGE) / (COLS_PER_PAGE - 1)),
		verticalSpacing = Math.floor((CARD_SIZE_Y - SAFE_AREA_Y * 2 - QR_CODE_SIZE * ROWS_PER_PAGE - FOOTER_HEIGHT) / (ROWS_PER_PAGE - 1));
	async.each(_.range(1, totPages + 1), function (page, pageCallback) {
		var	canvas = new Canvas(CARD_SIZE_X, CARD_SIZE_Y),
			ctx = canvas.getContext('2d'),
			footerText = 'Page ' + page + ' of ' + totPages + options.footer,
			// TODO: the calculation below seems unreliable
			footerWidth = ctx.measureText(footerText).width;
		ctx.fillStyle="#FFFFFF";
		ctx.fillRect(0, 0, CARD_SIZE_X, CARD_SIZE_Y);
		async.each(_.range(ROWS_PER_PAGE), function (row, rowCallback) {
			async.each(_.range(COLS_PER_PAGE), function (col, colCallback) {
				var text = textChunks[(page - 1) * QRS_PER_PAGE + row * ROWS_PER_PAGE + col];
				if (text) {
					// console.log("text's length is " + text.length);
					QRCode.draw(text, undefined, function (err, qrCanvas) {
						var img = new Canvas.Image;
						img.src = qrCanvas.toBuffer();
						ctx.drawImage(img, SAFE_AREA_X + col * (QR_CODE_SIZE + horizontalSpacing), SAFE_AREA_Y + row * (QR_CODE_SIZE + verticalSpacing), QR_CODE_SIZE, QR_CODE_SIZE);
						colCallback(null);
					});
				} else
					colCallback(null);
			}, rowCallback);
		},
		function (err) {
			ctx.fillStyle="#000000";
			ctx.font = FOOTER_FONT_SIZE + 'px Arial';
			ctx.fillText(footerText, Math.floor((CARD_SIZE_X - footerWidth) / 2), CARD_SIZE_Y - SAFE_AREA_Y - FOOTER_HEIGHT + Math.floor((FOOTER_HEIGHT - FOOTER_FONT_SIZE) / 2));
			canvas.toBuffer(function (err, buf) {
				fs.writeFileSync(argv.out + '/page' + page + '.png', buf);
				pageCallback(null);
			});
		});
	}, callback);
};


var sourceText = fs.readFileSync(argv.in, { encoding: 'utf8' });
savePages(sourceText, { decompression: argv.decompression, footer: argv.footer }, function (err) {
	console.log("Completed.");
})
