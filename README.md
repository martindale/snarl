snarl
=====

Our fuzzy and friendly gorilla, snarl.  He's an awesome automaton that helps us
with a great many things.

## Quick Start
snarl's basic implementation is for Slack.  You'll need to create a Bot User for
your Slack organization, generally found at
`https://YOUR-TEAM-NAME.slack.com/services/new/bot`.  Once the integration is
added, you'll be given an API token: **place this token into
`config/index.json`**.  For more help, Slack has [great documentation on bot
users][slack-bots].

To run snarl, simply execute:

```bash
node snarl.js
```

That's it.  You'll see snarl come online!

[slack-bots]: https://api.slack.com/bot-users

## Plugins
snarl supports plugins.  We've kept the default list short but fun.  We'd also love to see even more contributions!

Plugins for snarl can add commands or other functionality.  For example, the included `karma` plugin lets snarl keep track of karma for various users.

To use a plugin, simply require it, as follows:

```js
var Snarl = require('./lib/snarl');
var snarl = new Snarl();

// import the karma plugin
var karma = require('./plugins/karma');

// use the karma plugin we required above
snarl.use(karma);

// start snarl, as normal
snarl.start();
```
