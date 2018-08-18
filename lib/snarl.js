'use strict';

const Maki = require('maki');
const Doorman = require('doorman');

function Snarl (config) {
  this.app = new Maki(config.maki);
  this.bot = new Doorman(config);
}

Snarl.prototype.start = function () {
  let snarl = this;
  console.log('Snarl starting...', snarl.bot);

  snarl.bot.on('user', function (user) {
    let instance = Object.assign({
      id: user.id,
      name: user.name,
      created: Date.now()
    }, user);

    snarl.app.resources.Identity.create(instance, function (err, identity) {
      console.log('maki created identity:', err, identity);
    });
  });

  snarl.app.start();
  snarl.bot.start();
};

module.exports = Snarl;
