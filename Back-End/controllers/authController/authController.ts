import Database from "@controllers/DBController/DBController"
import { randomUUID } from "crypto"
//types import
import Auth from "@controllers/authController/auth_types"
import bcrypt from 'bcryptjs';


const log = console.log;


/**
 * Authenticates a user by verifying their email and password.
 *
 * @param {string} email - The email of the user attempting to log in.
 * @param {string} password - The plaintext password provided by the user.
 * @returns {Promise<Auth.UserInfo | undefined>} - The authenticated user object if credentials are correct, otherwise undefined.
 */
async function authenticate(email: string, password: string): Promise<Auth.UserInfo | undefined> {
  const authConn = await Database.getConnection();

  if (authConn) {
    try {
      // Step 1: Query the database for the user by email only
      const result = await authConn.request()
        .input('email', Database.msSQL.VarChar, email)
        .query('SELECT * FROM AppUser WHERE email = @email');

      // Step 2: Check if user exists and if the password matches
      if (result.recordset && result.recordset.length > 0) {
        const user = result.recordset[0];

        // Compare the plain-text password with the stored hashed password
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (isPasswordValid) {
          return user; // Authentication successful
        } else {
          log("Incorrect email or password", email, password);
        }
      } else {
        log("User not found", email);
      }
    }
    catch (error) {
      log("Error in login\n", error);
    }
  }

  return undefined;
}

async function registerUser(userInfo: Auth.UserInfo)
  : Promise<{ id: string } | undefined> {

  const authConn = await Database.getConnection();

  if ((undefined) !== (authConn)) {
    const { email,
      password,
      fullname,
      type } = userInfo;
    const id = randomUUID();

    try {
      const result = await authConn.request()
        .input('id', Database.msSQL.VarChar, id)
        .input('email', Database.msSQL.VarChar, email)
        .input('password', Database.msSQL.VarChar, password)
        .input('fullname', Database.msSQL.VarChar, fullname)
        .input('type', Database.msSQL.VarChar, type)
        .query('INSERT INTO AppUser ( id,  email,  password,  fullname,  type) \
              OUTPUT INSERTED.*                                         \
                          VALUES  (@id, @email, @password, @fullname, @type)');

      if ((undefined) === (result.recordset)) {
        log("Error inserting record ", result.recordset);
      }
      else {
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