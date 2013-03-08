var browserify = require('browserify')
  , handleify = require('handleify');

function browserify_middleware(opts) {
	var bundle, cache_time;
	var cache = '';
	
	if (typeof opts !== 'object') throw new Error('opts must be an object');
	if ( ! opts.entry) throw new Error('must provide an entry point');
	if ( ! opts.mount) throw new Error('must provide a mount point');

	bundle = browserify(opts.entry);

  bundle.transform(handleify);

	opts.bundle_opts = opts.bundle_opts || {};

	function bundle_it() {
		var stime = new Date();
		bundle.bundle(opts.bundle_opts, function(err, src) {
			cache_time = new Date();
			cache = src;

      var bundle_seconds = Number(((new Date()) - stime) / 1000);
      console.log('browserify -- bundled [' + bundle_seconds.toFixed(2) + 's] ' + opts.mount);
		});
	}

	bundle_it();

	return function(req, res, next) {
		if (req.url.split('?')[0] === opts.mount) {
			res.statusCode = 200;
			res.setHeader('last-modified', cache_time.toString());
			res.setHeader('content-type', 'text/javascript');
			res.end(cache);
		}
		else {
			next();
		}
	};
}

module.exports = browserify_middleware;
