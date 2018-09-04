'use strict';

const Doorman = require('doorman');
const Maki = require('maki');

const defaults = require('../config');
const meta = require('../package');

const EventEmitter = require('events').EventEmitter;

/**
 * Powerful gorilla to guard your rooms.
 * @param       {Object} config Configuration options for your Gorilla.
 * @constructor
 */
class Snarl extends EventEmitter {
  constructor (config) {
    super(config);

    this.config = Object.assign({}, defaults, config);
    this.meta = Object.assign({
      service: {
        name: `@${meta.name}`,
        about: `Control panel for [@snarl](${meta.homepage}).`,
        copyright: `&copy; ${(new Date()).getFullYear()} Fabric Labs`
      },
      database: {
        name: meta.name
      }
    }, this.config.maki);

    this.app = new Maki(this.meta);
    this.bot = new Doorman(this.config);

    return this;
  }
}

/**
 * Turn the gorilla on.
 * @async
 * @return {Snarl} Running instance of {@link Snarl}.
 */
Snarl.prototype.start = async function () {
  let snarl = this;

  snarl.bot.on('channel', snarl._registerChannel.bind(snarl));
  snarl.bot.on('user', snarl._registerUser.bind(snarl));
  snarl.bot.on('message', snarl._registerMessage.bind(snarl));
  snarl.bot.on('ready', snarl._signalReady.bind(snarl));

  if (snarl.config.services.web) {
    await snarl.app.start();
  }

  await snarl.bot.start();

  return snarl;
};

/**
 * Turn the gorilla off.
 * @async
 * @return {snarl} Stopped instance of {@link Snarl}.
 */
Snarl.prototype.stop = async function () {
  let snarl = this;

  await snarl.bot.stop();
  await snarl.app.stop();

  return snarl;
};

/**
 * Register a {@link Channel}.
 * @param  {Object} channel
 * @param  {String} channel.id Unique identifier for this channel.
 * @param  {String} channel.name Human-friendly name for this channel.
 * @param  {Number} [channel.created] Unix timestamp of the channel's creation time.
 * @param  {Array} [channel.members] List of the channel's members.
 * @return {Snarl}         Running instance of {@link Snarl}.
 */
Snarl.prototype._registerChannel = function registerChannel (channel) {
  let snarl = this;
  let instance = Object.assign({
    id: channel.id,
    name: channel.name,
    created: Date.now(),
    members: []
  }, channel);

  if (this.config.services.web) {
    // TODO: ensure idempotent creations
    snarl.app.resources.Channel.create(instance);
  }

  return snarl;
};

/**
 * Register a {@link User}.
 * @param  {Object} user
 * @param  {String} user.id Unique identifier for this user.
 * @param  {String} user.name Human-friendly name for this user.
 * @param  {Number} [user.created] Unix timestamp of the user's creation time.
 * @return {Snarl}         Running instance of {@link Snarl}.
 */
Snarl.prototype._registerUser = function registerUser (user) {
  let snarl = this;
  let instance = Object.assign({
    id: user.id,
    name: user.name,
    created: Date.now()
  }, user);

  if (this.config.services.web) {
    // TODO: ensure idempotent creations
    snarl.app.resources.Identity.create(instance);
  }

  return snarl;
};

/**
 * Register a {@link Message}.
 * @param  {Object} message
 * @param  {String} message.id Unique identifier for this message.
 * @param  {String} message.object Content of this message.
 * @param  {Number} [message.created] Unix timestamp of the message's creation time.
 * @return {Snarl}         Running instance of {@link Snarl}.
 */
Snarl.prototype._registerMessage = function (message) {
  let snarl = this;
  let instance = Object.assign({
    id: message.id,
    content: message.object,
    created: Date.now()
  }, message);

  if (this.config.services.web) {
    // TODO: ensure idempotent creations
    snarl.app.resources.Message.create(instance);
  }

  return snarl;
};

/**
 * Handle ready event.
 * @return {Snarl}         Running instance of {@link Snarl}.
 */
Snarl.prototype._signalReady = function () {
  return this.emit('ready');
};

module.exports = Snarl;
