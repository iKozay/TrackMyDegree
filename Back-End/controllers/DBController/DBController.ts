import msSQL                  from 'mssql'
import SQL                    from '@controllers/DBController/DB_types'


// Configure the connection
const sqlConfig: SQL.Config = {
  user      : process.env.SQL_SERVER_USER,
  password  : process.env.SQL_SERVER_PASSWORD,
  database  : process.env.SQL_SERVER_DATABASE,
  server    : process.env.SQL_SERVER_HOST,
  options   : {
                encrypt                 : true, // for Azure SQL
                trustServerCertificate  : true, // change to true for local dev/self-signed certs
              },
};


//Functions

/**
 * Get connection obj to database
 * @returns A promise of a msSQL ConnectionPool object, or throws an error
 */
async function getConnection(): Promise<msSQL.ConnectionPool> {
  try {
    const pool = await msSQL.connect(sqlConfig);
    console.log("Connected to SQL Server successfully!");
    return pool;
  } 
  catch (error) {
    console.error("Database connection failed:", error);
    throw error;
  }
}


//Default export
const DBController = {
  getConnection
};

export default DBController;
