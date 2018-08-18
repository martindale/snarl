'use strict';

const Maki = require('maki');
const Doorman = require('doorman');

/**
 * Powerful gorilla to guard your rooms.
 * @param       {Object} config Configuration options for your Gorilla.
 * @constructor
 */
function Snarl (config) {
  this.config = Object.assign({}, config);
  this.app = new Maki(this.config.maki);
  this.bot = new Doorman(this.config);
}

/**
 * Turn the gorilla on.
 * @return {Snarl} Running instance of {@link Snarl}.
 */
Snarl.prototype.start = function () {
  console.log('Snarl starting...');

  let snarl = this;

  snarl.bot.on('channel', snarl._registerChannel.bind(snarl));
  snarl.bot.on('user', snarl._registerUser.bind(snarl));
  snarl.bot.on('message', snarl._registerMessage.bind(snarl));

  snarl.app.start();
  snarl.bot.start();

  return snarl;
};

/**
 * Register a {@link Channel}.
 * @param  {Object} channel
 * @param  {Object} channel.id Unique identifier for this channel.
 * @param  {Object} channel.name Human-friendly name for this channel.
 * @return {Snarl}         Running instance of {@link Snarl}.
 */
Snarl.prototype._registerChannel = function registerChannel (channel) {
  let snarl = this;
  let instance = Object.assign({
    id: channel.id,
    name: channel.name,
    created: Date.now()
  }, channel);

  snarl.app.resources.Channel.create(instance);

  return this;
};

/**
 * Register a {@link User}.
 * @param  {Object} user
 * @param  {Object} user.id Unique identifier for this user.
 * @param  {Object} user.name Human-friendly name for this user.
 * @return {Snarl}         Running instance of {@link Snarl}.
 */
Snarl.prototype._registerUser = function registerUser (user) {
  let snarl = this;
  let instance = Object.assign({
    id: user.id,
    name: user.name,
    created: Date.now()
  }, user);

  snarl.app.resources.Identity.create(instance);

  return this;
};

/**
 * Register a {@link Message}.
 * @param  {Object} message
 * @param  {Object} message.id Unique identifier for this message.
 * @param  {Object} message.name Human-friendly name for this message.
 * @return {Snarl}         Running instance of {@link Snarl}.
 */
Snarl.prototype._registerMessage = function (message) {
  let snarl = this;
  let instance = Object.assign({
    id: message.id,
    name: message.name,
    created: Date.now()
  }, message);

  snarl.app.resources.Message.create(instance);

  return this;
};

module.exports = Snarl;
