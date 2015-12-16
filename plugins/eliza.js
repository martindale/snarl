var Eliza = require('../lib/eliza');
var eliza = new Eliza();

eliza.memSize = 500;

var initial = eliza.getInitial();

module.exports = {
  '{DM}': function(text, cb) {
    var reply = eliza.transform(text);
    cb(null, reply);
  }
}
