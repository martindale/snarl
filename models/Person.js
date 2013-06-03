var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = mongoose.SchemaTypes.ObjectId;

// this defines the fields associated with the model,
// and moreover, their type.
var PersonSchema = new Schema({
    name: { type: String, index: true }
  , plugID: { type: String, unique: true, sparse: true }
  , role: { type: Number }
  , karma: { type: Number, default: 0 }
  , plays: { type: Number, default: 0 }
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

PersonSchema.virtual('points.total').get(function () {
  return this.points.dj + this.points.curator + this.points.listener;
});

var Person = mongoose.model('Person', PersonSchema);

// export the model to anything requiring it.
module.exports = {
  Person: Person
};
