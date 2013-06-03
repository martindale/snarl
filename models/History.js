var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = mongoose.SchemaTypes.ObjectId;

// this defines the fields associated with the model,
// and moreover, their type.
var HistorySchema = new Schema({
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

HistorySchema.virtual('isoDate').get(function() {
  return this.timestamp.toISOString();
});

var History = mongoose.model('History', HistorySchema);

// export the model to anything requiring it.
module.exports = {
  History: History
};
