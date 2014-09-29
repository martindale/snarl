var config = require('./config')
  , subtitles = require('./subtitles')
  , express = require('express')
  , app = express()
  , mongoose = require('mongoose')
  , ObjectId = mongoose.Schema.Types.ObjectId
  , Schema = mongoose.Schema;

var async = require('async');

mongoose.connect('localhost', 'snarl');

var AUTH = config.auth; // Put your auth token here, it's the cookie value for usr
var ROOM = config.room;

User       = require('./models/User').User;
Person     = require('./models/Person').Person;
Song       = require('./models/Song').Song;
History    = require('./models/History').History;
Chat       = require('./models/Chat').Chat;

app.use(express.bodyParser());
app.use(function(req, res, next) {
  res.setHeader("X-Powered-By", 'cocaine. helluvadrug.');
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

    /* bot.customRoom.djs = _.toArray(bot.customRoom.djs).map(function(dj) {
      dj.avatarImage = 'http://plug.dj' + avatarManifest.getAvatarUrl('default', dj.avatar.key, '')
      return dj;
    }); */

    res.render('index', {
        currentSong: {} //bot.currentSong
      , history: history
      , room: { djs: [] } //bot.customRoom
      , wideformat: true
      , subtitle: subtitles[Math.round(Math.random()*(subtitles.length-1))]
    });


  });
});

app.get('/audience', function(req, res) {
  //res.send(bot.customRoom.audience);
  res.send([]);
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
