var rest = require('restler')
  , google = require('google')
  , mongoose = require('mongoose')
  , db = mongoose.createConnection('localhost', 'snarl');

var personSchema = mongoose.Schema({
        name: String
      , plugID: String
      , karma: { type: Number, default: 0 }
    });
var Person = db.model('Person', personSchema);

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
            self.chat(data.from + ' has 0 karma.');
          });
        } else {
          self.chat(data.from + ' has ' + person.karma + ' karma.');
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
          
          self.chat(links[0].title + ': ' + links[0].link);
          
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
