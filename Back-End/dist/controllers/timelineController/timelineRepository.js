"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const DBController_1 = __importDefault(require("../DBController/DBController"));
const uuid_1 = require("uuid");
class TimelineRepository {
    // Utility to start a transaction
    static async startTransaction() {
        const dbConn = await DBController_1.default.getConnection();
        if (!dbConn)
            throw new Error('Failed to establish database connection.');
        const transaction = dbConn.transaction();
        await transaction.begin();
        return transaction;
    }
    // Find timeline by user_id + name
    static async findTimelineByUserAndName(transaction, user_id, name) {
        return transaction
            .request()
            .input('user_id', DBController_1.default.msSQL.VarChar, user_id)
            .input('name', DBController_1.default.msSQL.VarChar, name)
            .query(`SELECT id FROM Timeline WHERE user_id = @user_id AND name = @name`);
    }
    // Upsert timeline metadata
    static async upsertTimeline(transaction, timeline) {
        const { user_id, name, degree_id, isExtendedCredit } = timeline;
        const lastModified = new Date();
        const existing = await this.findTimelineByUserAndName(transaction, user_id, name);
        if (existing.recordset.length > 0) {
            const timelineId = existing.recordset[0].id;
            await transaction
                .request()
                .input('timelineId', DBController_1.default.msSQL.VarChar, timelineId)
                .input('lastModified', DBController_1.default.msSQL.DateTime, lastModified)
                .input('degree_id', DBController_1.default.msSQL.VarChar, degree_id)
                .input('isExtendedCredit', DBController_1.default.msSQL.Bit, isExtendedCredit)
                .query(`UPDATE Timeline 
           SET last_modified = @lastModified, degree_id = @degree_id, isExtendedCredit = @isExtendedCredit
           WHERE id = @timelineId`);
            return timelineId;
        }
        else {
            const timelineId = (0, uuid_1.v4)();
            await transaction
                .request()
                .input('id', DBController_1.default.msSQL.VarChar, timelineId)
                .input('user_id', DBController_1.default.msSQL.VarChar, user_id)
                .input('degree_id', DBController_1.default.msSQL.VarChar, degree_id)
                .input('name', DBController_1.default.msSQL.VarChar, name)
                .input('lastModified', DBController_1.default.msSQL.DateTime, lastModified)
                .input('isExtendedCredit', DBController_1.default.msSQL.Bit, isExtendedCredit)
                .query(`INSERT INTO Timeline (id, user_id, degree_id, name, last_modified, isExtendedCredit)
           VALUES (@id, @user_id, @degree_id, @name, @lastModified, @isExtendedCredit)`);
            return timelineId;
        }
    }
    // Delete timeline items and their courses
    static async deleteTimelineItems(transaction, timelineId) {
        const itemsResult = await transaction
            .request()
            .input('timelineId', DBController_1.default.msSQL.VarChar, timelineId)
            .query(`SELECT id FROM TimelineItems WHERE timeline_id = @timelineId`);
        const timelineItemIds = itemsResult.recordset.map((i) => i.id);
        if (timelineItemIds.length === 0)
            return;
        // Delete linked courses
        await transaction
            .request()
            .query(`DELETE FROM TimelineItemXCourses WHERE timeline_item_id IN (${timelineItemIds
            .map((id) => `'${id}'`)
            .join(',')})`);
        // Delete items
        await transaction
            .request()
            .input('timelineId', DBController_1.default.msSQL.VarChar, timelineId)
            .query(`DELETE FROM TimelineItems WHERE timeline_id = @timelineId`);
    }
    // Insert a single timeline item + its courses
    static async insertTimelineItem(transaction, timelineId, item) {
        const timelineItemId = (0, uuid_1.v4)();
        await transaction
            .request()
            .input('id', DBController_1.default.msSQL.VarChar, timelineItemId)
            .input('timelineId', DBController_1.default.msSQL.VarChar, timelineId)
            .input('season', DBController_1.default.msSQL.VarChar, item.season)
            .input('year', DBController_1.default.msSQL.Int, item.year)
            .query(`INSERT INTO TimelineItems (id, timeline_id, season, year) VALUES (@id, @timelineId, @season, @year)`);
        const uniqueCourses = Array.from(new Set(item.courses));
        for (const courseCode of uniqueCourses) {
            await transaction
                .request()
                .input('timelineItemId', DBController_1.default.msSQL.VarChar, timelineItemId)
                .input('courseCode', DBController_1.default.msSQL.VarChar, courseCode)
                .query(`INSERT INTO TimelineItemXCourses (timeline_item_id, coursecode) VALUES (@timelineItemId, @courseCode)`);
        }
    }
    // Batch insert timeline items
    static async insertTimelineItems(transaction, timelineId, items) {
        for (const item of items) {
            await this.insertTimelineItem(transaction, timelineId, item);
        }
    }
    // Fetch all timelines for a user, including items and courses
    static async getTimelinesByUser(transaction, user_id) {
        const result = await transaction
            .request()
            .input('user_id', DBController_1.default.msSQL.VarChar, user_id).query(`
        SELECT t.id, t.user_id, t.degree_id, t.name, t.last_modified, t.isExtendedCredit,
               ti.id AS itemId, ti.season, ti.year, tic.coursecode
        FROM Timeline t
        LEFT JOIN TimelineItems ti ON t.id = ti.timeline_id
        LEFT JOIN TimelineItemXCourses tic ON ti.id = tic.timeline_item_id
        WHERE t.user_id = @user_id
        ORDER BY ti.year, ti.season
      `);
        const timelinesMap = {};
        for (const row of result.recordset) {
            if (!timelinesMap[row.id]) {
                timelinesMap[row.id] = {
                    id: row.id,
                    user_id: row.user_id,
                    degree_id: row.degree_id,
                    name: row.name,
                    last_modified: row.last_modified,
                    isExtendedCredit: row.isExtendedCredit,
                    items: [],
                };
            }
            if (row.itemId) {
                let item = timelinesMap[row.id].items.find((i) => i.id === row.itemId);
                if (!item) {
                    item = {
                        id: row.itemId,
                        season: row.season,
                        year: row.year,
                        courses: [],
                    };
                    timelinesMap[row.id].items.push(item);
                }
                if (row.coursecode) {
                    item.courses.push(row.coursecode);
                }
            }
        }
        return Object.values(timelinesMap);
    }
    // Delete a timeline
    static async deleteTimeline(transaction, timelineId) {
        const result = await transaction
            .request()
            .input('id', DBController_1.default.msSQL.VarChar, timelineId)
            .query(`DELETE FROM Timeline OUTPUT DELETED.id WHERE id = @id`);
        return result.rowsAffected[0];
    }
}
exports.default = TimelineRepository;
//# sourceMappingURL=timelineRepository.js.map