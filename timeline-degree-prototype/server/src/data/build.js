#!/usr/bin/env node
// build_catalog.mjs
import { readFile } from "node:fs/promises";


const DEGREE_PATH = "./src/data/degree.json";
const POOLS_PATH = "./src/data/course_pool.json";
const COURSES_PATH = "./src/data/courses.json";

function generateFourYearSemesters() {
    const seasons = ["FALL", "WINTER", "SUMMER"];
    const out = [];
    let i = 0, year = 2025; // start at FALL 2025
    while (true) {
        const label = `${seasons[i]} ${year}`;
        out.push({ [label]: [] });
        if (label === "WINTER 2029") break;
        i = (i + 1) % 3;
        if (i === 0) year++; // after SUMMER -> next FALL bumps year
    }
    return out;
}

// Returns an array of groups; each group is { anyOf: [courseCode, ...] }
// AND-of-ORs: returns [{ anyOf: [ ... ] }, ...]
function parseRequisites(str) {
    if (!str || typeof str !== "string") return [];
    // normalize spaces, remove trailing period(s)
    let s = str.replace(/\.+\s*$/, "").replace(/\s+/g, " ").trim();

    // Top-level AND: split on ';', ',' or ' and ' (case-insensitive)
    const andParts = s.split(/\s*;|\s*,\s*|\s+\band\b\s+/i).filter(Boolean);

    const groups = [];
    for (const part of andParts) {
        // OR within a part: split on '/' or ' or '
        const options = part.split(/\s*\/\s*|\s+\bor\b\s+/i)
            .map(t => t.trim())
            .filter(t => t.length > 0);

        // De-dup within the group, preserve order
        const seen = new Set();
        const anyOf = options.filter(x => (seen.has(x) ? false : (seen.add(x), true)));

        if (anyOf.length) groups.push({ anyOf });
    }
    return groups;
}


function normalizeOffered(offeredIN) {
    if (!Array.isArray(offeredIN)) return [];
    const out = [];
    for (const x of offeredIN) {
        const s = String(x || "").trim().toLowerCase();
        if (!s) continue;
        if (s.startsWith("fal")) out.push("Fall");
        else if (s.startsWith("win")) out.push("Winter");
        else if (s.startsWith("sum")) out.push("Summer");
    }
    return out;
}

// statuses: "planned" | "completed" | "inprogress" | "incomplete"
function addDefaultStatus(courses_set) {
    for (const c of Object.values(courses_set)) {
        c.status = { status: "incomplete", semester: null };
    }
    return courses_set; // same object, mutated
}

/**
 * Ensure every requisite token referenced in prerequisites/corequisites
 * exists in courses_set. Missing ones are added as empty placeholders.
 *
 * Assumes each course has:
 *   prerequisites: [{ anyOf: [...] }, ...]  // from your parseRequisites()
 *   corequisites: [{ anyOf: [...] }, ...]
 */
function addMissingFromRequisites(courses_set) {
    const ensure = (id) => {
        if (courses_set[id]) return;

        courses_set[id] = {
            id,
            title: "",
            credits: null,
            description: "",
            offeredIN: [],     // same key spelling as your input
            prerequisites: "", // keep as empty string (same shape as input)
            corequisites: "",
            status: { status: "completed", semester: null }
        };

        console.log(courses_set[id].status.status);
    };

    const visitGroups = (groups) => {
        if (!Array.isArray(groups)) return;
        for (const g of groups) {
            if (!g || !Array.isArray(g.anyOf)) continue;
            for (const token of g.anyOf) ensure(token);
        }
    };

    for (const course of Object.values(courses_set)) {
        visitGroups(course.prerequisites);
        visitGroups(course.corequisites);
    }
    return courses_set;
}




// ---------------- Core builder ----------------
function buildTimeline(degree, coursePools, courses) {

    const summary = {};
    const semesters = generateFourYearSemesters();
    let courses_set = Object.fromEntries(courses.map(c => {
        const id = String(c.id).trim();
        return [id, {
            ...c,
            offeredIN: normalizeOffered(c.offeredIN),          // normalized alias
            prerequisites: parseRequisites(c.prerequisites),
            corequisites: parseRequisites(c.corequisites),
        }];
    })
    );
    courses_set = addDefaultStatus(courses_set);
    courses_set = addMissingFromRequisites(courses_set);


    summary["degree"] = degree;
    summary["pools"] = coursePools;
    summary["semesters"] = semesters;
    summary["courses"] = courses_set;

    return summary;

}

// ---------------- Main ----------------
export const build = async () => {
    try {
        const [degreeRaw, poolsRaw, coursesRaw] = await Promise.all([
            readFile(DEGREE_PATH, "utf8"),
            readFile(POOLS_PATH, "utf8"),
            readFile(COURSES_PATH, "utf8")
        ]);
        const degree = JSON.parse(degreeRaw);
        const pools = JSON.parse(poolsRaw);
        const courses = JSON.parse(coursesRaw);

        const summary = buildTimeline(degree, pools, courses);
        return summary;
    } catch (err) {
        console.error("❌ Error:", err?.message || err);
        process.exit(1);
    }
}