#! /usr/bin/env node
'use strict';

const config = require('../config');
const Snarl = require('../services/snarl');

async function main () {
  const snarl = new Snarl(config);
  await snarl.start();
}

main();
