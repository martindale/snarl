var util = require('util');
var Cleverbot = require('cleverbot-node');
var cleverbot = new Cleverbot;

function Handler() {
  
}

util.inherits(Handler, require('events').EventEmitter);

Handler.prototype.plugin = function() {
  var self = this;
  return {
    '{DM}': function(text, cb) {
      self.emit('typing');
      Cleverbot.prepare(function() {
        console.log('cleverbot prepared...')
        cleverbot.write(text, function(response) {
          console.log('cleverbot back...', response);
          cb(null, response.message);
        });
      });
    }
  }
}

var handler = new Handler();

module.exports = handler.plugin();
