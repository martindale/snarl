var rest = require('restler')
  , google = require('google')
  , ddg = require('ddg-api')
  , urban = require('urban')
  , github = require('github')
  , _ = require('underscore')
  , async = require('async')
  , timeago = require('timeago')
  , mongoose = require('mongoose')
  , ObjectId = mongoose.Schema.Types.ObjectId
  , Schema = mongoose.Schema
  , db = mongoose.createConnection('localhost', 'snarl');

var facts = require('./facts');

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

module.exports = {
    snarl: "Ohaithar.  I'm a bot created by @remæus.  Blame him for any of my supposed mistakes."
  , source: "You can see all my insides (and submit modifications) here: http://github.com/martindale/snarl"
  , about: 'About Coding Soundtrack: http://codingsoundtrack.org/about'
  , afk: 'If you\'re AFK at the end of your song for longer than 30 minutes you get warning 1. One minute later you get warning 2, another minute last warning, 30 seconds [boot].'
  , askforseat: 'Please don\'t ask for seats here.  It\'s first come, first serve, and free for all.'
  , bitch: 'Not a lot of things are against the rules, but bitching about the music is. Stop being a bitch.'
  , commandments: 'Coding Soundtrack\'s 10 Commandments: http://codingsoundtrack.org/ten-commendmants'
  , rules: 'No song limits, no queues, no auto-DJ. Pure FFA. DJ\'s over 10 minutes idle (measured by chat) face the [boot]. See !music for music suggestions, though there are no defined or enforced rules on music. More: http://codingsoundtrack.org/rules'  // formerly: http://goo.gl/b7UGO
  , selection: 'Song Selection Guide: http://codingsoundtrack.org/song-selection'
  , suitup: 'Suit up, motherfucker!'
  , netsplit: 'plug.dj has been having a lot of issues lately, especially with chat becoming fragmented.  Some people can chat with each other, and others can\'t see those messages.  Relax, @Boycey will have it fixed soon.'
  , plugin: 'Coding Soundtrack is best enjoyed with jarPlug: https://chrome.google.com/webstore/detail/jarplug/anhldmgeompmlcmdcpbgdecdokhedlaa'
  , tags: 'Please edit the tags of the songs on your playlists to exclude things like [VIDEO] and [OFFICIAL].  It\'s a data thing, man!'
  , video: 'dat video.'
  , smellslike: 'PISSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS'
  , force: '/me senses a disturbance in the force.'
  , smiffhour: 'Lock & Load your smiff tracks !djs for the next hour we spin strictly smiff.'
  , awesome: function(data) {
      var self = this;
      this.woot(function() {
        console.log('Voted.');
        self.chat('Agreed, this track is svelte!  Wooted.');
      });
    }
  , lame: function(data) {
      var self = this;
      this.meh(function() {
        console.log('Voted.');
        self.chat('Mmm, not so hot.  Meh\'d.');
      });
    }
  , notsmiff: function(data) {
      var self = this;
      this.meh(function() {
        console.log('Voted.');
        self.chat('Hey, wait a second.  This isn\'t smiff.  D:');
      });
    }
  , bio: function(data) {
      var self = this;
      if (typeof(data.params) != 'undefined' && data.params.trim().length > 0) {
        data.person.bio = data.params.trim();
        data.person.save(function(err) {
          self.chat('Bio saved!  Profile link: http://codingsoundtrack.org/djs/' + data.fromID );
        });
      } else {
        if (typeof(data.person.bio) != 'undefined' && data.person.bio.length > 0) {
          self.chat('You must provide a string for your bio.  Markdown is accepted.  Your current bio is: “'+data.person.bio+'”');
        } else {
          self.chat('You must provide a string for your bio.  Markdown is accepted.');
        }
        
      }
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
  , topologyfacts: function(data) {
      var self = this;
      self.chat(randomFact('topology'));
    }
  , interstellafacts: function(data) {
      var self = this;
      self.chat(randomFact('interstella'));
    }
  , get smifffax () { return this.smifffacts }
  , smifffacts: function(data) {
      var self = this;
      self.chat(randomFact('smiff'));
    }
  , remæusfacts: function(data) {
      var self = this;
      self.chat('remæus\' third word was "combine".  His first was "truck," and his second "bobtail".');
    }
  , boss: function(data) {
      var self = this;
      self.chat('The best play of all time was... @' + self.records.boss._dj.name + ' with ' + self.records.boss.curates.length + ' snags of their play of ' + self.records.boss._song.title + ' on ' + self.records.boss.timestamp + '!  More: http://codingsoundtrack.org/history/' + self.records.boss._id );
    }
  , count: function(data) {
      var self = this;
      self.chat('I am currently aware of ' + _.toArray(self.room.audience).length + ' audience members.  I am probably wrong.');
    }
  , djs: function(data) {
      var self = this;
      var now = new Date();

      var idleDJs = [];
      _.toArray(self.room.djs).forEach(function(dj) {

        if (typeof(dj.lastChat) != 'undefined') {
          if (dj.lastChat.getTime() <= (now.getTime() - 300000)) {
            dj.idleTime = (now.getTime() - dj.lastChat.getTime()) / 1000;
            idleDJs.push(dj);
          }
        }
      });

      idleDJs = idleDJs.map(function(item) {
        var idleTime = secondsToTime(item.idleTime);
        var idleTimeString = '';
        var idleTimeString = (idleTime.h > 0) ? '('+ idleTime.h +'h'+ idleTime.m +'m'+idleTime.s+'s)' : '('+ idleTime.m +'m'+idleTime.s+'s)';

        return '@' + item.name + ' '+idleTimeString;
      });

      if (idleDJs.length > 0) {
        self.chat('Idle: ' + oxfordJoin(idleDJs));
      } else {
        self.chat('No idle DJs!');
      }

    }
  , donkeypunch: function(data) {
      var self = this;
      var randomSeed = getRandomInt(1, 100);

      Person.findOne({ $or: [ { plugID: data.fromID }, { name: data.from } ] }).exec(function(err, person) {
        if (!person) {
          var person = new Person({
              name: data.from
            , plugID: data.fromID
          });
        }

        person.points.man += randomSeed;

        person.save(function(err) {

          Person.count({}, function(err, totalPeople) {

            var fivePercent = Math.floor(totalPeople * 0.0006);
            var chanceToLose = 50;

            Person.find({}).sort('-points.man').limit(fivePercent).exec(function(err, manlyMen) {
              var manlyMenMap = manlyMen.map(function(man) {
                return man.plugID;
              });

              if (randomSeed <= chanceToLose) {
                self.chat('DONKEY PUNNNNNCH! ' + randomFact('donkey'));
                self.chat('/me donkeypunches ' + data.from +'.');

                person.points.man = 0;
                person.save(function(err) {
                  if (err) { console.log(err); }
                });
              } else {
                if (manlyMenMap.indexOf(data.fromID) >= 0) {
                  self.chat('@' + data.from + ' is ' + randomFact('compliment') + '.');
                } else if ( randomSeed > chanceToLose ) {
                  self.chat('@' + data.from + ' is alright.');
                }
              }

            });


          });
        });
      });

    }
  , manly: function(data) {
      var self = this;
      Person.count({}, function(err, totalPeople) {

        var fivePercent = Math.floor(totalPeople * 0.0006);

        Person.find({}).sort('-points.man').limit(fivePercent).exec(function(err, manlyMen) {

          var manlyManMap = manlyMen.map(function(man) {
            return '@' + man.name;
          });

          //console.log( 'Manly: ' + manlyManMap.join(', ') )
          self.chat('Manly: ' + manlyManMap.join(', '));

        });
      });
    }
  , erm: function(data) {
      var self = this;
      if (typeof(data.params) != 'undefined') {
        self.chat(ermgerd(data.params));
      }
    }
  , mods: function(data) {
      var self = this;
      var onlineStaff = [];

      var realModerators = [];
      _.toArray(self.room.staff).forEach(function(staffMember) {
        if ( self.room.staff[staffMember.plugID].role > 1 ) {
          realModerators.push(staffMember);
        }
      });

      _.intersection(
        _.toArray(realModerators).map(function(staffMember) {
          return staffMember._id.toString();
        }),
        _.toArray(self.room.audience).map(function(audienceMember) {
          return audienceMember._id.toString();
        })
      ).forEach(function(staffMember) {
        onlineStaff.push(staffMember);
      });

      Person.find({ _id: { $in: onlineStaff } }).exec(function(err, staff) {
        self.chat(staff.length + ' online staff members: ' + staff.map(function(staffMember) {
          console.log(staffMember);
          console.log(self.room.staff);
          //return staffMember.name + self.room.staff[staffMember.plugID].role;
          return '@' + staffMember.name;
        }).join(', ') );
      });
    }
  , nsfw: 'Please give people who are listening at work fair warning about NSFW videos.  It\'s common courtesy for people who don\'t code from home or at an awesome startup like LocalSense!'
  , permalink: function(data) {
      var self = this;
      self.chat('Song: http://codingsoundtrack.org/songs/' + self.room.track.id );
    }
  , plugid: function(data) {
      var self = this;
      self.chat('plug.dj calls you "'+ data.fromID +'".   Are you gonna take that?');
    }
  , profile: function(data) {
      var self = this;
      if (typeof(data.params) != 'undefined' && data.params.trim().length > 0) {
        Person.findOne({ name: data.params }).exec(function(err, person) {
          if (!person) {
            self.chat('/me could not find a profile by that name.');
          } else {
            self.chat('@' + data.params + ': “'+person.bio+'”  More: http://codingsoundtrack.org/djs/'+ person.plugID)
          }
        });
      } else {
        self.chat('Whose profile did you want?');
      }
    }
  , songtitle: function(data) {
      var self = this;

      var staffMap = [];
      _.toArray(self.room.staff).forEach(function(staffMember) {
        if ( self.room.staff[staffMember.plugID].role >= 1 ) {
          staffMap.push(staffMember.plugID);
        }
      });

      if (staffMap.indexOf( data.fromID ) == -1) {
        self.chat('I\'ll take that into consideration.  Maybe.');
      } else {
        Song.findOne({ id: self.currentSong.id }).exec(function(err, song) {
          if (err) { console.log(err); } else {
            if (data.params.length > 0) {
              var previousTitle = song.title;
              song.title = data.params;

              song.save(function(err) {
                self.chat('Song title updated, from "'+previousTitle+ '" to "'+song.title+'".  Link: http://codingsoundtrack.org/songs/' + self.room.track.id );
              });
            } else {
              self.chat('What do you want to set the title of this song to?  I need a parameter.');
            }
          }
        });
      }
    }
  , songartist: function(data) {
      var self = this;

      var staffMap = [];
      _.toArray(self.room.staff).forEach(function(staffMember) {
        if ( self.room.staff[staffMember.plugID].role >= 1 ) {
          staffMap.push(staffMember.plugID);
        }
      });

      if (staffMap.indexOf( data.fromID ) == -1) {
        self.chat('I\'ll take that into consideration.  Maybe.');
      } else {
        Song.findOne({ id: self.currentSong.id }).exec(function(err, song) {
          if (err) { console.log(err); } else {
            if (data.params.length > 0) {
              var previousAuthor = song.author;
              song.author = data.params;

              song.save(function(err) {
                self.chat('Song artist updated, from "'+previousAuthor+ '" to "'+song.author+'".  Link: http://codingsoundtrack.org/songs/' + self.room.track.id );
              });
            } else {
              self.chat('What do you want to set the author of this song to?  I need a parameter.');
            }
          }
        });
      }
    }
  , songplays: function(data) {
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
  , distracting: 'Try not to play songs that would be distracting to someone trying to write code.  Stay on theme as much as possible!'
  , lastplayed: function(data) {
      var self = this;
      History.find({ _song: self.room.track._id }).sort('-timestamp').limit(2).populate('_dj').exec(function(err, history) {
        var lastPlay = history[1];

        if (lastPlay) {
          History.count({ _song: self.room.track._id }).exec(function(err, count) {
            self.chat('This song was last played ' + timeago(lastPlay.timestamp) + ' by @' + lastPlay._dj.name + '.  It\'s been played ' + count + ' times in total.  More: http://codingsoundtrack.org/songs/' + self.room.track.id );
          });
        } else {
          self.chat('I haven\'t heard this song before now.');
        }

      });
    }
  , firstplayed: function(data) {
      var self = this;
      if (typeof(self.room.track._id) != 'undefined') {
        History.findOne({ _song: self.room.track._id }).sort('+timestamp').populate('_dj').exec(function(err, firstPlay) {
          History.count({ _song: self.room.track._id }).exec(function(err, count) {
            self.chat('@' + firstPlay._dj.name + ' was the first person to play this song!  Since then, it\'s been played ' + count + ' times.  More: http://codingsoundtrack.org/songs/' + self.room.track.id );
          });
        });
      } else {
        self.chat('Hold on, I\'m still booting up.  Gimme a minute.');
      }
    }
  , lastsong: function(data) {
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
  , music: function(data) {
      var self = this;
      var time = new Date().getUTCHours() - 5;
      
      if ( 0 <= time && time < 5) {
        self.chat("Evening! Keep the tempo up, it's the only thing keeping the all nighters going.");
      } else if ( 5 <= time && time < 12 ) {
        self.chat("AM! Chill tracks with good beats, most programmers are slow to wake so don't hit them with hard hitting tunes. Wubs are widely discouraged this early.");
      } else if (12 <= time && time < 17 ){
        self.chat('Afternoon! Fresh tracks for fresh people.');
      } else {
        self.chat("Evening! Most people are out of work so things are a lot more fluid and much less harsh. Seats are easy to get, spin a few if you want but don't hog the decks!");
      }
    }
  , history: function(data) {
      var self = this;
      History.count({}, function(err, count) {
        self.chat('There are ' + count + ' songs in recorded history: http://codingsoundtrack.org/history');
      });
    }
  , popular: function(data) {
      var self = this;
      Person.find().sort('-karma').limit(3).exec(function(err, people) {
        var names = people.map(function(person) {
          return '@' + person.name;
        });
      
        self.chat(oxfordJoin(names) + ' are all the rage these days. See more: http://codingsoundtrack.org/djs');
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
            self.chat('Karma is an arbitrary count of times that people have said your name followed by ++.  You can find yours at http://codingsoundtrack.org/djs/' + data.fromID );
          });
        } else {
          self.chat('Karma is an arbitrary count of times that people have said your name followed by ++.  You can find yours at http://codingsoundtrack.org/djs/' + data.fromID );
        }
      });
    }
  , trout: function(data) {
      this.chat('/me slaps ' + data.from + ' around a bit with a large trout.');
    }
  , falconpunch: function(data) {
      this.chat('/me falcon punches ' + data.from + ' out of a 13-story window.')
    }
  , brew: function(data) {
      var self = this;

      if (typeof(data.params) != 'undefined') {
        rest.get('http://api.brewerydb.com/v2/search?q=' + data.params + '&key=7c05e35f30f5fbb823ec4731735eb2eb').on('complete', function(api) {
          if (typeof(api.data) != 'undefined' && api.data.length > 0) {
            if (typeof(api.data[0].description) != 'undefined') {
              self.chat(api.data[0].name + ': ' + api.data[0].description);
            } else {
              self.chat(api.data[0].name + ' is a good beer, but I don\'t have a good way to describe it.');
            }
            
          } else {
            self.chat('Damn, I\'ve never heard of that.  Where do I need to go to find it?');
          }
        });
      } else {
        self.chat('No query provided.');
      }

    }
  , urban: function(data) {
      var self = this;


      if (typeof(data.params) != 'undefined') {

        rest.get('http://api.urbandictionary.com/v0/define?term='+data.params).on('complete', function(data) {
          self.chat(data.list[0].definition);
        });

      } else {
        self.chat('No query provided.');
      }

    }
  , duckduckgo: function(data) {
      var self = this;
      var client = new ddg.SearchClient();

      if (typeof(data.params) != 'undefined') {
        client.search(data.params, function(error, response, ddgData) {
          if (!error && response.statusCode == 200) {
            console.log(ddgData);

            if (ddgData.Abstract.length > 0) {
            self.chat(ddgData.Abstract);
            } else if (ddgData.Definition.length > 0) {
              self.chat(ddgData.Definition);
            } else {
              self.chat('No results found.');
            }

          } else {
            console.log("ERROR! " + error + "/" + response.statusCode);
          }
        });
      } else {
        self.chat('No query provided.');
      }
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
  , get snarlsource () { return this.source; }
  , debug: function(data) { this.chat(JSON.stringify(data)) }
  , get afpdj () { return this.afk; }
  , get aftt () { return this.afk; }
  , get ddg () { return this.duckduckgo; }
  , get dp () { return this.donkeypunch; }
  , get jarplug () { return this.plugin; }
  , get woot () { return this.awesome; }
  , get meh () { return this.lame; }
}

function oxfordJoin(array) {
  if (array instanceof Array) {

  } else {
    array = _.toArray(array).map(function(item) {
      return item.name;
    });
  }

  var string = '';
  if (array.length <= 1) {
    string = array.join();
  } else {
    string = array.slice(0, -1).join(", ") + ", and " + array[array.length-1];
  }
  return string;
}

function secondsToTime(secs) {
  var hours = Math.floor(secs / (60 * 60));
  
  var divisor_for_minutes = secs % (60 * 60);
  var minutes = Math.floor(divisor_for_minutes / 60);

  var divisor_for_seconds = divisor_for_minutes % 60;
  var seconds = Math.ceil(divisor_for_seconds);
  
  var obj = {
    "h": hours,
    "m": minutes,
    "s": seconds
  };
  return obj;
}

function randomFact(type) {
  var ar = facts[type];
  return ar[Math.round(Math.random()*(ar.length-1))];
}

function getRandomInt (min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function ermgerd(text) {
  text = text.toUpperCase();

  var words = text.split(' '),
    translatedWords = [];

  for (var j in words) {
    var prefix = words[j].match(/^\W+/) || '',
      suffix = words[j].match(/\W+$/) || '',
      word = words[j].replace(prefix, '').replace(suffix, '');

    if (word) {
      // Is translatable
      translatedWords.push(prefix + translate(word) + suffix);
    } else {
      // Is punctuation
      translatedWords.push(words[j]);
    }
  }

  return translatedWords.join(' ');
}

function str_split(string, split_length) {
  // http://kevin.vanzonneveld.net
  // +     original by: Martijn Wieringa
  // +     improved by: Brett Zamir (http://brett-zamir.me)
  // +     bugfixed by: Onno Marsman
  // +      revised by: Theriault
  // +        input by: Bjorn Roesbeke (http://www.bjornroesbeke.be/)
  // +      revised by: Rafał Kukawski (http://blog.kukawski.pl/)
  // *       example 1: str_split('Hello Friend', 3);
  // *       returns 1: ['Hel', 'lo ', 'Fri', 'end']
  if (split_length === null) {
    split_length = 1;
  }
  if (string === null || split_length < 1) {
    return false;
  }
  string += '';
  var chunks = [],
    pos = 0,
    len = string.length;
  while (pos < len) {
    chunks.push(string.slice(pos, pos += split_length));
  }

  return chunks;
};

function translate(word) {
  // Don't translate short words
  if (word.length == 1) {
    return word;
  }

  // Handle specific words
  switch (word) {
    case 'AWESOME':      return 'ERSUM';
    case 'BANANA':      return 'BERNERNER';
    case 'BAYOU':      return 'BERU';
    case 'FAVORITE':
    case 'FAVOURITE':    return 'FRAVRIT';
    case 'GOOSEBUMPS':    return 'GERSBERMS';
    case 'LONG':      return 'LERNG';
    case 'MY':        return 'MAH';
    case 'THE':        return 'DA';
    case 'THEY':      return 'DEY';
    case 'WE\'RE':      return 'WER';
    case 'YOU':        return 'U';
    case 'YOU\'RE':      return 'YER';
  }

  // Before translating, keep a reference of the original word
  var originalWord = word;

  // Drop vowel from end of words
  if (originalWord.length > 2) {  // Keep it for short words, like "WE"
    word = word.replace(/[AEIOU]$/, '');
  }

  // Reduce duplicate letters
  word = word.replace(/[^\w\s]|(.)(?=\1)/gi, '');

  // Reduce adjacent vowels to one
  word = word.replace(/[AEIOUY]{2,}/g, 'E');  // TODO: Keep Y as first letter

  // DOWN -> DERN
  word = word.replace(/OW/g, 'ER');

  // PANCAKES -> PERNKERKS
  word = word.replace(/AKES/g, 'ERKS');

  // The meat and potatoes: replace vowels with ER
  word = word.replace(/[AEIOUY]/g, 'ER');    // TODO: Keep Y as first letter

  // OH -> ER
  word = word.replace(/ERH/g, 'ER');

  // MY -> MAH
  word = word.replace(/MER/g, 'MAH');

  // FALLING -> FALERNG -> FERLIN
  word = word.replace('ERNG', 'IN');

  // POOPED -> PERPERD -> PERPED
  word = word.replace('ERPERD', 'ERPED');

  // MEME -> MAHM -> MERM
  word = word.replace('MAHM', 'MERM');

  // Keep Y as first character
  // YES -> ERS -> YERS
  if (originalWord.charAt(0) == 'Y') {
    word = 'Y' + word;
  }

  // Reduce duplicate letters
  word = word.replace(/[^\w\s]|(.)(?=\1)/gi, '');

  // YELLOW -> YERLER -> YERLO
  if ((originalWord.substr(-3) == 'LOW') && (word.substr(-3) == 'LER')) {
    word = word.substr(0, word.length - 3) + 'LO';
  }

  return word;
};
