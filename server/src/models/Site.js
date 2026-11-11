import mongoose from 'mongoose';

const siteSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 200
  },
  address: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: 255
  },
  html: {
    type: String,
    required: true,
    trim: true
  },
  plainText: {
    type: String,
    required: true,
    default: ''
  },
  authorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Person',
    required: true,
    index: true
  }
}, {
  timestamps: true
});

siteSchema.index({ title: 'text', plainText: 'text' }, {
  weights: { title: 10, plainText: 1 }
});

export const Site = mongoose.models.Site || mongoose.model('Site', siteSchema);
