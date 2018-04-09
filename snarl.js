'use strict';

const config = require('./config');
const Snarl = require('./lib/snarl');

function main () {
  let snarl = new Snarl(config);
  console.log('Snarl starting...');
  snarl.start();
}

main();
