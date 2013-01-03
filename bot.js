var clc = require('cli-color');
console.log(clc.greenBright('Snarl 0.0.1 by Eric Martindale'));
process.stdout.write('[' + clc.cyanBright('INFO') + '] Loading dependencies... ');

var config = require('./config')
  , $ = require('jquery')
  , _ = require('underscore')
  , async = require('async')
  , express = require('express')
  , LastFM = require('./lib/simple-lastfm')
  , messages = require('./messages')
  , mongoose = require('mongoose')
  , PlugAPI = require('plugapi')
  , repl = require('repl')
  , rest = require('restler')
  
  , app = express()
  , db = mongoose.createConnection('localhost', 'snarl')
  , ObjectId = mongoose.Schema.Types.ObjectId
  , Schema = mongoose.Schema

console.log(clc.greenBright('done!'));

var AUTH = config.auth.token;
var ROOM = config.general.room;

var bot = new PlugAPI(AUTH);
bot.currentSong = {};
bot.currentRoom = {};
bot.room = {
    djs: {}
  , track: {}
  , audience: {}
  , currentPlay: {}
  , currentDJ: {}
  , staff: {}
};
bot.records = {
  boss: {}
};

// Some shit functions

bot.chatWrap = function(message) {
  if(!config.general.disableChat) {
    bot.chat(message);
  }
}
function getFirstKey(array) {
  for(key in array) {
    return key;
  }
}

// We need to move them out of here.

bot.connect();

bot.on('connected', function() {

  bot.joinRoom(config.general.room, function(data) {

    console.log('[' + clc.cyanBright('INFO') + '] Joined room ' + config.general.room + '!');

    if(config.general.debugMode) {
      console.log(JSON.stringify(data));
    }
    
    bot.updateDJs(data.room.djs);
    bot.currentSong       = data.room.media;

    Song.findOne({ id: data.room.media.id }).exec(function(err, song) {
      bot.room.track  = song;
    });
    bot.getBoss(function(boss) {
      bot.records.boss = boss;
    });

    for (var plugID in data.room.staff) {
      findOrCreatePerson({
          plugID: plugID
        , role: data.room.staff[plugID]
      }, function(person) {
        bot.room.staff[person.plugID] = person;
      });
    }

    data.room.users.forEach(function(user) {
      bot.observeUser(user, function(person) {

      });
    });

    findOrCreatePerson({
      plugID: data.currentDJ
    }, function(dj) {
      bot.room.currentDJ    = dj;
    });

  });
})

var avatarManifest = {};

rest.get('http://plug.dj/_/static/js/avatars.4316486f.js').on('complete', function(data) {
  // TODO: bug @Boycey to provide an endpoint for this.
  eval(data);  // oh christ. this is bad. 
  avatarManifest = AvatarManifest; 
  console.log('[' + clc.cyanBright('INFO') + '] Downloaded avatar manifest.');
});

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
      , role: { type: Number }
      , karma: { type: Number, default: 0 }
      , points: {
            listener: { type: Number, default: 0 }
          , curator: { type: Number, default: 0 }
          , dj: { type: Number, default: 0 }
        }
      , lastChat: { type: Date }
      , bio: { type: String, max: 255 }
      , avatar: {
            'set': String
          , 'key': String
          , 'uri': String
          , 'thumb': String
        }
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
  , curates: [ new Schema({
      _person: { type: ObjectId, ref: 'Person', required: true }
    }) ]
  , downvotes: { type: Number, default: 0 }
  , upvotes: { type: Number, default: 0 }
  , votes: [ new Schema({
        _person: { type: ObjectId, ref: 'Person', required: true }
      , vote: { type: String, enum: ['up', 'down'] }
    }) ]
});
var chatSchema = mongoose.Schema({
    timestamp: { type: Date, default: Date.now }
  , _person: { type: ObjectId, ref: 'Person', required: true }
  , message: { type: String, required: true }
});

personSchema.virtual('points.total').get(function () {
  return this.points.dj + this.points.curator + this.points.listener;
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

History.find().limit(1).populate('_song').exec(function(err, oldestHistory) {
  app.locals.oldestPlay = oldestHistory[0];
});

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

    if (typeof(user.avatarID) != 'undefined') {
      person.avatar = {
          key: user.avatarID
        , thumb: 'http://plug.dj' + avatarManifest.getThumbUrl(user.avatarID)
      }
    }

    if (typeof(user.points) != 'undefined') {
      if (typeof(user.points.dj) != 'undefined') {
        person.points.dj = user.points.dj;
      }
      if (typeof(user.points.curator) != 'undefined') {
        person.points.curator = user.points.curator;
      }
      if (typeof(user.points.listener) != 'undefined') {
        person.points.listener = user.points.listener;
      }
    }

    if (typeof(user.role) != 'undefined') {
      person.role = user.role;
    }

    person.save(function(err) {
      callback(person);
    });
  });
}

app.get('/', function(req, res) {
  History.find().sort('-timestamp').limit(10).populate('_song').populate('_dj').exec(function(err,  history) {
    
    /* bot.room.djs = _.toArray(bot.room.djs).map(function(dj) {
      dj.avatarImage = 'http://plug.dj' + avatarManifest.getAvatarUrl('default', dj.avatar.key, '')
      return dj;
    }); */

    Chat.find().sort('-timestamp').limit(15).populate('_person').exec(function(err, chats) {
      res.render('index', {
          currentSong: bot.currentSong
        , history: history
        , room: bot.room
        , currentDJ: getFirstKey(bot.room.djs)
        , chats: chats
      });
    });


  });
});

app.get('/audience', function(req, res) {
  res.send(bot.room.audience);
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

app.get('/copypasta/monthly', function (req, res) {
  res.send('lol');
});

app.get('/djs', function(req, res) {
  Person.find().sort('-karma').limit(10).exec(function(err, people) {
     // one month
    var time = new Date();
    time.setDate( time.getDate() - 30 );

    mostProlificDJs(time, function(monthlyDJs) {
      res.render('djs', {
          djs: people
        , monthlyDJs: monthlyDJs
      });
    });

  });
});

app.get('/djs/:plugID', function(req, res, next) {
  Person.findOne({ plugID: req.param('plugID') }).exec(function(err, dj) {
    if (dj) {
      History.find({ _dj: dj._id }).sort('-timestamp').limit(10).populate('_song').exec(function(err, djHistory) {
        dj.playHistory = djHistory;

        if (typeof(dj.bio) == 'undefined') {
          dj.bio = '';
        }

        History.count({ _dj: dj._id }).exec(function(err, playCount) {
          res.render('dj', {
              md: require('node-markdown').Markdown
            , dj: dj
            , avatarImage: 'http://plug.dj' + avatarManifest.getAvatarUrl('default', dj.avatar.key, '')
            , playCount: playCount
          });
        });

      });
    } else {
      next();
    }
  });
});

app.get('/history', function(req, res) {
  History.find().sort('-timestamp').limit(1000).populate('_song').exec(function(err,  history) {
    res.render('history', {
      history: history
    });
  });
});

app.get('/history/:songInstance', function(req, res) {
  History.findOne({ _id: req.param('songInstance') }).populate('_song').populate('_dj').populate('curates._person').exec(function(err, songInstance) {

    res.render('song-instance', {
      song: songInstance
    });
  })
});

app.get('/rules', function(req, res) {
  res.render('rules');
});

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

app.get('/songs', function(req, res) {
  var today = new Date();

  mostPopularSongsAlltime(function(allTime) {

    // one month
    var time = new Date();
    time.setDate( today.getDate() - 30 );

    mostPopularSongsSince(time, function(month) {
      // one week
      var time = new Date();
      time.setDate( today.getDate() - 7 );

      mostPopularSongsSince(time, function(week) {
        res.render('songs', {
            allTime: allTime
          , month: month
          , week: week
        });
      });
    });
  });
});

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

var mapDJ = function() { //map function
  emit(this._dj, 1); //sends the url 'key' and a 'value' of 1 to the reduce function
}

app.get('/songs/:songID', function(req, res, next) {
  Song.findOne({ id: req.param('songID') }).exec(function(err, song) {
    if (song) {
      song._song = song; // hack to simplify templates for now. this is the History schema, technically
      History.count({ _song: song._id }, function(err, playCount) {
        song.playCount = playCount;

        History.find({ _song: song._id }).populate('_dj').exec(function(err, songPlays) {

          song.firstPlay = songPlays[0];
          song.mostRecently = songPlays[ songPlays.length - 1 ];

          var songDJs = {};

          songPlays.forEach(function(play) {
            songDJs[play._dj.plugID] = play._dj;
          });
          songPlays.forEach(function(play) {
            if (typeof(songDJs[play._dj.plugID].songPlays) != 'undefined') {
              songDJs[play._dj.plugID].songPlays = songDJs[play._dj.plugID].songPlays + 1;
            } else {
              songDJs[play._dj.plugID].songPlays = 1;
            }
          });

          songDJs = _.toArray(songDJs);
          songDJs.sort(function(a, b) {
            return b.songPlays - a.songPlays;
          });

          res.render('song', {
              song: song
            , songDJs: songDJs
          });

        });
      });
    } else {
      next();
    }
  });
});

app.get('/stats', function(req, res) {

  var map = function() { //map function
    emit(this._dj, 1); //sends the url 'key' and a 'value' of 1 to the reduce function
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
  }, function(err, djs) {

    /* sort the results */
    djs.sort(function(a, b) {
      return b.value - a.value;
    });

    /* clip the top 25 */
    djs = djs.slice(0, 25);

    /* now get the real records for these songs */
    async.parallel(djs.map(function(dj) {
      return function(callback) {
        Person.findOne({ _id: dj._id }).exec(function(err, realDJ) {
          realDJ.plays = dj.value;
          callback(null, realDJ);
        });
      };
    }), function(err, results) {

      /* resort since we're in parallel */
      results.sort(function(a, b) {
        return b.plays - a.plays;
      });

      res.render('djs', {
        djs: results
      });
    });
  });
});

app.get('/stats/plays', function(req, res) {
  var map = function() { //map function
    if (typeof(this.curates) == 'undefined') {
      emit(this._id, 0);
    } else {
      emit(this._id, this.curates.length);
    }
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
  }, function(err, plays) {

    if (err) {
      console.log(err);
    }

    /* sort the results */
    plays.sort(function(a, b) {
      return b.value - a.value;
    });

    /* clip the top 25 */
    plays = plays.slice(0, 25);

    /* now get the real records for these songs */
    async.parallel(plays.map(function(play) {
      return function(callback) {
        History.findOne({ _id: play._id }).populate('_song').exec(function(err, realPlay) {
          if (err) { console.log(err); }

          realPlay.curates = play.value;

          callback(null, realPlay);
        });
      };
    }), function(err, results) {

      /* resort since we're in parallel */
      results.sort(function(a, b) {
        return b.curates - a.curates;
      });

      res.send(results);
    });

  });
})

app.listen(config.general.port);

/* bot.on('userJoin', function(data) {
  findOrCreatePerson({
      name: data.username
    , plugID: data.id
  }, function(person) {
    console.log('User ' + person._id + ' joined.  Added to database.');
  });
}); */

function mostPopularSongsAlltime(callback) {
  /* execute map reduce */
  History.mapReduce({
      map: map
    , reduce: reduce
  }, function(err, songs) {

    /* sort the results */
    songs.sort(function(a, b) {
      return b.value - a.value;
    });

    /* clip the top 100 */
    songs = songs.slice(0, 100);

    /* now get the real records for these songs */
    async.parallel(songs.map(function(song) {
      return function(callback) {
        Song.findOne({ _id: song._id }).exec(function(err, realSong) {
          realSong.plays = song.value;
          callback(null, realSong);
        });
      };
    }), function(err, results) {

      /* resort since we're in parallel */
      results.sort(function(a, b) {
        return b.plays - a.plays;
      });

      callback(results);
    });
  });
}

function mostPopularSongsBetween(start, end, callback) {

  /* execute map reduce */
  History.mapReduce({
      map: map
    , reduce: reduce
    , query: { timestamp: { $gte: start, $lte: end } }
  }, function(err, songs) {

    /* sort the results */
    songs.sort(function(a, b) {
      return b.value - a.value;
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

      /* resort since we're in parallel */
      results.sort(function(a, b) {
        return b.plays - a.plays;
      });

      callback(results);

    });
  });
}

function mostPopularSongsSince(time, callback) {

  /* execute map reduce */
  History.mapReduce({
      map: map
    , reduce: reduce
    , query: { timestamp: { $gte: time } }
  }, function(err, songs) {

    /* sort the results */
    songs.sort(function(a, b) {
      return b.value - a.value;
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

      /* resort since we're in parallel */
      results.sort(function(a, b) {
        return b.plays - a.plays;
      });

      callback(results);

    });
  });
}

function mostProlificDJs(time, callback) {
  /* execute map reduce */
  History.mapReduce({
      map: mapDJ
    , reduce: reduce
    , query: { timestamp: { $gte: time } }
  }, function(err, songs) {

    /* sort the results */
    songs.sort(function(a, b) {
      return b.value - a.value;
    });

    /* clip the top 25 */
    songs = songs.slice(0, 10);

    /* now get the real records for these DJs */
    async.parallel(songs.map(function(song) {
      return function(callback) {
        Person.findOne({ _id: song._id }).exec(function(err, realSong) {
          realSong.plays = song.value;
          callback(null, realSong);
        });
      };
    }), function(err, results) {

      /* resort since we're in parallel */
      results.sort(function(a, b) {
        return b.plays - a.plays;
      });

      callback(results);

    });
  });
}

bot.on('curateUpdate', function(data) {
  if(config.general.debugMode) {
    console.log('CURATEUPDATE:');
    console.log(data);
  }

  bot.observeUser(data, function(person) {

    console.log('[' + clc.cyanBright('INFO') + '] ' + clc.yellowBright(person.name) + ' just added this song to their playlist.');

    if (typeof(bot.room.currentPlay) != 'undefined' && typeof(bot.room.currentPlay.curates) != 'undefined') {
      bot.room.currentPlay.curates.push({
        _person: person._id
      });

      bot.room.currentPlay.save(function(err) {
        if (err) { console.log(err); }
        if(config.general.debugMode) {
          console.log('completed curation update.')
          console.log('comparing curate records: ' + bot.records.boss.curates.length + ' and ' + bot.room.currentPlay.curates.length);
          console.log('CURRENT DJ:');
          console.log(bot.room.currentPlay._dj);
        }

        if (bot.records.boss.curates.length <= bot.room.currentPlay.curates.length) {
          bot.chatWrap('@' + bot.room.currentDJ.name + ' just stole the curation record from @' + bot.records.boss._dj.name + ' thanks to @' + person.name + '\'s playlist add!');
          bot.getBoss(function(boss) {
            bot.records.boss = boss;
          });
        }

      });
    }
  });
});

bot.on('voteUpdate', function(data) {
  if(config.general.debugMode) {
    console.log('VOTEUPDATE:');
    console.log(data);
  }

  findOrCreatePerson({
    plugID: data.id
  }, function(person) {
    bot.room.audience[data.id] = person;

    switch(data.vote) {
      case 1:
        bot.currentSong.upvotes++;
        console.log('[' + clc.cyanBright('INFO') + '] ' + clc.yellowBright(person.name) + clc.greenBright(' wooted') + ' the track!');
      break;
      case -1:
        bot.currentSong.downvotes++;
        console.log('[' + clc.cyanBright('INFO') + '] ' + clc.yellowBright(person.name) + clc.redBright(' meh\'d') + ' the track!');
      break;
    }

    if (typeof(bot.currentSong) != 'undefined') {
      //bot.currentSong.save();
    }
  });
});

bot.on('userLeave', function(data) {
  if(config.general.debugMode) {
    console.log('USERLEAVE EVENT:');
    console.log(data);
  }
  console.log('[' + clc.cyanBright('INFO') + '] ' + clc.yellowBright(bot.room.audience[data.id].name) + ' left the room!');
  delete bot.room.audience[data.id];
});

bot.on('userJoin', function(data) {
  if(config.general.debugMode) {
    console.log('USERJOIN EVENT:');
    console.log(data);
  }
  console.log('[' + clc.cyanBright('INFO') + '] ' + clc.yellowBright(data.username) + ' joined the room!');
  bot.observeUser(data);
});

bot.on('userUpdate', function(data) {
  if(config.general.debugMode) {
    console.log('USER UPDATE:');
    console.log(data);
  }

  bot.observeUser(data);
});

bot.on('djAdvance', function(data) {
  if(config.general.debugMode) {
    console.log('New song: ' + JSON.stringify(data));
  }
  console.log('[' + clc.cyanBright('INFO') + '] ' + clc.greenBright('Now playing: ') + data.media.author + ' - ' + data.media.title + ' (DJ: ' + clc.yellowBright(data.djs[0].user.username) + ')');

  lastfm.getSessionKey(function(result) {
    if(config.general.debugMode) {
      console.log("Last.fm session key: " + result.session_key);
    }
    if(result.success) {
      console.log('[' + clc.cyanBright('INFO') + '] Successfully obtained Last.fm session key.');
      lastfm.scrobbleNowPlayingTrack({
          artist: data.media.author
        , track: data.media.title
        , callback: function(result) {
            if(config.general.debugMode) {
              console.log("in callback, finished: ", result);
            }
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
                if(config.general.debugMode) {
                  console.log("in callback, finished: ", result);
                }
            }
        });
      //}, scrobbleDuration);
      }, 5000); // scrobble after 30 seconds, no matter what.

    } else {
      console.log('[' + clc.redBright('ERRO') + '] ' + clc.redBright('Failed') + ' to obtain Last.fm session key.');
      if(config.general.debugMode) {
        console.log("Error: " + result.error);
      }
    }
  });

  bot.updateDJs(data.djs);
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
          // hack to makein-memory record look work
          bot.room.currentDJ    = dj;
          bot.room.currentPlay  = history;
        });
      })

    });

  });
});

bot.on('chat', function(data) {
  var self = this;
  var now = new Date();

  if (data.type == 'emote') {
    console.log(clc.greenBright(data.from+data.message));
  } else {
    console.log(clc.blackBright(data.from) + ": " + clc.whiteBright(data.message));
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
          bot.chatWrap('I am a fully autonomous system capable of responding to a wide array of commands, which you can find here: http://snarl.ericmartindale.com/commands')
          //bot.chat('Available commands are: ' + Object.keys(messages).join(', '));
        } else {

          // if this is the very first token, it's a command and we need to grab the params.
          if (tokens.indexOf(token) === 0) {
            data.params = tokens.slice(1).join(' ');
          }

          switch (typeof(messages[data.trigger])) {
            case 'string':
              bot.chatWrap(messages[data.trigger]);
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
            self.chatWrap('Don\'t be a whore.');
          } else if (target.toLowerCase() == 'c' || target.length == 0) {
            // pass. probably a language mention. ;)
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

PlugAPI.prototype.getBoss = function(callback) {
  var self = this;
  var map = function() { //map function
    if (typeof(this.curates) == 'undefined') {
      emit(this._id, 0);
    } else {
      emit(this._id, this.curates.length);
    }
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
  }, function(err, plays) {

    if (err) {
      console.log(err);
    }

    /* sort the results */
    plays.sort(function(a, b) {
      return b.value - a.value;
    });

    /* clip the top 25 */
    plays = plays.slice(0, 1);

    /* now get the real records for these songs */
    async.parallel(plays.map(function(play) {
      return function(callback) {
        History.findOne({ _id: play._id }).populate('_song').populate('_dj').exec(function(err, realPlay) {
          if (err) { console.log(err); }

          realPlay.curates = play.value;

          callback(null, realPlay);
        });
      };
    }), function(err, results) {

      /* resort since we're in parallel */
      results.sort(function(a, b) {
        return b.curates - a.curates;
      });

      callback(results[0]);

    });

  });
};

PlugAPI.prototype.observeUser = function(user, callback) {
  if (typeof(callback) == 'undefined') {
    callback = function (person) {};
  }

  findOrCreatePerson({
      plugID: user.id
    , name: user.username
    , avatarID: user.avatarID
    , points: {
          listener: user.listenerPoints
        , curator: user.curatorPoints
        , dj: user.djPoints
      }
  }, function(person) {
    bot.room.audience[user.id] = person;
    callback(person);
  });
}

PlugAPI.prototype.updateDJs = function(djs) {
  var bot = this;
  bot.room.djs = {};
  djs.forEach(function(dj) {
    findOrCreatePerson({
        plugID: dj.user.id
      , name: dj.user.username
      , avatarID: dj.user.avatarID
      , points: {
            listener: dj.user.listenerPoints
          , curator: dj.user.curatorPoints
          , dj: dj.user.djPoints
        }
    }, function(person) {
      bot.room.djs[dj.user.id]      = person;
      bot.room.audience[dj.user.id] = person;
    });
  });
};

var _reconnect = function() { bot.connect(config.general.room); };
var reconnect = function() { setTimeout(_reconnect, 500); };
bot.on('close', reconnect);
bot.on('error', reconnect);

r = repl.start('');
r.context.bot = bot;