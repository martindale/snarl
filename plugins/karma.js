var async = require('async');

module.exports = {
  '{*}': function(msg, cb) {
    var self = this;
    var karmic = msg.tokens.filter(function(x) {
      return x.length > 2 && x.lastIndexOf('++') >= 0;
    }).map(function(x) {
      return x.replace(/[\W_]+/g, '').trim();
    }).map(function(x) {
      return self.userMap[x].name;
    });

    if (!karmic.length) return cb(null);

    async.each(karmic, function(username, done) {
      var key = username + ':karma';
      self.db.get(key, function(err, value) {
        if (err) console.error(err);
        if (!value) value = 0;
        self.db.put(key, ++value, function(err) {
          if (err) console.error(err);
          done(err);
        });
      });
    }, function(err, results) {
      async.map(karmic, function(username, done) {
        var key = username + ':karma';
        self.db.get(key, done);
      }, function(err, results) {
        if (err) console.error(err);
        return cb(err);
      });
    });
  }
};
