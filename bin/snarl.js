#! /usr/bin/env node
var config = require('../config');

var Snarl = require('../lib/snarl');
var snarl = new Snarl(config);

// you can add plugins here:
// snarl.use(require('snarl-karma'));

// or, simply add them to `config/index.json` and they will be auto-loaded:
snarl.autoload();

snarl.start(function(err) {
  console.log('snarl is started.');
});
