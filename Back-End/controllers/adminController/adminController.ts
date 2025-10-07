// src/controllers/adminController.ts

/**
 * This controller handles all the admin-facing database operations such as
 * - Creating JSON backups of key tables
 * - Listing, restoring, and deleting backups
 * - Seeding the DB with requirement + course data
 * - Utility endpoints for fetching tables and records
 * The idea here is to give admins tools to snapshot the DB state,
 * roll back if needed, and keep course/degree data fresh
 */

import { Request, Response, NextFunction } from 'express';
import Database from '@controllers/DBController/DBController'; // Your database connection utility
import {
  TableListResponse,
  TableRecordsResponse,
  GetTableRecordsRequest,
  StandardResponse,
  TableRecord,
} from '@controllers/adminController/admin_types';

import fs from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'path';
import * as sql from 'mssql';
import 'dotenv/config';
import { readdir } from 'fs/promises';
import * as Sentry from '@sentry/node';

// only tables we actually backup or restore
// restricted on purpose to avoid wiping out unrelated DB state
const allowedTables = [
  'AppUser',
  'Timeline',
  'TimelineItems',
  'TimelineItemXCourses',
  'Feedback',
];

/**
 * below is the reverse order well delete tables in when restoring
 * because oforeign key constraints. Delete child tables first,
 * to avoid errors from parent references.
 */
const allTablesReversed = [
  'Feedback',
  'Exemption',
  'Deficiency',
  'TimelineItemXCourses',
  'TimelineItems',
  'Timeline',
  'AppUser',
  'CourseXCoursePool',
  'DegreeXCoursePool',
  'CoursePool',
  'Requisite',
  'Course',
  'Degree',
];

// helper to resolve where backups should be stored. Falls back to ./backups if no env var is provided.
const getBackupDir = (): string => {
  return process.env.BACKUP_DIR || path.join(__dirname, '../../backups');
};

/**
 * Create a full JSON backup of all allowed tables. Each tables data dumped into one big JSON file with timestamp.
 */
export const createBackup = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const pool = await Database.getConnection();
    if (!pool) {
      res
        .status(500)
        .json({ success: false, message: 'Database connection failed' });
      return;
    }
    // Query to get all table names in the current database
    const tableQuery = `
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE' 
        AND TABLE_CATALOG = '${process.env.SQL_SERVER_DATABASE}'
        AND TABLE_NAME IN (${allowedTables.map((t) => `'${t}'`).join(',')})
    `;
    const tableResult = await pool.request().query(tableQuery);
    const tables: string[] = tableResult.recordset.map(
      (row: { TABLE_NAME: string }) => row.TABLE_NAME,
    );

    // Create an object mapping table names to their records
    const backupData: Record<string, any[]> = {};
    for (const tableName of tables) {
      const result = await pool.request().query(`SELECT * FROM [${tableName}]`);
      backupData[tableName] = result.recordset;
    }

    // Generate a backup filename with a timestamp (replace colons and dots)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `backup-${timestamp}.json`;
    const backupDir = getBackupDir();

    // Ensure the backup directory exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const backupFilePath = path.join(backupDir, backupFileName);

    // Write backup data as pretty-printed JSON
    await fsPromises.writeFile(
      backupFilePath,
      JSON.stringify(backupData, null, 2),
      'utf-8',
    );

    res.status(200).json({
      success: true,
      message: 'Backup created successfully',
      data: backupFileName,
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error creating backup:', error);
    res
      .status(500)
      .json({ success: false, message: 'Error creating backup', data: error });
  }
};

/**
 * Lists the available backup files from the backup directory.
 */
export const listBackups = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const backupDir = getBackupDir();
    // If the backup directory doesn't exist, return an empty list
    if (!fs.existsSync(backupDir)) {
      res.status(200).json({ success: true, data: [] });
      return;
    }
    const files = await fsPromises.readdir(backupDir);
    // Filter to include only .json files
    const backups = files.filter((file) => file.endsWith('.json'));
    res.status(200).json({ success: true, data: backups });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error listing backups:', error);
    res
      .status(500)
      .json({ success: false, message: 'Error listing backups', data: error });
  }
};

/**
 * Restores the database from the backup file.
 * This function reads the JSON backup file, then for each table:
 * 1. Deletes all records.
 * 2. Inserts the backed-up records.
 * All insertions are wrapped in a transaction.
 */
export const restoreBackup = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { backupName } = req.body;
    if (!backupName) {
      res
        .status(400)
        .json({ success: false, message: 'Backup name is required' });
      return;
    }
    const backupDir = getBackupDir();
    const backupFilePath = path.join(backupDir, backupName);
    if (!fs.existsSync(backupFilePath)) {
      res
        .status(404)
        .json({ success: false, message: 'Backup file not found' });
      return;
    }
    const backupContent = await fsPromises.readFile(backupFilePath, 'utf-8');
    const backupData = JSON.parse(backupContent);

    // Filter backupData to only include allowed tables
    const filteredBackupData: Record<string, any[]> = {};
    for (const tableName of Object.keys(backupData)) {
      if (allowedTables.includes(tableName)) {
        filteredBackupData[tableName] = backupData[tableName];
      }
    }

    const pool = await Database.getConnection();
    if (!pool) {
      res
        .status(500)
        .json({ success: false, message: 'Database connection failed' });
      return;
    }

    // ========================================================
    // Step 1: Delete records from ALL allowed tables in reverse order
    // ========================================================
    const deletionTx = pool.transaction();
    await deletionTx.begin();
    try {
      for (const tableName of allTablesReversed) {
        await deletionTx.request().query(`DELETE FROM [${tableName}]`);
      }
      await deletionTx.commit();
      console.log('Allowed tables deleted successfully.');
    } catch (deleteError) {
      await deletionTx.rollback();
      throw deleteError;
    }

    // ========================================================
    // Step 2: Reseed the database using seedSoenDegree function
    // ========================================================
    console.log('Reseeding database...');
    await seedSoenDegree();
    console.log('Database reseeded successfully.');

    const newPool = await Database.getConnection();
    if (!newPool) {
      res
        .status(500)
        .json({ success: false, message: 'Database connection failed' });
      return;
    }

    // ========================================================
    // Step 3: Insert backup data into allowed tables
    // ========================================================
    const insertTx = newPool.transaction();
    await insertTx.begin();
    try {
      for (const tableName of Object.keys(filteredBackupData)) {
        // Delete any leftover records (just in case)
        await insertTx.request().query(`DELETE FROM [${tableName}]`);
        const records: any[] = filteredBackupData[tableName];
        if (records.length === 0) continue;
        for (const record of records) {
          const columns = Object.keys(record);
          const values = columns.map((col) => record[col]);
          const columnsJoined = columns.map((col) => `[${col}]`).join(', ');
          const placeholders = columns.map((_, idx) => `@p${idx}`).join(', ');
          const insertRequest = insertTx.request();
          columns.forEach((col, idx) => {
            insertRequest.input(`p${idx}`, values[idx]);
          });

          try {
            await insertRequest.query(
              `INSERT INTO [${tableName}] (${columnsJoined}) VALUES (${placeholders})`,
            );
          } catch (error) {
            if (error instanceof Error && error.message.includes('FOREIGN KEY constraint')) {
              console.error(
                `Foreign key constraint error while inserting into table "${tableName}". Record:`,
                record,
              );
            }
            throw error;
          }
        }
      }
      await insertTx.commit();
      console.log('Backup data inserted successfully.');
      res
        .status(200)
        .json({ success: true, message: 'Database restored successfully' });
    } catch (insertError) {
      await insertTx.rollback();
      throw insertError;
    }
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error restoring backup:', error);
    res
      .status(500)
      .json({ success: false, message: 'Error restoring backup', data: error });
  }
};

/**
 * Deletes a backup file from the backup directory.
 */
export const deleteBackup = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { backupName } = req.body;
    if (!backupName) {
      res
        .status(400)
        .json({ success: false, message: 'Backup name is required' });
      return;
    }
    const backupDir = getBackupDir();
    const backupFilePath = path.join(backupDir, backupName);
    if (!fs.existsSync(backupFilePath)) {
      res
        .status(404)
        .json({ success: false, message: 'Backup file not found' });
      return;
    }
    await fsPromises.unlink(backupFilePath);
    res
      .status(200)
      .json({ success: true, message: 'Backup deleted successfully' });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error deleting backup:', error);
    res
      .status(500)
      .json({ success: false, message: 'Error deleting backup', data: error });
  }
};

// Admin Utilities 

/**
 * Fetches the list of all tables in the database.
 */
export const getTables = async (
  req: Request,
  res: Response<StandardResponse>,
  next: NextFunction,
): Promise<void> => {
  try {
    const pool = await Database.getConnection();
    if (!pool) {
      res
        .status(500)
        .json({ success: false, message: 'Database connection failed' });
      return;
    }

    const query = `
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE' 
        AND TABLE_CATALOG = '${process.env.SQL_SERVER_DATABASE}'
    `;

    const result = await pool.request().query(query);
    const tables: TableListResponse = result.recordset.map(
      (row: { TABLE_NAME: string }) => row.TABLE_NAME,
    );
    res.status(200).json({ success: true, data: tables });
  } catch (error) {
    console.error('Error fetching tables:', error);
    res
      .status(500)
      .json({ success: false, message: 'Error fetching tables', data: error });
  }
};

/**
 * Fetches records from a specific table with optional keyword filtering.
 */
export const getTableRecords = async (
  req: GetTableRecordsRequest,
  res: Response<StandardResponse>,
  next: NextFunction,
): Promise<void> => {
  const { tableName } = req.params;
  const { keyword } = req.query;

  try {
    const pool = await Database.getConnection();
    if (!pool) {
      res
        .status(500)
        .json({ success: false, message: 'Database connection failed' });
      Sentry.captureException({ error: 'Database connection failed' });
      return;
    }

    let query = `SELECT * FROM [${tableName}]`;
    if (keyword) {
      // Fetch text-based columns for keyword search
      const columnsResult = await pool.request().query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = '${tableName}' 
          AND DATA_TYPE IN ('varchar', 'nvarchar', 'text', 'char')
      `);
      const columns: string[] = columnsResult.recordset.map(
        (row: { COLUMN_NAME: string }) => row.COLUMN_NAME,
      );
      if (columns.length > 0) {
        const whereClauses = columns.map(
          (col) => `[${col}] LIKE '%${keyword}%'`,
        );
        query += ` WHERE ${whereClauses.join(' OR ')}`;
      }
    }
    const result = await pool.request().query(query);
    const records: TableRecordsResponse = result.recordset as TableRecord[];
    res.status(200).json({ success: true, data: records });
  } catch (error) {
    Sentry.captureException({ error: 'Error fetching table records' });
    console.error('Error fetching table records:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching records from table',
      data: error,
    });
  }
};

let dbPassword = process.env.DB_PASSWORD; // default to env var for backward compatibility
// if docker secret file is provided, read the password from there
if (process.env.SQL_SERVER_PASSWORD_FILE) {
  try {
    dbPassword = fs.readFileSync(process.env.SQL_SERVER_PASSWORD_FILE, 'utf-8').trim();
    } catch (e) {
      console.error('Error reading dbPassword from file:', e);
  }
}

const dbConfig: sql.config = {
  user: process.env.DB_USER,
  password: dbPassword,
  database: process.env.DB_NAME,
  server: process.env.DB_HOST || 'localhost',
  options: {
    trustServerCertificate: true,
  },
};

// -------------------------------------
// 2) Data Interfaces
// -------------------------------------
interface Requirement {
  poolId: string; // e.g., "engineering-core"
  poolName: string; // e.g., "Engineering Core (30.5 credits)"
  creditsRequired: number; // e.g., 30.5
  courseCodes: string[]; // e.g., ["ELEC275", "ENCS282", ...]
}

interface DegreeData {
  degreeId: string;
  degreeName: string;
  totalCredits: number;
  requirements: Requirement[];
  isAddon: boolean;
}

// Requisite Interface
interface Requisite {
  code1: string; // Course code that has the requisite
  code2?: string; // Prerequisite course code (optional for credit-based)
  type: 'pre' | 'co';
  groupId?: string; // Identifier for groups of alternative requisites
  creditsRequired?: number; // Number of credits required (optional for credit-based)
}

// CourseJson Interface
interface CourseJson {
  title: string; // e.g., "ENGR 201 Professional Practice and Responsibility (1.5 credits)"
  credits?: number; // e.g., 1.5
  description?: string;
  prerequisites?: string; // e.g., "COMP 248, MATH 201" or "COMP 248/MATH 201"
  corequisites?: string; // e.g., "MATH 203" or "MATH 203/ENGR 300"
  offeredIn?: string[]; // e.g., ["Fall", "Winter"]
  // ... more if needed
}

// -------------------------------------
// 3) Parse the Requirements Text File
// -------------------------------------
/**
 * Parses a plaintext degree requirements file into a structured object.
 * and returns a full DegreeData object with requirements array
 */
function parseRequirementsFile(filePath: string): DegreeData {
  const text = fs.readFileSync(filePath, 'utf-8');
  const lines = text.split('\n').map((l) => l.trim());

  let degreeId = '';
  let degreeName = '';
  let totalCredits = 120;
  let isAddon = false;
  const requirements: Requirement[] = [];
  let currentPoolName = '';
  let currentCredits = 0;
  let currentCourseCodes: string[] = [];

  function pushCurrentPool() {
    if (currentPoolName) {
      // Prefix poolName with degreeId to ensure uniqueness
      const uniquePoolName = `${degreeId} - ${currentPoolName}`;
      requirements.push({
        poolId: uniquePoolName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/-credits/g, ''),
        poolName: uniquePoolName,
        creditsRequired: currentCredits,
        courseCodes: currentCourseCodes.filter((cc) => cc),
      });
    }
  }

  for (const line of lines) {
    if (!line || line.startsWith('#')) continue;
    if (line.includes('DegreeID=')) {
      degreeId = line.split('=')[1].trim();
      continue;
    }
    if (line.includes('DegreeName=')) {
      degreeName = line.split('=')[1].trim();
      continue;
    }
    if (line.includes('TotalCredits=')) {
      totalCredits = parseFloat(line.split('=')[1].trim());
      continue;
    }
    if (line.includes('Addon')) {
      isAddon = true;
      continue;
    }
    const bracketMatch = line.match(/^\[(.*)\]$/);
    if (bracketMatch) {
      pushCurrentPool();
      currentPoolName = bracketMatch[1];
      currentCourseCodes = [];
      const creditsMatch = currentPoolName.match(/\(([\d\.]+)\s*credits?\)/i);
      currentCredits = creditsMatch ? parseFloat(creditsMatch[1]) : 0;
      continue;
    }
    currentCourseCodes.push(line);
  }
  pushCurrentPool();
  return { degreeId, degreeName, totalCredits, requirements, isAddon };
}

// -------------------------------------
// 4) Parse the JSON (Course Data)
// -------------------------------------
/**
 * Loads every course JSON file in the given directory (recursively)
 * and warns if duplicates are found
 */
function loadAllCourseJsons(dirPath: string): Map<string, CourseJson> {
  const courseMap = new Map<string, CourseJson>();
  function recurseDirectory(currentPath: string) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        recurseDirectory(fullPath);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.json')) {
        try {
          const raw = fs.readFileSync(fullPath, 'utf-8');
          const data: CourseJson[] = JSON.parse(raw);
          for (const c of data) {
            const code = extractCodeFromTitle(c.title).toUpperCase();
            if (courseMap.has(code)) {
              console.warn(
                `Warning: Duplicate course code "${code}" found in file ${fullPath}. Overwriting previous entry.`,
              );
            }
            courseMap.set(code, c);
          }
        } catch (err) {
          Sentry.captureException({
            error: `Error parsing JSON file: ${fullPath}`,
          });
          console.error(`Error parsing JSON file: ${fullPath}`, err);
        }
      }
    }
  }
  recurseDirectory(dirPath);
  return courseMap;
}

function extractCodeFromTitle(title: string): string {
  const match = title.match(/^([A-Z]{2,4})\s*(\d{3})/);
  if (!match) throw new Error(`Invalid course title format: "${title}"`);
  return `${match[1]}${match[2]}`.toUpperCase();
}


// this validates loaded courses mainly by format checks on titles
function validateCourseData(courseMap: Map<string, CourseJson>): void {
  for (const [code, courseData] of courseMap.entries()) {
    if (!/^[A-Z]{2,4}\s*\d{3}/.test(courseData.title)) {
      console.warn(
        `Course "${code}" has an invalid title format: "${courseData.title}"`,
      );
    }
    ['pre', 'co'].forEach((field) => {
      const requisiteStr = courseData[field as keyof CourseJson];
      if (requisiteStr && typeof requisiteStr !== 'string') {
        console.warn(
          `Course "${code}" has a non-string ${field}:`,
          requisiteStr,
        );
      }
    });
  }
}

// -------------------------------------
// 5) Upsert Helpers (SQL Statements)
// -------------------------------------
/**
 * basically insert rows if they don’t exist, or update them if they do.
 * this have been used  for:
 *   - Degrees
 *   - CoursePools
 *   - Courses
 *   - DegreeXCoursePool
 *   - CourseXCoursePool
 *   - Requisites
 */

// they use this to generate the next incremental ID for a table using a prefix.
async function generateNextId(
  t: sql.Transaction,
  tableName: string,
  prefix: string,
): Promise<string> {
  const request = new sql.Request(t);
  const query = `
    SELECT MAX(CAST(SUBSTRING(id, LEN(@prefix) + 1, LEN(id)) AS INT)) AS MaxId
    FROM [${tableName}]
    WHERE id LIKE @prefix + '%'
  `;
  request.input('prefix', sql.VarChar, prefix);
  const result = await request.query(query);
  const maxId = result.recordset[0].MaxId;
  const nextIdNumber = (maxId !== null ? maxId : 0) + 1;
  return `${prefix}${nextIdNumber}`;
}

async function upsertDegree(
  t: sql.Transaction,
  id: string,
  name: string,
  totalCredits: number,
  isAddon: boolean,
): Promise<string> {
  const request = new sql.Request(t);
  request.input('id', sql.VarChar, id);
  request.input('name', sql.VarChar, name);
  request.input('totalCredits', sql.Float, totalCredits);
  request.input('isAddon', sql.Bit, isAddon);

  const result = await request.query('SELECT id FROM Degree WHERE id = @id');
  if (result.recordset.length === 0) {
    // Insert a new degree with the provided ID
    await request.query(`
      INSERT INTO Degree (id, name, totalCredits, isAddon)
      VALUES (@id, @name, @totalCredits, @isAddon)
    `);
    console.log(`Inserted Degree: ${name} with ID: ${id}`);
    return id;
  } else {
    // Update the existing degree
    await request.query(`
      UPDATE Degree
      SET name = @name, totalCredits = @totalCredits, isAddon = @isAddon
      WHERE id = @id
    `);
    console.log(`Updated Degree: ${name} with ID: ${id}`);
    return id;
  }
}

async function upsertCoursePool(
  t: sql.Transaction,
  poolName: string,
): Promise<string> {
  const request = new sql.Request(t);
  request.input('name', sql.VarChar, poolName);
  const result = await request.query(
    'SELECT id FROM CoursePool WHERE name = @name',
  );
  if (result.recordset.length === 0) {
    const newId = await generateNextId(t, 'CoursePool', 'CP');
    request.input('newId', sql.VarChar, newId);
    await request.query(`
      INSERT INTO CoursePool (id, name)
      VALUES (@newId, @name)
    `);
    console.log(`Inserted CoursePool: ${poolName} with ID: ${newId}`);
    return newId;
  } else {
    const poolId = result.recordset[0].id;
    console.log(`CoursePool already exists: ${poolName} with ID: ${poolId}`);
    return poolId;
  }
}

async function upsertCourse(
  t: sql.Transaction,
  code: string,
  title: string,
  credits: number,
  description: string,
  offeredIn: string,
): Promise<void> {
  const request = new sql.Request(t);
  request.input('code', sql.VarChar, code);
  request.input('title', sql.VarChar, title);
  request.input('credits', sql.Float, credits);
  request.input('description', sql.VarChar, description);
  request.input('offeredIn', sql.VarChar, offeredIn);
  const result = await request.query(
    'SELECT code FROM Course WHERE code = @code',
  );
  if (result.recordset.length === 0) {
    await request.query(`
      INSERT INTO Course (code, title, credits, description, offeredIn)
      VALUES (@code, @title, @credits, @description, @offeredIn)
    `);
    console.log(`Inserted Course: ${code}`);
  } else {
    await request.query(`
      UPDATE Course
      SET title = @title, credits = @credits, description = @description, offeredIn = @offeredIn
      WHERE code = @code
    `);
    console.log(`Updated Course: ${code}`);
  }
}

async function upsertDegreeXCoursePool(
  t: sql.Transaction,
  degreeId: string,
  poolId: string,
  creditsRequired: number,
): Promise<string> {
  const request = new sql.Request(t);
  request.input('degreeId', sql.VarChar, degreeId);
  request.input('poolId', sql.VarChar, poolId);
  request.input('creditsRequired', sql.Float, creditsRequired);
  const result = await request.query(`
    SELECT id FROM DegreeXCoursePool
    WHERE degree = @degreeId AND coursepool = @poolId
  `);
  if (result.recordset.length === 0) {
    const newId = await generateNextId(t, 'DegreeXCoursePool', 'DXCP');
    request.input('newId', sql.VarChar, newId);
    await request.query(`
      INSERT INTO DegreeXCoursePool (id, degree, coursepool, creditsRequired)
      VALUES (@newId, @degreeId, @poolId, @creditsRequired)
    `);
    console.log(`Inserted DegreeXCoursePool with ID: ${newId}`);
    return newId;
  } else {
    const dxcpId = result.recordset[0].id;
    request.input('id', sql.VarChar, dxcpId);
    await request.query(`
      UPDATE DegreeXCoursePool
      SET creditsRequired = @creditsRequired
      WHERE id = @id
    `);
    console.log(`Updated DegreeXCoursePool with ID: ${dxcpId}`);
    return dxcpId;
  }
}

async function upsertCourseXCoursePool(
  t: sql.Transaction,
  courseCode: string,
  poolId: string,
  groupId: string | null,
): Promise<string> {
  const request = new sql.Request(t);
  request.input('courseCode', sql.VarChar, courseCode);
  request.input('poolId', sql.VarChar, poolId);
  request.input('groupId', sql.VarChar, groupId);
  const result = await request.query(`
    SELECT id FROM CourseXCoursePool
    WHERE coursecode = @courseCode AND coursepool = @poolId AND 
          ((@groupId IS NULL AND groupId IS NULL) OR groupId = @groupId)
  `);
  if (result.recordset.length === 0) {
    const newId = await generateNextId(t, 'CourseXCoursePool', 'CXP');
    request.input('newId', sql.VarChar, newId);
    await request.query(`
      INSERT INTO CourseXCoursePool (id, coursecode, coursepool, groupId)
      VALUES (@newId, @courseCode, @poolId, @groupId)
    `);
    console.log(
      `Linked Course ${courseCode} to CoursePool ID: ${poolId}` +
      (groupId ? ` with groupId: ${groupId}` : ''),
    );
    return newId;
  } else {
    const cxcpId = result.recordset[0].id;
    console.log(
      `CourseXCoursePool already exists for Course ${courseCode} in Pool ID: ${poolId}` +
      (groupId ? ` with groupId: ${groupId}` : ''),
    );
    return cxcpId;
  }
}

async function upsertRequisite(
  t: sql.Transaction,
  requisite: Requisite,
): Promise<void> {
  const { code1, code2, type, groupId, creditsRequired } = requisite;
  const request = new sql.Request(t);
  request.input('code1', sql.VarChar, code1);
  request.input('type', sql.VarChar, type);
  if (creditsRequired !== undefined) {
    request.input('creditsRequired', sql.Float, creditsRequired);
  }
  if (code2) {
    request.input('code2', sql.VarChar, code2);
  }
  if (groupId) {
    request.input('group_id', sql.VarChar, groupId);
  }
  let whereClause = 'code1 = @code1 AND type = @type';
  if (creditsRequired !== undefined) {
    whereClause +=
      ' AND creditsRequired = @creditsRequired AND code2 IS NULL AND group_id IS NULL';
  } else if (code2) {
    whereClause += ' AND code2 = @code2';
    if (groupId) {
      whereClause += ' AND group_id = @group_id';
    } else {
      whereClause += ' AND group_id IS NULL';
    }
  }
  const result = await request.query(
    `SELECT id FROM Requisite WHERE ${whereClause}`,
  );
  if (result.recordset.length === 0) {
    const newId = await generateNextId(t, 'Requisite', 'R');
    request.input('newId', sql.VarChar, newId);
    await request.query(`
      INSERT INTO Requisite (id, code1, code2, type, group_id, creditsRequired)
      VALUES (
        @newId, 
        @code1, 
        ${creditsRequired !== undefined ? 'NULL' : code2 ? '@code2' : 'NULL'}, 
        @type, 
        ${creditsRequired !== undefined
        ? 'NULL'
        : groupId
          ? '@group_id'
          : 'NULL'
      }, 
        ${creditsRequired !== undefined ? '@creditsRequired' : 'NULL'}
      )
    `);
    console.log(
      `Inserted Requisite: ${code1}` +
      (code2
        ? ` -> ${code2}`
        : ` with Credits Required: ${creditsRequired}`) +
      ` (${type})` +
      (groupId ? ` Group ID: ${groupId}` : ''),
    );
  } else {
    console.log(
      `Requisite already exists: ${code1}` +
      (code2
        ? ` -> ${code2}`
        : ` with Credits Required: ${creditsRequired}`) +
      ` (${type})` +
      (groupId ? ` Group ID: ${groupId}` : ''),
    );
  }
}

async function getPoolIdByName(
  t: sql.Transaction,
  poolName: string,
): Promise<string> {
  const request = new sql.Request(t);
  request.input('name', sql.VarChar, poolName);
  const result = await request.query(
    'SELECT id FROM CoursePool WHERE name = @name',
  );
  if (result.recordset.length === 0) {
    throw new Error(`CoursePool with name "${poolName}" does not exist.`);
  }
  return result.recordset[0].id;
}

function generateGroupId(
  degreeId: string,
  poolId: string,
  groupNumber: number,
): string {
  return `${degreeId}-${poolId}-G${groupNumber}`;
}

// -------------------------------------
// 5) Parse Requisites Function
// -------------------------------------
let globalGroupCounter = 1;
function parseRequisites(
  code1: string,
  requisiteStr: string | undefined,
  type: 'pre' | 'co',
): Requisite[] {
  if (!requisiteStr) return [];
  if (typeof requisiteStr !== 'string') {
    console.warn(
      `Expected string for requisites but got ${typeof requisiteStr} for course ${code1}. Skipping.`,
    );
    return [];
  }
  const cleanedStr = requisiteStr.replace(/[;\.]/g, ',');
  const parts = cleanedStr
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const requisites: Requisite[] = [];
  for (const part of parts) {
    if (part.includes('/')) {
      const alternatives = part.split('/').map((c) => c.trim());
      const groupId = `G${globalGroupCounter++}`;
      for (const alt of alternatives) {
        const code = alt.replace(/\s+/g, '').toUpperCase();
        if (/^[A-Z]{2,4}\d{3}$/.test(code)) {
          requisites.push({ code1, code2: code, type, groupId });
        } else if (/^\d+CR$/i.test(code)) {
          requisites.push({
            code1,
            creditsRequired: parseFloat(code.replace(/CR/i, '')),
            type,
            groupId,
          });
        } else {
          console.warn(
            `Invalid course code or credit requirement "${code}" in requisites for course "${code1}". Skipping.`,
          );
        }
      }
    } else {
      const code = part.replace(/\s+/g, '').toUpperCase();
      if (/^[A-Z]{2,4}\d{3}$/.test(code)) {
        requisites.push({ code1, code2: code, type });
      } else if (/^\d+CR$/i.test(code)) {
        requisites.push({
          code1,
          creditsRequired: parseFloat(code.replace(/CR/i, '')),
          type,
        });
      } else {
        console.warn(
          `Invalid course code or credit requirement "${code}" in requisites for course "${code1}". Skipping.`,
        );
      }
    }
  }
  return requisites;
}

// -------------------------------------
// 6) Main Seed Function
// -------------------------------------
/**
 * main seeding function that
 * basically brings the DB up to date with what’s in course-data/.
 */
async function seedSoenDegree() {
  let transaction: sql.Transaction | null = null;
  let pool: sql.ConnectionPool | null = null;
  try {
    // 1. DEFINE PATHS
    const requirementsDir = path.join(
      __dirname,
      '../../course-data/degree-reqs',
    );
    const courseListsDir = path.join(
      __dirname,
      '../../course-data/course-lists/updated_courses',
    );

    // 2. READ ALL REQUIREMENT FILES
    const files = await readdir(requirementsDir);
    const requirementFiles = files.filter((file) => file.endsWith('.txt'));
    if (requirementFiles.length === 0) {
      console.warn('No requirement files found in the directory.');
      return;
    }

    // 3. LOAD ALL COURSE JSONS and VALIDATE
    const courseMap = loadAllCourseJsons(courseListsDir);
    validateCourseData(courseMap);

    // 5. CONNECT TO DATABASE
    console.log('[SEED] Connecting to DB...');
    pool = await sql.connect(dbConfig);
    const dbResult = await pool.request().query('SELECT DB_NAME() AS dbName');
    const connectedDbName = dbResult.recordset[0].dbName;
    console.log(`[SEED] Connected to database: ${connectedDbName}`);
    if (connectedDbName !== process.env.DB_NAME) {
      throw new Error(
        `Connected to incorrect database "${connectedDbName}". Expected "${process.env.DB_NAME}".`,
      );
    }

    // Phase 1: Upsert Courses and Requisites (only once)
    try {
      transaction = pool.transaction();
      await transaction.begin();
      // Upsert Courses
      for (const [code, courseData] of courseMap.entries()) {
        const cTitle = courseData.title;
        const cCredits = courseData.credits ?? 3;
        const cDesc = courseData.description ?? `No description for ${code}`;
        const cOfferedIn = courseData.offeredIn?.join(', ') ?? 'Empty';
        await upsertCourse(
          transaction,
          code,
          cTitle,
          cCredits,
          cDesc,
          cOfferedIn,
        );
      }
      // Upsert Requisites (Prerequisites and Corequisites)
      for (const [code, courseData] of courseMap.entries()) {
        const prerequisites = parseRequisites(
          code,
          courseData.prerequisites,
          'pre',
        );
        for (const preReq of prerequisites) {
          if (
            preReq.code2 &&
            !courseMap.has(preReq.code2) &&
            !/^\d+CR$/.test(preReq.code2)
          ) {
            console.warn(
              `Prerequisite course or credit requirement "${preReq.code2}" for "${code}" does not exist. Skipping.`,
            );
            continue;
          }
          await upsertRequisite(transaction, preReq);
        }
        const corequisites = parseRequisites(
          code,
          courseData.corequisites,
          'co',
        );
        for (const coReq of corequisites) {
          if (
            coReq.code2 &&
            !courseMap.has(coReq.code2) &&
            !/^\d+CR$/.test(coReq.code2)
          ) {
            console.warn(
              `Corequisite course or credit requirement "${coReq.code2}" for "${code}" does not exist. Skipping.`,
            );
            continue;
          }
          await upsertRequisite(transaction, coReq);
        }
      }
      await transaction.commit();
      console.log('Courses and requisites upserted successfully.');
    } catch (err) {
      console.error('Error upserting courses and requisites:', err);
      // Attempt rollback if possible
      try {
        if (transaction) await transaction.rollback();
      } catch (rollbackErr) {
        console.error('Error during rollback:', rollbackErr);
      }
      throw err;
    }

    // Phase 2: Process each requirement file for degree-specific linking
    for (const file of requirementFiles) {
      const filePath = path.join(requirementsDir, file);
      console.log(`[SEED] Processing file: ${filePath}`);
      const { degreeId, degreeName, totalCredits, requirements, isAddon } =
        parseRequirementsFile(filePath);
      const tx = pool.transaction();
      await tx.begin();
      console.log(`[SEED] Transaction started for degree: ${degreeName}`);
      try {
        // Upsert Degree
        const degreeIdNumber = await upsertDegree(
          tx,
          degreeId,
          degreeName,
          totalCredits,
          isAddon,
        );
        // Upsert Course Pools and DegreeXCoursePool
        for (const req of requirements) {
          const uniquePoolName = req.poolName; // Already includes the degreeId prefix
          const poolIdNumber = await upsertCoursePool(tx, uniquePoolName);
          await upsertDegreeXCoursePool(
            tx,
            degreeIdNumber,
            poolIdNumber,
            req.creditsRequired,
          );
        }
        // Link Courses to Course Pools
        for (const req of requirements) {
          // Handle Course Groups (Alternative Courses)
          const alternativeCourses = req.courseCodes.filter(
            (code) => code.includes(',') || code.includes('/'),
          );
          let groupNumber = 1;
          for (const altLine of alternativeCourses) {
            const separators = altLine.includes('/') ? '/' : ',';
            const groupCourses = altLine.split(separators).map((c) => c.trim());
            if (groupCourses.length > 1) {
              const groupId = generateGroupId(
                degreeId,
                req.poolId,
                groupNumber,
              );
              for (const courseCode of groupCourses) {
                const upperCode = courseCode.toUpperCase().replace(/\s+/g, '');
                const isCreditReq = /^\d+CR$/.test(upperCode);
                if (!/^[A-Z]{2,4}\d{3}$/.test(upperCode) && !isCreditReq) {
                  console.log(
                    `Skipping invalid course code or credit requirement: "${courseCode}"`,
                  );
                  continue;
                }
                const poolIdNumber = await getPoolIdByName(tx, req.poolName);
                console.log(
                  `Upserting ${upperCode} in ${req.poolName} with groupId ${groupId}`,
                );
                if (isCreditReq) {
                  console.warn(
                    `Credit-based requisites should be handled in course prerequisites. Skipping linking for "${upperCode}".`,
                  );
                } else {
                  await upsertCourseXCoursePool(
                    tx,
                    upperCode,
                    poolIdNumber,
                    groupId,
                  );
                }
              }
              groupNumber++;
            } else {
              const code = groupCourses[0];
              const upperCode = code.toUpperCase().replace(/\s+/g, '');
              const isCreditReq = /^\d+CR$/.test(upperCode);
              if (!/^[A-Z]{2,4}\d{3}$/.test(upperCode) && !isCreditReq) {
                console.log(
                  `Skipping invalid course code or credit requirement: "${code}"`,
                );
                continue;
              }
              const poolIdNumber = await getPoolIdByName(tx, req.poolName);
              console.log(`Upserting ${upperCode} in ${req.poolName}`);
              if (isCreditReq) {
                console.warn(
                  `Credit-based requisites should be handled in course prerequisites. Skipping linking for "${upperCode}".`,
                );
              } else {
                await upsertCourseXCoursePool(
                  tx,
                  upperCode,
                  poolIdNumber,
                  null,
                );
              }
            }
          }
          // Handle Non-Alternative Courses
          const nonAlternativeCourses = req.courseCodes.filter(
            (code) => !code.includes(',') && !code.includes('/'),
          );
          for (const code of nonAlternativeCourses) {
            const upperCode = code.toUpperCase().replace(/\s+/g, '');
            const isCreditReq = /^\d+CR$/.test(upperCode);
            if (!/^[A-Z]{2,4}\d{3}$/.test(upperCode) && !isCreditReq) {
              console.log(
                `Skipping invalid course code or credit requirement: "${code}"`,
              );
              continue;
            }
            const poolIdNumber = await getPoolIdByName(tx, req.poolName);
            console.log(`Upserting ${upperCode} in ${req.poolName}`);
            if (isCreditReq) {
              console.warn(
                `Credit-based requisites should be handled in course prerequisites. Skipping linking for "${upperCode}".`,
              );
            } else {
              await upsertCourseXCoursePool(tx, upperCode, poolIdNumber, null);
            }
          }
        }
        await tx.commit();
        console.log(
          `[SEED] Seeding completed successfully for degree: ${degreeName}`,
        );
      } catch (err) {
        console.error(
          `[SEED] Error during seeding degree "${degreeName}":`,
          err,
        );
        try {
          await tx.rollback();
          console.log(
            `[SEED] Transaction rolled back for degree: ${degreeName}`,
          );
        } catch (rollbackErr) {
          console.error(
            `[SEED] Error during rollback for degree "${degreeName}":`,
            rollbackErr,
          );
        }
        continue;
      }
    }

    console.log('[SEED] All requirement files have been processed.');
    await pool.close();
  } catch (err) {
    console.error('[SEED] Unexpected error during seeding:', err);
    if (pool) {
      try {
        await pool.close();
      } catch (closeErr) {
        console.error(
          '[SEED] Error closing the database connection:',
          closeErr,
        );
      }
    }
  }
}

// If running from command line: `ts-node adminController.ts`
if (require.main === module) {
  seedSoenDegree();
}

export { seedSoenDegree };
