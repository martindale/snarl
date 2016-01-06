var assert = require('assert');
var Snarl = require('../lib/snarl');
var config = require('../config');

describe('Snarl', function() {
  it('should expose a constructor', function(){
    assert(typeof Snarl, 'function');
  });
  it('should handle a message', function(done) {
    var snarl = new Snarl(config);
    snarl.triggers = require('../lib/triggers');
    snarl.conversations = {};
    snarl.userMap = { foo: {} };

    snarl.on('response', function(msg) {
      assert(msg, 'pong!');
      done();
    });
    
    snarl._interpret({
      text: '!ping',
      user: 'foo',
      _client: {
        dms: {},
        self: {
          id: null
        }
      }
    });
  });
});
