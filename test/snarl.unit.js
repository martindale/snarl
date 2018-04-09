'use strict';

const assert = require('assert');
const config = require('../config');

const Snarl = require('../lib/snarl');

describe('Snarl', function () {
  it('should expose a constructor', function () {
    assert(Snarl instanceof Function);
  });

  it('should emit a ready event on default startup', function (done) {
    let snarl = new Snarl(config);
    snarl.bot.on('ready', done);
    snarl.bot.start();
  });
});
