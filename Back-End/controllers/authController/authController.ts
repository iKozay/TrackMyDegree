import Database         from "@controllers/DBController/DBController"
import { randomUUID }   from "crypto"
//types import
import Auth             from "@controllers/authController/auth_types"

const log = console.log;


//Functions
async function authenticate(email: string, password: string)
: Promise<Auth.UserInfo | undefined>{
  const authConn = await Database.getConnection();
  
  if((undefined) !== (authConn)){
    try {
      const result = await authConn.request()
      .input('email'   , Database.msSQL.VarChar, email   )
      .input('password', Database.msSQL.VarChar, password)
      .query('SELECT * FROM AppUser WHERE email = @email AND password = @password');
  
      if((undefined) === (result.recordset)){
        log("Incorrect email or password", email, password);
      }
      else{
        return result.recordset[0];
      }
    } 
    catch (error) {
      log("Error in login\n", error);
    }
  }

}

async function registerUser(userInfo: Auth.UserInfo)
: Promise<{id: string} | undefined> {

  const authConn = await Database.getConnection();

  if((undefined) !== (authConn)){
    const { email, 
            password, 
            fullname, 
            type } = userInfo;
    const   id     = randomUUID();

    try {
      const result = await authConn.request()
      .input('id'       , Database.msSQL.VarChar, id)
      .input('email'    , Database.msSQL.VarChar, email)
      .input('password' , Database.msSQL.VarChar, password)
      .input('name'     , Database.msSQL.VarChar, fullname)
      .input('type'     , Database.msSQL.VarChar, type)
      .query('INSERT INTO AppUser ( id,  email,  password,  name,  type) \
              OUTPUT INSERTED.id                                         \
                          VALUES  (@id, @email, @password, @name, @type)');
  
      if((undefined) === (result.recordset)){
        log("Error inserting record ", result.recordset);
      }
      else{
        return result.recordset[0];
      }
    } 
    catch (error) {
      log("Error in Sign Up\n", error);
    }
  }
}

//Namespace
const authController = {
  authenticate,
  registerUser
};


//Default export
export default authController;