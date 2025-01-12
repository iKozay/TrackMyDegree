import Database from "@controllers/DBController/DBController"
import DeficiencyTypes from "@controllers/deficiencyController/deficiency_types"

async function createDeficiency (
    id: string, 
    coursepool: string, 
    user_id: string, 
    creditsRequired: number
):  Promise<DeficiencyTypes.Deficiency | undefined> {
  const conn = await Database.getConnection();

    if(conn){
        try {
            // Check if a deficiency with the same id already exists
            const existingDeficiency = await conn.request()
            .input('id', Database.msSQL.VarChar, id)
            .query('SELECT * FROM Deficiency WHERE id = @id');
        
            if (existingDeficiency.recordset.length > 0) {
              throw new Error('Deficiency with this id or name already exists.');
            }

            const existingCoursePool = await conn.request()
            .input('id', Database.msSQL.VarChar, coursepool)
            .query('SELECT * FROM CoursePool WHERE id = @id');
        
            if (existingCoursePool.recordset.length === 0) {
              throw new Error('CoursePool does not exist.');
            }

            const existingAppUser = await conn.request()
            .input('id', Database.msSQL.VarChar, user_id)
            .query('SELECT * FROM AppUser WHERE id = @id');
        
            if (existingAppUser.recordset.length === 0) {
              throw new Error('AppUser does not exist.');
            }
        
            await conn.request()
            .input('id', Database.msSQL.VarChar, id)
            .input('coursepool', Database.msSQL.VarChar, coursepool)
            .input('user_id', Database.msSQL.VarChar, user_id)
            .input('creditsRequired', Database.msSQL.Int, creditsRequired)
            .query('INSERT INTO Deficiency (id, coursepool, user_id, creditsRequired) VALUES (@id, @coursepool, @user_id, @creditsRequired)');

            return { id, coursepool, user_id, creditsRequired };
          } catch (error) {
            throw error;
          } finally {
            conn.close()
          }
    }
};


async function readDeficiency (id: string):  Promise<DeficiencyTypes.Deficiency | undefined> {
    const conn = await Database.getConnection();
    
      if(conn){
          try {
              // Check if a deficiency with the id exists
              const deficiency = await conn.request()
              .input('id', Database.msSQL.VarChar, id)
              .query('SELECT * FROM Deficiency WHERE id = @id');
          
              if (deficiency.recordset.length === 0) {
                throw new Error('Deficiency with this id does not exist.');
              }
          
              return deficiency.recordset[0];
            } catch (error) {
              throw error;
            } finally {
              conn.close();
            }
      }
  };


  async function updateDeficiency(id: string, 
    coursepool: string, 
    user_id: string, 
    creditsRequired: number
): Promise<DeficiencyTypes.Deficiency | undefined> {
    const conn = await Database.getConnection();
  
    if (conn) {
      try {
        // Check if a deficiency with the id exists
        const deficiency = await conn
          .request()
          .input('id', Database.msSQL.VarChar, id)
          .query('SELECT * FROM Deficiency WHERE id = @id');
  
        if (deficiency.recordset.length === 0) {
          throw new Error('Deficiency with this id does not exist.');
        }

        // Check if a coursePool exists
        const existingCoursePool = await conn.request()
            .input('id', Database.msSQL.VarChar, coursepool)
            .query('SELECT * FROM CoursePool WHERE id = @id');
        
            if (existingCoursePool.recordset.length === 0) {
              throw new Error('CoursePool does not exist.');
            }
        // Check if a appUser exists
            const existingAppUser = await conn.request()
            .input('id', Database.msSQL.VarChar, user_id)
            .query('SELECT * FROM AppUser WHERE id = @id');
        
            if (existingAppUser.recordset.length === 0) {
              throw new Error('AppUser does not exist.');
            }
  
        // Update the deficiency with the new name and totalCredits
        await conn
          .request()
          .input('id', Database.msSQL.VarChar, id)
          .input('coursepool', Database.msSQL.VarChar, coursepool)
          .input('user_id', Database.msSQL.VarChar, user_id)
          .input('creditsRequired', Database.msSQL.Int, creditsRequired)
          .query(
            'UPDATE Deficiency SET coursepool = @coursepool, user_id = @user_id, creditsRequired = @creditsRequired WHERE id = @id'
          );
  
        // Return the updated deficiency
        const updatedDeficiency = await conn
          .request()
          .input('id', Database.msSQL.VarChar, id)
          .query('SELECT * FROM Deficiency WHERE id = @id');
  
        return updatedDeficiency.recordset[0];
      } catch (error) {
        throw error;
      } finally {
        conn.close();
      }
    }
  }
  
  async function deleteDeficiency(id: string): Promise<string | undefined> {
    const conn = await Database.getConnection();
  
    if (conn) {
      try {
        // Check if a deficiency with the given id exists
        const deficiency = await conn
          .request()
          .input('id', Database.msSQL.VarChar, id)
          .query('SELECT * FROM Deficiency WHERE id = @id');
  
        if (deficiency.recordset.length === 0) {
          throw new Error('Deficiency with this id does not exist.');
        }
  
        // Delete the deficiency
        await conn
          .request()
          .input('id', Database.msSQL.VarChar, id)
          .query('DELETE FROM Deficiency WHERE id = @id');
  
        // Return success message
        return `Deficiency with id ${id} has been successfully deleted.`;
      } catch (error) {
        throw error;
      } finally {
        conn.close();
      }
    }
  };
  
//Namespace
const deficiencyController = {
    createDeficiency,
    readDeficiency,
    updateDeficiency,
    deleteDeficiency
};

export default deficiencyController;