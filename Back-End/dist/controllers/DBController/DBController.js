"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mssql_1 = __importDefault(require("mssql"));
const dotenv_1 = __importDefault(require("dotenv"));
const Sentry = __importStar(require("@sentry/node"));
const fs_1 = __importDefault(require("fs"));
dotenv_1.default.config(); // load environment variables from .env file
let sqlPassword = process.env.SQL_SERVER_PASSWORD; // default to env var for backward compatibility
// if docker secret file is provided, read the password from there
if (process.env.SQL_SERVER_PASSWORD_FILE) {
    try {
        sqlPassword = fs_1.default
            .readFileSync(process.env.SQL_SERVER_PASSWORD_FILE, 'utf-8')
            .trim();
    }
    catch (e) {
        console.error('Error reading SQL_SERVER_PASSWORD_FILE:', e);
    }
}
// Database connection configuration
const sqlConfig = {
    user: process.env.SQL_SERVER_USER,
    password: sqlPassword,
    database: process.env.SQL_SERVER_DATABASE,
    server: process.env.SQL_SERVER_HOST,
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
async function getConnection() {
    try {
        const pool = await mssql_1.default.connect(sqlConfig);
        console.log('Connected to SQL Server successfully!');
        return pool;
    }
    catch (error) {
        // these below logs to both Sentry and console for debugging and monitoring
        Sentry.captureException({ error: 'Database connection failed:' });
        console.error('Database connection failed:', error);
    }
}
// Export the controller object, containing:
// - the raw msSQL library
// - the helper to establish DB connections
const DBController = {
    msSQL: mssql_1.default,
    getConnection,
};
exports.default = DBController;
//# sourceMappingURL=DBController.js.map