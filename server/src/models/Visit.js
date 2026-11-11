import mongoose from 'mongoose';

const visitSchema = new mongoose.Schema({
  personId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Person',
    required: true,
    index: true
  },
  address: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    maxlength: 255
  },
  siteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Site',
    default: null
  },
  visitedAt: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  navigationType: {
    type: String,
    enum: ['typed', 'link', 'history', 'publish'],
    required: true,
    default: 'typed'
  },
  status: {
    type: String,
    enum: ['success', 'not_found'],
    required: true,
    default: 'success'
  },
  fromAddress: {
    type: String,
    default: null,
    trim: true,
    lowercase: true,
    maxlength: 255
  }
}, {
  timestamps: false
});

visitSchema.index({ personId: 1, visitedAt: -1 });
visitSchema.index({ personId: 1, address: 1 });

export const Visit = mongoose.models.Visit || mongoose.model('Visit', visitSchema);
