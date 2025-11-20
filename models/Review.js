const mongoose = require('mongoose');
const User = require('./User'); // Imports for reference, assuming they exist in the same directory

const ReviewSchema = new mongoose.Schema({
  rating: {
    type: Number,
    min: [1, 'Rating must be at least 1 star'],
    max: [5, 'Rating cannot be more than 5 stars'],
    required: [true, 'A rating between 1 and 5 is required']
  },
  comment: {
    type: String,
    trim: true,
    maxlength: [500, 'Comment cannot be more than 500 characters']
  },
  resourceType: {
    type: String,
    enum: ['Course', 'File'],
    required: true
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'resourceType'
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure a user can only leave one review per resource
ReviewSchema.index({ resourceId: 1, user: 1 }, { unique: true });

// Static method to get avg rating and save
ReviewSchema.statics.getAverageRating = async function (resourceId, resourceType) {
  const obj = await this.aggregate([
    {
      $match: { resourceId, resourceType }
    },
    {
      $group: {
        _id: '$resourceId',
        averageRating: { $avg: '$rating' }
      }
    }
  ]);

  try {
    const Model = mongoose.model(resourceType);
    await Model.findByIdAndUpdate(resourceId, {
      averageRating: obj[0] ? obj[0].averageRating : 0
    });
  } catch (err) {
    console.error(`Error updating average rating for ${resourceType} ${resourceId}:`, err.message);
  }
};

// Call getAverageRating after save
ReviewSchema.post('save', function() {
  this.constructor.getAverageRating(this.resourceId, this.resourceType);
});

// Call getAverageRating after deleteOne (for controllers using review.deleteOne())
ReviewSchema.post('deleteOne', { document: true, query: false }, function() {
  this.constructor.getAverageRating(this.resourceId, this.resourceType);
});

module.exports = mongoose.model('Review', ReviewSchema);