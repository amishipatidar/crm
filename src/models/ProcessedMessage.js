const mongoose = require('mongoose');

const processedMessageSchema = new mongoose.Schema({
  messageSid: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  from: {
    type: String,
    required: true
  },
  body: {
    type: String,
    required: true
  },
  processedAt: {
    type: Date,
    default: Date.now
  },
  response: {
    type: String
  },
  command: {
    type: String
  },
  status: {
    type: String,
    enum: ['processing', 'completed', 'failed'],
    default: 'processing'
  }
}, {
  timestamps: true
});

// Index for cleanup of old messages
processedMessageSchema.index({ processedAt: 1 }, { expireAfterSeconds: 86400 * 7 }); // 7 days

module.exports = mongoose.model('ProcessedMessage', processedMessageSchema);
