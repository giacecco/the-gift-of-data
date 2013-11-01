var async = require('async'),
	fs = require('fs'),
	Canvas = require('canvas'),
	zlib = require('zlib'),
	_ = require('underscore'),
	argv = require('optimist') 
		.usage('Usage: $0 --in inputFile --out outputFolder] [--utf8] [--zoom zoom%] [--footer "footer message"] [--maxpages maxNoOfPages]')
		.demand([ 'in', 'out' ])
		.alias('in', 'i')
		.alias('out', 'o')
		.alias('utf8', 'u')
		.alias('zoom', 'z')
		.alias('footer', 'f')
		.alias('maxpages', 'm')
		.default('zoom', '100')
		.argv,
	QRCodes = require('./qrcodes');

var CARD_SIZE_X = 1795,
	CARD_SIZE_Y = 1287, // Moo-specified final artwork size is 109mm x 152mm
	SAFE_AREA_X = 40,
	SAFE_AREA_Y = 40, // determined experimentally by uploading the images to Moo
	QR_CODE_SIZE = 580, // determined experimentally
	FOOTER_FONT_SIZE = 30,
	FOOTER_HEIGHT = FOOTER_FONT_SIZE * 2,
	ROWS_PER_PAGE = Math.floor((CARD_SIZE_Y - FOOTER_HEIGHT) / QR_CODE_SIZE),
	COLS_PER_PAGE = Math.floor(CARD_SIZE_X / QR_CODE_SIZE),
	QRS_PER_PAGE = ROWS_PER_PAGE * COLS_PER_PAGE,
	HORIZONTAL_SPACING = Math.floor((CARD_SIZE_X - SAFE_AREA_X * 2 - QR_CODE_SIZE * COLS_PER_PAGE) / (COLS_PER_PAGE - 1)),
	VERTICAL_SPACING = Math.floor((CARD_SIZE_Y - SAFE_AREA_Y * 2 - QR_CODE_SIZE * ROWS_PER_PAGE - FOOTER_HEIGHT) / (ROWS_PER_PAGE - 1));

var createPages = function (sourceText, options, callback) {
	options = options || { };
	options.zoom = options.zoom || 1.;
	options.footer = options.footer ? " - " + options.footer : "";
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

	var pages = [ ],
		page = 1,
		row = 0,
		col = 0,
		foundLastQr = false,
		canvas,
		ctx;
	createHeader();
	async.whilst(function () {
		return !foundLastQr;
	}, function (callback) {
		QRCodes.draw(sourceText, { targetSize: Math.floor(QR_CODE_SIZE / options.zoom) }, function (err, text, qRCanvas) {
			var img = new Canvas.Image;
			img.src = qRCanvas.toBuffer();
			ctx.drawImage(
				img, 
				SAFE_AREA_X + col * (QR_CODE_SIZE + HORIZONTAL_SPACING), 
				SAFE_AREA_Y + row * (QR_CODE_SIZE + VERTICAL_SPACING),
				options.zoom != 1. ? QR_CODE_SIZE : img.width,
				options.zoom != 1. ? QR_CODE_SIZE : img.height
			);
			foundLastQr = 
				sourceText.length == text.length || 
				(options.maxPages ? (col + 1 == COLS_PER_PAGE) && (row + 1 == ROWS_PER_PAGE) && (page == options.maxPages) : false);
			// for the next round
			if (!foundLastQr) {
				sourceText = sourceText.substring(text.length, sourceText.length);
				col++;
				if (col == COLS_PER_PAGE) {
					col = 0;
					row++;
				}
				if (row == ROWS_PER_PAGE) {
					pages.push(canvas);
					page++;
					row = 0;
					createHeader();
				}
			}
			callback(null);
		});
	}, function (err) {
		pages.push(canvas);
		callback(null, pages);
	});
};

var createPagesPass2 = function (pages, options, callback) {
	async.eachLimit(_.range(1, pages.length + 1), 2, function (pageNo, callback) {
		var ctx = pages[pageNo - 1].getContext('2d'),
			footerText = 'Card ' + pageNo + " of " + pages.length + options.footer,
			footerWidth = ctx.measureText(footerText).width;
		ctx.fillStyle="#000000";
	    ctx.font = FOOTER_FONT_SIZE + 'px Arial';
	    ctx.fillText(footerText, Math.floor((CARD_SIZE_X - footerWidth) / 2), CARD_SIZE_Y - SAFE_AREA_Y - FOOTER_HEIGHT + Math.floor((FOOTER_HEIGHT - FOOTER_FONT_SIZE) / 2));				
	    callback(null);
	}, function (err) {
		callback(err, pages);
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
			callback(err);
		});
	});
};


fs.readFile(argv.in, { encoding: (argv.utf8 ? 'utf8' : undefined) }, function (err, buffer) {

	var save = function (text) {
		savePages(
			text, 
			{	maxPages: argv.maxpages, 
				zoom: parseFloat(argv.zoom) / 100., 
				footer: argv.footer }, 
			function (err) {
				console.log("Completed.");
			}
		);
	}

	buffer = argv.utf8 ? buffer : buffer.toString('base64')
	if (!argv.raw) {
		zlib.deflate(buffer, function(err, buffer) {
			save(buffer.toString('base64'));
		});
	} else {
		save(buffer);
	}
});
