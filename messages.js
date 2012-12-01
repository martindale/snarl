 rest = require('restler')
  , google = require('google')
  , mongoose = require('mongoose')
  , ObjectId = mongoose.Schema.Types.ObjectId
  , db = mongoose.createConnection('localhost', 'snarl');

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

module.exports = {
    snarl: "Ohaithar.  I'm a bot created by @remæus.  Blame him for any of my supposed mistakes."
  , snarlSource: "You can see all my insides (and submit modifications) here: http://github.com/martindale/snarl"
  , debug: function(data) { this.chat(JSON.stringify(data)) }
  , video: 'dat video.'
  , awesome: function(data) {
      var self = this;
      this.woot(function() {
        console.log('Voted.');
        self.chat('Agreed, this track is svelte!  Wooted.');
      });
    }
  , catfacts: function(data) {
      var self = this;
      rest.get('http://catfacts-api.appspot.com/api/facts').on('complete', function(response) {
        response = JSON.parse(response);
        if (response.facts && response.facts.length > 0) {
          self.chat(response.facts[0]);
        }
      });
    }
  , songPlays: function(data) {
      var self = this;
      console.log('looking up: ' + JSON.stringify(self.currentSong));
      
      Song.findOne({ id: self.currentSong.id }).exec(function(err, song) {
        if (err) { console.log(err); } else {
        
        
          History.count({ _song: song._id }, function(err, count) {
            self.chat('This song has been played ' + count + ' times in recorded history.');
          });
        }
      });
    }
  , lastPlayed: function(data) {
      var self = this;
    }
  , lastSong: function(data) {
      var self = this;
      History.find({}).sort('-timestamp').limit(2).populate('_song').exec(function(err, history) {
        if (history.length <= 1) {
          self.chat("I've not been alive long enough to know that, Dave.");
        } else {
          var lastSong = history[1]._song;
          self.chat('The last song was “'+ lastSong.title +'” by '+ lastSong.author + '.');
        }
      });
    }
  , history: function(data) {
      var self = this;
      History.count({}, function(err, count) {
        self.chat('There are ' + count + ' songs in recorded history.');
      });
    }
  , popular: function(data) {
      var self = this;
      Person.find().sort('-karma').limit(3).exec(function(err, people) {
        var names = people.map(function(person) {
          return '@' + person.name;
        });
      
        self.chat(oxfordJoin(names) + ' are all the rage these days.');
      });
    }
  , karma: function(data) {
      var self = this;
      Person.findOne({ $or: [ { plugID: data.fromID }, { name: data.from } ] }).exec(function(err, person) {
        if (!person) {
          var person = new Person({
              name: data.from
            , plugID: data.fromID
          });

          person.save(function(err) {
            self.chat('Karma is an arbitrary count of times that people have said your name followed by ++.  You can find yours at http://snarl.ericmartindale.com/djs/' + data.fromID );
          });
        } else {
          self.chat('Karma is an arbitrary count of times that people have said your name followed by ++.  You can find yours at http://snarl.ericmartindale.com/djs/' + data.fromID );
        }
      });
    }
  , trout: function(data) {
      this.chat('/me slaps ' + data.from + ' around a bit with a large trout.');
    }
  , google: function(data) {
      var self = this;
      if (typeof(data.params) != 'undefined') {
        google(data.params, function(err, next, links) {
          if (err) { console.log(err); }

          if (typeof(links[0]) != 'undefined') {
            self.chat(links[0].title + ': ' + links[0].link);
          }

        });
      } else {
        self.chat('No query provided.');
      }
    }
}

function oxfordJoin(array) {
  var string = '';
  if (array.length <= 1) {
    string = array.join();
  } else {
    string = array.slice(0, -1).join(", ") + ", and " + array[array.length-1];
  }
  return string;
}
