/**
 * Purpose:
 *  - Central place to configure and manage the SQL Server database connection.
 *  - Exports a getConnection helper that other controllers call to interact with the DB.
 *  - wraps around the `mssql` library and reads credentials from environment variables.
 * Notes:
 *  - Uses dotenv to load environment variables (SQL_SERVER_USER, PASSWORD, etc.)
 *  - Errors are logged to console and captured by Sentry for monitoring.
 *  - Connection options are set up for both Azure SQL (encrypt: true) and local dev (trustServerCertificate).
 */

import msSQL from 'mssql';
import SQL from '@controllers/DBController/DB_types';
import dotenv from 'dotenv';
import * as Sentry from '@sentry/node';
import fs from 'fs';

dotenv.config(); // load environment variables from .env file

let sqlPassword = process.env.SQL_SERVER_PASSWORD; // default to env var for backward compatibility
// if docker secret file is provided, read the password from there
if (process.env.SQL_SERVER_PASSWORD_FILE) {
  try {
    sqlPassword = fs
      .readFileSync(process.env.SQL_SERVER_PASSWORD_FILE, 'utf-8')
      .trim();
  } catch (e) {
    console.error('Error reading SQL_SERVER_PASSWORD_FILE:', e);
  }
}
// Database connection configuration
const sqlConfig: SQL.Config = {
  user: process.env.SQL_SERVER_USER || '',
  password: sqlPassword || '',
  database: process.env.SQL_SERVER_DATABASE || '',
  server: process.env.SQL_SERVER_HOST || '',
  options: {
    encrypt: true, // for Azure SQL
    trustServerCertificate: true, // change to true for local dev/self-signed certs
    requestTimeout: 30000, // 30 seconds
  },
};

/**
 * Establish connection to the SQL Server database
 * @returns A promise of a msSQL ConnectionPool object, or throws an error with undefined
 */
async function getConnection(): Promise<msSQL.ConnectionPool | undefined> {
  try {
    const pool = await msSQL.connect(sqlConfig);
    console.log('Connected to SQL Server successfully!');
    return pool;
  } catch (error) {
    // these below logs to both Sentry and console for debugging and monitoring
    Sentry.captureException({ error: 'Database connection failed:' });
    console.error('Database connection failed:', error);
  }
}

// Export the controller object, containing:
// - the raw msSQL library
// - the helper to establish DB connections
const DBController = {
  msSQL,
  getConnection,
};

export default DBController;
