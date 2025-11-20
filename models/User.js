// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, maxlength: 50 },
  firstName: { type: String, required: true, maxlength: 50 },
  lastName: { type: String, required: true, maxlength: 50 },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  profilePicture: { type: String, default: null }, // ADDED: Profile picture URL (Placeholder for future feature)
  favoriteCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  favoriteFiles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'File' }],
  role: { type: String, enum: ['user', 'admin'], default: 'user' }
}, {
  // Added options to ensure virtuals are included in JSON/Object conversions
  toJSON: { virtuals: true }, 
  toObject: { virtuals: true } 
});

// Hash password before saving
userSchema.pre('save', async function () {
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(12); // Best practice: explicitly generate salt
    this.password = await bcrypt.hash(this.password, salt);
  }
});

// Compare password
userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);