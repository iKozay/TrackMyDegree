import Database from "@controllers/DBController/DBController"
import ExemptionTypes from "@controllers/exemptionController/exemption_types"
import { randomUUID } from "crypto"

async function createExemption(
  coursecode: string, 
  user_id: string
): Promise<ExemptionTypes.Exemption | undefined> {
  const conn = await Database.getConnection();

  if (conn) {
    try {
      // Check if a course exists
      const existingCourseCode = await conn.request()
        .input('code', Database.msSQL.VarChar, coursecode)
        .query('SELECT * FROM Course WHERE code = @code');

      if (existingCourseCode.recordset.length === 0) {
        throw new Error(`Course with code '${coursecode}' does not exist.`);
      }

      // Check if a appUser exists
      const existingUser_id = await conn.request()
        .input('id', Database.msSQL.VarChar, user_id)
        .query('SELECT * FROM AppUser WHERE id = @id');

      if (existingUser_id.recordset.length === 0) {
        throw new Error(`AppUser with id '${user_id}' does not exist.`);
      }

      // Check if a exemption with the same coursecode and user_id already exists
      const existingExemption = await conn.request()
        .input('coursecode', Database.msSQL.VarChar, coursecode)
        .input('user_id', Database.msSQL.VarChar, user_id)
        .query('SELECT * FROM Exemption WHERE coursecode = @coursecode AND user_id = @user_id');

      if (existingExemption.recordset.length > 0) {
        throw new Error('Exemption with this coursecode and user_id already exists.');
      }

      // generate random id
      const id = randomUUID();

      await conn.request()
        .input('id', Database.msSQL.VarChar, id)
        .input('coursecode', Database.msSQL.VarChar, coursecode)
        .input('user_id', Database.msSQL.VarChar, user_id)
        .query('INSERT INTO Exemption (id, coursecode, user_id) VALUES (@id, @coursecode, @user_id)');

      return { id, coursecode, user_id };
    } catch (error) {
      throw error;
    } finally {
      conn.close()
    }
  }
};


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
  createExemption,
  getAllExemptionsByUser,
  deleteExemptionByCoursecodeAndUserId
};

export default exemptionController;