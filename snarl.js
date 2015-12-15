var config = require('./config');

var Snarl = require('./lib/snarl');
var snarl = new Snarl(config);

snarl.use(require('./plugins/erm'));

snarl.start(function(err) {
  console.log('snarl is started.');
});
