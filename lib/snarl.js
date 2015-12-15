var _ = require('lodash');
var util = require('util');
var join = require('oxford-join');
var Slack = require('./slack');

function Snarl(config) {
  this.config = config;
  this.name = config.name;
  this.slack = new Slack(config.slack.token, true, true);
  this._plugins = [];
}

util.inherits(Snarl, require('events').EventEmitter);

Snarl.prototype.use = function(plugin) {
  var self = this;
  self._plugins.push(plugin);
}

Snarl.prototype._interpret = function(message) {
  var self = this;
  var options = self.triggers ? Object.keys(self.triggers) : [];

  if (!message.subtype) {
    var text = message.text;
    var tokens = text.split(' ');
    tokens.filter(function(x) {
      return x.indexOf('!') === 0;
    }).forEach(function(x) {
      // remove any non-alpha characters
      x = x.substring(1).replace(/[\W_]+/g, '').trim();

      var command = self.triggers[x];

      if (typeof command === 'function') {
        return command(text, function(err, response) {
          self.emit('response', response, message);
        });
      } else {
        var response = command;
        self.emit('response', response, message);
      }

      if (x === 'help') {
        var response = 'There are ' + options.length + ' available triggers: `'+join(options)+'`.  To trigger one, use an `!` anywhere in your message.  For example:\n> Maybe we should get together for a !meetup?  Gosh, that would be fun!';
        self.emit('response', response, message);
      }
    });

  }
};

Snarl.prototype.start = function() {
  var self = this;
  var slack = self.slack;
  if (!cb) {
    var cb = new Function();
  }
  
  // configure default triggers
  slack.triggers = require('./triggers');
  
  // extend with plugins
  self._plugins.forEach(function(plugin) {
    slack.triggers = _.extend(slack.triggers, plugin);
  });
  
  console.log('slack triggers:', slack.triggers);

  slack.on('open', function() {
    console.log('Connected.');
  });
  
  slack.on('open', slack._channelInventory);
  slack.on('open', slack._userInventory);
  
  slack.on('message', self._interpret);
  
  slack.on('response', function(response, message) {
    slack.__reply(message, response);
  });

  slack.login();
  
  return cb();
}

module.exports = Snarl;
