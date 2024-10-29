// backend/db.js
const sql = require('mssql');

// Configure the connection
const sqlConfig = {
    user: process.env.SQL_SERVER_USER,
    password: process.env.SQL_SERVER_PASSWORD,
    database: process.env.SQL_SERVER_DATABASE,
    server: process.env.SQL_SERVER_HOST,
    options: {
        encrypt: true, // for Azure SQL
        trustServerCertificate: true, // change to true for local dev/self-signed certs
    },
};

async function connectToDatabase() {
    try {
        const pool = await sql.connect(sqlConfig);
        console.log("Connected to SQL Server successfully!");
        return pool;
    } catch (error) {
        console.error("Database connection failed:", error);
        throw error;
    }
}

module.exports = { connectToDatabase };
