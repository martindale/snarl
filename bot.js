var config = require('./config')
  , fs =  require('fs')
  , PlugAPI = require('plugapi')
  , repl = require('repl')
  , messages = require('./messages')
  , _ = require('underscore')
  , LastFM = require('./lib/simple-lastfm')
  , async = require('async')
  , rest = require('restler')
  , express = require('express')
  , ElizaBot = require('./eliza')
  , $ = require('jquery')
  , app = express()
  , mongoose = require('mongoose')
  , ObjectId = mongoose.Schema.Types.ObjectId
  , Schema = mongoose.Schema
  , db = mongoose.createConnection('localhost', 'snarl');

var AUTH = config.auth; // Put your auth token here, it's the cookie value for usr
var ROOM = config.room;

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
bot.connect();

bot.on('connected', function() {
  bot.joinRoom(config.room, function(data) {
    console.log(JSON.stringify(data));

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
          , man: { type: Number, default: 0 }
        }
      , lastChat: { type: Date }
      , bio: { type: String, max: 1024 }
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
    , nsfw: Boolean
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

historySchema.virtual('isoDate').get(function() {
  return this.timestamp.toISOString();
});

chatSchema.virtual('isoDate').get(function() {
  return this.timestamp.toISOString();
});

var Person  = db.model('Person',  personSchema);
var Song    = db.model('Song',    songSchema);
var History = db.model('History', historySchema);
var Chat    = db.model('Chat',    chatSchema);

app.use(express.bodyParser());
app.use(function(req, res, next) {
  res.setHeader("X-Powered-By", 'speed.');
  next();
});
app.use(app.router);
app.use(express.static(__dirname + '/public'));
app.use(express.errorHandler());
app.set('view engine', 'jade');
app.locals.config = config; // WARNING: this exposes your config to jade! be careful not to render your bot's cookie.
app.locals.pretty = true;
app.locals.wideformat = false;

History.find().limit(1).populate('_song').exec(function(err, oldestHistory) {
  app.locals.oldestPlay = oldestHistory[0];
});

function findOrCreatePerson(user, callback) {
  Person.findOne({ $or: [ { plugID: user.plugID }, { name: user.name } ] }).exec(function(err, person) {

    if (!person) {
      var person = new Person({
          name: user.name
        , plugID: user.plugID
        , lastChat: new Date()
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

/* app.get('/chat', function(req, res) {
  Chat.find().sort('-timestamp').limit(50).populate('_person').exec(function(err, chats) {
    fs.readFile('./public/analysis.html', function(err, data) {
      res.render('chats', {
          chats: chats
        , chatStats: data
      });
    });
  });
}); */

app.post('/chat', function(req, res) {
  Chat.find({ message: new RegExp('(.*)'+req.param('q')+'(.*)', 'i') }).sort('-timestamp').limit(50).populate('_person').exec(function(err, chats) {
    res.render('chats', {
        chats: chats
    });
  });
});

app.post('/songs', function(req, res) {
  Song.find({ $or: [
        { author: new RegExp('(.*)'+req.param('q')+'(.*)', 'i') }
      , { title: new RegExp('(.*)'+req.param('q')+'(.*)', 'i') }
    ] }).limit(50).exec(function(err, songs) {
    res.render('songlist', {
      songs: songs
    });
  });
});

app.get('/commands', function(req, res) {
  res.render('commands', {
    commands: Object.keys(messages)
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

app.get('/boycey', function(req, res) {
  res.render('boycey');
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

app.get('/copypasta/monthly', function (req, res) {
  res.send('lol');
});

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

app.get('/djs', function(req, res) {
  Person.find().sort('-karma').limit(10).exec(function(err, people) {

    // one month
    var time = new Date();
    time.setDate( time.getDate() - 30 );

    mostProlificDJs(time, function(monthlyDJs) {
      Person.find().sort('-points.dj').limit(10).exec(function(err, mostPoints) {
        res.render('djs', {
            djs: people
          , monthlyDJs: monthlyDJs
          , mostPoints: mostPoints
        });
      });
    });

  });
});

app.post('/djs', function(req, res) {
  Person.find({ $or: [
        { name: new RegExp('(.*)'+req.param('q')+'(.*)', 'i') }
      , { bio: new RegExp('(.*)'+req.param('q')+'(.*)', 'i') }
    ] }).sort('-karma').limit(50).exec(function(err, djs) {
    res.render('dj-list', {
      djs: djs
    });
  });
});

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

app.get('/', function(req, res) {
  History.find().sort('-timestamp').limit(10).populate('_song').populate('_dj').exec(function(err, history) {

    /* bot.room.djs = _.toArray(bot.room.djs).map(function(dj) {
      dj.avatarImage = 'http://plug.dj' + avatarManifest.getAvatarUrl('default', dj.avatar.key, '')
      return dj;
    }); */

    res.render('index', {
        currentSong: bot.currentSong
      , history: history
      , room: bot.room
      , wideformat: true
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


bot.on('curateUpdate', function(data) {
  console.log('CURATEUPDATE:');
  console.log(data);

  bot.observeUser(data, function(person) {

    console.log(person.name + ' just added this song to their playlist.');

    if (typeof(bot.room.currentPlay) != 'undefined' && typeof(bot.room.currentPlay.curates) != 'undefined') {
      bot.room.currentPlay.curates.push({
        _person: person._id
      });

      bot.room.currentPlay.save(function(err) {
        if (err) { console.log(err); }
        console.log('completed curation update.')
        console.log('comparing curate records: ' + bot.records.boss.curates.length + ' and ' + bot.room.currentPlay.curates.length);
        console.log('CURRENT DJ:');
        console.log(bot.room.currentPlay._dj);


        if (bot.records.boss.curates.length <= bot.room.currentPlay.curates.length) {
          bot.chat('@' + bot.room.currentDJ.name + ' just stole the curation record from @' + bot.records.boss._dj.name + ' thanks to @' + person.name + '\'s playlist add!');
          bot.getBoss(function(boss) {
            bot.records.boss = boss;
          });
        }

      });
    }
  });
});

bot.on('voteUpdate', function(data) {
  console.log('VOTEUPDATE:');
  console.log(data);

  findOrCreatePerson({
    plugID: data.id
  }, function(person) {
    bot.room.audience[data.id] = person;



    switch (data.vote) {
      case 1:
        bot.currentSong.upvotes++;
      break;
      case -1:
        bot.currentSong.downvotes++;
      break;
    }

    if (typeof(bot.currentSong) != 'undefined') {
      //bot.currentSong.save();
    }

  });
});

bot.on('userLeave', function(data) {
  console.log('USERLEAVE EVENT:');
  console.log(data);

  delete bot.room.audience[data.id];
});

bot.on('userJoin', function(data) {
  console.log('USERJOIN EVENT:');
  console.log(data);

  bot.observeUser(data);
});

bot.on('userUpdate', function(data) {
  console.log('USER UPDATE:');
  console.log(data);

  bot.observeUser(data);
});

bot.on('djUpdate', function(data) {
  console.log('DJ UPDATE EVENT:');
  //console.log(data);

  var currentDJs = [];
  for (var dj in bot.room.djs) {
    currentDJs.push(bot.room.djs[dj].plugID.toString());
  }

  var newDJs = data.map(function(dj) {
    return dj.user.id;
  });

  console.log('OLD DJs: ' + currentDJs);
  console.log('NEW DJs: ' + newDJs);

  data.forEach(function(dj) {
    console.log('DJ: ' + dj.user.id + ' ...');
    findOrCreatePerson({
      plugID: dj.user.id
    }, function(person) {

      console.log(currentDJs.indexOf(person.plugID.toString()));
      if ((typeof(config.welcomeNewDjs) === 'undefined' || config.welcomeNewDjs)
          && currentDJs.indexOf(person.plugID.toString()) == -1) {
        console.log('NEW DJ FOUND!!! ' + person.name);
        History.count({ _dj: person._id }).exec(function(err, playCount) {
          console.log('They have played ' + playCount + ' songs in this room before.');
          if (playCount == 0) {
            console.log(person.name + ' has never played any songs here before!');
            bot.chat('Welcome to the stage, @'+person.name+'!  I\'m sure you\'re a good DJ, but I\'ve never seen you play a song in Coding Soundtrack before, so here\'s our song selection guide: http://codingsoundtrack.org/song-selection');
          }
        });
      }
    });
  });

  bot.updateDJs(data);
});

bot.on('djAdvance', function(data) {
  var self = this;

  console.log('New song: ' + JSON.stringify(data));

  try {
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
        //}, scrobbleDuration);
        }, 5000); // scrobble after 30 seconds, no matter what.

      } else {
        console.log("Error: " + result.error);
      }
    });
  }
  catch (err) {
    console.log('lastfm scrobble failed')
  }
  
  bot.updateDJs(data.djs);
  bot.currentSong = data.media;

  Song.findOne({ id: data.media.id }).exec(function(err, song) {
    if (!song) {
      var song = new Song(data.media);
    }

    if(song.nsfw) {
      self.chat('Warning: This track may contain NSFW content.');
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

var AI = new ElizaBot();

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

    if (data.from == 'roboJar' && data.message != 'Isn\'t this !awesome snarl') {
      self.chat( AI.transform(data.message) );
    }

    var cmd = data.message;
    var tokens = cmd.split(" ");

    var parsedCommands = [];

    tokens.forEach(function(token) {
      if (token.substr(0, 1) === (config.commandPrefix || '!') && data.from != (config.botName || 'snarl') && parsedCommands.indexOf(token.substr(1)) == -1) {
        data.trigger = token.substr(1).toLowerCase();
        parsedCommands.push(data.trigger);

        if (data.trigger == 'commands') {
          bot.chat('I am a fully autonomous system capable of responding to a wide array of commands, which you can find here: http://snarl.ericmartindale.com/commands')
          //bot.chat('Available commands are: ' + Object.keys(messages).join(', '));
        } else {

          // if this is the very first token, it's a command and we need to grab the params.
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
        } else {

          if (tokens.length === 1) {
            Chat.find({}).sort('-timestamp').limit(1).exec(function(err, lastChat) {
              var now = new Date();
              var difference = ( now - lastChat.timestamp ) / 1000;
              if (difference >= 300) {
                rest.get('http://api.urbandictionary.com/v0/define?term='+token).on('complete', function(data) {
                  self.chat(data.list[0].definition);
                });
              }
            });
          }

        }
      }
    });
  });

});

app.get('/audience', function(req, res) {
  res.send(bot.room.audience);
});

app.get('/rules', function(req, res) {
  res.redirect(301, 'ten-commandments');
});

app.get('/ten-commandments', function(req, res) {
  res.render('rules');
});

app.get('/song-selection', function(req, res) {
  res.render('song-selection');
});

app.get('/about', function(req, res) {
  res.render('about');
});

app.get('/player', function(req, res) {
  res.render('player');
});

app.listen(43001);

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
      return function(innerCallback) {
        History.findOne({ _id: play._id }).populate('_song').populate('_dj').exec(function(err, realPlay) {
          if (err) { console.log(err); }

          realPlay.curates = play.value;

          innerCallback(null, realPlay);
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

var _reconnect = function() { bot.connect(config.room); };
var reconnect = function() { setTimeout(_reconnect, 500); };
bot.on('close', reconnect);
bot.on('error', reconnect);

r = repl.start("node> ");
r.context.bot = bot;
