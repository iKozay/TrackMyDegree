// src/controllers/adminController.ts

import { Request, Response, NextFunction } from 'express';
import Database from '@controllers/DBController/DBController'; // Your database connection utility
import { 
    TableListResponse, 
    TableName, 
    TableRecordsResponse, 
    GetTableRecordsRequest, 
    StandardResponse, 
    TableRecord 
} from '@controllers/adminController/admin_types';

/**
 * Fetches the list of all tables in the database.
 */
export const getTables = async (req: Request, res: Response<StandardResponse>, next: NextFunction): Promise<void> => {
    try {
        const pool = await Database.getConnection();
        // console.log(pool);
        if (!pool) {
            res.status(500).json({ success: false, message: 'Database connection failed' });
            return;
        }

        // console.log(process.env.DB_DATABASE);

        const query = `
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_TYPE = 'BASE TABLE' 
              AND TABLE_CATALOG = '${process.env.SQL_SERVER_DATABASE}'
        `;

        const result = await pool.request().query(query);

        const tables: TableListResponse = result.recordset.map((row: { TABLE_NAME: string }) => row.TABLE_NAME);

        res.status(200).json({ success: true, data: tables });
    } catch (error) {
        console.error('Error fetching tables:', error);
        res.status(500).json({ success: false, message: 'Error fetching tables', data: error });
    }
};

/**
 * Fetches records from a specific table with optional keyword filtering.
 */
export const getTableRecords = async (req: GetTableRecordsRequest, res: Response<StandardResponse>, next: NextFunction): Promise<void> => {
    const { tableName } = req.params;
    const { keyword } = req.query;

    try {
        const pool = await Database.getConnection();
        if (!pool) {
            res.status(500).json({ success: false, message: 'Database connection failed' });
            return;
        }

        let query = `SELECT * FROM [${tableName}]`;

        if (keyword) {
            // Fetch columns that are text-based for keyword search
            const columnsResult = await pool.request().query(`
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_NAME = '${tableName}' 
                  AND DATA_TYPE IN ('varchar', 'nvarchar', 'text', 'char')
            `);

            const columns: string[] = columnsResult.recordset.map((row: { COLUMN_NAME: string }) => row.COLUMN_NAME);

            if (columns.length > 0) {
                const whereClauses = columns.map(col => `[${col}] LIKE '%${keyword}%'`);
                query += ` WHERE ${whereClauses.join(' OR ')}`;
            }
        }

        const result = await pool.request().query(query);

        const records: TableRecordsResponse = result.recordset as TableRecord[];

        res.status(200).json({ success: true, data: records });
    } catch (error) {
        console.error('Error fetching table records:', error);
        res.status(500).json({ success: false, message: 'Error fetching records from table', data: error });
    }
};
