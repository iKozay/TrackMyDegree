/**
 * Optimized Timeline Controller
 *
 * Provides timeline-specific operations with improved error handling and consistency.
 */

import { BaseMongoController } from './BaseMongoController';
import { Timeline } from '../../models';
import TimelineTypes from '../timelineController/timeline_types';

export class TimelineController extends BaseMongoController<any> {
  constructor() {
    super(Timeline, 'Timeline');
  }

  /**
   * Save or update a timeline (upsert)
   */
  async saveTimeline(
    timeline: TimelineTypes.Timeline,
  ): Promise<TimelineTypes.Timeline> {
    try {
      const { user_id, name, degree_id, items, isExtendedCredit } = timeline;

      if (!user_id || !name || !degree_id) {
        throw new Error('User ID, timeline name, and degree ID are required');
      }

      const result = await this.updateOne(
        { user_id, name, degree_id },
        {
          user_id,
          name,
          degree_id,
          items,
          isExtendedCredit,
          last_modified: new Date(),
        },
      );

      if (!result.success) {
        // If update failed, try to create new
        const createResult = await this.create({
          user_id,
          name,
          degree_id,
          items,
          isExtendedCredit,
          last_modified: new Date(),
        });

        if (!createResult.success) {
          throw new Error('Failed to save timeline');
        }

        return this.formatTimelineResponse(createResult.data);
      }

      return this.formatTimelineResponse(result.data);
    } catch (error) {
      this.handleError(error, 'saveTimeline');
    }
  }

  /**
   * Get all timelines for a user
   */
  async getTimelinesByUser(user_id: string): Promise<TimelineTypes.Timeline[]> {
    try {
      const result = await this.findAll({ user_id });

      if (!result.success) {
        throw new Error('Failed to fetch timelines');
      }

      return (
        result.data?.map((timeline) => this.formatTimelineResponse(timeline)) ||
        []
      );
    } catch (error) {
      this.handleError(error, 'getTimelinesByUser');
    }
  }

  /**
   * Remove a timeline by ID
   */
  async removeUserTimeline(
    timeline_id: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const result = await this.deleteById(timeline_id);

      if (!result.success) {
        return { success: false, message: `Timeline ${timeline_id} not found` };
      }

      return {
        success: true,
        message: `Timeline ${timeline_id} deleted successfully`,
      };
    } catch (error) {
      this.handleError(error, 'removeUserTimeline');
      return {
        success: false,
        message: 'Error occurred while deleting timeline.',
      };
    }
  }

  /**
   * Format timeline response to match expected interface
   */
  private formatTimelineResponse(timeline: any): TimelineTypes.Timeline {
    return {
      id: timeline._id.toString(),
      user_id: timeline.user_id,
      name: timeline.name,
      degree_id: timeline.degree_id,
      items: timeline.items.map((item: any) => ({
        id: item._id?.toString(),
        season: item.season as TimelineTypes.TimelineItem['season'],
        year: item.year,
        courses: item.courses,
      })),
      isExtendedCredit: timeline.isExtendedCredit,
      last_modified: timeline.last_modified,
    };
  }
}

export const timelineController = new TimelineController();
