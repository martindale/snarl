#! /usr/bin/env node
var config = require('../config');

var Snarl = require('../lib/snarl');
var snarl = new Snarl(config);

snarl.start(function(err) {
  console.log('snarl is started.');
});
