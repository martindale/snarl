var erm = require('erm');

module.exports = {
  erm: function(data, cb) {
    return cb(null, erm(data));
  },
}
