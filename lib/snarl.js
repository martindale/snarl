'use strict';

const Doorman = require('doorman');

function Snarl (config) {
  this.bot = new Doorman(config);
}

Snarl.prototype.start = function () {
  console.log('Snarl starting...', this.bot);
  this.bot.start();
};

module.exports = Snarl;
