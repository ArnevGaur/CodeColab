const mongoose = require('mongoose');

const checkpointSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    index: true
  },
  content: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['auto', 'manual', 'pre-execution'],
    required: true
  },
  author: {
    type: String,
    required: true
  },
  language: {
    type: String,
    default: 'javascript'
  },
  label: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Checkpoint', checkpointSchema);
