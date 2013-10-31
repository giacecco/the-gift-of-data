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
	MAX_QR_CODE_CAPACITY = 1270, // "level H" QR codes should support up to 1273 characters, but I have seen the qrcode library failing beyond 1270
	QR_CODE_SIZE = 580,  
	FOOTER_FONT_SIZE = 30,
	FOOTER_HEIGHT = FOOTER_FONT_SIZE * 2,
	ROWS_PER_PAGE = Math.floor((CARD_SIZE_Y - FOOTER_HEIGHT) / QR_CODE_SIZE),
	COLS_PER_PAGE = Math.floor(CARD_SIZE_X / QR_CODE_SIZE),
	QRS_PER_PAGE = ROWS_PER_PAGE * COLS_PER_PAGE,
	HORIZONTAL_SPACING = Math.floor((CARD_SIZE_X - SAFE_AREA_X * 2 - QR_CODE_SIZE * COLS_PER_PAGE) / (COLS_PER_PAGE - 1)),
	VERTICAL_SPACING = Math.floor((CARD_SIZE_Y - SAFE_AREA_Y * 2 - QR_CODE_SIZE * ROWS_PER_PAGE - FOOTER_HEIGHT) / (ROWS_PER_PAGE - 1));

var makeQRCodeImage = function (sourceText, targetSize, callback) {
	var	canvas = new Canvas(CARD_SIZE_X, CARD_SIZE_Y),
		ctx = canvas.getContext('2d'),
		img = undefined;
	sourceText = sourceText.substring(0, Math.min(sourceText.length, MAX_QR_CODE_CAPACITY)),
	async.doWhilst(function (callback) {
		QRCode.draw(sourceText, undefined, function (err, qrCanvas) {
			img = new Canvas.Image;
			img.src = qrCanvas.toBuffer();
			callback(null);
		});
	}, function () {
		var found = img.width <= targetSize;
		if (!found) sourceText = sourceText.substring(0, Math.floor(sourceText.length * Math.pow(targetSize, 2) / Math.pow(img.width, 2)));
		return !found;
	}, function (err) {
		callback(err, sourceText, img);
	});
};


var createPages = function (sourceText, options, callback) {
	createPagesPass1(sourceText, options, function (err, pages) {
		createPagesPass2(pages, options, function (err, pages) {
			callback(err, pages);
		})
	})	
};

var createPagesPass1 = function (sourceText, options, callback) {

	var createHeader = function () {
		canvas = new Canvas(CARD_SIZE_X, CARD_SIZE_Y),
		ctx = canvas.getContext('2d');
		ctx.fillStyle="#FFFFFF";
	    ctx.fillRect(0, 0, CARD_SIZE_X, CARD_SIZE_Y);
	};

	var createFooter = function () {
		var footerText = 'Card ' + page + options.footer,
			footerWidth = ctx.measureText(footerText).width;
		ctx.fillStyle="#000000";
	    ctx.font = FOOTER_FONT_SIZE + 'px Arial';
	    ctx.fillText(footerText, Math.floor((CARD_SIZE_X - footerWidth) / 2), CARD_SIZE_Y - SAFE_AREA_Y - FOOTER_HEIGHT + Math.floor((FOOTER_HEIGHT - FOOTER_FONT_SIZE) / 2));				
	};

	options = options || { };
	options.footer = options.footer ? " - " + options.footer : "";
	var pages = [ ],
		page = 1,
		row = 0,
		col = 0,
		foundLastPage = false,
		canvas,
		ctx;
	createHeader();
	async.whilst(function () {
		return !foundLastPage;
	}, function (callback) {
		makeQRCodeImage(sourceText, QR_CODE_SIZE, function (err, text, image) {
			// console.log("========== Card " + page + " Row " + row + " Col " + col + " ==========");
			// console.log(text);
			foundLastPage = sourceText.length == text.length;
			sourceText = sourceText.substring(text.length, sourceText.length);
			ctx.drawImage(image, SAFE_AREA_X + col * (QR_CODE_SIZE + HORIZONTAL_SPACING), SAFE_AREA_Y + row * (QR_CODE_SIZE + VERTICAL_SPACING));
			col++;
			if (col == COLS_PER_PAGE) {
				col = 0;
				row++;
			}
			if (row == ROWS_PER_PAGE) {
				createFooter();
				pages.push(canvas);
				page++;
				row = 0;
				createHeader();
			}
			callback(null);
		});
	}, function (err) {
		createFooter();
		pages.push(canvas);
		callback(null, pages);
	});
};

var savePages = function (sourceText, options, callback) {
	createPages(sourceText, options, function (err, pages) {
		async.eachLimit(_.range(1, pages.length + 1), 2, function (pageNo, callback) {
		    pages[pageNo - 1].toBuffer(function (err, buf) {
				fs.writeFileSync(argv.out + '/card' + pageNo + '.png', buf);
				callback(null);
			});
		}, function (err) {

		});
	});
};


var sourceText = fs.readFileSync(argv.in, { encoding: 'utf8' });
savePages(sourceText, { decompression: argv.decompression, footer: argv.footer }, function (err) {
	console.log("Completed.");
})
