var repl = require('repl');
var net = require('net');

var Slack = require('./lib/slack');
var token = require('./config').slack.token;
var _ = require('lodash');
var join = require('oxford-join');

var commands = require('./commands');

var autoReconnect = true;
var autoMark = true;

Slack.prototype._formulate = function(text, cb) {
  var tokens = text.split(' ');
  var response;

  tokens.filter(function(x) {
    return x.indexOf('!') === 0;
  }).forEach(function(x) {
    // remove any non-alpha characters
    x = x.substring(1).replace(/[\W_]+/g, '').trim();

    var options = Object.keys(commands);
    var command = commands[x];

    if (typeof command === 'function') {
      return command(text, cb);
    } else {
      response = command;
    }

    if (x.substring(1) === 'help') {
      response = 'There are ' + options.length + ' available triggers: `'+join(options)+'`.  To trigger one, use an `!` anywhere in your message.  For example:\n> Maybe we should get together for a !meetup?  Gosh, that would be fun!';
    }
  });

  return cb(null, response);

};

var slack = new Slack(token, autoReconnect, autoMark);

slack.channelMap = {};
slack.userMap = {};

slack.on('open', function() {
  console.log('Connected to', slack.team.name, 'as @' + slack.self.name);

  Object.keys(slack.channels).forEach(function(id) {
    var channel = slack.channels[id];
    slack.channelMap[channel.name] = channel;
  });
  
  Object.keys(slack.users).forEach(function(id) {
    var user = slack.users[id];
    slack.userMap[user.name] = user;
  });

});

slack.on('message', function(message) {
  console.log('hey, message:', message.subtype, Object.keys(message));

  switch (message.subtype) {
    case undefined:
      slack._formulate(message.text, function(err, response) {
        slack.__reply(message, response);
      });
      break;
    case 'channel_join':
      //slack.__reply(message, slack._formulate(message.text));
      break;
  }

});

slack.on('error', function(err) {
  console.error('Error', err);
});

slack.login();

net.createServer(function(socket) {
  var server = repl.start({
    prompt: 'snarl> ',
    input: socket,
    output: socket
  }).on('exit', function() {
    socket.end();
  });

  server.context.slack = slack;
}).listen('snarl.sock');
