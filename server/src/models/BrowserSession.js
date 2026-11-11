import mongoose from 'mongoose';

const sessionEntrySchema = new mongoose.Schema({
  address: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    maxlength: 255
  },
  visitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Visit',
    required: true
  },
  scrollY: {
    type: Number,
    default: 0,
    min: 0
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  status: {
    type: String,
    enum: ['success', 'not_found'],
    required: true,
    default: 'success'
  }
}, { _id: false });

const browserSessionSchema = new mongoose.Schema({
  personId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Person',
    required: true,
    unique: true,
    index: true
  },
  entries: {
    type: [sessionEntrySchema],
    default: []
  },
  currentIndex: {
    type: Number,
    default: -1,
    min: -1
  }
}, {
  timestamps: true
});

export const BrowserSession = mongoose.models.BrowserSession || mongoose.model('BrowserSession', browserSessionSchema);
