var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = mongoose.SchemaTypes.ObjectId;

// this defines the fields associated with the model,
// and moreover, their type.
var SongSchema = new Schema({
    author: String
  , id: { type: String, index: true }
  , cid: String
  , plugID: String
  , format: String
  , title: String
  , duration: Number
  , lastPlay: Date
  , nsfw: Boolean
  , banned: { type: Boolean }
});

var Song = mongoose.model('Song', SongSchema);

// export the model to anything requiring it.
module.exports = {
  Song: Song
};
