var fs = require('fs');
var http = require('http');
var _ = require('underscore');
var mustache = require('mu2');
var express = require('express');
var WebSocketServer = require('ws').Server;

var PORT = process.env.PORT || 3000;
var DEBUG = 'DEBUG' in process.env;
var INTEGER_RE = /^\d+$/;
var MAX_DIMENSION = 500;
var KEEPALIVE_INTERVAL = 30000;
var OMIT_HEADERS = lowercased(commaSeparated(process.env.OMIT_HEADERS));
var IP_HEADER = (process.env.IP_HEADER || '').toLowerCase();
var COPY_PK_HEADERS = [
  'content-type',
  'content-length',
  'access-control-allow-origin'
];

var app = express();
var server = http.createServer(app);
var wss = new WebSocketServer({server: server});
var channels = {
  _chan: {},
  add: function(name, ws) {
    if (!(name in this._chan))
      this._chan[name] = [];
    this._chan[name].push(ws);
  },
  remove: function(name, ws) {
    var index = (this._chan[name] || []).indexOf(ws);
    if (index == -1) throw new Error('socket not found in ' + name);
    this._chan[name].splice(index, 1);
    if (this._chan[name].length == 0)
      delete this._chan[name];
  },
  broadcast: function(name, msg) {
    (this._chan[name] || []).forEach(function(ws) {
      ws.send(msg);
    });
  }
};

function lowercased(list) {
  return list.map(function(item) { return item.toLowerCase(); });
}

function commaSeparated(str) {
  str = str || '';
  return str.split(',').map(function(item) { return item.trim(); });
}

function setDimension(name) {
  return function(req, res, next, id) {
    if (!INTEGER_RE.test(id)) return next('route');
    id = parseInt(id);
    if (id == 0 || id > MAX_DIMENSION) return next('route');
    req[name] = id;
    next();
  }
}

function getRemoteAddress(req) {
  var addr;
  if (IP_HEADER)
    // If there are multiple IP addresses listed, assume the
    // last one is the most trusted: http://stackoverflow.com/a/18517550
    addr = commaSeparated(req.headers[IP_HEADER]).slice(-1)[0];
  return addr || req.connection.remoteAddress;
}

function channelNameFromRequest(req) {
  return '/' + req.width + '/' + req.height + '/channel';
}

function makeRandomPath() {
  return '/' + _.random(1, MAX_DIMENSION) + '/' +
               _.random(1, MAX_DIMENSION) + '/log';
}

mustache.root = __dirname + '/templates';

app.param('width', setDimension('width'));
app.param('height', setDimension('height'));

if (DEBUG)
  app.use(function(req, res, next) { mustache.clearCache(); next(); });

app.get('/', function(req, res) {
  res.writeHead(200, {'content-type': 'text/html'});
  mustache.compileAndRender('index.html', {
    randomPath: makeRandomPath()
  }).pipe(res);  
});

app.get('/:width/:height', function setCookie(req, res, next) {
  if (req.headers.dnt == '1') return next();
  var match = (req.headers.cookie || '').match(/requestCount=([0-9]+)/);
  res.cookie('requestCount', match ? parseInt(match[1]) + 1 : 1);
  next();
}, function(req, res, next) {
  var url = 'http://placekitten.com/' + req.width + '/' + req.height;
  var info = _.extend(_.pick(req, 'method', 'url', 'httpVersion'), {
    remoteAddress: getRemoteAddress(req),
    headers: _.omit(req.headers, OMIT_HEADERS)
  });
  channels.broadcast(channelNameFromRequest(req), JSON.stringify(info));
  http.get(url, function(kittenRes) {
    if (kittenRes.statusCode != 200)
      return res.send(502);
    res.writeHead(200, _.pick(kittenRes.headers, COPY_PK_HEADERS));
    kittenRes.pipe(res);
  }).on('error', function(e) {
    return res.send(502);
  });
});

app.get('/:width/:height/log', function(req, res, next) {
  res.writeHead(200, {'content-type': 'text/html'});
  mustache.compileAndRender('log.html', {
    path: '/' + req.width + '/' + req.height,
    randomPath: makeRandomPath(),
    channelName: channelNameFromRequest(req)
  }).pipe(res);
});

app.use(express.static(__dirname + '/static'));

server.listen(PORT, function() {
  console.log('listening on port ' + PORT);
});

wss.on('connection', function(ws) {
  var keepalive = setInterval(function() {
    ws.send('keepalive');
  }, KEEPALIVE_INTERVAL);
  channels.add(ws.upgradeReq.url, ws);
  ws.on('close', function() {
    clearInterval(keepalive);
    channels.remove(ws.upgradeReq.url, ws);
  });
});
