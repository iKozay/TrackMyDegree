"use strict";
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
exports.seedDatabase = seedDatabase;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const promises_1 = require("node:fs/promises");
const Course_1 = require("../../models/Course");
const Degree_1 = require("../../models/Degree");
const Sentry = __importStar(require("@sentry/node"));
// -------------------------------------
// Parse Requirements File
// -------------------------------------
function parseRequirementsFile(filePath) {
    const text = node_fs_1.default.readFileSync(filePath, 'utf-8');
    const lines = text.split('\n').map((l) => l.trim());
    let degreeId = '';
    let degreeName = '';
    let totalCredits = 120;
    let isAddon = false;
    const requirements = [];
    let currentPoolName = '';
    let currentCredits = 0;
    let currentCourseCodes = [];
    function pushCurrentPool() {
        if (currentPoolName) {
            const uniquePoolName = `${degreeId} - ${currentPoolName}`;
            requirements.push({
                poolId: uniquePoolName
                    .toLowerCase()
                    .replaceAll(/[^a-z0-9]+/g, '-')
                    .replaceAll('-credits', ''),
                poolName: uniquePoolName,
                creditsRequired: currentCredits,
                courseCodes: currentCourseCodes.filter(Boolean),
            });
        }
    }
    function processConfigLine(line) {
        if (line.includes('DegreeID=')) {
            degreeId = line.split('=')[1].trim();
            return true;
        }
        if (line.includes('DegreeName=')) {
            degreeName = line.split('=')[1].trim();
            return true;
        }
        if (line.includes('TotalCredits=')) {
            totalCredits = Number.parseFloat(line.split('=')[1].trim());
            return true;
        }
        if (line.includes('Addon')) {
            isAddon = true;
            return true;
        }
        return false;
    }
    function processBracketLine(line) {
        const bracketRegex = /^\[(.*)\]$/;
        const bracketMatch = bracketRegex.exec(line);
        if (bracketMatch) {
            pushCurrentPool();
            currentPoolName = bracketMatch[1];
            currentCourseCodes = [];
            const creditsRegex = /\(([\d.]+)\s*credits?\)/i;
            const creditsMatch = creditsRegex.exec(currentPoolName);
            currentCredits = creditsMatch ? Number.parseFloat(creditsMatch[1]) : 0;
            return true;
        }
        return false;
    }
    for (const line of lines) {
        if (!line || line.startsWith('#'))
            continue;
        if (processConfigLine(line))
            continue;
        if (processBracketLine(line))
            continue;
        currentCourseCodes.push(line);
    }
    pushCurrentPool();
    return { degreeId, degreeName, totalCredits, requirements, isAddon };
}
// -------------------------------------
// Load Course JSONs
// -------------------------------------
function loadAllCourseJsons(dirPath) {
    const courseMap = new Map();
    function recurseDirectory(currentPath) {
        const entries = node_fs_1.default.readdirSync(currentPath, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = node_path_1.default.join(currentPath, entry.name);
            if (entry.isDirectory()) {
                recurseDirectory(fullPath);
            }
            else if (entry.isFile() && entry.name.toLowerCase().endsWith('.json')) {
                try {
                    const raw = node_fs_1.default.readFileSync(fullPath, 'utf-8');
                    const data = JSON.parse(raw);
                    for (const c of data) {
                        const code = extractCodeFromTitle(c.title).toUpperCase();
                        if (courseMap.has(code)) {
                            console.warn(`Warning: Duplicate course code "${code}" found in file ${fullPath}. Overwriting.`);
                        }
                        courseMap.set(code, c);
                    }
                }
                catch (err) {
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
function extractCodeFromTitle(title) {
    const titleRegex = /^([A-Z]{2,4})\s*(\d{3})/;
    const match = titleRegex.exec(title);
    if (!match)
        throw new Error(`Invalid course title format: "${title}"`);
    return `${match[1]}${match[2]}`.toUpperCase();
}
// isValidCourseCode checks if the code matches patterns like "CS101" or "MATH240"
function isValidCourseCode(code) {
    return /^[A-Z]{2,4}\d{3}$/.test(code);
}
// isCreditRequirement checks if the code matches patterns like "60CR"
function isCreditRequirement(code) {
    return /^\d+CR$/i.test(code);
}
// -------------------------------------
// Parse Requisites (Prerequisites/Corequisites)
// -------------------------------------
function parseRequisites(requisiteStr) {
    if (!requisiteStr)
        return [];
    if (typeof requisiteStr !== 'string') {
        console.warn(`Expected string for requisites but got ${typeof requisiteStr}. Skipping.`);
        return [];
    }
    const cleanedStr = requisiteStr.replaceAll(/[;.]/g, ',');
    const parts = cleanedStr
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);
    const requisites = [];
    function processCode(code) {
        const normalizedCode = code.replaceAll(/\s+/g, '').toUpperCase();
        if (isValidCourseCode(normalizedCode)) {
            requisites.push(normalizedCode);
        }
        else if (!isCreditRequirement(normalizedCode)) {
            console.warn(`Invalid course code "${normalizedCode}" in requisites. Skipping.`);
        }
    }
    function processAlternatives(part) {
        const alternatives = part.split('/').map((c) => c.trim());
        for (const alt of alternatives) {
            processCode(alt);
        }
    }
    for (const part of parts) {
        if (part.includes('/')) {
            processAlternatives(part);
        }
        else {
            processCode(part);
        }
    }
    return requisites;
}
// -------------------------------------
// Upsert Course
// -------------------------------------
async function upsertCourse(code, title, credits, description, offeredIn, prerequisites, corequisites) {
    try {
        await Course_1.Course.findByIdAndUpdate(code, {
            _id: code,
            title,
            credits,
            description,
            offeredIn,
            prerequisites,
            corequisites,
        }, { upsert: true, new: true });
        console.log(`Upserted Course: ${code}`);
    }
    catch (error) {
        console.error(`Error upserting course ${code}:`, error);
        throw error;
    }
}
// -------------------------------------
// Upsert Degree with Embedded Course Pools
// -------------------------------------
async function upsertDegree(degreeId, degreeName, totalCredits, isAddon, requirements) {
    try {
        const coursePools = requirements.map((req) => {
            const courses = [];
            for (const codeStr of req.courseCodes) {
                if (!codeStr)
                    continue;
                // Handle alternatives (comma or slash separated)
                if (codeStr.includes(',') || codeStr.includes('/')) {
                    const separator = codeStr.includes('/') ? '/' : ',';
                    const alternatives = codeStr
                        .split(separator)
                        .map((c) => c.trim().toUpperCase().replaceAll(/\s+/g, ''));
                    courses.push(...alternatives.filter((c) => /^[A-Z]{2,4}\d{3}$/.test(c)));
                }
                else {
                    const code = codeStr.toUpperCase().replaceAll(/\s+/g, '');
                    // Only add valid course codes (skip credit requirements like "60CR")
                    if (/^[A-Z]{2,4}\d{3}$/.test(code)) {
                        courses.push(code);
                    }
                }
            }
            return {
                id: req.poolId,
                name: req.poolName,
                creditsRequired: req.creditsRequired,
                courses: [...new Set(courses)], // Remove duplicates
            };
        });
        await Degree_1.Degree.findByIdAndUpdate(degreeId, {
            _id: degreeId,
            name: degreeName,
            totalCredits,
            isAddon,
            coursePools,
        }, { upsert: true, new: true });
        console.log(`Upserted Degree: ${degreeName} (${degreeId})`);
    }
    catch (error) {
        console.error(`Error upserting degree ${degreeId}:`, error);
        throw error;
    }
}
// -------------------------------------
// Main Seed Function
// -------------------------------------
async function seedDatabase() {
    try {
        console.log('[SEED] Starting database seeding...');
        // 1. Define paths
        const requirementsDir = node_path_1.default.join(__dirname, '../../course-data/degree-reqs');
        const courseListsDir = node_path_1.default.join(__dirname, '../../course-data/course-lists/updated_courses');
        // 2. Load all course JSONs
        console.log('[SEED] Loading course data...');
        const courseMap = loadAllCourseJsons(courseListsDir);
        console.log(`[SEED] Loaded ${courseMap.size} courses`);
        // 3. Upsert all courses
        console.log('[SEED] Upserting courses...');
        for (const [code, courseData] of courseMap.entries()) {
            const title = courseData.title;
            const credits = courseData.credits ?? 3;
            const description = courseData.description ?? `No description for ${code}`;
            const offeredIn = courseData.offeredIn ?? [];
            const prerequisites = parseRequisites(courseData.prerequisites);
            const corequisites = parseRequisites(courseData.corequisites);
            await upsertCourse(code, title, credits, description, offeredIn, prerequisites, corequisites);
        }
        console.log('[SEED] All courses upserted successfully');
        // 4. Read all requirement files
        console.log('[SEED] Loading degree requirements...');
        const files = await (0, promises_1.readdir)(requirementsDir);
        const requirementFiles = files.filter((file) => file.endsWith('.txt'));
        if (requirementFiles.length === 0) {
            console.warn('[SEED] No requirement files found');
            return;
        }
        // 5. Upsert all degrees
        console.log('[SEED] Upserting degrees...');
        for (const file of requirementFiles) {
            const filePath = node_path_1.default.join(requirementsDir, file);
            console.log(`[SEED] Processing: ${file}`);
            const { degreeId, degreeName, totalCredits, requirements, isAddon } = parseRequirementsFile(filePath);
            await upsertDegree(degreeId, degreeName, totalCredits, isAddon, requirements);
        }
        console.log('[SEED] Database seeding completed successfully!');
    }
    catch (error) {
        Sentry.captureException(error);
        console.error('[SEED] Error during database seeding:', error);
        throw error;
    }
}
// If running from command line: `ts-node seedService.ts`
if (require.main === module) {
    (async () => {
        // NOSONAR - need to use async IIFE here due to top-level await not being supported everywhere
        try {
            await seedDatabase();
            console.log('Seed completed');
            process.exit(0);
        }
        catch (err) {
            console.error('Seed failed:', err);
            process.exit(1);
        }
    })();
}
//# sourceMappingURL=seedService.js.map