var erm = require('erm');

module.exports = {
  erm: function(message, cb) {
    return cb(null, erm(message.text));
  },
}
