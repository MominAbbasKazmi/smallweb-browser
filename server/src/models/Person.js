import mongoose from 'mongoose';

const personSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 2,
    maxlength: 80
  }
}, {
  timestamps: {
    createdAt: true,
    updatedAt: false
  }
});

export const Person = mongoose.models.Person || mongoose.model('Person', personSchema);
