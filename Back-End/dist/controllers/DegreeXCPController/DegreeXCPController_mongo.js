"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Degree_1 = require("../../models/Degree");
const DB_Ops_1 = __importDefault(require("../../Util/DB_Ops"));
/**
 * Creates a new DegreeXCoursePool record in the database.
 *
 * @param {DegreeXCPTypes.NewDegreeXCP} new_record - The new degreeXcoursepool record to be created.
 * @returns {Promise<DB_OPS>} - The result of the operation (SUCCESS, MOSTLY_OK, or FAILURE).
 */
function createDegreeXCP(new_record) {
    return __awaiter(this, void 0, void 0, function* () {
        // Destructure the new_record object
        const { degree_id, coursepool_id, credits } = new_record;
        // Check if the degree exists
        const degree = yield Degree_1.Degree.findById(degree_id);
        if (!degree) {
            console.log(`Degree with id ${degree_id} not found.`);
            return DB_Ops_1.default.FAILURE;
        }
        // Check if the course pool already exists in the degree
        const coursePool = degree.coursePools.find(cp => cp.id === coursepool_id);
        if (coursePool) {
            console.log(`CoursePool with id ${coursepool_id} already exists in Degree ${degree_id}.`);
            return DB_Ops_1.default.FAILURE;
        }
        // Add the new course pool to the degree
        degree.coursePools.push({
            id: coursepool_id,
            name: "<CoursePool Name>", // TODO: Set name appropriately
            creditsRequired: credits,
            courses: []
        });
        yield degree.save();
        return DB_Ops_1.default.SUCCESS;
    });
}
/**
 * Retrieves all course pools associated with a specific degree.
 *
 * @param {string} degree_id - The ID of the degree.
 * @returns {Promise<{course_pools: CoursePoolTypes.CoursePoolItem[]} | undefined>} - A list of course pools associated with the degree, or undefined if an error occurs.
 */
function getAllDegreeXCP(degree_id) {
    return __awaiter(this, void 0, void 0, function* () {
        const degree = yield Degree_1.Degree.findById(degree_id);
        if (degree) {
            return { course_pools: degree.coursePools };
        }
        else {
            console.log(`Degree with id ${degree_id} not found.`);
        }
        return { course_pools: [] };
    });
}
/**
 * Updates an existing DegreeXCoursePool record.
 *
 * @param {DegreeXCPTypes.DegreeXCPItem} update_record - The degreeXcoursepool record with updated information.
 * @returns {Promise<DB_OPS>} - The result of the operation (SUCCESS, MOSTLY_OK, or FAILURE).
 *
 * here the SET clause in SQL should include commas which it lacks at the moment
 */
function updateDegreeXCP(update_record) {
    return __awaiter(this, void 0, void 0, function* () {
        // Destructure the update_record object
        // Here we ignore the id field because it refers to the DegreeXCoursePool record itself
        // and we don't need it for the MongoDB operation
        const { id, degree_id, coursepool_id, credits } = update_record;
        // Find the degree that currently contains the coursepool_id
        let degree = yield findCoursePool(coursepool_id);
        const coursePool = degree === null || degree === void 0 ? void 0 : degree.coursePools.find(cp => cp.id === coursepool_id);
        // If course pool not found in any degree
        if (!degree || !coursePool) {
            console.log(`CoursePool with id ${coursepool_id} not found in any degree.`);
            return DB_Ops_1.default.FAILURE;
        }
        // If the course pool is already in the target degree, just update it
        if (degree._id.toString() === degree_id) {
            coursePool.creditsRequired = credits;
            yield degree.save();
            return DB_Ops_1.default.SUCCESS;
        }
        // If different degrees, move the course pool
        // First, check if target degree exists
        const targetDegree = yield Degree_1.Degree.findById(degree_id);
        if (!targetDegree) {
            console.log(`Target degree with id ${degree_id} not found.`);
            return DB_Ops_1.default.FAILURE;
        }
        // Remove from current degree
        degree.coursePools.pull({ id: coursepool_id });
        yield degree.save();
        // Add to target degree with updated credits
        targetDegree.coursePools.push({
            id: coursepool_id,
            name: coursePool.name,
            creditsRequired: credits,
            courses: coursePool.courses
        });
        yield targetDegree.save();
        return DB_Ops_1.default.SUCCESS;
    });
}
/**
 * Removes a DegreeXCoursePool record from the database.
 *
 * @param {DegreeXCPTypes.DegreeXCP} delete_record - The degreeXcoursepool record to be deleted.
 * @returns {Promise<DB_OPS>} - The result of the operation (SUCCESS, MOSTLY_OK, or FAILURE).
 */
function removeDegreeXCP(delete_record) {
    return __awaiter(this, void 0, void 0, function* () {
        const { degree_id, coursepool_id } = delete_record;
        // Find the degree that contains the coursepool_id
        const degree = yield Degree_1.Degree.findById(degree_id);
        const coursePool = degree === null || degree === void 0 ? void 0 : degree.coursePools.find(cp => cp.id === coursepool_id);
        if (!degree || !coursePool) {
            console.log(`CoursePool with id ${coursepool_id} not found in Degree ${degree_id}.`);
            return DB_Ops_1.default.FAILURE;
        }
        // Remove the course pool from the degree
        degree.coursePools.pull({ id: coursepool_id });
        yield degree.save();
        return DB_Ops_1.default.SUCCESS;
    });
}
function findCoursePool(coursepool_id) {
    return __awaiter(this, void 0, void 0, function* () {
        const allDegrees = yield Degree_1.Degree.find();
        for (const degree of allDegrees) {
            const foundCoursePool = degree.coursePools.find(cp => cp.id === coursepool_id);
            if (foundCoursePool) {
                return degree;
            }
        }
        return null;
    });
}
// Exported controller API
const DegreeXCPController = {
    createDegreeXCP,
    getAllDegreeXCP,
    updateDegreeXCP,
    removeDegreeXCP,
};
exports.default = DegreeXCPController;
