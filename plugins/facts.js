var facts = require('../data/facts');

function randomFact(type) {
  var ar = facts[type];
  return ar[Math.round(Math.random()*(ar.length-1))];
}

module.exports = {
  topologyfacts: function(data, cb) {
    return cb(null, randomFact('topology'));
  },
  interstellafacts: function(data, cb) {
    return cb(null, randomFact('interstella'));
  },
  get smifffax () { return this.smifffacts },
  get remaeusfacts () { return this.remæusfacts },
  smifffacts: function(data, cb) {
    return cb(null, randomFact('smiff'));
  },
  remæusfacts: function(data, cb) {
    return cb(null, randomFact('remaeus'));
  },
  insults: function(data, cb) {
    return cb(null, randomFact ('insult'));
  }
}
