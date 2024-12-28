import Database from "@controllers/DBController/DBController"
import CRUD from "@controllers/CRUDController/CRUD_types"

async function createDegree (id: string, name: string, totalCredits: number):  Promise<CRUD.Degree | undefined> {
  const conn = await Database.getConnection();

    if(conn){
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
            .query('INSERT INTO Degree (id, name, totalCredits) VALUES (?, ?, ?)');

            return { id, name, totalCredits };
          } catch (error) {
            throw error;
          } finally {
            conn.close()
          }
    }
};


async function readDegree (id: string):  Promise<CRUD.Degree | undefined> {
    const conn = await Database.getConnection();
    
      if(conn){
          try {
              // Check if a degree with the same id or name already exists
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

//Namespace
const CRUDController = {
    createDegree,
    readDegree,
};

export default CRUDController;