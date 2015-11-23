var Slack = require('./lib/slack');
var token = require('./config').slack.token;
var repl = require('repl');
var _ = require('lodash');

var commands = require('./commands');

var autoReconnect = true;
var autoMark = true;

Slack.prototype._formulate = function(text) {
  console.log('formulate:', text);
  
  var tokens = text.split(' ');
  var response;
  
  tokens
    .filter(function(x) {
      return x.indexOf('!') === 0;
    })
    .forEach(function(x) {
      console.log('matching:', x);
      var command = commands[x.substring(1)];
      console.log('command:', command);
      
      if (typeof command === 'function') {
        response = command(text);
      } else {
        response = command;
      }
    });

  return response;

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
      slack.__reply(message, slack._formulate(message.text));
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

var server = repl.start({
  prompt: 'snarl> '
});

server.context.slack = slack;
