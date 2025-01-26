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
import sql from "mssql";
import "dotenv/config";

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
  code2: string; // Course code that is the prerequisite/corequisite
  type: "pre" | "co";
}

// CourseJson Interface
interface CourseJson {
  title: string; // e.g., "ENGR 201 Professional Practice and Responsibility (1.5 credits)"
  credits?: number; // e.g., 1.5
  description?: string;
  prerequisites?: string; // e.g., "COMP 248, MATH 201"
  corequisites?: string; // e.g., "MATH 203"
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
      const poolId = currentPoolName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/-credits/g, "");

      requirements.push({
        poolId,
        poolName: currentPoolName,
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
 * Parses a prerequisites/corequisites string into an array of course codes.
 * Example: "COMP 248, MATH 201" => ["COMP248", "MATH201"]
 */
/**
 * Parses a prerequisites/corequisites string into an array of course codes.
 * Handles various separators and cleans up trailing punctuation.
 * Example: "COMP 248, MATH 201; SOEN 287." => ["COMP248", "MATH201", "SOEN287"]
 */
function parseRequisites(requisiteStr: string | undefined): string[] {
  if (!requisiteStr) return [];
  
  if (typeof requisiteStr !== "string") {
    console.warn(`Expected string for requisites but got ${typeof requisiteStr}. Skipping.`);
    return [];
  }

  // Replace semicolons with commas, remove periods, and split by comma
  const cleanedStr = requisiteStr.replace(/;/g, ",").replace(/\./g, "");
  
  return cleanedStr
    .split(",")
    .map((code) => code.trim().replace(/\s+/g, "").toUpperCase())
    .filter((code) => /^[A-Z]{2,4}\d{3}$/.test(code)); // Ensures valid course codes
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
  credits: number,
  description: string
): Promise<void> {
  const request = new sql.Request(t);
  request.input("code", sql.VarChar, code);
  request.input("credits", sql.Int, credits);
  request.input("description", sql.VarChar, description);

  // Check if course exists by code
  const result = await request.query(
    "SELECT code FROM Course WHERE code = @code"
  );

  if (result.recordset.length === 0) {
    // Insert
    await request.query(`
      INSERT INTO Course (code, credits, description)
      VALUES (@code, @credits, @description)
    `);
    console.log(`Inserted Course: ${code}`);
  } else {
    // Update
    await request.query(`
      UPDATE Course
      SET credits = @credits, description = @description
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
  request.input("creditsRequired", sql.Int, creditsRequired);

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
      `Linked Course ${courseCode} to CoursePool ID: ${poolId} with groupId: ${groupId}`
    );
    return newId;
  } else {
    // Already exists, return existing ID
    const cxcpId = result.recordset[0].id;
    console.log(
      `CourseXCoursePool already exists for Course ${courseCode} in Pool ID: ${poolId} with groupId: ${groupId}`
    );
    return cxcpId;
  }
}

/**
 * Upserts a Requisite (prerequisite or corequisite).
 */
async function upsertRequisite(
  t: sql.Transaction,
  code1: string,
  code2: string,
  type: "pre" | "co"
): Promise<void> {
  const request = new sql.Request(t);
  request.input("code1", sql.VarChar, code1);
  request.input("code2", sql.VarChar, code2);
  request.input("type", sql.VarChar, type);

  // Check if Requisite exists by (code1, code2, type)
  const result = await request.query(`
    SELECT id FROM Requisite
    WHERE code1 = @code1 AND code2 = @code2 AND type = @type
  `);

  if (result.recordset.length === 0) {
    // Generate new ID
    const newId = await generateNextId(t, "Requisite", "R");

    // Bind newId
    request.input("newId", sql.VarChar, newId);

    // Insert
    await request.query(`
      INSERT INTO Requisite (id, code1, code2, type)
      VALUES (@newId, @code1, @code2, @type)
    `);
    console.log(
      `Inserted Requisite: ${code1} -> ${code2} (${type}) with ID: ${newId}`
    );
  } else {
    console.log(`Requisite already exists: ${code1} -> ${code2} (${type})`);
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
 * Generates a unique groupId based on poolId and groupNumber.
 */
function generateGroupId(poolId: string, groupNumber: number): string {
  return `${poolId}-group-${groupNumber}`;
}

// -------------------------------------
// 6) Main Seed Function
// -------------------------------------
/**
 * Main Seed Function to populate the database.
 */
async function seedSoenDegree() {
  let transaction: sql.Transaction | null = null; // Declare transaction in outer scope for rollback
  try {
    // 1. PARSE THE REQUIREMENTS TEXT FILE
    const requirementsFilePath = path.join(
      __dirname,
      "../../course-data",
      "soen-requirements.txt"
    );
    const { degreeId, degreeName, totalCredits, requirements } =
      parseRequirementsFile(requirementsFilePath);

    // 2. LOAD COURSE JSON
    const courseListsDir = path.join(
      __dirname,
      "../../course-data/course-lists"
    );
    const courseMap = loadAllCourseJsons(courseListsDir);

    // 3. CONNECT + BEGIN TRANSACTION
    console.log("[SEED] Connecting to DB...");
    const pool = await sql.connect(dbConfig);

    // Confirm connected database
    const dbResult = await pool.request().query("SELECT DB_NAME() AS dbName");
    const connectedDbName = dbResult.recordset[0].dbName;
    console.log(`[SEED] Connected to database: ${connectedDbName}`);

    if (connectedDbName !== process.env.DB_NAME) {
      throw new Error(
        `Connected to incorrect database "${connectedDbName}". Expected "${process.env.DB_NAME}".`
      );
    }

    transaction = pool.transaction();
    await transaction.begin();
    console.log("[SEED] Transaction started.");

    // 4. Upsert the Degree
    const degreeIdNumber = await upsertDegree(
      transaction,
      degreeName,
      totalCredits
    );

    // 5. Upsert all CoursePools and DegreeXCoursePools
    for (const req of requirements) {
      // Upsert CoursePool
      const poolIdNumber = await upsertCoursePool(transaction, req.poolName);

      // Upsert DegreeXCoursePool
      await upsertDegreeXCoursePool(
        transaction,
        degreeIdNumber,
        poolIdNumber,
        req.creditsRequired
      );
    }

    // 6. Upsert all Courses
    for (const [code, courseData] of courseMap.entries()) {
      const cCredits = courseData.credits ?? 3; // default 3 if not found
      const cDesc = courseData.description ?? `No description for ${code}`;
      await upsertCourse(transaction, code, cCredits, cDesc);
    }

    // 7. Link Courses to CoursePools
    for (const req of requirements) {
      // Handle Course Groups (Alternative Courses)
      const alternativeCourses = req.courseCodes.filter((code) =>
        code.includes(",")
      );
      let groupNumber = 1;

      for (const altLine of alternativeCourses) {
        const groupCourses = altLine.split(",").map((c) => c.trim());
        const groupId = generateGroupId(req.poolId, groupNumber);

        for (const courseCode of groupCourses) {
          if (!/^[A-Z]{2,4}\s*\d{3}/.test(courseCode)) {
            console.log(`Skipping non-course line: "${courseCode}"`);
            continue;
          }

          const upperCode = courseCode.toUpperCase().replace(/\s+/g, "");
          const poolIdNumber = await getPoolIdByName(transaction, req.poolName);
          console.log(`Upserting ${upperCode} in ${req.poolName}`);
          console.log(`Pool ID: ${poolIdNumber}`);
          console.log(`Group ID: ${groupId}`);
          console.log(`Group Number: ${groupNumber}`);

          await upsertCourseXCoursePool(
            transaction,
            upperCode,
            poolIdNumber,
            groupId
          );
        }

        groupNumber++;
      }

      // Handle Non-Alternative Courses
      const nonAlternativeCourses = req.courseCodes.filter(
        (code) => !code.includes(",")
      );
      for (const code of nonAlternativeCourses) {
        if (!/^[A-Z]{2,4}\s*\d{3}/.test(code)) {
          console.log(`Skipping non-course line: "${code}"`);
          continue;
        }

        const upperCode = code.toUpperCase().replace(/\s+/g, "");
        const poolIdNumber = await getPoolIdByName(transaction, req.poolName);
        console.log(`Upserting ${upperCode} in ${req.poolName}`);
        console.log(`Pool ID: ${poolIdNumber}`);
        // console.log(`Group ID: ${groupId}`);
        console.log(`Group Number: ${groupNumber}`);

        await upsertCourseXCoursePool(
          transaction,
          upperCode,
          poolIdNumber,
          null
        );
      }
    }

    // 8. Upsert Prerequisites and Corequisites from Course JSONs
    for (const [code, courseData] of courseMap.entries()) {
      // Handle Prerequisites
      const prerequisites = parseRequisites(courseData.prerequisites);
      for (const preCode of prerequisites) {
        // Ensure the prerequisite course exists
        if (!courseMap.has(preCode)) {
          console.warn(
            `Prerequisite course "${preCode}" for "${code}" does not exist. Skipping.`
          );
          continue;
        }
        await upsertRequisite(transaction, code, preCode, "pre");
      }

      // Handle Corequisites
      const corequisites = parseRequisites(courseData.corequisites);
      for (const coCode of corequisites) {
        // Ensure the corequisite course exists
        if (!courseMap.has(coCode)) {
          console.warn(
            `Corequisite course "${coCode}" for "${code}" does not exist. Skipping.`
          );
          continue;
        }
        await upsertRequisite(transaction, code, coCode, "co");
      }
    }

    // 9. Commit
    await transaction.commit();
    console.log("[SEED] Seeding completed successfully.");
    pool.close();
  } catch (err) {
    console.error("[SEED] Error during seeding:", err);
    if (transaction) {
      try {
        await transaction.rollback();
        console.log("[SEED] Transaction rolled back due to error.");
      } catch (rollbackErr) {
        console.error("[SEED] Error during rollback:", rollbackErr);
      }
    }
  }
}

// If running from command line: `ts-node adminController.ts`
if (require.main === module) {
  seedSoenDegree();
}

export { seedSoenDegree };
