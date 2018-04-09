#! /usr/bin/env node
'use strict';

const Doorman = require('doorman');
const config = require('../config');

function main () {
  let snarl = new Doorman(config);
  snarl.scribe.log('Snarl starting...');
  snarl.start();
}

main();
