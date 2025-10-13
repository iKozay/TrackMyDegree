/**
 * Purpose:
 *  - Controller module for the Exemption table.
 *  - Provides functions to create, read, and delete exemptions for users and courses.
 * Notes:
 *  - Uses type definitions from exemption_types.d.ts for Exemption shape.
 *  - Errors are logged to Sentry and then rethrown.
 *  - If `Database.getConnection()` fails, functions return empty arrays.
 *  - Keeps track of exemptions that already exist to avoid duplicates.
 */


import Database from '@controllers/DBController/DBController';
import ExemptionTypes from '@controllers/exemptionController/exemption_types';
import { randomUUID } from 'crypto';
import * as Sentry from '@sentry/node';

/**
 * Creates exemptions for a list of courses for a specific user.
 * Exemptions mean the user does not need to take those courses.
 * @param {string[]} coursecodes - Array of course codes for which exemptions are to be created.
 * @param {string} user_id - The ID of the user for whom the exemptions are created.
 * @returns {Promise<{ created: ExemptionTypes.Exemption[]; alreadyExists: string[] }>} - An object containing a list of created exemptions and a list of course codes that already have exemptions.
 */
async function createExemptions(
  coursecodes: string[],
  user_id: string,
): Promise<{ created: ExemptionTypes.Exemption[]; alreadyExists: string[] }> {
  const conn = await Database.getConnection();
  const createdExemptions: ExemptionTypes.Exemption[] = [];
  const alreadyExists: string[] = [];

  if (conn) {
    try {
      // Step 1: Confirm the user exists before creating exemptions for them.
      const existingUser = await conn
        .request()
        .input('id', Database.msSQL.VarChar, user_id)
        .query('SELECT * FROM AppUser WHERE id = @id');

      if (existingUser.recordset.length === 0) {
        throw new Error(`AppUser with id '${user_id}' does not exist.`);
      }

      // Step 2: Loop through each course code provided.
      for (const coursecode of coursecodes) {
        // Check if the course exists
        const existingCourse = await conn
          .request()
          .input('code', Database.msSQL.VarChar, coursecode)
          .query('SELECT * FROM Course WHERE code = @code');

        if (existingCourse.recordset.length === 0) {
          throw new Error(`Course with code '${coursecode}' does not exist.`);
        }

        // Check if the exemption already exists for this user + course.
        const existingExemption = await conn
          .request()
          .input('coursecode', Database.msSQL.VarChar, coursecode)
          .input('user_id', Database.msSQL.VarChar, user_id)
          .query(
            'SELECT * FROM Exemption WHERE coursecode = @coursecode AND user_id = @user_id',
          );

        if (existingExemption.recordset.length > 0) {
          // Instead of throwing an error, add the coursecode to the alreadyExists array and continue.
          alreadyExists.push(coursecode);
          continue;
        }

        // If it’s a new exemption → create a unique ID.
        const id = randomUUID();

        // Insert the exemption record into the database.
        await conn
          .request()
          .input('id', Database.msSQL.VarChar, id)
          .input('coursecode', Database.msSQL.VarChar, coursecode)
          .input('user_id', Database.msSQL.VarChar, user_id)
          .query(
            'INSERT INTO Exemption (id, coursecode, user_id) VALUES (@id, @coursecode, @user_id)',
          );

          // Add to our "created" results array.
        createdExemptions.push({ id, coursecode, user_id });
      }

      // Return both the newly created exemptions and the ones that already existed.
      return { created: createdExemptions, alreadyExists };
    } catch (error) {
      Sentry.captureException(error);
      throw error;
    } finally {
      conn.close();
    }
  }
  // In case no connection is made, just return empty arrays.
  return { created: [], alreadyExists: [] };
}

/**
 * Retrieves all exemptions associated with a specific user.
 * Useful to display which courses the student doesn’t need to complete.
 * 
 * @param {string} user_id - The ID of the user whose exemptions are to be fetched.
 * @returns {Promise<ExemptionTypes.Exemption[] | undefined>} - A list of exemptions associated with the user, or undefined if none found.
 */
async function getAllExemptionsByUser(
  user_id: string,
): Promise<ExemptionTypes.Exemption[] | undefined> {
  const conn = await Database.getConnection();

  if (conn) {
    try {
      // Check if a appUser exists
      const existingUser_id = await conn
        .request()
        .input('id', Database.msSQL.VarChar, user_id)
        .query('SELECT * FROM AppUser WHERE id = @id');

      if (existingUser_id.recordset.length === 0) {
        throw new Error(`AppUser with id '${user_id}' does not exist.`);
      }

      // Read all exemptions of a user
      const allExemptions = await conn
        .request()
        .input('user_id', Database.msSQL.VarChar, user_id)
        .query('SELECT * FROM Exemption WHERE user_id = @user_id');

      if (allExemptions.recordset.length === 0) {
        throw new Error(`No exemptions found for user with id '${user_id}'.`);
      }

      return allExemptions.recordset;
    } catch (error) {
      Sentry.captureException(error);
      throw error;
    } finally {
      conn.close();
    }
  }
}
/**
 * Deletes an exemption for a specific course and user.
 * Used when an exemption was wrongly added or revoked.
 * @param {string} coursecode - The course code for which the exemption should be deleted.
 * @param {string} user_id - The ID of the user for whom the exemption is being deleted.
 * @returns {Promise<string | undefined>} - A success message if the exemption was deleted, or undefined if no exemption was found.
 */
async function deleteExemptionByCoursecodeAndUserId(
  coursecode: string,
  user_id: string,
): Promise<string | undefined> {
  const conn = await Database.getConnection();

  if (conn) {
    try {
      // Step 1: Check that the exemption exists before trying to delete it.
      const exemption = await conn
        .request()
        .input('coursecode', Database.msSQL.VarChar, coursecode)
        .input('user_id', Database.msSQL.VarChar, user_id)
        .query(
          'SELECT * FROM Exemption WHERE coursecode = @coursecode AND user_id = @user_id',
        );

      if (exemption.recordset.length === 0) {
        throw new Error(
          'Exemption with this coursecode and user_id does not exist.',
        );
      }

      // Step 2: Delete the exemption record.
      await conn
        .request()
        .input('coursecode', Database.msSQL.VarChar, coursecode)
        .input('user_id', Database.msSQL.VarChar, user_id)
        .query(
          'DELETE FROM Exemption WHERE coursecode = @coursecode AND user_id = @user_id',
        );

      // Step 3: Return a success message for logging/UI.
      return `Exemption with appUser ${user_id} and coursecode ${coursecode} has been successfully deleted.`;
    } catch (error) {
      Sentry.captureException(error);
      throw error;
    } finally {
      conn.close();
    }
  }
}

// Group everything in one object for export.
const exemptionController = {
  createExemptions,
  getAllExemptionsByUser,
  deleteExemptionByCoursecodeAndUserId,
};

export default exemptionController;
