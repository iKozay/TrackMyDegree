import Database from "@controllers/DBController/DBController"
import ExemptionTypes from "@controllers/exemptionController/exemption_types"

async function createExemption(id: string, coursecode: string, user_id: string): Promise<ExemptionTypes.Exemption | undefined> {
  const conn = await Database.getConnection();

  if (conn) {
    try {
      // Check if a exemption with the same id already exists
      const existingExemption = await conn.request()
        .input('id', Database.msSQL.VarChar, id)
        .query('SELECT * FROM Exemption WHERE id = @id');

      if (existingExemption.recordset.length > 0) {
        throw new Error('Exemption with this id already exists.');
      }

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


async function readExemption(id: string): Promise<ExemptionTypes.Exemption | undefined> {
  const conn = await Database.getConnection();

  if (conn) {
    try {
      // Check if a exemption with the id exists
      const exemption = await conn.request()
        .input('id', Database.msSQL.VarChar, id)
        .query('SELECT * FROM Exemption WHERE id = @id');

      if (exemption.recordset.length === 0) {
        throw new Error('Exemption with this id does not exist.');
      }

      return exemption.recordset[0];
    } catch (error) {
      throw error;
    } finally {
      conn.close();
    }
  }
};


async function updateExemption(id: string, coursecode: string, user_id: string): Promise<ExemptionTypes.Exemption | undefined> {
  const conn = await Database.getConnection();

  if (conn) {
    try {
      // Check if a exemption with the id exists
      const exemption = await conn
        .request()
        .input('id', Database.msSQL.VarChar, id)
        .query('SELECT * FROM Exemption WHERE id = @id');

      if (exemption.recordset.length === 0) {
        throw new Error('Exemption with this id does not exist.');
      }

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


      // Update the exemption with the new coursecode and user_id
      await conn
        .request()
        .input('id', Database.msSQL.VarChar, id)
        .input('coursecode', Database.msSQL.VarChar, coursecode)
        .input('user_id', Database.msSQL.VarChar, user_id)
        .query(
          'UPDATE Exemption SET coursecode = @coursecode, user_id = @user_id WHERE id = @id'
        );

      // Return the updated exemption
      const updatedExemption = await conn
        .request()
        .input('id', Database.msSQL.VarChar, id)
        .query('SELECT * FROM Exemption WHERE id = @id');

      return updatedExemption.recordset[0];
    } catch (error) {
      throw error;
    } finally {
      conn.close();
    }
  }
}

async function deleteExemption(id: string): Promise<string | undefined> {
  const conn = await Database.getConnection();

  if (conn) {
    try {
      // Check if a exemption with the given id exists
      const exemption = await conn
        .request()
        .input('id', Database.msSQL.VarChar, id)
        .query('SELECT * FROM Exemption WHERE id = @id');

      if (exemption.recordset.length === 0) {
        throw new Error('Exemption with this id does not exist.');
      }

      // Delete the exemption
      await conn
        .request()
        .input('id', Database.msSQL.VarChar, id)
        .query('DELETE FROM Exemption WHERE id = @id');

      // Return success message
      return `Exemption with id ${id} has been successfully deleted.`;
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
  readExemption,
  updateExemption,
  deleteExemption
};

export default exemptionController;