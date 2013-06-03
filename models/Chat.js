var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = mongoose.SchemaTypes.ObjectId;

// this defines the fields associated with the model,
// and moreover, their type.
var ChatSchema = new Schema({
    timestamp: { type: Date, default: Date.now }
  , _person: { type: ObjectId, ref: 'Person', required: true }
  , message: { type: String, required: true }
});

ChatSchema.virtual('isoDate').get(function() {
  return this.timestamp.toISOString();
});

var Chat = mongoose.model('Chat', ChatSchema);

// export the model to anything requiring it.
module.exports = {
  Chat: Chat
};
