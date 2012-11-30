var config = require('./config')
  , messages = require('./messages')
  , express = require('express')
  , app = express()
  , mongoose = require('mongoose')
  , ObjectId = mongoose.Schema.Types.ObjectId
  , db = mongoose.createConnection('localhost', 'snarl');

var AUTH = config.auth; // Put your auth token here, it's the cookie value for usr
var ROOM = config.room;

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
  , timestamp: { type: Date }
})

var Person  = db.model('Person',  personSchema);
var Song    = db.model('Song',    songSchema);
var History = db.model('History', historySchema);

app.use(app.router);
app.use(express.static(__dirname + '/public'));
app.use(express.errorHandler());
app.set('view engine', 'jade');

app.get('/history', function(req, res) {
  History.find().sort('-timestamp').limit(10).populate('_song').exec(function(err,  history) {
    res.send(history);
  });
});

app.get('/djs', function(req, res) {
  Person.find().sort('-karma').limit(10).exec(function(err, people) {
    res.send(people);
  });
});

var PlugAPI = require('plugapi'),
    repl = require('repl');

var bot = new PlugAPI(AUTH);
bot.currentSong = {};
bot.connect(ROOM);

app.get('/', function(req, res) {
  History.find().sort('-timestamp').limit(10).populate('_song').exec(function(err,  history) {
    res.render('index', {
        currentSong: bot.currentSong
      , history: history
    });
  });

});

bot.on('djAdvance', function(data) {
  console.log('New song: ' + JSON.stringify(data));
  
  bot.currentSong = data.media;
  
  Song.findOne({ id: data.media.id }).exec(function(err, song) {
    if (!song) {
      var song = new Song(data.media);
    }
    
    var now = new Date();
    
    song.lastPlay = now;
  
    song.save(function(err) {
    
      var history = new History({
          _song: song._id
        , timestamp: now
      });
      history.save(function(err) {
      
      });
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

          Person.findOne({ name: target }).exec(function(err, person) {
            if (!person) {
              var person = new Person({ name: target });
            }

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
