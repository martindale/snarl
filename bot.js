var config = require('./config')
  , PlugAPI = require('plugapi')
  , repl = require('repl')
  , messages = require('./messages')
  , _ = require('underscore')
  , LastFM = require('./lib/simple-lastfm')
  , async = require('async')
  , express = require('express')
  , app = express()
  , mongoose = require('mongoose')
  , ObjectId = mongoose.Schema.Types.ObjectId
  , db = mongoose.createConnection('localhost', 'snarl');

var AUTH = config.auth; // Put your auth token here, it's the cookie value for usr
var ROOM = config.room;

var bot = new PlugAPI(AUTH);
bot.currentSong = {};
bot.currentRoom = {};
bot.room = {
    djs: {}
  , track: {}
};
bot.connect(ROOM);

var lastfm = new LastFM({
    api_key:    config.lastfm.key
  , api_secret: config.lastfm.secret
  , username:   config.lastfm.username
  , password:   config.lastfm.password
  , debug: false
});

var personSchema = mongoose.Schema({
        name: { type: String, index: true }
      , plugID: { type: String, unique: true, sparse: true }
      , karma: { type: Number, default: 0 }
      , lastChat: { type: Date }
      , bio: { type: String }
    });
var songSchema = mongoose.Schema({
      author: String
    , id: { type: String, index: true }
    , cid: String
    , plugID: String
    , format: String
    , title: String
    , duration: Number
    , lastPlay: Date
});
var historySchema = mongoose.Schema({
    _song: { type: ObjectId, ref: 'Song', required: true }
  , _dj: { type: ObjectId, ref: 'Person', required: true }
  , timestamp: { type: Date }
});
var chatSchema = mongoose.Schema({
    timestamp: { type: Date, default: Date.now }
  , _person: { type: ObjectId, ref: 'Person', required: true }
  , message: { type: String, required: true }
});

var Person  = db.model('Person',  personSchema);
var Song    = db.model('Song',    songSchema);
var History = db.model('History', historySchema);
var Chat    = db.model('Chat',    chatSchema);

app.use(app.router);
app.use(express.static(__dirname + '/public'));
app.use(express.errorHandler());
app.set('view engine', 'jade');
app.locals.config = config; // WARNING: this exposes your config to jade! be careful not to render your bot's cookie.
app.locals.pretty = true;

function findOrCreatePerson(user, callback) {
  Person.findOne({ $or: [ { plugID: user.plugID }, { name: user.name } ] }).exec(function(err, person) {

    if (!person) {
      var person = new Person({
          name: user.name
        , plugID: user.plugID
      });
    }

    if (typeof(user.name) != 'undefined') {
      person.name = user.name;
    }

    if (typeof(user.plugID) != 'undefined') {
      person.plugID = user.plugID;
    }

    person.save(function(err) {
      callback(person);
    });
  });
}

app.get('/search/name/:name', function(req, res) {
  Person.findOne({ name: req.param('name') }).exec(function(err, person) {
    if (!person) {
      res.send('No such DJ found!');
    } else {
      if (typeof(person.plugID) != 'undefined') {
        res.redirect('/djs/' + person.plugID);
      } else {
        res.send('DJ located, but no known plug.dj ID.');
      }
    }
  })
});

app.get('/chat', function(req, res) {
  Chat.find().sort('-timestamp').limit(50).populate('_person').exec(function(err, chats) {
    res.render('chats', {
      chats: chats
    });
  });
});

app.get('/commands', function(req, res) {
  res.render('commands', {
    commands: Object.keys(messages)
  });
});

app.get('/history', function(req, res) {
  History.find().sort('-timestamp').limit(10).populate('_song').exec(function(err,  history) {
    res.render('history', {
      history: history
    });
  });
});

app.get('/history/:songInstance', function(req, res) {
  History.findOne({ _id: req.param('songInstance') }).populate('_song').populate('_dj').exec(function(err, songInstance) {
    res.render('song-instance', {
      song: songInstance
    });
  })
});

app.get('/songs', function(req, res) {

  var map = function() { //map function
    emit(this._song, 1); //sends the url 'key' and a 'value' of 1 to the reduce function
  } 

  var reduce = function(previous, current) { //reduce function
    var count = 0;
    for (index in current) {  //in this example, 'current' will only have 1 index and the 'value' is 1
      count += current[index]; //increments the counter by the 'value' of 1
    }
    return count;
  };

  /* execute map reduce */
  History.mapReduce({
      map: map
    , reduce: reduce
  }, function(err, songs) {

    /* sort the results */
    songs.sort(function(a, b) {
      return a.value - b.value;
    });

    /* clip the top 25 */
    songs = songs.slice(0, 25);

    /* now get the real records for these songs */
    async.parallel(songs.map(function(song) {
      return function(callback) {
        Song.findOne({ _id: song._id }).exec(function(err, realSong) {
          realSong.plays = song.value;
          callback(null, realSong);
        });
      };
    }), function(err, results) {
      res.render('songs', {
        songs: results
      });
    });
  });

});

app.get('/songs/:songID', function(req, res, next) {
  Song.findOne({ id: req.param('songID') }).exec(function(err, song) {
    if (song) {
      song._song = song; // hack to simplify templates for now. this is the History schema, technically
      History.count({ _song: song._id }, function(err, playCount) {
        song.playCount = playCount;
        History.findOne({ _song: song._id }).sort('-timestamp').populate('_dj').exec(function(err, lastPlay) {
          song.mostRecently = lastPlay;
          res.render('song', {
            song: song
          });
        });
      });
    } else {
      next();
    }
  });
});

app.get('/djs', function(req, res) {
  Person.find().sort('-karma').limit(10).exec(function(err, people) {
    res.render('djs', {
      djs: people
    });
  });
});

app.get('/djs/:plugID', function(req, res, next) {
  Person.findOne({ plugID: req.param('plugID') }).exec(function(err, dj) {
    if (dj) {
      History.find({ _dj: dj._id }).sort('-timestamp').limit(10).populate('_song').exec(function(err, djHistory) {
        dj.playHistory = djHistory;
        res.render('dj', {
          dj: dj
        });
      });
    } else {
      next();
    }
  });
});

app.get('/', function(req, res) {
  History.find().sort('-timestamp').limit(10).populate('_song').populate('_dj').exec(function(err,  history) {
    res.render('index', {
        currentSong: bot.currentSong
      , history: history
      , room: bot.room
    });
  });
});

/* bot.on('userJoin', function(data) {
  findOrCreatePerson({
      name: data.username
    , plugID: data.id
  }, function(person) {
    console.log('User ' + person._id + ' joined.  Added to database.');
  });
}); */

bot.on('voteUpdate', function(data) {
  findOrCreatePerson({
    plugID: data.id
  }, function(person) {

  });
});

bot.on('djAdvance', function(data) {
  console.log('New song: ' + JSON.stringify(data));

  lastfm.getSessionKey(function(result) {
    console.log("session key = " + result.session_key);
    if (result.success) {
      lastfm.scrobbleNowPlayingTrack({
          artist: data.media.author
        , track: data.media.title
        , callback: function(result) {
            console.log("in callback, finished: ", result);
          }
      });

      var scrobbleDuration = 60000;
      if (data.media.duration > 120000) {
        scrobbleDuration = 240000;
      } else {
        scrobbleDuration = data.media.duration * 1000 / 2;
      }

      bot.room.track.scrobbleTimer = setTimeout(function() {
        lastfm.scrobbleTrack({
            artist: data.media.author,
            track: data.media.title,
            callback: function(result) {
                console.log("in callback, finished: ", result);
            }
        });
      }, scrobbleDuration);

    } else {
      console.log("Error: " + result.error);
    }
  });

  bot.room.djs = {};
  data.djs.forEach(function(dj) {
    findOrCreatePerson({
      plugID: dj.id
    }, function(person) {
      bot.room.djs[dj.id] = person;
    });
  });

  bot.currentSong = data.media;

  Song.findOne({ id: data.media.id }).exec(function(err, song) {
    if (!song) {
      var song = new Song(data.media);
    }

    var now = new Date();

    song.lastPlay = now;

    song.save(function(err) {

      bot.room.track = song;
      bot.currentSongMongoose = song;

      findOrCreatePerson({
        plugID: data.currentDJ
      }, function(dj) {
        var history = new History({
            _song: song._id
          , _dj: dj._id
          , timestamp: now
        });
        history.save(function(err) {

        });
      })

    });

  });
});

bot.on('chat', function(data) {
  var self = this;
  var now = new Date();

  if (data.type == 'emote') {
    console.log(data.from+data.message);
  } else {
    console.log(data.from+"> "+data.message);
  }

  findOrCreatePerson({
      name: data.from
    , plugID: data.fromID
  }, function(person) {
    person.lastChat = now;
    person.save(function(err) {
      var chat = new Chat({
          message: data.message
        , _person: person._id
      });
      chat.save(function(err) {
        if (err) { console.log(err); }
      });
    });

    data.person = person;

    if (typeof(bot.room.djs[data.fromID]) != 'undefined') {
      bot.room.djs[data.fromID].lastChat = now;
    }

    var cmd = data.message;
    var tokens = cmd.split(" ");

    var parsedCommands = [];

    tokens.forEach(function(token) {
      if (token.substr(0, 1) === '!' && data.from != 'snarl' && parsedCommands.indexOf(token.substr(1)) == -1) {
        data.trigger = token.substr(1).toLowerCase();
        parsedCommands.push(data.trigger);

        if (data.trigger == 'commands') {
          bot.chat('Available commands are: ' + Object.keys(messages).join(', '));
        } else {

          if (tokens.indexOf(token) === 0) {
            data.params = tokens.slice(1).join(' ');
          }

          switch (typeof(messages[data.trigger])) {
            case 'string':
              bot.chat(messages[data.trigger]);
            break;
            case 'function':
              messages[data.trigger].apply(bot, [ data ]);
            break;
          }

        }
      } else {
        if (token.indexOf('++') != -1) {
          var target = token.substr(0, token.indexOf('++'));
          
          // remove leading @ if it exists
          if (target.indexOf('@') === 0) {
            target = target.substr(1);
          }

          if (target == data.from) {
            self.chat('Don\'t be a whore.');
          } else {

            findOrCreatePerson({ name: target }, function(person) {
              person.karma++;
              person.save(function(err) {
                if (err) { console.log(err); }
              });
            });
          }
        }
      }
    });
  });

});

app.listen(43001);

var _reconnect = function() { bot.connect('coding-soundtrack'); };
var reconnect = function() { setTimeout(_reconnect, 500); };
bot.on('close', reconnect);
bot.on('error', reconnect);

r = repl.start("node> ");
r.context.bot = bot;
