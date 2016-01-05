var Eliza = require('../lib/eliza');
var eliza = new Eliza();

eliza.memSize = 500;

var initial = eliza.getInitial();

module.exports = {
  conversation: 'You can @mention me in a channel (or DM me) and I\'ll start a conversation with you.  After you get my attention, no need to tag me again -- but I\'ll stop if you don\'t say anything for a few minutes.  I have things to do!',
  '{DM}': function(text, cb) {
    var reply = eliza.transform(text);
    cb(null, reply);
  }
}
