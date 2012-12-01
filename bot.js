var config = require('./config')
  , PlugAPI = require('plugapi')
  , repl = require('repl')
  , messages = require('./messages')
  , _ = require('underscore')
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

var personSchema = mongoose.Schema({
        name: { type: String, index: true }
      , plugID: { type: String, unique: true, sparse: true }
      , karma: { type: Number, default: 0 }
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
})

var Person  = db.model('Person',  personSchema);
var Song    = db.model('Song',    songSchema);
var History = db.model('History', historySchema);

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

app.get('/songs/:songID', function(req, res) {
  Song.findOne({ id: req.param('songID') }).exec(function(err, song) {
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
  });
});

app.get('/djs', function(req, res) {
  Person.find().sort('-karma').limit(10).exec(function(err, people) {
    res.render('djs', {
      djs: people
    });
  });
});

app.get('/djs/:plugID', function(req, res) {
  Person.findOne({ plugID: req.param('plugID') }).exec(function(err, dj) {
    History.find({ _dj: dj._id }).sort('-timestamp').limit(10).populate('_song').exec(function(err, djHistory) {
      dj.playHistory = djHistory;
      res.render('dj', {
        dj: dj
      });
    });

  });
});

app.get('/', function(req, res) {
  History.find().sort('-timestamp').limit(10).populate('_song').populate('_dj').exec(function(err,  history) {

    console.log(history[0]);

    res.render('index', {
        currentSong: bot.currentSong
      , history: history
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

      bot.room.song = song;
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

  if (data.type == 'emote') {
    console.log(data.from+data.message);
  } else {
    console.log(data.from+"> "+data.message);
  }

  findOrCreatePerson({
      name: data.from
    , plugID: data.fromID
  }, function(person) {
    console.log('User ' + person._id + ' joined.  Added to database.');
  });

  var cmd = data.message;
  var tokens = cmd.split(" ");

  tokens.forEach(function(token) {
    if (token.substr(0, 1) === '!') {
      data.trigger = token.substr(1);

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
        
        if (target == data.from) {
          self.chat('Don\'t be a whore.');
        } else {

          findOrCreatePerson({ name: target }, function(person) {
            console.log(person);

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

app.listen(43001);

var _reconnect = function() { bot.connect('coding-soundtrack'); };
var reconnect = function() { setTimeout(_reconnect, 500); };
bot.on('close', reconnect);
bot.on('error', reconnect);

r = repl.start("node> ");
r.context.bot = bot;
