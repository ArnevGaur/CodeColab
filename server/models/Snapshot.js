const mongoose = require('mongoose');

const snapshotSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    index: true
  },
  content: {
    type: String,
    required: true
  },
  authorName: {
    type: String,
    default: 'System'
  },
  label: {
    type: String,
    default: 'Auto-save'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Snapshot', snapshotSchema);
