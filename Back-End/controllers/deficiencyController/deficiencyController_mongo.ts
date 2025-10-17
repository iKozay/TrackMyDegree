// controllers/deficiencyController/deficiencyController_mongo.ts

import { randomUUID } from 'node:crypto';
import * as Sentry from '@sentry/node';
import DeficiencyTypes from '@controllers/deficiencyController/deficiency_types';

// Use existing models
import { User } from '../../models/User';
import { Degree } from '../../models/Degree';

/**
 * Creates a new deficiency for a user and coursepool.
 * - Deficiencies are stored embedded inside the User document (user.deficiencies).
 */
async function createDeficiency(
  coursepool: string,
  user_id: string,
  creditsRequired: number,
): Promise<DeficiencyTypes.Deficiency | undefined> {
  try {
    // 1) Verify user exists
    const user = await User.findOne({ _id: user_id });
    if (!user) {
      throw new Error('AppUser does not exist.');
    }

    // 2) Check if the deficiency already exists on the user (embedded)
    if (Array.isArray(user.deficiencies) && user.deficiencies.some(d => d.coursepool === coursepool)) {
      throw new Error(
        'Deficiency with this coursepool and user_id already exists. Please use the update endpoint',
      );
    }

    // 3) Verify course pool exists somewhere in degrees (assumes Degree.coursePools[] with id field)
    const degreeContainingPool = await Degree.findOne({ 'coursePools.id': coursepool }).lean();
    if (!degreeContainingPool) {
      throw new Error('CoursePool does not exist.');
    }

    user.deficiencies = user.deficiencies || [];
    user.deficiencies.push({
      coursepool,
      creditsRequired
    });

    // 5) Save the updated user document
    await user.save();

    // Return the created deficiency (plain object)
    return {
      id: randomUUID(),
      coursepool,
      user_id,
      creditsRequired
    };
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  }
}

/**
 * Retrieves all deficiencies for a specific user.
 * Returns `undefined` if none found (keeps previous behaviour).
 */
async function getAllDeficienciesByUser(
  user_id: string,
): Promise<DeficiencyTypes.Deficiency[] | undefined> {
  try {
    // Confirm the user exists and fetch deficiencies
    const user = await User.findOne({ _id: user_id }).lean();
    if (!user) {
      throw new Error('AppUser does not exist.');
    }

    const allDeficiencies = (user.deficiencies || []).map(def => ({
      id: randomUUID(),
      coursepool: def.coursepool,
      user_id: user_id,
      creditsRequired: def.creditsRequired
    }));

    return allDeficiencies;
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  }
}

/**
 * Deletes a deficiency based on course pool and user ID.
 */
async function deleteDeficiencyByCoursepoolAndUserId(
  coursepool: string,
  user_id: string,
): Promise<string | undefined> {
  try {
    // Find the user document (we will mutate it and save)
    const user = await User.findOne({ _id: user_id });
    if (!user) {
      throw new Error('AppUser does not exist.');
    }

    if (!Array.isArray(user.deficiencies)) {
      throw new TypeError('Deficiency with this id does not exist.');
    }

    const idx = user.deficiencies.findIndex(d => d.coursepool === coursepool);

    if (idx === -1) {
      throw new Error('Deficiency with this id does not exist.');
    }

    // Remove the deficiency and save
    user.deficiencies.splice(idx, 1);
    await user.save();

    return `Deficiency with appUser ${user_id} and coursepool ${coursepool} has been successfully deleted.`;
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  }
}

const deficiencyControllerMongo = {
  createDeficiency,
  getAllDeficienciesByUser,
  deleteDeficiencyByCoursepoolAndUserId,
};

export default deficiencyControllerMongo;
