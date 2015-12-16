var util = require('util');
var Slack = require('slack-client');

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

Slack.prototype._channelInventory = function() {
  var self = this;
  Object.keys(self.channels).forEach(function(id) {
    var channel = self.channels[id];
    self.emit('channel', channel);
  });
};

Slack.prototype._userInventory = function() {
  var self = this;
  Object.keys(self.users).forEach(function(id) {
    var user = self.users[id];
    self.emit('user', user);
  });
};

module.exports = Slack;
