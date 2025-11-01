/**
 * Purpose:
 *  - Controller module for the AppUser table.
 *  - Provides functions to update and delete user records.
 * Notes:
 *  - Relies on type definitions from appUser_types.d.ts for AppUser shape and roles
 *  - Errors are logged to Sentry and then rethrown.
 *  - If `Database.getConnection()` fails, functions just return `undefined` silently.
 */

import Database from '@controllers/DBController/DBController';
import appUserTypes from '@controllers/appUserController/appUser_types';
import * as Sentry from '@sentry/node';

/**
 * Updates an existing AppUser in the database.
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

const SELECT_USER_BY_ID = 'SELECT * FROM AppUser WHERE id = @id';

async function updateAppUser(
  id: string,
  email: string,
  password: string,
  fullname: string,
  degree: string,
  type: appUserTypes.UserType,
): Promise<appUserTypes.AppUser | undefined> {
  // Establish a database connection
  const conn = await Database.getConnection();
  // consider throwing or returning a specific error value here?
  if (conn) {
    try {
      // Check if an AppUser with the given id exists
      const appUser = await conn
        .request()
        .input('id', Database.msSQL.VarChar, id)
        .query(SELECT_USER_BY_ID);

      if (appUser.recordset.length === 0) {
        throw new Error('AppUser with this id does not exist.');
      }

      // Update the AppUser with the provided values
      await conn
        .request()
        .input('id', Database.msSQL.VarChar, id)
        .input('email', Database.msSQL.VarChar, email)
        .input('password', Database.msSQL.VarChar, password)
        .input('fullname', Database.msSQL.VarChar, fullname)
        .input('degree', Database.msSQL.VarChar, degree)
        .input('type', Database.msSQL.VarChar, type)
        .query(
          `UPDATE AppUser 
            SET email = @email, 
                password = @password, 
                fullname = @fullname, 
                degree = @degree, 
                type = @type 
            WHERE id = @id`,
        );
      // Stores passwords directly on plaintext which could be a security risk here, suggest hashing
      // Retrieve and return the updated user data
      const updatedAppUser = await conn
        .request()
        .input('id', Database.msSQL.VarChar, id)
        .query(SELECT_USER_BY_ID);

      return updatedAppUser.recordset[0];
    } catch (error) {
      Sentry.captureException(error);
      throw error; // Rethrow any errors encountered
    } finally {
      // I'd suggest consider awaiting it through
      // `await conn.close();`
      // ensures the connection is fully closed before this function resolves
      conn.close(); // Ensure the database connection is closed
    }
  }
}

/**
 * Deletes an AppUser from the database.
 *
 * @param {string} id - The unique identifier of the user to be deleted.
 * @returns {Promise<string | undefined>} - A success message if deletion is successful, or undefined if an error occurs.
 * @throws {Error} - If the user does not exist or a database error occurs.
 */
async function deleteAppUser(id: string): Promise<string | undefined> {
  const conn = await Database.getConnection();
  // Again, consider throwing or returning a specific error value here
  if (conn) {
    try {
      // Check if an AppUser with the given id exists
      const appUser = await conn
        .request()
        .input('id', Database.msSQL.VarChar, id)
        .query(SELECT_USER_BY_ID);

      if (appUser.recordset.length === 0) {
        throw new Error('AppUser with this id does not exist.');
      }

      // Delete the AppUser from the database
      await conn
        .request()
        .input('id', Database.msSQL.VarChar, id)
        .query('DELETE FROM AppUser WHERE id = @id');

      // Return success message
      return `AppUser with id ${id} has been successfully deleted.`;
    } catch (error) {
      Sentry.captureException(error);
      throw error; // Rethrow any errors encountered
    } finally {
      // again consider `await conn.close();` to be sure connection has ended
      conn.close(); // Ensure the database connection is always closed
    }
  }
}

//Namespace
const appUserController = {
  updateAppUser,
  deleteAppUser,
};

export default appUserController;
