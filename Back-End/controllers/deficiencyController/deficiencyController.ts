/**
 * Purpose:
 *  - Controller module for the Deficiency table.
 *  - Provides functions to create, read, and delete deficiencies for users and course pools.
 * Notes:
 *  - Uses type definitions from deficiency_types.d.ts for Deficiency shape.
 *  - Errors are logged to Sentry and then rethrown.
 *  - If `Database.getConnection()` fails, functions return undefined silently.
 *  - Ensures no duplicate deficiencies are created.
 */

import Database from '@controllers/DBController/DBController';
import DeficiencyTypes from '@controllers/deficiencyController/deficiency_types';
import { randomUUID } from 'crypto';
import * as Sentry from '@sentry/node';

/**
 * Creates a new deficiency for a user and coursepool.
 * Deficiencies represent missing credits a student must complete.
 *
 * @param {string} coursepool - The ID of the course pool.
 * @param {string} user_id - The ID of the user.
 * @param {number} creditsRequired - The number of credits required to resolve the deficiency.
 * @returns {Promise<DeficiencyTypes.Deficiency | undefined>} - The created deficiency or undefined if failed.
 */
async function createDeficiency(
  coursepool: string,
  user_id: string,
  creditsRequired: number,
): Promise<DeficiencyTypes.Deficiency | undefined> {
  const conn = await Database.getConnection();

  if (conn) {
    try {
      // Step 1: Check if this deficiency already exists (same coursepool + user). 
      // If yes, we don't create a duplicate → the user should update instead.
      const existingDeficiency = await conn
        .request()
        .input('coursepool', Database.msSQL.VarChar, coursepool)
        .input('user_id', Database.msSQL.VarChar, user_id)
        .query(
          'SELECT * FROM Deficiency WHERE coursepool = @coursepool AND user_id = @user_id',
        );

      if (existingDeficiency.recordset.length > 0) {
        throw new Error(
          'Deficiency with this coursepool and user_id already exists. Please use the update endpoint',
        );
      }
 
      // Step 2: Make sure the course pool actually exists.
      const existingCoursePool = await conn
        .request()
        .input('id', Database.msSQL.VarChar, coursepool)
        .query('SELECT * FROM CoursePool WHERE id = @id');

      if (existingCoursePool.recordset.length === 0) {
        throw new Error('CoursePool does not exist.');
      }

      // Step 3: Make sure the user exists in the system.
      const existingAppUser = await conn
        .request()
        .input('id', Database.msSQL.VarChar, user_id)
        .query('SELECT * FROM AppUser WHERE id = @id');

      if (existingAppUser.recordset.length === 0) {
        throw new Error('AppUser does not exist.');
      }

      // Step 4: Generate a unique ID for this new deficiency.
      const id = randomUUID();

      // Step 5: Insert the new deficiency into the database.
      await conn
        .request()
        .input('id', Database.msSQL.VarChar, id)
        .input('coursepool', Database.msSQL.VarChar, coursepool)
        .input('user_id', Database.msSQL.VarChar, user_id)
        .input('creditsRequired', Database.msSQL.Int, creditsRequired)
        .query(
          'INSERT INTO Deficiency (id, coursepool, user_id, creditsRequired) VALUES (@id, @coursepool, @user_id, @creditsRequired)',
        );

      // Return the object so the caller knows what was created.
      return { id, coursepool, user_id, creditsRequired };
    } catch (error) {
      // If something goes wrong, capture it with Sentry for monitoring.
      Sentry.captureException(error);
      throw error;
    } finally {
      conn.close();
    }
  }
}

/**
 * Retrieves all deficiencies for a specific user.
 * This allows us to see which course pools still require credits.
 * 
 * @param {string} user_id - The ID of the user.
 * @returns {Promise<DeficiencyTypes.Deficiency[] | undefined>} - List of deficiencies or undefined if not found.
 */
async function getAllDeficienciesByUser(
  user_id: string,
): Promise<DeficiencyTypes.Deficiency[] | undefined> {
  const conn = await Database.getConnection();

  if (conn) {
    try {
      // First, confirm that the user exists in the system.
      const existingAppUser = await conn
        .request()
        .input('id', Database.msSQL.VarChar, user_id)
        .query('SELECT * FROM AppUser WHERE id = @id');

      if (existingAppUser.recordset.length === 0) {
        throw new Error('AppUser does not exist.');
      }

      // Fetch all deficiencies tied to this user.
      const allDeficiencies = await conn
        .request()
        .input('user_id', Database.msSQL.VarChar, user_id)
        .query('SELECT * FROM Deficiency WHERE user_id = @user_id');
      
      // Return the list if found, otherwise undefined.
      return allDeficiencies.recordset.length > 0
        ? allDeficiencies.recordset
        : undefined;
    } catch (error) {
      Sentry.captureException(error);
      throw error;
    } finally {
      conn.close();
    }
  }
}
/**
 * Deletes a deficiency based on course pool and user ID.
 * Useful if the deficiency is resolved or was created by mistake.
 * 
 * @param {string} coursepool - The ID of the course pool.
 * @param {string} user_id - The ID of the user.
 * @returns {Promise<string | undefined>} - Success message or undefined if deletion fails.
 */

async function deleteDeficiencyByCoursepoolAndUserId(
  coursepool: string,
  user_id: string,
): Promise<string | undefined> {
  const conn = await Database.getConnection();

  if (conn) {
    try {
      // Step 1: Make sure the deficiency actually exists before deleting.
      const deficiency = await conn
        .request()
        .input('coursepool', Database.msSQL.VarChar, coursepool)
        .input('user_id', Database.msSQL.VarChar, user_id)
        .query(
          'SELECT * FROM Deficiency WHERE coursepool = @coursepool AND user_id = @user_id',
        );

      if (deficiency.recordset.length === 0) {
        throw new Error('Deficiency with this id does not exist.');
      }

      // Step 2: Delete the deficiency record.
      await conn
        .request()
        .input('coursepool', Database.msSQL.VarChar, coursepool)
        .input('user_id', Database.msSQL.VarChar, user_id)
        .query(
          'DELETE FROM Deficiency WHERE coursepool = @coursepool AND user_id = @user_id',
        );

      // Step 3: Return a success message.
      return `Deficiency with appUser ${user_id} and coursepool ${coursepool} has been successfully deleted.`;
    } catch (error) {
      Sentry.captureException(error);
      throw error;
    } finally {
      conn.close();
    }
  }
}

// Export the functions in a namespace-like object so they can be used elsewhere.
const deficiencyController = {
  createDeficiency,
  getAllDeficienciesByUser,
  deleteDeficiencyByCoursepoolAndUserId,
};

export default deficiencyController;
