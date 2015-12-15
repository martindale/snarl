var rest = require('restler');
var _ = require('lodash');
var async = require('async');

var facts = require('../data/facts');

function randomFact(type) {
  var ar = facts[type];
  return ar[Math.round(Math.random()*(ar.length-1))];
}

module.exports = {
  snarl: 'Ohaithar.  I\'m a bot created by @martindale.  Blame him for any of my supposed mistakes.',
  source: 'You can see all my insides (and submit modifications) here: http://github.com/martindale/snarl',
  meetup: 'Many of us have met in person, usually for drinks.  Join #beer to coordinate!',
  force: '/me senses a disturbance in the force.',
  ping: 'pong!',
  topologyfacts: function(data, cb) {
    return cb(null, randomFact('topology'));
  },
  interstellafacts: function(data, cb) {
    return cb(null, randomFact('interstella'));
  },
  get smifffax () { return this.smifffacts },
  smifffacts: function(data, cb) {
    return cb(null, randomFact('smiff'));
  },
  remæusfacts: function(data, cb) {
    return cb(null, randomFact('remaeus'));
  },
  brew: function(data, cb) {
    var tokens = data.split(' ');
    
    console.log('brew called, tokens:', tokens);
    var query = tokens.filter(function(x) {
      return x !== '!brew';
    }).join(' ');

    if (query.length) {
      rest.get('http://api.brewerydb.com/v2/search?q=' + query + '&key=7c05e35f30f5fbb823ec4731735eb2eb').on('complete', function(api) {
        if (typeof(api.data) != 'undefined' && api.data.length > 0) {
          if (typeof(api.data[0].description) != 'undefined') {
            cb(null, api.data[0].name + ': ' + api.data[0].description);
          } else {
            cb(null, api.data[0].name + ' is a good beer, but I don\'t have a good way to describe it.');
          }
        } else {
          cb(null, 'Damn, I\'ve never heard of that.  Where do I need to go to find it?');
        }
      });
    } else {
      return 'How about asking for something in specific?';
    }
  }
  /* trout: function(data) {
    console.log('message:', message);
    
    var target = data.from;

    if (typeof(data.params) != 'undefined' && data.params.trim().length > 0) {
      target = data.params.trim();
    }

    return '/me slaps ' + target + ' around a bit with a large trout.';
  },
  falconpunch: function(data) {
    return '/me falcon punches ' + data.from + ' out of a 13-story window.';
  } */
}
