// src/types/adminTypes.ts

/**
 * Represents the structure of the JSON response body.
 */
export interface StandardResponse {
  success: boolean;
  message?: string;
  data?: any;
}

/**
 * Represents the name of a database table.
 */
export type TableName = string;

/**
 * Represents a list of table names.
 */
export type TableListResponse = TableName[];

/**
 * Represents a single record from a database table.
 */
export interface TableRecord {
  [column: string]: string | number | boolean | null;
}

/**
 * Represents a list of records from a table.
 */
export type TableRecordsResponse = TableRecord[];

/**
 * Extends the Express Request interface for fetching table records.
 */
import { Request } from 'express';

export interface GetTableRecordsRequest
  extends Request<
    { tableName: string }, // Route parameters
    any, // Response body (not used here)
    any, // Request body (not used here)
    { keyword?: string } // Query parameters
  > {}
