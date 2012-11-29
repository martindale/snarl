var config = require('./config')
  , messages = require('./messages');


var AUTH = config.auth; // Put your auth token here, it's the cookie value for usr
var ROOM = config.room;

var PlugAPI = require('plugapi'),
    repl = require('repl');

var bot = new PlugAPI(AUTH);
bot.connect(ROOM);

bot.on('chat', function(data) {

  if (data.type == 'emote') {
    console.log(data.from+data.message);
  } else {
    console.log(data.from+"> "+data.message);
  }

  var cmd = data.message;
  var tokens = cmd.split(" ");
  tokens.forEach(function(token) {
    if (token.substr(0, 1) === '!') {
      data.trigger = token.substr(1);

      if (data.trigger == 'commands') {
        bot.chat('Available commands are: ' + Object.keys(messages).join(', '));
      } else {
      
        if (tokens.indexOf(token) === 0) {
          data.params = tokens.slice(1).join(' ');
        }

        switch (typeof(messages[data.trigger])) {
          case 'string':
            bot.chat(messages[data.trigger]);
          break;
          case 'function':
            messages[data.trigger].apply(bot, [ data ]);
          break;
        }

      }
    }
  });

});

var _reconnect = function() { bot.connect('coding-soundtrack'); };
var reconnect = function() { setTimeout(_reconnect, 500); };
bot.on('close', reconnect);
bot.on('error', reconnect);

r = repl.start("node> ");
r.context.bot = bot;
