// src/controllers/adminController.ts

import { Request, Response, NextFunction } from "express";
import Database from "@controllers/DBController/DBController"; // Your database connection utility
import {
  TableListResponse,
  TableName,
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
    // console.log(pool);
    if (!pool) {
      res
        .status(500)
        .json({ success: false, message: "Database connection failed" });
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
    res
      .status(500)
      .json({
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
  poolId: string; // e.g. "engineering-core"
  poolName: string; // e.g. "Engineering Core (30.5 credits)"
  creditsRequired: number; // e.g. 30.5
  courseCodes: string[]; // e.g. ["ELEC 275", "ENCS 282", ...]
}

interface DegreeData {
  degreeId: string;
  degreeName: string;
  totalCredits: number;
  requirements: Requirement[];
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
      // Create a poolId by slugifying the pool name
      const poolId = currentPoolName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-") // replace non-alphanumeric with dashes
        .replace(/-credits/g, ""); // minor cleanup
      requirements.push({
        poolId,
        poolName: currentPoolName,
        creditsRequired: currentCredits,
        courseCodes: currentCourseCodes.filter((cc) => cc), // remove empty lines
      });
    }
  }

  for (const line of lines) {
    // Ignore empty lines or lines starting with #
    if (!line || line.startsWith("#")) {
      continue;
    }

    // Parse Key=Value lines for metadata
    if (line.includes("DegreeID=")) {
      const val = line.split("=")[1];
      degreeId = val.trim();
      continue;
    }
    if (line.includes("DegreeName=")) {
      const val = line.split("=")[1];
      degreeName = val.trim();
      continue;
    }
    if (line.includes("TotalCredits=")) {
      const val = line.split("=")[1];
      totalCredits = parseFloat(val.trim());
      continue;
    }

    // If line starts with '[' we found a new section: [Something (X credits)]
    const bracketMatch = line.match(/^\[(.*)\]$/);
    if (bracketMatch) {
      // We are starting a new pool. Push the old one if it exists
      pushCurrentPool();

      // Reset for the new pool
      currentPoolName = bracketMatch[1]; // e.g. "Engineering Core (30.5 credits)"
      currentCourseCodes = [];

      // Attempt to parse the credits from the pool name: e.g. "(30.5 credits)"
      // We'll match something like (X credits) with possible decimals
      const creditsMatch = currentPoolName.match(/\(([\d\.]+)\s*credits?\)/i);
      if (creditsMatch) {
        currentCredits = parseFloat(creditsMatch[1]);
      } else {
        currentCredits = 0;
      }

      continue;
    }

    // Otherwise, it should be a course code line
    // e.g. "ELEC 275" or "General Education Elective"
    currentCourseCodes.push(line);
  }

  // Push the last pool if any
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
interface CourseJson {
  title: string; // e.g. "ENGR 201 Professional Practice and Responsibility (1.5 credits)"
  credits?: number; // e.g. 1.5
  description?: string;
  prerequisites?: string;
  corequisites?: string;
  // ... more if needed
}

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
 * Attempt to parse a course code from "title".
 * E.g. "ENGR 201 Professional Practice ... (1.5 credits)" => "ENGR 201"
 * Adjust logic to suit your data better, or store code as a separate property in JSON.
 */
function extractCodeFromTitle(title: string): string {
  const tokens = title.trim().split(/\s+/);
  if (tokens.length < 2) {
    throw new Error(`Invalid course title format: "${title}"`);
  }
  console.log(tokens[0] + tokens[1]);
  return `${tokens[0]}${tokens[1]}`; // e.g. "ENGR201"
}

function loadCourseJson(jsonFilePath: string): Map<string, CourseJson> {
  const raw = fs.readFileSync(jsonFilePath, "utf-8");
  const data: CourseJson[] = JSON.parse(raw);

  const map = new Map<string, CourseJson>();
  for (const c of data) {
    // If your JSON has an explicit "code" field, use that. Otherwise parse from `title`.
    const code = extractCodeFromTitle(c.title);
    map.set(code.toUpperCase(), c); // store uppercase so we can compare easily
  }
  return map;
}

// -------------------------------------
// 5) Upsert Helpers (SQL Statements)
// -------------------------------------
async function upsertDegree(
  t: sql.Transaction,
  degreeId: string,
  name: string,
  totalCredits: number
) {
  const request = new sql.Request(t);
  request.input("degreeId", sql.VarChar, degreeId);

  const result = await request.query(
    "SELECT id FROM Degree WHERE id = @degreeId"
  );
  if (result.recordset.length === 0) {
    // Insert
    const insertSQL = `
        INSERT INTO Degree (id, name, totalCredits)
        VALUES (@degreeId, @name, @totalCredits)
      `;
    request.input("name", sql.VarChar, name);
    request.input("totalCredits", sql.Int, totalCredits);
    await request.query(insertSQL);
    console.log(`Inserted Degree: ${degreeId}`);
  } else {
    // Update
    const updateSQL = `
        UPDATE Degree
        SET name = @name, totalCredits = @totalCredits
        WHERE id = @degreeId
      `;
    request.input("name", sql.VarChar, name);
    request.input("totalCredits", sql.Int, totalCredits);
    await request.query(updateSQL);
    console.log(`Updated Degree: ${degreeId}`);
  }
}

async function upsertCoursePool(
  t: sql.Transaction,
  poolId: string,
  poolName: string
) {
  const request = new sql.Request(t);
  request.input("poolId", sql.VarChar, poolId);

  const result = await request.query(
    "SELECT id FROM CoursePool WHERE id = @poolId"
  );
  if (result.recordset.length === 0) {
    const insertSQL = `
        INSERT INTO CoursePool (id, name)
        VALUES (@poolId, @poolName)
      `;
    request.input("poolName", sql.VarChar, poolName);
    await request.query(insertSQL);
    console.log(`Inserted CoursePool: ${poolId}`);
  } else {
    const updateSQL = `
        UPDATE CoursePool
        SET name = @poolName
        WHERE id = @poolId
      `;
    request.input("poolName", sql.VarChar, poolName);
    await request.query(updateSQL);
    console.log(`Updated CoursePool: ${poolId}`);
  }
}

async function upsertDegreeXCoursePool(
  t: sql.Transaction,
  dxcpId: string,
  degreeId: string,
  poolId: string,
  creditsRequired: number
) {
  const request = new sql.Request(t);
  request.input("dxcpId", sql.VarChar, dxcpId);
  let result = await request.query(
    "SELECT id FROM DegreeXCoursePool WHERE id = @dxcpId"
  );
  if (result.recordset.length === 0) {
    const insertSQL = `
        INSERT INTO DegreeXCoursePool (id, degree, coursepool, creditsRequired)
        VALUES (@dxcpId, @degree, @poolId, @creditsRequired)
      `;
    request.input("degree", sql.VarChar, degreeId);
    request.input("poolId", sql.VarChar, poolId);
    request.input("creditsRequired", sql.Int, creditsRequired);
    await request.query(insertSQL);
    console.log(`Inserted DegreeXCoursePool: ${dxcpId}`);
  } else {
    const updateSQL = `
        UPDATE DegreeXCoursePool
        SET degree = @degree, coursepool = @poolId, creditsRequired = @creditsRequired
        WHERE id = @dxcpId
      `;
    request.input("degree", sql.VarChar, degreeId);
    request.input("poolId", sql.VarChar, poolId);
    request.input("creditsRequired", sql.Int, creditsRequired);
    await request.query(updateSQL);
    console.log(`Updated DegreeXCoursePool: ${dxcpId}`);
  }
}

async function upsertCourse(
  t: sql.Transaction,
  code: string,
  credits: number,
  description: string
) {
  const request = new sql.Request(t);
  request.input("code", sql.VarChar, code);
  const result = await request.query(
    "SELECT code FROM Course WHERE code = @code"
  );

  if (result.recordset.length === 0) {
    const insertSQL = `
        INSERT INTO Course (code, credits, description)
        VALUES (@code, @credits, @description)
      `;
    request.input("credits", sql.Int, credits);
    request.input("description", sql.VarChar, description);
    await request.query(insertSQL);
    console.log(`Inserted Course: ${code}`);
  } else {
    const updateSQL = `
        UPDATE Course
        SET credits = @credits, description = @description
        WHERE code = @code
      `;
    request.input("credits", sql.Int, credits);
    request.input("description", sql.VarChar, description);
    await request.query(updateSQL);
    // console.log(`Updated Course: ${code}`);
  }
}

async function upsertCourseXCoursePool(
  t: sql.Transaction,
  cxcpId: string,
  courseCode: string,
  poolId: string
) {
  const request = new sql.Request(t);
  request.input("cxcpId", sql.VarChar, cxcpId);

  let result = await request.query(
    "SELECT id FROM CourseXCoursePool WHERE id = @cxcpId"
  );

  if (result.recordset.length === 0) {
    const insertSQL = `
        INSERT INTO CourseXCoursePool (id, coursecode, coursepool)
        VALUES (@cxcpId, @courseCode, @poolId)
      `;
    request.input("courseCode", sql.VarChar, courseCode);
    request.input("poolId", sql.VarChar, poolId);
    await request.query(insertSQL);
    // console.log(`Linked ${courseCode} to ${poolId}`);
  } else {
    const updateSQL = `
        UPDATE CourseXCoursePool
        SET coursecode = @courseCode, coursepool = @poolId
        WHERE id = @cxcpId
      `;
    request.input("courseCode", sql.VarChar, courseCode);
    request.input("poolId", sql.VarChar, poolId);
    await request.query(updateSQL);
    // console.log(`Updated link for ${courseCode} in ${poolId}`);
  }
}

// -------------------------------------
// 6) Main Seed Function
// -------------------------------------
async function seedSoenDegree() {
  try {
    // 6.1) PARSE THE REQUIREMENTS TEXT FILE
    const requirementsFilePath = path.join(
      __dirname,
      "../../course-data",
      "soen-requirements.txt"
    );
    const { degreeId, degreeName, totalCredits, requirements } =
      parseRequirementsFile(requirementsFilePath);

    // 6.2) LOAD COURSE JSON
    const courseListsDir = path.join(
      __dirname,
      "../../course-data/course-lists"
    );
    const courseMap = loadAllCourseJsons(courseListsDir);

    // 6.3) CONNECT + BEGIN TRANSACTION
    console.log("[SEED] Connecting to DB...");
    const pool = await sql.connect(dbConfig);
    const transaction = pool.transaction();
    await transaction.begin();
    console.log("[SEED] Connected. Transaction started.");

    // 6.4) Upsert the Degree
    await upsertDegree(transaction, degreeId, degreeName, totalCredits);

    // 6.5) For each requirement, upsert course pool + link to degree
    for (const req of requirements) {
      // 6.5a) Upsert CoursePool
      await upsertCoursePool(transaction, req.poolId, req.poolName);

      // 6.5b) Upsert DegreeXCoursePool
      const dxcpId = `${degreeId}-${req.poolId}`; // unique bridging ID
      await upsertDegreeXCoursePool(
        transaction,
        dxcpId,
        degreeId,
        req.poolId,
        req.creditsRequired
      );

      // 6.5c) Upsert each Course & Link
      for (const code of req.courseCodes) {
        // If it’s something like "General Education Elective", skip or handle specially
        if (!code.match(/^[A-Z]{2,4}\s*\d{3}/)) {
          // skip if it doesn’t match typical "ENGR 201" pattern
          console.log(`Skipping non-course line: "${code}"`);
          continue;
        }
        const upperCode = code.toUpperCase().replace(/\s+/g, '');
        console.log(`Upserting course: ${upperCode}`);
        const jsonData = courseMap.get(upperCode);

        const cCredits = jsonData?.credits ?? 3; // default 3 if not found
        const cDesc =
          jsonData?.description ?? `No description for ${upperCode}`;
        await upsertCourse(transaction, upperCode, cCredits, cDesc);

        // Link in CourseXCoursePool
        const cxcpId = `${code}-${req.poolId}`;
        await upsertCourseXCoursePool(transaction, cxcpId, upperCode, req.poolId);
      }
    }

    // 6.6) Commit
    await transaction.commit();
    console.log("[SEED] Seeding completed successfully.");
    pool.close();
  } catch (err) {
    console.error("[SEED] Error during seeding:", err);
  }
}

// If running from command line: `ts-node seedSoenDegree.ts`
if (require.main === module) {
  seedSoenDegree();
}

export { seedSoenDegree };
