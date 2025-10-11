/**
 * Purpose:
 *  - Mongoose model for the Exemption collection.
 *  - Represents a relationship where a user is exempted from taking a specific course.
 * Notes:
 *  - Each document links one user_id to one coursecode.
 *  - A compound index prevents duplicate exemptions for the same user and course.
 */

import mongoose from 'mongoose';

const exemptionSchema = new mongoose.Schema(
  {
    coursecode: {
      type: String,
      required: true,
      trim: true,
    },
    user_id: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt fields automatically
  }
);

// Prevent duplicate exemptions for the same user and course
exemptionSchema.index({ coursecode: 1, user_id: 1 }, { unique: true });

// Export the model
export const Exemption = mongoose.model('Exemption', exemptionSchema);
