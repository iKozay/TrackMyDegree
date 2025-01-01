import Database from "@controllers/DBController/DBController"
import appUserTypes from "@controllers/appUserController/appUser_types"

async function createAppUser (id: string, email: string, password: string, firstname: string, lastname: string, degree: string, type: appUserTypes.UserType):  Promise<string | undefined> {
  const conn = await Database.getConnection();

    if(conn){
        try {
            // Check if a appUser with the same id already exists
            const existingAppUser = await conn.request()
            .input('id', Database.msSQL.VarChar, id)
            .query('SELECT * FROM AppUser WHERE id = @id');
        
            if (existingAppUser.recordset.length > 0) {
              throw new Error('AppUser with this id already exists.');
            }
        
            await conn.request()
            .input('id', Database.msSQL.VarChar, id)
            .input('email', Database.msSQL.VarChar, email)
            .input('password', Database.msSQL.VarChar, password)
            .input('firstname', Database.msSQL.VarChar, firstname)
            .input('lastname', Database.msSQL.VarChar, lastname)
            .input('degree', Database.msSQL.VarChar, degree)
            .input('type', Database.msSQL.VarChar, type)
            .query('INSERT INTO AppUser (id, email, password, firstname, lastname, degree, type) VALUES (?, ?, ?, ?, ?, ?, ?)');

            return `appUser with id: ${id} is created, role: ${type}`;
          } catch (error) {
            throw error;
          } finally {
            conn.close()
          }
    }
};


async function readAppUser (id: string):  Promise<appUserTypes.AppUser | undefined> {
    const conn = await Database.getConnection();
    
      if(conn){
          try {
              // Check if a appUser with the id exists
              const appUser = await conn.request()
              .input('id', Database.msSQL.VarChar, id)
              .query('SELECT * FROM AppUser WHERE id = @id');
          
              if (appUser.recordset.length === 0) {
                throw new Error('AppUser with this id does not exist.');
              }
          
              return appUser.recordset[0];
            } catch (error) {
              throw error;
            } finally {
              conn.close();
            }
      }
  };


  async function updateAppUser(
        id: string, 
        email: string, 
        password: string, 
        firstname: string, 
        lastname: string, 
        degree: string, 
        type: appUserTypes.UserType
): Promise<appUserTypes.AppUser | undefined> {

    const conn = await Database.getConnection();
  
    if (conn) {
      try {
        // Check if a appUser with the id exists
        const appUser = await conn
          .request()
          .input('id', Database.msSQL.VarChar, id)
          .query('SELECT * FROM AppUser WHERE id = @id');
  
        if (appUser.recordset.length === 0) {
          throw new Error('AppUser with this id does not exist.');
        }
  
        // Update the appUser with the new name and totalCredits
        await conn
          .request()
          .input('id', Database.msSQL.VarChar, id)
          .input('email', Database.msSQL.VarChar, email)
          .input('password', Database.msSQL.VarChar, password)
          .input('firstname', Database.msSQL.VarChar, firstname)
          .input('lastname', Database.msSQL.VarChar, lastname)
          .input('degree', Database.msSQL.VarChar, degree)
          .input('type', Database.msSQL.VarChar, type)
          .query(
            `UPDATE AppUser 
            SET email = @email, 
                password = @password, 
                firstname = @firstname, 
                lastname = @lastname, 
                degree = @degree, 
                type = @type 
            WHERE id = @id`
          );
  
        // Return the updated appUser
        const updatedAppUser = await conn
          .request()
          .input('id', Database.msSQL.VarChar, id)
          .query('SELECT * FROM AppUser WHERE id = @id');
  
        return updatedAppUser.recordset[0];
      } catch (error) {
        throw error;
      } finally {
        conn.close();
      }
    }
  }
  
  async function deleteAppUser(id: string): Promise<string | undefined> {
    const conn = await Database.getConnection();
  
    if (conn) {
      try {
        // Check if a AppUser with the given id exists
        const appUser = await conn
          .request()
          .input('id', Database.msSQL.VarChar, id)
          .query('SELECT * FROM AppUser WHERE id = @id');
  
        if (appUser.recordset.length === 0) {
          throw new Error('AppUser with this id does not exist.');
        }
  
        // Delete the AppUser
        await conn
          .request()
          .input('id', Database.msSQL.VarChar, id)
          .query('DELETE FROM AppUser WHERE id = @id');
  
        // Return success message
        return `AppUser with id ${id} has been successfully deleted.`;
      } catch (error) {
        throw error;
      } finally {
        conn.close();
      }
    }
  };
  
//Namespace
const appUserController = {
    createAppUser,
    readAppUser,
    updateAppUser,
    deleteAppUser
};

export default appUserController;