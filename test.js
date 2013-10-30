var async = require('async'),
	fs = require('fs'),
	Canvas = require('canvas'),
	_ = require('underscore'),
	argv = require('optimist') 
		.usage('Usage: $0 --out [output folder]')
		.demand([ 'out' ])
		.alias('out', 'o')
		.argv;

var page = 0;
async.each(_.range(10), function (page, callback) {
	var canvas = new Canvas(200, 200),
	  	ctx = canvas.getContext('2d');
	ctx.font = '30px Impact';
	ctx.fillText("Page " + page, 50, 100); 
	canvas.toBuffer(function (err, buf) {
		if (err) throw err;
		fs.writeFile(argv.out + '/page' + page + '.png', buf);
		callback(null);
	});
}, function (err) {
	console.log("Finished");
});


