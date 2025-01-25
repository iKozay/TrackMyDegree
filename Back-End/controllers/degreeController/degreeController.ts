import Database from "@controllers/DBController/DBController"
import DegreeTypes from "@controllers/degreeController/degree_types"

async function createDegree(id: string, name: string, totalCredits: number): Promise<DegreeTypes.Degree | undefined> {
  const conn = await Database.getConnection();

  if (conn) {
    try {
      // Check if a degree with the same id or name already exists
      const existingDegree = await conn.request()
        .input('id', Database.msSQL.VarChar, id)
        .input('name', Database.msSQL.VarChar, name)
        .query('SELECT * FROM Degree WHERE id = @id OR name = @name');

      if (existingDegree.recordset.length > 0) {
        throw new Error('Degree with this id or name already exists.');
      }

      await conn.request()
        .input('id', Database.msSQL.VarChar, id)
        .input('name', Database.msSQL.VarChar, name)
        .input('totalCredits', Database.msSQL.Int, totalCredits)
        .query('INSERT INTO Degree (id, name, totalCredits) VALUES (@id, @name, @totalCredits)');

      return { id, name, totalCredits };
    } catch (error) {
      throw error;
    } finally {
      conn.close()
    }
  }
};


async function readDegree(id: string): Promise<DegreeTypes.Degree | undefined> {
  const conn = await Database.getConnection();

  if (conn) {
    try {
      // Check if a degree with the id exists
      const degree = await conn.request()
        .input('id', Database.msSQL.VarChar, id)
        .query('SELECT * FROM Degree WHERE id = @id');

      if (degree.recordset.length === 0) {
        throw new Error('Degree with this id does not exist.');
      }

      return degree.recordset[0];
    } catch (error) {
      throw error;
    } finally {
      conn.close();
    }
  }
};


async function updateDegree(id: string, name: string, totalCredits: number): Promise<DegreeTypes.Degree | undefined> {
  const conn = await Database.getConnection();

  if (conn) {
    try {
      // Check if a degree with the id exists
      const degree = await conn
        .request()
        .input('id', Database.msSQL.VarChar, id)
        .query('SELECT * FROM Degree WHERE id = @id');

      if (degree.recordset.length === 0) {
        throw new Error('Degree with this id does not exist.');
      }

      // Update the degree with the new name and totalCredits
      await conn
        .request()
        .input('id', Database.msSQL.VarChar, id)
        .input('fullname', Database.msSQL.VarChar, name)
        .input('totalCredits', Database.msSQL.Int, totalCredits)
        .query(
          'UPDATE Degree SET name = @fullname, totalCredits = @totalCredits WHERE id = @id'
        );

      // Return the updated degree
      const updatedDegree = await conn
        .request()
        .input('id', Database.msSQL.VarChar, id)
        .query('SELECT * FROM Degree WHERE id = @id');

      return updatedDegree.recordset[0];
    } catch (error) {
      throw error;
    } finally {
      conn.close();
    }
  }
}

async function deleteDegree(id: string): Promise<string | undefined> {
  const conn = await Database.getConnection();

  if (conn) {
    try {
      // Check if a degree with the given id exists
      const degree = await conn
        .request()
        .input('id', Database.msSQL.VarChar, id)
        .query('SELECT * FROM Degree WHERE id = @id');

      if (degree.recordset.length === 0) {
        throw new Error('Degree with this id does not exist.');
      }

      // Delete the degree
      await conn
        .request()
        .input('id', Database.msSQL.VarChar, id)
        .query('DELETE FROM Degree WHERE id = @id');

      // Return success message
      return `Degree with id ${id} has been successfully deleted.`;
    } catch (error) {
      throw error;
    } finally {
      conn.close();
    }
  }
};

//Namespace
const degreeController = {
  createDegree,
  readDegree,
  updateDegree,
  deleteDegree
};

export default degreeController;