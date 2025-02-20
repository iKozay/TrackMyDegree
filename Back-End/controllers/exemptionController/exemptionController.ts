import Database from "@controllers/DBController/DBController"
import ExemptionTypes from "@controllers/exemptionController/exemption_types"
import { randomUUID } from "crypto"

async function createExemptions(
  coursecodes: string[],
  user_id: string
): Promise<{ created: ExemptionTypes.Exemption[]; alreadyExists: string[] }> {
  const conn = await Database.getConnection();
  const createdExemptions: ExemptionTypes.Exemption[] = [];
  const alreadyExists: string[] = [];

  if (conn) {
    try {
      // Check if the user exists
      const existingUser = await conn.request()
        .input('id', Database.msSQL.VarChar, user_id)
        .query('SELECT * FROM AppUser WHERE id = @id');

      if (existingUser.recordset.length === 0) {
        throw new Error(`AppUser with id '${user_id}' does not exist.`);
      }

      for (const coursecode of coursecodes) {
        // Check if the course exists
        const existingCourse = await conn.request()
          .input('code', Database.msSQL.VarChar, coursecode)
          .query('SELECT * FROM Course WHERE code = @code');

        if (existingCourse.recordset.length === 0) {
          throw new Error(`Course with code '${coursecode}' does not exist.`);
        }

        // Check if the exemption already exists
        const existingExemption = await conn.request()
          .input('coursecode', Database.msSQL.VarChar, coursecode)
          .input('user_id', Database.msSQL.VarChar, user_id)
          .query('SELECT * FROM Exemption WHERE coursecode = @coursecode AND user_id = @user_id');

        if (existingExemption.recordset.length > 0) {
          // Instead of throwing an error, add the coursecode to the alreadyExists array and continue.
          alreadyExists.push(coursecode);
          continue;
        }

        // Generate random id
        const id = randomUUID();

        // Insert the new exemption
        await conn.request()
          .input('id', Database.msSQL.VarChar, id)
          .input('coursecode', Database.msSQL.VarChar, coursecode)
          .input('user_id', Database.msSQL.VarChar, user_id)
          .query('INSERT INTO Exemption (id, coursecode, user_id) VALUES (@id, @coursecode, @user_id)');

        createdExemptions.push({ id, coursecode, user_id });
      }

      return { created: createdExemptions, alreadyExists };
    } catch (error) {
      throw error;
    } finally {
      conn.close();
    }
  }

  return { created: [], alreadyExists: [] };
}




async function getAllExemptionsByUser(user_id: string): Promise<ExemptionTypes.Exemption[] | undefined> {
  const conn = await Database.getConnection();

  if (conn) {
    try {
      // Check if a appUser exists
      const existingUser_id = await conn.request()
        .input('id', Database.msSQL.VarChar, user_id)
        .query('SELECT * FROM AppUser WHERE id = @id');

      if (existingUser_id.recordset.length === 0) {
        throw new Error(`AppUser with id '${user_id}' does not exist.`);
      }

      // Read all exemptions of a user
      const allExemptions = await conn.request()
        .input('user_id', Database.msSQL.VarChar, user_id)
        .query('SELECT * FROM Exemption WHERE user_id = @user_id');


      if (allExemptions.recordset.length === 0) {
        throw new Error(`No exemptions found for user with id '${user_id}'.`);
      }

      return allExemptions.recordset;
    } catch (error) {
      throw error;
    } finally {
      conn.close();
    }
  }
};

async function deleteExemptionByCoursecodeAndUserId(
  coursecode: string,
  user_id: string,
): Promise<string | undefined> {
  const conn = await Database.getConnection();

  if (conn) {
    try {
      // Check if a exemption with the given id exists
      const exemption = await conn
        .request()
        .input('coursecode', Database.msSQL.VarChar, coursecode)
        .input('user_id', Database.msSQL.VarChar, user_id)
        .query('SELECT * FROM Exemption WHERE coursecode = @coursecode AND user_id = @user_id');

      if (exemption.recordset.length === 0) {
        throw new Error('Exemption with this coursecode and user_id does not exist.');
      }

      // Delete the exemption
      await conn
        .request()
        .input('coursecode', Database.msSQL.VarChar, coursecode)
        .input('user_id', Database.msSQL.VarChar, user_id)
        .query('DELETE FROM Exemption WHERE coursecode = @coursecode AND user_id = @user_id');

      // Return success message
      return `Exemption with appUser ${user_id} and coursecode ${coursecode} has been successfully deleted.`;
    } catch (error) {
      throw error;
    } finally {
      conn.close();
    }
  }
};

//Namespace
const exemptionController = {
  createExemptions,
  getAllExemptionsByUser,
  deleteExemptionByCoursecodeAndUserId
};

export default exemptionController;