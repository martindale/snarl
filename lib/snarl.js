var _ = require('lodash');
var util = require('util');
var join = require('oxford-join');
var level = require('level');
var Slack = require('./slack');
var eventList = require('./events');
//var Eliza = require('./eliza');

function Snarl(config) {
  this.config = config;
  this.debug = config.debug;
  this.name = config.name;
  this.db = level(config.store);
  this.slack = new Slack(config.slack.token, true, true);
  this.events = eventList;
  this._plugins = [];
}

util.inherits(Snarl, require('events').EventEmitter);

Snarl.prototype.use = function(plugin) {
  var self = this;
  self._plugins.push(plugin);
  return self;
}

Snarl.prototype.autoload = function() {
  var self = this;
  var config = self.config;
  if (config.plugins && config.plugins instanceof Array) {
    var fs = require('fs');
    var base = __dirname + '/../plugins/';

    config.plugins.forEach(function(plugin) {
      var path = base + '/' + plugin + '.js';
      var name = 'snarl-' + plugin;
      var node = __dirname + '/../node_modules/' + name;

      if (fs.existsSync(path)) {
        self.use(require(path));
      } else if (fs.existsSync(node)) {
        self.use(require(name));
      } else {
        console.error('config file wanted `' + plugin + '` but it was not found.');
      }
    });
  }
  return self;
}

Snarl.prototype._interpretRaw = function(message) {
  var self = this;
  var options = self.triggers ? Object.keys(self.triggers) : [];

  if (self.debug) {
    console.log('raw message received:', message.type);
  }

  self.events.forEach(function(e) {
    if (message.type === e.type) {
      console.log('message matched', e.type, ', emitting new event:', e.name);
      self.emit(e.name, message);
    }
  });

}

Snarl.prototype._interpret = function(message) {
  var self = this;
  var options = self.triggers ? Object.keys(self.triggers) : [];

  if (self.debug) {
    console.log('message received:', message.type, message.subtype, 'interpreting...');
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
      if (!self.userMap[x]) {
        console.error('Could not find user in map: ' + x);
        return 'Unknown';
      }
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

    var parsed = text.replace(/\!([a-zA-Z])+\s?/g, '');

    var msg = {
      raw: message.text,
      text: text,
      tokens: tokens,
      triggers: triggers,
      mentions: mentions,
      parsed: parsed,
      timestamp: message.ts,
      channel: message.channel,
      from: {
        id: self.userMap[message.user].id,
        username: self.userMap[message.user].name,
        profile: self.userMap[message.user].profile
      }
    };

    if ((isPrivate || isMention || inConversation) && !triggers.length) {
      if (self.triggers['{DM}']) {
        if (typeof self.triggers['{DM}'] === 'function') {
          return self.triggers['{DM}'].apply(self, [msg, function(err, reply) {
            self.emit('response', reply, message);
          }]);
        } else {
          return self.emit('response', self.triggers['{DM}'], message);
        }
      } else if (self.userMap[message.user].eliza) {
        var reply = self.userMap[message.user].eliza.transform(text);
        return self.emit('response', reply, message);
      }
    }

    if (self.triggers['{*}']) {
      if (typeof self.triggers['{*}'] === 'function') {
        return self.triggers['{*}'].apply(self, [msg, function(err, reply) {
          self.emit('response', reply, message);
        }]);
      }
    }

    triggers.forEach(function(x) {
      // remove any non-alpha characters
      x = x.substring(1).replace(/[\W_]+/g, '').trim();

      var command = self.triggers[x];

      if (typeof command === 'function') {
        return command.apply(self, [msg, function(err, response) {
          self.emit('response', response, message);
        }]);
      } else {
        var response = command;
        self.emit('response', response, message);
      }

      if (x === 'help') {
        var response = 'There are ' + options.length + ' available triggers: '+join(options.map(function(x) {
          return '`'+x+'`';
        }))+'.  To trigger one, use an `!` anywhere in your message.  For example:\n> Maybe we should get together for a !meetup?  Gosh, that would be fun!';
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
  slack.config = self.config;
  slack.debug = self.debug;
  slack.userMap = {};
  slack.userNameMap = {};
  slack.channelMap = {};
  slack.channelNameMap = {};
  slack.plugins = [];
  slack.conversations = [];
  slack.conversationTimers = {};
  slack.db = self.db;
  slack.events = self.events;

  // configure default triggers
  slack.triggers = require('./triggers');

  // extend with plugins
  self._plugins.forEach(function(plugin) {
    slack.plugins.push(plugin);
    slack.triggers = _.extend(slack.triggers, plugin);

    slack.events.forEach(function(e) {
      if (plugin[e.trigger]) {
        slack.on(e.name, function(obj) {
          slack.triggers[e.trigger].apply(slack, [obj, function(err, reply) {
            //slack.emit('response', reply, message);
          }]);
        });
      }
    });
  });

  slack.on('open', function() {
    console.log('Connected.');
  });

  slack.on('open', slack._channelInventory);
  slack.on('open', slack._userInventory);

  slack.on('raw_message', self._interpretRaw);
  slack.on('message', self._interpret);

  slack.on('response', function(response, message) {
    slack.__reply(message, response);
  });

  slack.on('user', function(user) {
    //user.eliza = new Eliza();
    slack.userMap[user.id] = user;
    slack.userNameMap[user.name] = user;
  });

  slack.on('channel', function(room) {
    slack.channelMap[room.id] = room;
    slack.channelNameMap[room.name] = room;
  });

  slack.on('error', function(err) {
    console.error(err);
  });

  setInterval(function() {
    console.log('active conversations:', Object.keys(slack.conversations).length);
  }, 60 * 1000);

  slack.login();

  return cb();
};

module.exports = Snarl;
