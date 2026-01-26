"use strict";
/**
 * Purpose:
 *  - Helpers that read/write the DegreeXCoursePool table.
 *  - Provides create, read (list), update and delete operations for degree ↔ coursepool mappings.
 * Notes:
 *  - Functions return a DB_OPS enum to signal high-level outcome.
 *  - Errors are logged to console and reported to Sentry.
 *  - Types for inputs are defined in DegreeXCP_types.d.ts and CoursePool types in coursepool_types.
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
const DBController_1 = __importDefault(require("../DBController/DBController"));
const DB_Ops_1 = __importDefault(require("../../Util/DB_Ops"));
const crypto_1 = require("crypto");
const Sentry = __importStar(require("@sentry/node"));
const log = console.log;
/**
 * Creates a new DegreeXCoursePool record in the database.
 *
 * @param {DegreeXCPTypes.NewDegreeXCP} new_record - The new degreeXcoursepool record to be created.
 * @returns {Promise<DB_OPS>} - The result of the operation (SUCCESS, MOSTLY_OK, or FAILURE).
 */
async function createDegreeXCP(new_record) {
    const dbConn = await DBController_1.default.getConnection();
    if (dbConn) {
        const { degree_id, coursepool_id, credits } = new_record;
        const record_id = (0, crypto_1.randomUUID)();
        try {
            const result = await dbConn
                .request()
                .input('id', DBController_1.default.msSQL.VarChar, record_id)
                .input('degree', DBController_1.default.msSQL.VarChar, degree_id)
                .input('coursepool', DBController_1.default.msSQL.VarChar, coursepool_id)
                .input('creditsRequired', DBController_1.default.msSQL.Int, credits)
                .query('INSERT INTO DegreeXCoursePool \
              ( id, degree, coursepool, creditsRequired )\
              OUTPUT INSERTED.id\
              VALUES\
              (@id, @degree, @coursepool, @creditsRequired)');
            if (undefined === result.recordset) {
                // if insert didn't return expected insert id
                log('Error inserting degreeXcoursepool record: ' + result.recordset);
                Sentry.captureMessage('Error inserting degreeXcoursepool record: ' + result.recordset);
                return DB_Ops_1.default.MOSTLY_OK;
            }
            else {
                return DB_Ops_1.default.SUCCESS;
            }
        }
        catch (error) {
            Sentry.captureException(error);
            log('Error in degreeXcoursepool creation\n', error);
        }
    }
    return DB_Ops_1.default.FAILURE;
}
/**
 * Retrieves all course pools associated with a specific degree.
 *
 * @param {string} degree_id - The ID of the degree.
 * @returns {Promise<{course_pools: CoursePoolTypes.CoursePoolItem[]} | undefined>} - A list of course pools associated with the degree, or undefined if an error occurs.
 */
async function getAllDegreeXCP(degree_id) {
    const dbConn = await DBController_1.default.getConnection();
    if (dbConn) {
        try {
            const result = await dbConn
                .request()
                .input('degree_id', DBController_1.default.msSQL.VarChar, degree_id)
                .query('SELECT cp.id, cp.name\
              FROM CoursePool cp\
              JOIN DegreeXCoursePool dxcp ON cp.id = dxcp.coursepool\
              WHERE dxcp.degree = @degree_id');
            return {
                course_pools: result.recordset,
            };
        }
        catch (error) {
            Sentry.captureException(error);
            log('Error fetching all course pools for given degree id\n', error);
        }
    }
    return undefined;
}
/**
 * Updates an existing DegreeXCoursePool record.
 *
 * @param {DegreeXCPTypes.DegreeXCPItem} update_record - The degreeXcoursepool record with updated information.
 * @returns {Promise<DB_OPS>} - The result of the operation (SUCCESS, MOSTLY_OK, or FAILURE).
 *
 * here the SET clause in SQL should include commas which it lacks at the moment
 */
async function updateDegreeXCP(update_record) {
    const dbConn = await DBController_1.default.getConnection();
    if (dbConn) {
        const { id, degree_id, coursepool_id, credits } = update_record;
        try {
            const result = await dbConn
                .request()
                .input('id', DBController_1.default.msSQL.VarChar, id)
                .input('degree', DBController_1.default.msSQL.VarChar, degree_id)
                .input('coursepool', DBController_1.default.msSQL.VarChar, coursepool_id)
                .input('creditsRequired', DBController_1.default.msSQL.Int, credits)
                .query('UPDATE DegreeXCoursePool  \
              SET \
                degree          = @degree \
                coursepool      = @coursepool \
                creditsRequired = @creditsRequired \
              OUTPUT INSERTED.id \
              WHERE   id = @id');
            if (result.recordset.length > 0 && id === result.recordset[0].id) {
                return DB_Ops_1.default.SUCCESS;
            }
            else {
                return DB_Ops_1.default.MOSTLY_OK;
            }
        }
        catch (error) {
            Sentry.captureException(error);
            log('Error in updating degreeXcoursepool item\n', error);
        }
    }
    return DB_Ops_1.default.FAILURE;
}
/**
 * Removes a DegreeXCoursePool record from the database.
 *
 * @param {DegreeXCPTypes.DegreeXCP} delete_record - The degreeXcoursepool record to be deleted.
 * @returns {Promise<DB_OPS>} - The result of the operation (SUCCESS, MOSTLY_OK, or FAILURE).
 */
async function removeDegreeXCP(delete_record) {
    const dbConn = await DBController_1.default.getConnection();
    if (dbConn) {
        const { degree_id, coursepool_id } = delete_record;
        try {
            const result = await dbConn
                .request()
                .input('degree', DBController_1.default.msSQL.VarChar, degree_id)
                .input('coursepool', DBController_1.default.msSQL.VarChar, coursepool_id)
                .query('DELETE FROM DegreeXCoursePool\
                  OUTPUT DELETED.degree\
                  WHERE degree     = @degree\
                  AND   coursepool = @coursepool');
            if (result.recordset.length > 0 &&
                result.recordset[0].degree === degree_id) {
                return DB_Ops_1.default.SUCCESS;
            }
            else {
                return DB_Ops_1.default.MOSTLY_OK;
            }
        }
        catch (error) {
            Sentry.captureException(error);
            log('Error in deleting degreeXcoursepool item\n', error);
        }
    }
    return DB_Ops_1.default.FAILURE;
}
// Exported controller API
const DegreeXCPController = {
    createDegreeXCP,
    getAllDegreeXCP,
    updateDegreeXCP,
    removeDegreeXCP,
};
exports.default = DegreeXCPController;
//# sourceMappingURL=DegreeXCPController.js.map