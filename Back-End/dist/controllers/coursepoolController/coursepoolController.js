"use strict";
/**
 * Purpose:
 *  - Controller for managing CoursePool entities (create, read, update, delete).
 *  - Encapsulates all DB operations tied to course pools.
 * Notes:
 *  - Returns DB_OPS enum to standardize operation results (SUCCESS, FAILURE, etc.)
 *  - Relies on DBController for SQL Server connections.
 *  - Errors logged locally and reported to Sentry.
 *  - Uses coursepool_types.d.ts for strong typing of course pool objects.
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
const DBController_1 = __importDefault(require("@controllers/DBController/DBController"));
const DB_Ops_1 = __importDefault(require("@Util/DB_Ops"));
const crypto_1 = require("crypto");
const Sentry = __importStar(require("@sentry/node"));
const log = console.log;
/**
 * Creates a new course pool.
 *
 * @param {string} pool_name - The name of the course pool.
 * @returns {Promise<DB_OPS>} - Returns a DB operation status.
 */
function createCoursePool(pool_name) {
    return __awaiter(this, void 0, void 0, function* () {
        const dbConn = yield DBController_1.default.getConnection();
        if (dbConn) {
            let record = {
                id: (0, crypto_1.randomUUID)(),
                name: pool_name,
            };
            try {
                const result = yield dbConn
                    .request()
                    .input('id', DBController_1.default.msSQL.VarChar, record.id)
                    .input('name', DBController_1.default.msSQL.VarChar, record.name)
                    .query('INSERT INTO CoursePool ( id, name )\
              OUTPUT INSERTED.id\
              VALUES                 (@id, @name)');
                // INSERT uses OUTPUT INSERTED.id so we expect result.recordset to contain the inserted id.
                // If result.recordset is undefined the code treats it as a partial success (MOSTLY_OK).
                // This is how almost all the MOSTLY_OK returns behave in this file and other controllers till now.
                if (undefined === result.recordset) {
                    log('Error inserting coursepool record: ' + result.recordset);
                    return DB_Ops_1.default.MOSTLY_OK;
                }
                else {
                    return DB_Ops_1.default.SUCCESS;
                }
            }
            catch (error) {
                Sentry.captureException({ error: 'Error in coursepool creation' });
                log('Error in coursepool creation\n', error);
            }
        }
        return DB_Ops_1.default.FAILURE;
    });
}
/**
 * Retrieves all course pools.
 *
 * @returns {Promise<{ course_pools: CoursePoolTypes.CoursePoolItem[] } | undefined>}
 */
function getAllCoursePools() {
    return __awaiter(this, void 0, void 0, function* () {
        const dbConn = yield DBController_1.default.getConnection();
        if (dbConn) {
            try {
                const result = yield dbConn.request().query('SELECT * FROM CoursePool');
                // returns empty array of table is empty
                return {
                    course_pools: result.recordset,
                };
            }
            catch (error) {
                Sentry.captureException({
                    error: 'Error fetching all course pools',
                });
                log('Error fetching all course pools\n', error);
            }
        }
        return undefined;
    });
}
/**
 * Retrieves a specific course pool by ID.
 *
 * @param {string} pool_id - The course pool ID.
 * @returns {Promise<CoursePoolTypes.CoursePoolItem | undefined>}
 */
function getCoursePool(pool_id) {
    return __awaiter(this, void 0, void 0, function* () {
        const dbConn = yield DBController_1.default.getConnection();
        if (dbConn) {
            try {
                const result = yield dbConn
                    .request()
                    .input('id', DBController_1.default.msSQL.VarChar, pool_id)
                    .query('SELECT * FROM CoursePool\
              WHERE id = @id');
                return result.recordset[0];
            }
            catch (error) {
                Sentry.captureException({
                    error: 'Error fetching course pool by ID',
                });
                log('Error fetching course pool by ID\n', error);
            }
        }
        return undefined;
    });
}
/**
 * Updates an existing course pool.
 *
 * @param {CoursePoolTypes.CoursePoolItem} update_info - The course pool details to update.
 * @returns {Promise<DB_OPS>}
 */
function updateCoursePool(update_info) {
    return __awaiter(this, void 0, void 0, function* () {
        const dbConn = yield DBController_1.default.getConnection();
        if (dbConn) {
            const { id, name } = update_info;
            try {
                const result = yield dbConn
                    .request()
                    .input('id', DBController_1.default.msSQL.VarChar, id)
                    .input('name', DBController_1.default.msSQL.VarChar, name)
                    .query('UPDATE CoursePool  \
              SET   name = @name \
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
                Sentry.captureException({
                    error: 'Error in updating course pool item',
                });
                log('Error in updating course pool item\n', error);
            }
        }
        return DB_Ops_1.default.FAILURE;
    });
}
/**
 * Removes a course pool by ID.
 *
 * @param {string} pool_id - The course pool ID to remove.
 * @returns {Promise<DB_OPS>}
 */
function removeCoursePool(pool_id) {
    return __awaiter(this, void 0, void 0, function* () {
        const dbConn = yield DBController_1.default.getConnection();
        if (dbConn) {
            try {
                const result = yield dbConn
                    .request()
                    .input('id', DBController_1.default.msSQL.VarChar, pool_id)
                    .query('DELETE FROM CoursePool\
                  OUTPUT DELETED.id\
                  WHERE id = @id');
                if (result.recordset.length > 0 && result.recordset[0].id === pool_id) {
                    return DB_Ops_1.default.SUCCESS;
                }
                else {
                    return DB_Ops_1.default.MOSTLY_OK;
                }
            }
            catch (error) {
                Sentry.captureException({
                    error: 'Error in deleting course pool item',
                });
                log('Error in deleting course pool item\n', error);
            }
        }
        return DB_Ops_1.default.FAILURE;
    });
}
const coursepoolController = {
    createCoursePool,
    getAllCoursePools,
    getCoursePool,
    updateCoursePool,
    removeCoursePool,
};
exports.default = coursepoolController;
