import Database     from "@controllers/DBController/DBController"
//types import
import Auth         from "@controllers/authController/auth_types"
import { ConnectionPool } from "mssql";

const log = console.log;


//Functions
async function authenticate(email: string, password: string): Promise<Auth.Credentials | undefined>{
  const authConn = await Database.getConnection();
  
  if(undefined !== authConn){
    try {
      const result = await authConn.request()
      .input('email'   , Database.msSQL.VarChar, email   )
      .input('password', Database.msSQL.VarChar, password)
      .query('SELECT * FROM AppUser WHERE email = @email AND password = @password');
  
      if((undefined) === (result.recordset)){
        log("Incorrect email or password", email, password);
      }
      else{
        return { email: email, password: password };
      }
    } 
    catch (error) {
      log(`email:${email}   $Password:${password}`);
      log("Error in login\n", error);
    }
  }

}


//Namespace
const authController = {
  authenticate
};


//Default export
export default authController;