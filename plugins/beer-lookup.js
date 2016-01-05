var rest = require('restler');

module.exports = {
  brew: function(msg, cb) {
    var tokens = msg.text.split(' ');

    console.log('brew called, tokens used:', tokens);
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
}
