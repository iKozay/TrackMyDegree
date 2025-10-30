/**
 * Purpose:
 *  - Controller module for the User collection (MongoDB).
 *  - Provides functions to update and delete user records.
 * Notes:
 *  - Uses Mongoose instead of raw SQL.
 *  - Errors are logged to Sentry and then rethrown.
 *  - If the Mongoose connection is not ready, functions just return `undefined`.
 */

import mongoose from 'mongoose';
import * as Sentry from '@sentry/node';
import appUserTypes from '@controllers/appUserController/appUser_types';
import { User } from '../../models/User';

/**
 * Updates an existing User in MongoDB.
 *
 * @param {string} id - The unique identifier of the user.
 * @param {string} email - The new email of the user.
 * @param {string} password - The new password of the user.
 * @param {string} fullname - The updated full name of the user.
 * @param {string} degree - The updated degree ID associated with the user.
 * @param {appUserTypes.UserType} type - The updated user type (student, advisor, admin).
 * @returns {Promise<appUserTypes.AppUser | undefined>} - The updated user record or undefined if the update fails.
 * @throws {Error} - If the user does not exist or a database error occurs.
 */
async function updateAppUser(
  id: string,
  email: string,
  password: string,
  fullname: string,
  degree: string,
  type: appUserTypes.UserType,
): Promise<appUserTypes.AppUser | undefined> {
  // Check MongoDB connection state (1 = connected)
  if (mongoose.connection.readyState !== 1) {
    return undefined;
  }

  try {
    const existingUser = await User.findById(id);
    if (!existingUser) {
      throw new Error('AppUser with this id does not exist.');
    }

    existingUser.email = email;
    existingUser.password = password; // Note: plain text, consider hashing later
    existingUser.fullname = fullname;
    existingUser.degree = degree;
    existingUser.type = type;

    await existingUser.save();

    const userObj = existingUser.toObject();
    return { ...userObj, id: userObj._id.toString() } as appUserTypes.AppUser;
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  }
}

/**
 * Deletes an existing User from MongoDB.
 *
 * @param {string} id - The unique identifier of the user to be deleted.
 * @returns {Promise<string | undefined>} - Success message or undefined if connection unavailable.
 * @throws {Error} - If the user does not exist or a database error occurs.
 */
async function deleteAppUser(id: string): Promise<string | undefined> {
  // Check MongoDB connection
  if (mongoose.connection.readyState !== 1) {
    return undefined;
  }

  try {
    const deleted = await User.findByIdAndDelete(id);

    if (!deleted) {
      throw new Error('AppUser with this id does not exist.');
    }

    return `AppUser with id ${id} has been successfully deleted.`;
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  }
}

const appUserController = {
  updateAppUser,
  deleteAppUser,
};

export default appUserController;
