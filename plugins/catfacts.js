var rest = require('restler');

module.exports = {
  catfacts: function(msg, cb) {
    rest.get('http://catfacts-api.appspot.com/api/facts').on('complete', function(api) {
      if (api.facts && api.facts.length > 0) {
        cb(null, api.facts[0]);
      } else {
        cb(null, 'Damn, the api doesn\'t want to work right now... Not unlike a cat.');
      }
    });
  }
};
