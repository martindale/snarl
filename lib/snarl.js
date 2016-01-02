var _ = require('lodash');
var util = require('util');
var join = require('oxford-join');
var Slack = require('./slack');
var Eliza = require('./eliza');

function Snarl(config) {
  this.config = config;
  this.debug = config.debug;
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

  if (self.debug) {
    console.log('message:', message);
  }

  var dms = Object.keys(message._client.dms);
  var me = message._client.self.id;

  if (message.user === me) {
    return; // never respond to self.
  }

  // messages without a subtype seem to be chat messages
  if (!message.subtype) {
    var text = message.text;
    var tokens = text.split(' ');

    var mentions = tokens.filter(function(x) {
      return x.slice(0, 2) === '<@';
    }).map(function(x) {
      return x.replace(/[\W_]+/g, '').trim();
    });

    var mentionNames = mentions.map(function(x) {
      return self.userMap[x].name;
    });

    var isPrivate = dms.indexOf(message.channel) >= 0;
    var isMention = mentions.indexOf(me) >= 0;
    var inConversation = Object.keys(self.conversations).indexOf(message.user) >= 0;

    if (isMention) {
      if (self.conversations[message.user]) {
        clearTimeout(self.conversationTimers[message.user]);
      }

      self.conversations[message.user] = setTimeout(function() {
        delete self.conversations[message.user];
      }, 5 * 60 * 1000);
    }

    var triggers = tokens.filter(function(x) {
      return x.indexOf('!') === 0;
    });

    var msg = {
      text: text,
      from: {
        username: self.userMap[message.user].name,
        profile: self.userMap[message.user].profile
      }
    };

    if ((isPrivate || isMention || inConversation) && !triggers.length) {
      if (self.triggers['{DM}']) {
        if (typeof self.triggers['{DM}'] === 'function') {
          return self.triggers['{DM}'](msg, function(err, reply) {
            self.emit('response', reply, message);
          });
        } else {
          return self.emit('response', self.triggers['{DM}'], message);
        }
      } else {
        var reply = self.userMap[message.user].eliza.transform(text);
        return self.emit('response', reply, message);
      }
    }

    triggers.forEach(function(x) {
      // remove any non-alpha characters
      x = x.substring(1).replace(/[\W_]+/g, '').trim();

      var command = self.triggers[x];

      if (typeof command === 'function') {
        return command(msg, function(err, response) {
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

  slack.userMap = {};
  slack.channelMap = {};
  slack.plugins = [];
  slack.conversations = [];
  slack.conversationTimers = {};

  // configure default triggers
  slack.triggers = require('./triggers');

  // extend with plugins
  self._plugins.forEach(function(plugin) {
    slack.plugins.push(plugin);
    slack.triggers = _.extend(slack.triggers, plugin);
  });

  slack.on('open', function() {
    console.log('Connected.');
  });

  slack.on('open', slack._channelInventory);
  slack.on('open', slack._userInventory);

  slack.on('message', self._interpret);

  slack.on('response', function(response, message) {
    slack.__reply(message, response);
  });

  slack.on('user', function(user) {
    user.eliza = new Eliza();
    slack.userMap[user.id] = user;
  });

  slack.on('error', function(err) {
    console.error(err);
  });

  setInterval(function() {
    console.log('active conversations:', Object.keys(slack.conversations).length);
  }, 60 * 1000);

  slack.login();

  return cb();
}

module.exports = Snarl;
