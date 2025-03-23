import Database from '@controllers/DBController/DBController';
import RequisiteTypes from '@controllers/requisiteController/requisite_types';
import { randomUUID } from 'crypto';
import * as Sentry from '@sentry/node';

async function createRequisite(
  code1: string,
  code2: string,
  type: RequisiteTypes.RequisiteType,
): Promise<RequisiteTypes.Requisite | undefined> {
  const conn = await Database.getConnection();

  if (conn) {
    try {
      // generate random id
      const id = randomUUID();
      // Check if both courses exist
      const coursesCheck = await conn
        .request()
        .input('code1', Database.msSQL.VarChar, code1)
        .input('code2', Database.msSQL.VarChar, code2).query(`
          SELECT code
          FROM Course
          WHERE code IN (@code1, @code2);
        `);

      if (coursesCheck.recordset.length < 2) {
        throw new Error(
          `One or both courses ('${code1}', '${code2}') do not exist.`,
        );
      }

      // Check if a requisite with the same course combination already exists
      const existingRequisite = await conn
        .request()
        .input('code1', Database.msSQL.VarChar, code1)
        .input('code2', Database.msSQL.VarChar, code2)
        .input('type', Database.msSQL.VarChar, type)
        .query(
          'SELECT * FROM Requisite WHERE code1 = @code1 AND code2 = @code2 AND type = @type',
        );

      if (existingRequisite.recordset.length > 0) {
        throw new Error(
          'Requisite with this combination of courses already exists.',
        );
      }

      await conn
        .request()
        .input('id', Database.msSQL.VarChar, id)
        .input('code1', Database.msSQL.VarChar, code1)
        .input('code2', Database.msSQL.VarChar, code2)
        .input('type', Database.msSQL.VarChar, type)
        .query(
          'INSERT INTO Requisite (id, code1, code2, type) VALUES (@id, @code1, @code2, @type)',
        );

      return existingRequisite.recordset[0];
    } catch (error) {
      Sentry.captureException(error);
      throw error;
    } finally {
      conn.close();
    }
  }
}

async function readRequisite(
  code1: string,
  code2?: string, // Make code2 optional
  type?: RequisiteTypes.RequisiteType, // Make type optional
): Promise<RequisiteTypes.Requisite[] | undefined> {
  // Return an array of requisites
  const conn = await Database.getConnection();

  if (conn) {
    try {
      // Check if code1 exists
      const coursesCheck = await conn
        .request()
        .input('code1', Database.msSQL.VarChar, code1).query(`
          SELECT code
          FROM Course
          WHERE code = @code1;
        `);

      if (coursesCheck.recordset.length < 1) {
        throw new Error(`Course '${code1}' does not exist.`);
      }

      // If code2 and type are provided, search using all parameters
      if (code2 && type) {
        const existingRequisite = await conn
          .request()
          .input('code1', Database.msSQL.VarChar, code1)
          .input('code2', Database.msSQL.VarChar, code2)
          .input('type', Database.msSQL.VarChar, type)
          .query(
            'SELECT * FROM Requisite WHERE code1 = @code1 AND code2 = @code2 AND type = @type',
          );

        return existingRequisite.recordset; // Return all matching requisites
      } else {
        // If only code1 is provided, search for requisites with code1
        const existingRequisite = await conn
          .request()
          .input('code1', Database.msSQL.VarChar, code1)
          .query('SELECT * FROM Requisite WHERE code1 = @code1');

        return existingRequisite.recordset; // Return all requisites for code1
      }
    } catch (error) {
      Sentry.captureException(error);
      throw error;
    } finally {
      conn.close();
    }
  }
}

async function updateRequisite(
  code1: string,
  code2: string,
  type: RequisiteTypes.RequisiteType,
): Promise<RequisiteTypes.Requisite | undefined> {
  const conn = await Database.getConnection();

  if (conn) {
    try {
      // Check if both courses exist
      const coursesCheck = await conn
        .request()
        .input('code1', Database.msSQL.VarChar, code1)
        .input('code2', Database.msSQL.VarChar, code2).query(`
          SELECT code
          FROM Course
          WHERE code IN (@code1, @code2);
        `);

      if (coursesCheck.recordset.length < 2) {
        throw new Error(
          `One or both courses ('${code1}', '${code2}') do not exist.`,
        );
      }

      // Check if a requisite with the same course combination already exists
      const existingRequisite = await conn
        .request()
        .input('code1', Database.msSQL.VarChar, code1)
        .input('code2', Database.msSQL.VarChar, code2)
        .input('type', Database.msSQL.VarChar, type)
        .query(
          'SELECT * FROM Requisite WHERE code1 = @code1 AND code2 = @code2 AND type = @type',
        );

      if (existingRequisite.recordset.length > 0) {
        throw new Error(
          'Requisite with this combination of courses already exists.',
        );
      }

      // Update the requisite with the new attributes
      await conn
        .request()
        .input('code1', Database.msSQL.VarChar, code1)
        .input('code2', Database.msSQL.VarChar, code2)
        .input('type', Database.msSQL.VarChar, type)
        .query(
          'UPDATE Requisite SET code1 = @code1, code2 = @code2, type = @type WHERE id = @id',
        );

      // Return the updated requisite
      const updatedRequisite = await conn
        .request()
        .input('code1', Database.msSQL.VarChar, code1)
        .input('code2', Database.msSQL.VarChar, code2)
        .input('type', Database.msSQL.VarChar, type)
        .query(
          'SELECT * FROM Requisite WHERE code1 = @code1 AND code2 = @code2 AND type = @type',
        );

      return updatedRequisite.recordset[0];
    } catch (error) {
      Sentry.captureException(error);
      throw error;
    } finally {
      conn.close();
    }
  }
}

async function deleteRequisite(
  code1: string,
  code2: string,
  type: RequisiteTypes.RequisiteType,
): Promise<string | undefined> {
  const conn = await Database.getConnection();

  if (conn) {
    try {
      // Check if a requisite with the given id exists
      const requisite = await conn
        .request()
        .input('code1', Database.msSQL.VarChar, code1)
        .input('code2', Database.msSQL.VarChar, code2)
        .input('type', Database.msSQL.VarChar, type)
        .query(
          'SELECT * FROM Requisite WHERE code1 = @code1 AND code2 = @code2 AND type = @type',
        );

      if (requisite.recordset.length === 0) {
        throw new Error('Requisite with this id does not exist.');
      }

      // Delete the requisite
      await conn
        .request()
        .input('code1', Database.msSQL.VarChar, code1)
        .input('code2', Database.msSQL.VarChar, code2)
        .input('type', Database.msSQL.VarChar, type)
        .query(
          'DELETE FROM Requisite WHERE code1 = @code1 AND code2 = @code2 AND type = @type',
        );

      // Return success message
      return `Requisite with the course combination provided has been successfully deleted.`;
    } catch (error) {
      Sentry.captureException(error);
      throw error;
    } finally {
      conn.close();
    }
  }
}

//Namespace
const requisiteController = {
  createRequisite,
  readRequisite,
  updateRequisite,
  deleteRequisite,
};

export default requisiteController;
