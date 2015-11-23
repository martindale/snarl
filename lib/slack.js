var util = require('util');
var Core = require('slack-client');
var Slack = Core;

util.inherits(Slack, Core);

Slack.prototype.__send = function(message) {
  this.ws.send(JSON.stringify(message) + '\n');
};

Slack.prototype.__say = function(channel, text) {
  var message = { type: 'message', channel: channel, text: text };
  this.__send(message);
};

Slack.prototype.__reply = function(message, text) {
  if (!text) return;
  console.log('__reply:', message.channel, text);
  this.__say(message.channel, text);
};

module.exports = Slack;
