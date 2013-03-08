
/**
 * Module dependencies.
 */

var express = require('express')
  , _ = require('underscore')
  , http = require('http')
  , path = require('path')
  , Game = require('./server/game')
  , browserify = require('browserify')
  , browserify_middleware = require('./server/middleware/browserify')
  , httpServer, app, io;

app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

var browserifyMiddleware = browserify_middleware({
  entry: __dirname + '/client/index.js',
  watch: __dirname + '/',
  mount: '/javascripts/airhockey.js',
  verbose: true,
  minify: false
}, function(bundle) {
  console.log(bundle);
});

app.use(browserifyMiddleware);

app.configure('development', function(){
  app.use(express.errorHandler());
});

httpServer = http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});

io = require('socket.io').listen(httpServer, { log: false });

var game = new Game(io);

game.init();
