const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['new', 'contacted', 'qualified', 'proposal_sent', 'closed', 'lost'],
    default: 'new'
  },
  source: {
    type: String,
    default: 'sms'
  },
  notes: [{
    content: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  followUps: [{
    scheduledDate: Date,
    completed: {
      type: Boolean,
      default: false
    },
    notes: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  followUpDate: {
    type: Date
  },
  followUpDays: {
    type: Number
  },
  followUpSet: {
    type: Boolean,
    default: false
  },
  agentId: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
leadSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Lead', leadSchema); 