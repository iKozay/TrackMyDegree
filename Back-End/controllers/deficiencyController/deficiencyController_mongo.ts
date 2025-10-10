import DeficiencyModel from '../../models/deficiencyModel'; // Adjust path
import AppUserModel from '../../models/appUserModel'; // Adjust path
import CoursePoolModel from '../../models/coursePoolModel'; // Adjust path
import DeficiencyTypes from '@controllers/deficiencyController/deficiency_types';
import { randomUUID } from 'crypto';
import * as Sentry from '@sentry/node';

/**
 * Creates a new deficiency for a user and coursepool.
 */
async function createDeficiency(
  coursepool: string,
  user_id: string,
  creditsRequired: number,
): Promise<DeficiencyTypes.Deficiency | undefined> {
  try {
    // Step 1: Check if this deficiency already exists (handled by compound index, but explicit check is clearer)
    const existingDeficiency = await DeficiencyModel.findOne({ coursepool, user_id });
    if (existingDeficiency) {
      throw new Error(
        'Deficiency with this coursepool and user_id already exists. Please use the update endpoint',
      );
    }

    // Step 2: Make sure the course pool actually exists.
    const existingCoursePool = await CoursePoolModel.findOne({ id: coursepool });
    if (!existingCoursePool) {
      throw new Error('CoursePool does not exist.');
    }

    // Step 3: Make sure the user exists in the system.
    const existingAppUser = await AppUserModel.findOne({ id: user_id });
    if (!existingAppUser) {
      throw new Error('AppUser does not exist.');
    }

    // Step 4: Generate a unique ID and create the new deficiency.
    const id = randomUUID();
    const newDeficiency = new DeficiencyModel({
      id,
      coursepool,
      user_id,
      creditsRequired,
    });

    // Step 5: Save the new deficiency.
    await newDeficiency.save();
    return newDeficiency.toObject();
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  }
}

/**
 * Retrieves all deficiencies for a specific user.
 */
async function getAllDeficienciesByUser(
  user_id: string,
): Promise<DeficiencyTypes.Deficiency[] | undefined> {
  try {
    // First, confirm that the user exists.
    const existingAppUser = await AppUserModel.findOne({ id: user_id });
    if (!existingAppUser) {
      throw new Error('AppUser does not exist.');
    }

    // Fetch all deficiencies tied to this user.
    const allDeficiencies = await DeficiencyModel.find({ user_id }).lean();

    // Replicate original logic: return undefined if no deficiencies are found.
    return allDeficiencies.length > 0 ? allDeficiencies : undefined;
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
    // findOneAndDelete is an atomic operation.
    const deletedDeficiency = await DeficiencyModel.findOneAndDelete({
      coursepool,
      user_id,
    });

    if (!deletedDeficiency) {
      throw new Error('Deficiency with this id does not exist.');
    }

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