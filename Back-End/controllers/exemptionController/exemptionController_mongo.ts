/**
 * Purpose:
 *  - Controller module for user-embedded exemptions (MongoDB).
 *  - Provides functions to create, read, and delete exemptions stored inside the User model.
 * Notes:
 *  - No separate Exemption collection; data lives within the User document.
 *  - Uses Mongoose and Sentry for error handling.
 *  - Returns results shaped like the SQL version for backward compatibility.
 */

import mongoose from 'mongoose';
import * as Sentry from '@sentry/node';
import { User } from '../../models/User';
import { Course } from '../../models/Course';

export interface ExemptionDoc {
  coursecode: string;
  user_id: string;
}

/**
 * Creates exemptions for a list of courses for a specific user.
 * Returns { created, alreadyExists } arrays.
 */
async function createExemptions(
  coursecodes: string[],
  user_id: string,
): Promise<{ created: ExemptionDoc[]; alreadyExists: string[] }> {
  // Connection check
  if (mongoose.connection.readyState !== 1) {
    return { created: [], alreadyExists: [] };
  }

  const created: ExemptionDoc[] = [];
  const alreadyExists: string[] = [];

  try {
    const user = await User.findById(user_id);
    if (!user) throw new Error(`AppUser with id '${user_id}' does not exist.`);

    for (const code of coursecodes) {
      const course = await Course.findById(code);
      if (!course)
        throw new Error(`Course with code '${code}' does not exist.`);

      if (user.exemptions.includes(code)) {
        alreadyExists.push(code);
        continue;
      }

      user.exemptions.push(code);
      created.push({ coursecode: code, user_id });
    }

    await user.save();
    return { created, alreadyExists };
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  }
}

/**
 * Retrieves all exemptions associated with a specific user.
 */
async function getAllExemptionsByUser(
  user_id: string,
): Promise<ExemptionDoc[] | undefined> {
  if (mongoose.connection.readyState !== 1) {
    return undefined;
  }

  try {
    const user = await User.findById(user_id);
    if (!user) throw new Error(`AppUser with id '${user_id}' does not exist.`);

    if (!user.exemptions || user.exemptions.length === 0) {
      throw new Error(`No exemptions found for user with id '${user_id}'.`);
    }

    return user.exemptions.map((code: string) => ({
      coursecode: code,
      user_id,
    }));
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  }
}

/**
 * Deletes an exemption for a specific course and user.
 */
async function deleteExemptionByCoursecodeAndUserId(
  coursecode: string,
  user_id: string,
): Promise<string | undefined> {
  if (mongoose.connection.readyState !== 1) {
    return undefined;
  }

  try {
    const user = await User.findById(user_id);
    if (!user) throw new Error(`AppUser with id '${user_id}' does not exist.`);

    if (!user.exemptions.includes(coursecode)) {
      throw new Error(
        'Exemption with this coursecode and user_id does not exist.',
      );
    }

    user.exemptions = user.exemptions.filter((c: string) => c !== coursecode);
    await user.save();

    return `Exemption with appUser ${user_id} and coursecode ${coursecode} has been successfully deleted.`;
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  }
}

const exemptionController = {
  createExemptions,
  getAllExemptionsByUser,
  deleteExemptionByCoursecodeAndUserId,
};

export default exemptionController;
