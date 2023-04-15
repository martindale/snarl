'use strict';

const assert = require('assert');
const config = require('../config');
const source = require('../plugins/source');
const soundtrack = require('../plugins/soundtrack');

const Snarl = require('../services/snarl');

describe('Snarl', function () {
  this.timeout(60000);

  it('should expose a constructor', function () {
    assert(Snarl instanceof Function);
  });

  it('should emit a ready event on default startup', function (done) {
    let snarl = new Snarl();

    snarl.on('ready', async function () {
      console.log('received ready!');
      await snarl.stop();
      console.log('stopping stopped! returning done');
      return done();
    });

    snarl.start();
  });

  describe('_registerChannel', function () {
    it('should return a truthy value', function (done) {
      let snarl = new Snarl();

      async function body () {
        await snarl.start();
        await snarl._registerChannel({
          id: 'test'
        });
        await snarl.stop();
        return done();
      }

      body();
    });
  });

  describe('_registerUser', function () {
    it('should return a truthy value', function (done) {
      let snarl = new Snarl();

      async function body () {
        await snarl.start();
        await snarl._registerUser({
          id: 'test'
        });
        await snarl.stop();
        return done();
      }

      body();
    });
  });

  describe('_registerMessage', function () {
    it('should return a truthy value', function (done) {
      let snarl = new Snarl();

      async function body () {
        await snarl.start();
        await snarl._registerMessage({
          id: 'test'
        });
        await snarl.stop();
        return done();
      }

      body();
    });
  });

  describe('Plugin', function () {
    xit('should respond to a !source request', function (done) {
      let snarl = new Snarl();

      console.log('bot:', snarl.bot);

      snarl.bot.on('response', async function (message) {
        assert.equal(message.parent.id, 'local/messages/test');
        assert.equal(message.response, source.source());
        await snarl.stop();
        return done();
      });

      snarl.on('ready', async function () {
        snarl.bot.services.local.emit('message', {
          id: 'test',
          actor: 'Alice',
          target: 'test',
          object: 'Use the !source Luke!'
        });
      });

      snarl.start();
    });

    xit('give credit to the !soundtrack community', function (done) {
      let snarl = new Snarl();

      snarl.bot.on('response', async function (message) {
        assert.equal(message.parent.id, 'local/messages/test');
        assert.equal(message.response, soundtrack.soundtrack());
        await snarl.stop();
        return done();
      });

      snarl.on('ready', async function () {
        snarl.bot.services.local.emit('message', {
          id: 'test',
          actor: 'Alice',
          target: 'test',
          object: 'Listen to the !soundtrack of life...'
        });
      });

      snarl.start();
    });
  });
});
