"use strict";
/**
 * Provides timeline-specific operations with improved performance and consistency.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.timelineController = exports.TimelineController = void 0;
const BaseMongoController_1 = require("./BaseMongoController");
const models_1 = require("../../models");
class TimelineController extends BaseMongoController_1.BaseMongoController {
    constructor() {
        super(models_1.Timeline, 'Timeline');
    }
    /**
     * Save or update a timeline (upsert operation)
     * Optimized with single database operation
     */
    async saveTimeline(timeline) {
        try {
            const { user_id, name, degree_id, items, isExtendedCredit } = timeline;
            if (!user_id || !name || !degree_id) {
                throw new Error('User ID, timeline name, and degree ID are required');
            }
            // Map API fields (snake_case) to model fields (camelCase)
            // Ensure items have _id field
            const mappedItems = (items || []).map((item, index) => ({
                _id: item._id || `item-${index}`,
                season: item.season,
                year: item.year,
                courses: item.courses || [],
            }));
            const result = await this.upsert({ userId: user_id, name, degreeId: degree_id }, {
                userId: user_id,
                name,
                degreeId: degree_id,
                items: mappedItems,
                isExtendedCredit,
                last_modified: new Date(),
            });
            if (!result.success) {
                throw new Error('Failed to save timeline');
            }
            return this.formatTimelineResponse(result.data);
        }
        catch (error) {
            this.handleError(error, 'saveTimeline');
        }
    }
    /**
     * Get all timelines for a user
     */
    async getTimelinesByUser(user_id) {
        try {
            const result = await this.findAll({ userId: user_id }, { sort: { last_modified: -1 } });
            if (!result.success) {
                throw new Error('Failed to fetch timelines');
            }
            return (result.data || []).map((timeline) => this.formatTimelineResponse(timeline));
        }
        catch (error) {
            this.handleError(error, 'getTimelinesByUser');
        }
    }
    /**
     * Get specific timeline by ID
     */
    async getTimelineById(timeline_id) {
        try {
            const result = await this.findById(timeline_id);
            if (!result.success) {
                throw new Error('Timeline not found');
            }
            return this.formatTimelineResponse(result.data);
        }
        catch (error) {
            this.handleError(error, 'getTimelineById');
        }
    }
    /**
     * Update timeline
     */
    async updateTimeline(timeline_id, updates) {
        try {
            // Map API fields (snake_case) to model fields (camelCase)
            const mappedUpdates = {
                last_modified: new Date(),
            };
            if (updates.user_id !== undefined) {
                mappedUpdates.userId = updates.user_id;
            }
            if (updates.degree_id !== undefined) {
                mappedUpdates.degreeId = updates.degree_id;
            }
            if (updates.name !== undefined) {
                mappedUpdates.name = updates.name;
            }
            if (updates.isExtendedCredit !== undefined) {
                mappedUpdates.isExtendedCredit = updates.isExtendedCredit;
            }
            if (updates.items !== undefined) {
                // Ensure items have id field
                mappedUpdates.items = (updates.items || []).map((item, index) => ({
                    _id: item._id,
                    season: item.season,
                    year: item.year,
                    courses: item.courses || [],
                }));
            }
            const result = await this.updateById(timeline_id, mappedUpdates);
            if (!result.success) {
                throw new Error('Timeline not found');
            }
            return this.formatTimelineResponse(result.data);
        }
        catch (error) {
            this.handleError(error, 'updateTimeline');
        }
    }
    /**
     * Remove a timeline by ID
     */
    async removeUserTimeline(timeline_id) {
        try {
            const result = await this.deleteById(timeline_id);
            if (!result.success) {
                return { success: false, message: `Timeline ${timeline_id} not found` };
            }
            return {
                success: true,
                message: `Timeline ${timeline_id} deleted successfully`,
            };
        }
        catch {
            return {
                success: false,
                message: 'Error occurred while deleting timeline.',
            };
        }
    }
    /**
     * Delete all timelines for a user
     */
    async deleteAllUserTimelines(user_id) {
        try {
            const result = await this.deleteMany({ userId: user_id });
            if (!result.success) {
                throw new Error('Failed to delete timelines');
            }
            return result.data || 0;
        }
        catch (error) {
            this.handleError(error, 'deleteAllUserTimelines');
        }
    }
    /**
     * Format timeline response to match expected interface
     */
    formatTimelineResponse(timeline) {
        return {
            _id: timeline._id,
            user_id: timeline.userId || timeline.user_id,
            name: timeline.name,
            degree_id: timeline.degreeId || timeline.degree_id,
            items: (timeline.items || []).map((item) => ({
                _id: item._id,
                season: item.season,
                year: item.year,
                courses: item.courses || [],
            })),
            isExtendedCredit: timeline.isExtendedCredit,
            last_modified: timeline.last_modified,
        };
    }
}
exports.TimelineController = TimelineController;
exports.timelineController = new TimelineController();
//# sourceMappingURL=TimelineController.js.map