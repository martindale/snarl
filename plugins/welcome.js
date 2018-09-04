'use strict';

/**
 * Welcome users using an automated onboarding flow.
 * @type {Plugin}
 */
class WelcomePlugin {
  constructor (config) {
    // TODO: add super(config) here
    // TODO: why can't super() be called on Doorman plugins?
    // util.inherits is used in Doorman, but super() is unavailable...
    this.config = Object.assign({}, config);
    // TODO: remove in favor of super() (see above)
    // only necessary as Scribe's constructor is not called
    // WelcomePlugin ⇒ Plugin ⇒ Service ⇒ Scribe
    this.stack = [];
  }

  /**
   * Attach event listeners and start the Welcome plugin.
   * @return {WelcomePlugin} Running instance of the Welcome plugin.
   */
  start () {
    this.fabric.on('join', this._handleJoin.bind(this));
  }

  /**
   * Handles a join message.
   * @param  {JoinMessage}  join Message from Fabric indicating a join.
   * @param  {String}  join.user Unique identifier for the user.
   * @param  {String}  join.channel Unique identifier for the channel.
   * @return {Promise}      Resolved once handled (success or failure).
   */
  async _handleJoin (join) {
    if (this.config.debug) this.log('handling join:', join);

    let parts = join.channel.split('/');
    let channel = this.fabric.services[parts[0]]._getChannel(parts[2]);
    let names = [channel.id, channel.name, channel.name_normalized, `#${channel.name}`];

    for (let i in this.config.channels) {
      if (names.includes(this.config.channels[i])) {
        this._beginOnboarding(parts[0], join.user, join.channel);
      }
    }

    return this;
  }

  /**
   * Start the process of welcoming a user.
   * @param  {String}  origin    Name of the network service.
   * @param  {String}  userID    Unique identifier for the user.
   * @param  {String}  channelID Unique identifier for the channel.
   * @return {Promise}           Resolves once the first message is sent.
   */
  async _beginOnboarding (origin, userID, channelID) {
    let service = this.fabric.services[origin];
    let user = await service._getUser(userID.split('/')[2]);
    let channel = await service._getChannel(channelID.split('/')[2]);
    let message = `Welcome to ${channel.name}, ${user.name}!`;

    return service.send(channel.id, message);
  }
}

module.exports = WelcomePlugin;
