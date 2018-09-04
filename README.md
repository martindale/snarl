snarl ![snarl](/snarl-headshot.png)
===================================
[![NPM version](	https://img.shields.io/npm/v/snarl.svg?style=flat-square)](https://www.npmjs.com/package/snarl)
[![Build Status](https://img.shields.io/travis/martindale/snarl.svg?branch=master&style=flat-square)](https://travis-ci.org/martindale/snarl)

Snarl is a powerful chatbot built with [Doorman][doorman], [Maki][maki], and
[the Fabric Protocol][fabric].  Currently, he's running things over in [the
Fabric Chat][fabric-chat], but you can add him to Slack, Discord, and/or Matrix.

Despite his name, snarl is just a fuzzy and friendly goofball.  He's been with
us for several years, since the beginning of [the Coding
Soundtrack](https://soundtrack.io) community.  He's an awesome automaton that
helps us with a great many things, so be nice to him.

Avatar for snarl is by [@yiyinglu](https://github.com/yiyinglu), who designed
the original avatars for tuntable.fm.

## Quick Start
To connect with Slack, Discord, or Matrix, you'll need an access token for each
service.  Once acquired, add them to `config.json`.

1. Install via `npm install snarl -g`, or simply clone<sup>1</sup> this repository and run `npm install` as usual.
2. Modify `config.json` to suit your needs (see paragraph above).
3. Execute `npm start` in the source directory, or `snarl` if you installed globally.

That's it.  You'll see snarl come online!  If you install snarl globally via
`npm install snarl -g`, you can also simply type `snarl` at any time (for example,
inside of a screen or a tmux session) to run the bot.

<small>1: if you want to make modifications, you should [fork it first][fork]!</small>

### Naming Your Bot
If you want to give snarl a different name, you can configure it via Slack (see
link above), or add a `name` property to `config.json`.

## Plugins
Snarl comes pre-configured with several convenient plugins, but more can be
enabled by adding them to the `plugins` list in `config.json`.

### Included Plugins
The list of available plugins (via `./plugins/plugin-name`) is as follows:

- `welcome`, which provides a welcome message to users joining specified channels.
- `erm`, which transforms the text of a user message into `ERMEGERD` speech using [martindale/erm](https://github.com/martindale/erm).

### Other Plugins
- [snarl-eliza](https://github.com/martindale/snarl-eliza) is a simple AI using
the ELIZA self-help chatbot created by Joseph Weizenbaum between 1964 and 1966.
- [snarl-wine-lookup](https://github.com/naterchrdsn/snarl-wine-lookup) is a simple plugin for performing wine-lookups via the [snooth wine api](http://api.snooth.com/), using the !vino command and several optional parameters. Cheers!

### Writing Plugins
To write a snarl plugin, create a new NPM module that exports a map of triggers
your bot will respond to.  You can use either a simple message string, or a
function that expects a callback:

### Deprecated Plugins
Snarl has a long history, and we'd like to keep him up to date — so we've
deprecated the following plugins as to focus on core functionality.

- `karma`, which keeps track of user karma, as incremented by `@username++`.
- `facts`, which provides `!TopologyFacts` (mathematical topology facts), `!SmiffFacts` (facts about Will Smith), and `!InterstellaFacts` (facts about [Interstella 5555](https://en.wikipedia.org/wiki/Interstella_5555:_The_5tory_of_the_5ecret_5tar_5ystem))
- `meetups`, which responds with a simple message telling your community about in-person meetups.
- `beer-lookup`, which provides `!brew <beerName>` to look up and describe a beer via [BreweryDB](http://www.brewerydb.com/).

Feel free to submit a pull request if you'd like to make an improvement!

[doorman]: https://github.com/FabricLabs/doorman
[writing-doorman-plugins]: https://github.com/FabricLabs/doorman#plugins
[fabric]: https://fabric.pub
[fabric-chat]: https://chat.fabric.pub
[maki]: https://maki.io
[slack-bots]: https://api.slack.com/bot-users
[fork]: https://github.com/martindale/snarl/fork
