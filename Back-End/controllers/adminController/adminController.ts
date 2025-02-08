// src/controllers/adminController.ts

import { Request, Response, NextFunction } from "express";
import Database from "@controllers/DBController/DBController"; // Your database connection utility
import {
  TableListResponse,
  TableRecordsResponse,
  GetTableRecordsRequest,
  StandardResponse,
  TableRecord,
} from "@controllers/adminController/admin_types";

import fs from "fs";
import path from "path";
import * as sql from "mssql";
import "dotenv/config";
import { readdir } from 'fs/promises';

/**
 * Fetches the list of all tables in the database.
 */
export const getTables = async (
  req: Request,
  res: Response<StandardResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const pool = await Database.getConnection();
    if (!pool) {
      res
        .status(500)
        .json({ success: false, message: "Database connection failed" });
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
      (row: { TABLE_NAME: string }) => row.TABLE_NAME
    );

    res.status(200).json({ success: true, data: tables });
  } catch (error) {
    console.error("Error fetching tables:", error);
    res
      .status(500)
      .json({ success: false, message: "Error fetching tables", data: error });
  }
};

/**
 * Fetches records from a specific table with optional keyword filtering.
 */
export const getTableRecords = async (
  req: GetTableRecordsRequest,
  res: Response<StandardResponse>,
  next: NextFunction
): Promise<void> => {
  const { tableName } = req.params;
  const { keyword } = req.query;

  try {
    const pool = await Database.getConnection();
    if (!pool) {
      res
        .status(500)
        .json({ success: false, message: "Database connection failed" });
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

      const columns: string[] = columnsResult.recordset.map(
        (row: { COLUMN_NAME: string }) => row.COLUMN_NAME
      );

      if (columns.length > 0) {
        const whereClauses = columns.map(
          (col) => `[${col}] LIKE '%${keyword}%'`
        );
        query += ` WHERE ${whereClauses.join(" OR ")}`;
      }
    }

    const result = await pool.request().query(query);

    const records: TableRecordsResponse = result.recordset as TableRecord[];

    res.status(200).json({ success: true, data: records });
  } catch (error) {
    console.error("Error fetching table records:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching records from table",
      data: error,
    });
  }
};

const dbConfig: sql.config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  server: process.env.DB_HOST || "localhost",
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
}

// Requisite Interface
interface Requisite {
  code1: string; // Course code that has the requisite
  code2?: string; // Prerequisite course code (optional for credit-based)
  type: "pre" | "co";
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
  // ... more if needed
}

// -------------------------------------
// 3) Parse the Requirements Text File
// -------------------------------------
function parseRequirementsFile(filePath: string): DegreeData {
  const text = fs.readFileSync(filePath, "utf-8");
  const lines = text.split("\n").map((l) => l.trim());

  let degreeId = "";
  let degreeName = "";
  let totalCredits = 120;

  const requirements: Requirement[] = [];
  let currentPoolName = "";
  let currentCredits = 0;
  let currentCourseCodes: string[] = [];

  function pushCurrentPool() {
    if (currentPoolName) {
      // Prefix poolName with degreeId to ensure uniqueness
      const uniquePoolName = `${degreeId} - ${currentPoolName}`;

      requirements.push({
        poolId: uniquePoolName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/-credits/g, ""),
        poolName: uniquePoolName,
        creditsRequired: currentCredits,
        courseCodes: currentCourseCodes.filter((cc) => cc),
      });
    }
  }

  for (const line of lines) {
    if (!line || line.startsWith("#")) {
      continue;
    }

    if (line.includes("DegreeID=")) {
      degreeId = line.split("=")[1].trim();
      continue;
    }
    if (line.includes("DegreeName=")) {
      degreeName = line.split("=")[1].trim();
      continue;
    }
    if (line.includes("TotalCredits=")) {
      totalCredits = parseFloat(line.split("=")[1].trim());
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

  return {
    degreeId,
    degreeName,
    totalCredits,
    requirements,
  };
}

// -------------------------------------
// 4) Parse the JSON (Course Data)
// -------------------------------------
/**
 * Recursively loads all .json files in `dirPath` and merges them into a single Map.
 * Each .json file is assumed to be an array of CourseJson objects.
 */
function loadAllCourseJsons(dirPath: string): Map<string, CourseJson> {
  const courseMap = new Map<string, CourseJson>();

  function recurseDirectory(currentPath: string) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        // Recurse into subdirectory
        recurseDirectory(fullPath);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".json")) {
        // Found a JSON file
        try {
          const raw = fs.readFileSync(fullPath, "utf-8");
          const data: CourseJson[] = JSON.parse(raw);

          for (const c of data) {
            // Extract or define a code from c.title (or c.code if you have it)
            const code = extractCodeFromTitle(c.title).toUpperCase();

            if (courseMap.has(code)) {
              // If there's a duplicate code, decide how to handle it
              console.warn(
                `Warning: Duplicate course code "${code}" found in file ${fullPath}. Overwriting previous entry.`
              );
            }

            courseMap.set(code, c);
          }
        } catch (err) {
          console.error(`Error parsing JSON file: ${fullPath}`, err);
        }
      }
    }
  }

  recurseDirectory(dirPath);
  return courseMap;
}

/**
 * Extracts the course code from the course title.
 * Example: "ENGR 201 Professional Practice ... (1.5 credits)" => "ENGR201"
 */
function extractCodeFromTitle(title: string): string {
  const match = title.match(/^([A-Z]{2,4})\s*(\d{3})/);
  if (!match) {
    throw new Error(`Invalid course title format: "${title}"`);
  }
  return `${match[1]}${match[2]}`.toUpperCase(); // e.g., "ENGR201"
}

/**
 * Validates course data for proper formatting.
 * Logs warnings for any inconsistencies found.
 */
function validateCourseData(courseMap: Map<string, CourseJson>): void {
  for (const [code, courseData] of courseMap.entries()) {
    // Validate title format
    if (!/^[A-Z]{2,4}\s*\d{3}/.test(courseData.title)) {
      console.warn(
        `Course "${code}" has an invalid title format: "${courseData.title}"`
      );
    }

    // Validate prerequisites and corequisites
    ["pre", "co"].forEach((field) => {
      const requisiteStr = courseData[field as keyof CourseJson];
      if (requisiteStr && typeof requisiteStr !== "string") {
        console.warn(
          `Course "${code}" has a non-string ${field}:`,
          requisiteStr
        );
      }
    });
  }
}

// -------------------------------------
// 5) Upsert Helpers (SQL Statements)
// -------------------------------------

/**
 * Generates the next ID for a given table based on the prefix.
 * @param t - The SQL transaction.
 * @param tableName - The name of the table.
 * @param prefix - The prefix for the ID.
 * @returns The newly generated ID.
 */
async function generateNextId(
  t: sql.Transaction,
  tableName: string,
  prefix: string
): Promise<string> {
  const request = new sql.Request(t);
  const query = `
    SELECT MAX(CAST(SUBSTRING(id, LEN(@prefix) + 1, LEN(id)) AS INT)) AS MaxId
    FROM [${tableName}]
    WHERE id LIKE @prefix + '%'
  `;
  request.input("prefix", sql.VarChar, prefix);

  const result = await request.query(query);
  const maxId = result.recordset[0].MaxId;
  const nextIdNumber = (maxId !== null ? maxId : 0) + 1;

  return `${prefix}${nextIdNumber}`;
}

/**
 * Upserts a Degree based on name.
 * Returns the degree's ID.
 */
async function upsertDegree(
  t: sql.Transaction,
  name: string,
  totalCredits: number
): Promise<string> {
  const request = new sql.Request(t);
  request.input("name", sql.VarChar, name);
  request.input("totalCredits", sql.Int, totalCredits);

  // Check if degree exists by name
  const result = await request.query(
    "SELECT id FROM Degree WHERE name = @name"
  );

  if (result.recordset.length === 0) {
    // Generate new ID
    const newId = await generateNextId(t, "Degree", "D");

    // Bind newId
    request.input("newId", sql.VarChar, newId);

    // Insert
    await request.query(`
      INSERT INTO Degree (id, name, totalCredits)
      VALUES (@newId, @name, @totalCredits)
    `);
    console.log(`Inserted Degree: ${name} with ID: ${newId}`);
    return newId;
  } else {
    // Update
    const degreeId = result.recordset[0].id;
    request.input("id", sql.VarChar, degreeId);
    await request.query(`
      UPDATE Degree
      SET totalCredits = @totalCredits
      WHERE id = @id
    `);
    console.log(`Updated Degree: ${name} with ID: ${degreeId}`);
    return degreeId;
  }
}

/**
 * Upserts a CoursePool based on name.
 * Returns the course pool's ID.
 */
async function upsertCoursePool(
  t: sql.Transaction,
  poolName: string
): Promise<string> {
  const request = new sql.Request(t);
  request.input("name", sql.VarChar, poolName);

  // Check if course pool exists by name
  const result = await request.query(
    "SELECT id FROM CoursePool WHERE name = @name"
  );

  if (result.recordset.length === 0) {
    // Generate new ID
    const newId = await generateNextId(t, "CoursePool", "CP");

    // Bind newId
    request.input("newId", sql.VarChar, newId);

    // Insert
    await request.query(`
      INSERT INTO CoursePool (id, name)
      VALUES (@newId, @name)
    `);
    console.log(`Inserted CoursePool: ${poolName} with ID: ${newId}`);
    return newId;
  } else {
    // Update (if necessary)
    const poolId = result.recordset[0].id;
    console.log(`CoursePool already exists: ${poolName} with ID: ${poolId}`);
    return poolId;
  }
}

/**
 * Upserts a Course based on code.
 */
async function upsertCourse(
  t: sql.Transaction,
  code: string,
  title: string,
  credits: number,
  description: string
): Promise<void> {
  const request = new sql.Request(t);
  request.input("code", sql.VarChar, code);
  request.input("title", sql.VarChar, title);
  request.input("credits", sql.Int, credits);
  request.input("description", sql.VarChar, description);

  // Check if course exists by code
  const result = await request.query(
    "SELECT code FROM Course WHERE code = @code"
  );

  if (result.recordset.length === 0) {
    // Insert
    await request.query(`
      INSERT INTO Course (code, title, credits, description)
      VALUES (@code, @title, @credits, @description)
    `);
    console.log(`Inserted Course: ${code}`);
  } else {
    // Update
    await request.query(`
      UPDATE Course
      SET title = @title, credits = @credits, description = @description
      WHERE code = @code
    `);
    console.log(`Updated Course: ${code}`);
  }
}

/**
 * Upserts a DegreeXCoursePool.
 */
async function upsertDegreeXCoursePool(
  t: sql.Transaction,
  degreeId: string,
  poolId: string,
  creditsRequired: number
): Promise<string> {
  const request = new sql.Request(t);
  request.input("degreeId", sql.VarChar, degreeId);
  request.input("poolId", sql.VarChar, poolId);
  request.input("creditsRequired", sql.Float, creditsRequired); // Assuming credits can be fractional

  // Check if DegreeXCoursePool exists by degree and coursepool
  const result = await request.query(`
    SELECT id FROM DegreeXCoursePool
    WHERE degree = @degreeId AND coursepool = @poolId
  `);

  if (result.recordset.length === 0) {
    // Generate new ID
    const newId = await generateNextId(t, "DegreeXCoursePool", "DXCP");

    // Bind newId
    request.input("newId", sql.VarChar, newId);

    // Insert
    await request.query(`
      INSERT INTO DegreeXCoursePool (id, degree, coursepool, creditsRequired)
      VALUES (@newId, @degreeId, @poolId, @creditsRequired)
    `);
    console.log(`Inserted DegreeXCoursePool with ID: ${newId}`);
    return newId;
  } else {
    // Update
    const dxcpId = result.recordset[0].id;
    request.input("id", sql.VarChar, dxcpId);
    await request.query(`
      UPDATE DegreeXCoursePool
      SET creditsRequired = @creditsRequired
      WHERE id = @id
    `);
    console.log(`Updated DegreeXCoursePool with ID: ${dxcpId}`);
    return dxcpId;
  }
}

/**
 * Upserts a CourseXCoursePool with an optional groupId.
 */
async function upsertCourseXCoursePool(
  t: sql.Transaction,
  courseCode: string,
  poolId: string,
  groupId: string | null
): Promise<string> {
  const request = new sql.Request(t);
  request.input("courseCode", sql.VarChar, courseCode);
  request.input("poolId", sql.VarChar, poolId);
  request.input("groupId", sql.VarChar, groupId);

  // Check if CourseXCoursePool exists by coursecode, poolId, and groupId
  const result = await request.query(`
    SELECT id FROM CourseXCoursePool
    WHERE coursecode = @courseCode AND coursepool = @poolId AND 
          ((@groupId IS NULL AND groupId IS NULL) OR groupId = @groupId)
  `);

  if (result.recordset.length === 0) {
    // Generate new ID
    const newId = await generateNextId(t, "CourseXCoursePool", "CXP");

    // Bind newId
    request.input("newId", sql.VarChar, newId);

    // Insert
    await request.query(`
      INSERT INTO CourseXCoursePool (id, coursecode, coursepool, groupId)
      VALUES (@newId, @courseCode, @poolId, @groupId)
    `);
    console.log(
      `Linked Course ${courseCode} to CoursePool ID: ${poolId}` +
      (groupId ? ` with groupId: ${groupId}` : "")
    );
    return newId;
  } else {
    // Already exists, return existing ID
    const cxcpId = result.recordset[0].id;
    console.log(
      `CourseXCoursePool already exists for Course ${courseCode} in Pool ID: ${poolId}` +
      (groupId ? ` with groupId: ${groupId}` : "")
    );
    return cxcpId;
  }
}

/**
 * Upserts a Requisite (prerequisite or corequisite).
 */
async function upsertRequisite(
  t: sql.Transaction,
  requisite: Requisite
): Promise<void> {
  const { code1, code2, type, groupId, creditsRequired } = requisite;
  const request = new sql.Request(t);

  // Bind always present parameters
  request.input("code1", sql.VarChar, code1);
  request.input("type", sql.VarChar, type);

  // Conditionally bind optional parameters
  if (creditsRequired !== undefined) {
    request.input("creditsRequired", sql.Float, creditsRequired);
  }
  if (code2) {
    request.input("code2", sql.VarChar, code2);
  }
  if (groupId) {
    request.input("group_id", sql.VarChar, groupId);
  }

  // Build dynamic WHERE clause based on whether it's credit-based or course-based
  let whereClause = "code1 = @code1 AND type = @type";
  if (creditsRequired !== undefined) {
    whereClause += " AND creditsRequired = @creditsRequired AND code2 IS NULL AND group_id IS NULL";
  } else if (code2) {
    whereClause += " AND code2 = @code2";
    if (groupId) {
      whereClause += " AND group_id = @group_id";
    } else {
      whereClause += " AND group_id IS NULL";
    }
  }

  // Check if Requisite exists
  const result = await request.query(`
    SELECT id FROM Requisite
    WHERE ${whereClause}
  `);

  if (result.recordset.length === 0) {
    // Generate new ID
    const newId = await generateNextId(t, "Requisite", "R");

    // Bind newId
    request.input("newId", sql.VarChar, newId);

    // Insert
    await request.query(`
      INSERT INTO Requisite (id, code1, code2, type, group_id, creditsRequired)
      VALUES (
        @newId, 
        @code1, 
        ${creditsRequired !== undefined ? "NULL" : (code2 ? "@code2" : "NULL")}, 
        @type, 
        ${creditsRequired !== undefined ? "NULL" : (groupId ? "@group_id" : "NULL")}, 
        ${creditsRequired !== undefined ? "@creditsRequired" : "NULL"}
      )
    `);
    console.log(
      `Inserted Requisite: ${code1}` +
      (code2
        ? ` -> ${code2}`
        : ` with Credits Required: ${creditsRequired}`) +
      ` (${type})` +
      (groupId ? ` Group ID: ${groupId}` : "")
    );
  } else {
    console.log(
      `Requisite already exists: ${code1}` +
      (code2
        ? ` -> ${code2}`
        : ` with Credits Required: ${creditsRequired}`) +
      ` (${type})` +
      (groupId ? ` Group ID: ${groupId}` : "")
    );
    // If you have additional fields to update, handle here
  }
}


/**
 * Retrieves the pool ID by pool name.
 */
async function getPoolIdByName(
  t: sql.Transaction,
  poolName: string
): Promise<string> {
  const request = new sql.Request(t);
  request.input("name", sql.VarChar, poolName);

  const result = await request.query(
    "SELECT id FROM CoursePool WHERE name = @name"
  );

  if (result.recordset.length === 0) {
    throw new Error(`CoursePool with name "${poolName}" does not exist.`);
  }

  return result.recordset[0].id;
}

/**
 * Generates a unique groupId based on degreeId, poolId, and groupNumber.
 */
function generateGroupId(degreeId: string, poolId: string, groupNumber: number): string {
  return `${degreeId}-${poolId}-G${groupNumber}`;
}

// -------------------------------------
// 5) Parse Requisites Function
// -------------------------------------

let globalGroupCounter = 1; // To generate unique group IDs

/**
 * Parses a prerequisites/corequisites string into an array of Requisite objects.
 * Handles various separators (commas and slashes) and groups alternatives separated by slashes.
 * Example: "COMP 248/MATH 201; SOEN 287" => [
 *   { code1: 'TARGET_CODE', code2: 'COMP248', type: 'prerequisite', groupId: 'D1-CP1-G1' },
 *   { code1: 'TARGET_CODE', code2: 'MATH201', type: 'prerequisite', groupId: 'D1-CP1-G1' },
 *   { code1: 'TARGET_CODE', code2: 'SOEN287', type: 'prerequisite' }
 * ]
 */
function parseRequisites(
  code1: string,
  requisiteStr: string | undefined,
  type: "pre" | "co"
): Requisite[] {
  if (!requisiteStr) return [];

  if (typeof requisiteStr !== "string") {
    console.warn(
      `Expected string for requisites but got ${typeof requisiteStr} for course ${code1}. Skipping.`
    );
    return [];
  }

  // Replace semicolons with commas for uniformity
  const cleanedStr = requisiteStr.replace(/;/g, ",");

  // Split by comma to handle individual prerequisites
  const parts = cleanedStr.split(",");

  const requisites: Requisite[] = [];

  for (const part of parts) {
    const trimmedPart = part.trim().replace(/\./g, ""); // Remove periods

    if (trimmedPart.includes("/")) {
      // This part contains alternative requisites
      const alternatives = trimmedPart.split("/").map((c) => c.trim());

      const groupId = `G${globalGroupCounter++}`; // Assign a unique group ID

      for (const alt of alternatives) {
        const code = alt.replace(/\s+/g, "").toUpperCase();

        if (/^[A-Z]{2,4}\d{3}$/.test(code)) {
          requisites.push({
            code1,
            code2: code,
            type,
            groupId,
          });
        } else if (/^\d+CR$/.test(code)) {
          // Detect credit requirements like "75CR"
          requisites.push({
            code1,
            creditsRequired: parseInt(code.replace("CR", "")),
            type,
            groupId,
          });
        } else {
          console.warn(
            `Invalid course code or credit requirement "${code}" in requisites for course "${code1}". Skipping.`
          );
        }
      }
    } else {
      // Single requisite
      const code = trimmedPart.replace(/\s+/g, "").toUpperCase();

      if (/^[A-Z]{2,4}\d{3}$/.test(code)) {
        requisites.push({
          code1,
          code2: code,
          type,
        });
      } else if (/^\d+CR$/.test(code)) {
        // Detect credit requirements like "75CR"
        requisites.push({
          code1,
          creditsRequired: parseInt(code.replace("CR", "")),
          type,
        });
      } else {
        console.warn(
          `Invalid course code or credit requirement "${code}" in requisites for course "${code1}". Skipping.`
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
 * Main Seed Function to populate the database.
 */
async function seedSoenDegree() {
  let transaction: sql.Transaction | null = null; // Declare transaction in outer scope for rollback
  let pool: sql.ConnectionPool | null = null;
  try {
    // 1. DEFINE PATHS
    const requirementsDir = path.join(
      __dirname,
      "../../course-data/degree-reqs" // Ensure this path is correct
    ); // Directory containing prerequisite files
    const courseListsDir = path.join(
      __dirname,
      "../../course-data/course-lists"
    );

    // 2. READ ALL REQUIREMENT FILES
    const files = await readdir(requirementsDir);
    const requirementFiles = files.filter((file) => file.endsWith(".txt"));

    if (requirementFiles.length === 0) {
      console.warn("No requirement files found in the directory.");
      return;
    }

    // 3. LOAD ALL COURSE JSONS
    const courseMap = loadAllCourseJsons(courseListsDir);

    // 4. VALIDATE COURSE DATA
    validateCourseData(courseMap);

    // 5. CONNECT TO DATABASE
    console.log("[SEED] Connecting to DB...");
    pool = await sql.connect(dbConfig);

    // Confirm connected database
    const dbResult = await pool.request().query("SELECT DB_NAME() AS dbName");
    const connectedDbName = dbResult.recordset[0].dbName;
    console.log(`[SEED] Connected to database: ${connectedDbName}`);

    if (connectedDbName !== process.env.DB_NAME) {
      throw new Error(
        `Connected to incorrect database "${connectedDbName}". Expected "${process.env.DB_NAME}".`
      );
    }

    // 6. PROCESS EACH REQUIREMENT FILE
    for (const file of requirementFiles) {
      const filePath = path.join(requirementsDir, file);
      console.log(`[SEED] Processing file: ${filePath}`);

      // 6.a. PARSE REQUIREMENT FILE
      const { degreeId, degreeName, totalCredits, requirements } =
        parseRequirementsFile(filePath);

      // 6.b. BEGIN TRANSACTION
      const transaction = pool.transaction();
      await transaction.begin();
      console.log(`[SEED] Transaction started for degree: ${degreeName}`);

      try {
        // 6.c. UPSERT DEGREE
        const degreeIdNumber = await upsertDegree(
          transaction,
          degreeName,
          totalCredits
        );

        // 6.d. UPSERT COURSE POOLS AND DEGREE_X_COURSE_POOLS
        for (const req of requirements) {
          // Create unique pool name by including degreeId
          const uniquePoolName = `${degreeId} - ${req.poolName}`;

          // Upsert CoursePool
          const poolIdNumber = await upsertCoursePool(transaction, uniquePoolName);

          // Upsert DegreeXCoursePool
          await upsertDegreeXCoursePool(
            transaction,
            degreeIdNumber,
            poolIdNumber,
            req.creditsRequired
          );
        }

        // 6.e. UPSERT COURSES
        for (const [code, courseData] of courseMap.entries()) {
          const cTitle = courseData.title; // Extract title from CourseJson
          const cCredits = courseData.credits ?? 3; // Default to 3 if not provided
          const cDesc = courseData.description ?? `No description for ${code}`;
          await upsertCourse(transaction, code, cTitle, cCredits, cDesc);
        }

        // 6.f. LINK COURSES TO COURSE_POOLS
        for (const req of requirements) {
          // Handle Course Groups (Alternative Courses)
          const alternativeCourses = req.courseCodes.filter((code) =>
            code.includes(",") || code.includes("/")
          );

          let groupNumber = 1;

          for (const altLine of alternativeCourses) {
            const separators = altLine.includes("/") ? "/" : ",";
            const groupCourses = altLine.split(separators).map((c) => c.trim());

            if (groupCourses.length > 1) {
              // Generate unique groupId with degreeId
              const groupId = generateGroupId(degreeId, req.poolId, groupNumber);

              for (const courseCode of groupCourses) {
                // Check if courseCode is a valid course or credit requirement
                const upperCode = courseCode.toUpperCase().replace(/\s+/g, "");
                const isCreditReq = /^\d+CR$/.test(upperCode);

                if (
                  !/^[A-Z]{2,4}\d{3}$/.test(upperCode) &&
                  !isCreditReq
                ) {
                  console.log(`Skipping invalid course code or credit requirement: "${courseCode}"`);
                  continue;
                }

                const poolIdNumber = await getPoolIdByName(transaction, `${degreeId} - ${req.poolName}`);
                console.log(`Upserting ${upperCode} in ${req.poolName}`);
                console.log(`Pool ID: ${poolIdNumber}`);
                console.log(`Group ID: ${groupId}`);
                console.log(`Group Number: ${groupNumber}`);

                if (isCreditReq) {
                  // Credit-based requisite
                  console.warn(`Credit-based requisites should be handled in course prerequisites. Skipping Requisite upsert for "${upperCode}".`);
                }

                await upsertCourseXCoursePool(
                  transaction,
                  upperCode,
                  poolIdNumber,
                  groupId
                );
              }

              groupNumber++;
            } else {
              // Single course or credit requirement, no group
              const code = groupCourses[0];
              const upperCode = code.toUpperCase().replace(/\s+/g, "");
              const isCreditReq = /^\d+CR$/.test(upperCode);

              if (
                !/^[A-Z]{2,4}\d{3}$/.test(upperCode) &&
                !isCreditReq
              ) {
                console.log(`Skipping invalid course code or credit requirement: "${code}"`);
                continue;
              }

              const poolIdNumber = await getPoolIdByName(transaction, `${degreeId} - ${req.poolName}`);
              console.log(`Upserting ${upperCode} in ${req.poolName}`);
              console.log(`Pool ID: ${poolIdNumber}`);

              if (isCreditReq) {
                // Credit-based requisite
                console.warn(`Credit-based requisites should be handled in course prerequisites. Skipping Requisite upsert for "${upperCode}".`);
              }

              await upsertCourseXCoursePool(
                transaction,
                upperCode,
                poolIdNumber,
                null
              );
            }
          }

          // Handle Non-Alternative Courses
          const nonAlternativeCourses = req.courseCodes.filter(
            (code) => !code.includes(",") && !code.includes("/")
          );
          for (const code of nonAlternativeCourses) {
            const upperCode = code.toUpperCase().replace(/\s+/g, "");
            const isCreditReq = /^\d+CR$/.test(upperCode);

            if (
              !/^[A-Z]{2,4}\d{3}$/.test(upperCode) &&
              !isCreditReq
            ) {
              console.log(`Skipping invalid course code or credit requirement: "${code}"`);
              continue;
            }

            const poolIdNumber = await getPoolIdByName(transaction, `${degreeId} - ${req.poolName}`);
            console.log(`Upserting ${upperCode} in ${req.poolName}`);
            console.log(`Pool ID: ${poolIdNumber}`);

            if (isCreditReq) {
              // Credit-based requisite
              console.warn(`Credit-based requisites should be handled in course prerequisites. Skipping Requisite upsert for "${upperCode}".`);
            }

            await upsertCourseXCoursePool(
              transaction,
              upperCode,
              poolIdNumber,
              null
            );
          }
        }

        // 6.g. UPSERT PREREQUISITES AND COREQUISITES FROM COURSE JSONs
        for (const [code, courseData] of courseMap.entries()) {
          // Handle Prerequisites
          const prerequisites = parseRequisites(code, courseData.prerequisites, "pre");
          for (const preReq of prerequisites) {
            // Ensure the prerequisite course exists or is a credit requirement
            if (preReq.code2 && !courseMap.has(preReq.code2) && !/^\d+CR$/.test(preReq.code2)) {
              console.warn(
                `Prerequisite course or credit requirement "${preReq.code2}" for "${code}" does not exist. Skipping.`
              );
              continue;
            }
            await upsertRequisite(transaction, preReq);
          }

          // Handle Corequisites
          const corequisites = parseRequisites(code, courseData.corequisites, "co");
          for (const coReq of corequisites) {
            // Ensure the corequisite course exists or is a credit requirement
            if (coReq.code2 && !courseMap.has(coReq.code2) && !/^\d+CR$/.test(coReq.code2)) {
              console.warn(
                `Corequisite course or credit requirement "${coReq.code2}" for "${code}" does not exist. Skipping.`
              );
              continue;
            }
            await upsertRequisite(transaction, coReq);
          }
        }

        // 6.h. COMMIT TRANSACTION
        await transaction.commit();
        console.log(`[SEED] Seeding completed successfully for degree: ${degreeName}`);
      } catch (err) {
        console.error(`[SEED] Error during seeding degree "${degreeName}":`, err);
        try {
          await transaction.rollback();
          console.log(`[SEED] Transaction rolled back for degree: ${degreeName}`);
        } catch (rollbackErr) {
          console.error(`[SEED] Error during rollback for degree "${degreeName}":`, rollbackErr);
        }
        // Continue with next degree
        continue;
      }
    }

    console.log("[SEED] All requirement files have been processed.");
    await pool.close();
  } catch (err) {
    console.error("[SEED] Unexpected error during seeding:", err);
    if (pool) {
      try {
        await pool.close();
      } catch (closeErr) {
        console.error("[SEED] Error closing the database connection:", closeErr);
      }
    }
  }
}

// If running from command line: `ts-node adminController.ts`
if (require.main === module) {
  seedSoenDegree();
}

export { seedSoenDegree };
