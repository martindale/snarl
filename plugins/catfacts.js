var rest = require('restler');

module.exports = {
  catfacts: function(msg, cb) {
    rest.get('http://catfacts-api.appspot.com/api/facts').on('complete', function(api) {
      var input = JSON.parse(api);
      if (input.facts && input.facts.length > 0) {
        cb(null, input.facts[0]);
      } else {
        cb(null, 'Damn, the api doesn\'t want to work right now... Not unlike a cat.');
      }
    });
  }
};
