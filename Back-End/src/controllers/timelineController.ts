import { BaseMongoController } from './baseMongoController';
import { Timeline } from '@models';
import {TimelineSemester,TimelineCourse,} from '@services/timeline/timelineService';
import { CourseStatus } from '../types/transcript';
import { CoursePoolInfo } from './degreeController';

// Timeline as received from frontend for saving/editing
export interface TimelineData {
  _id?: string; // optional if creating a new timeline
  userId: string;
  name: string;
  degreeId: string;
  semesters: TimelineSemester[];
  isExtendedCredit?: boolean;
  isCoop?: boolean;
  courses: Record<string, TimelineCourse>; // full course info
  coursePools: CoursePoolInfo[]
}


export class TimelineController extends BaseMongoController<any> {
  constructor() {
    super(Timeline, 'Timeline');
  }

  /**
   * Save or update a timeline (upsert operation)
   * Optimized with single database operation
   */
  async saveTimeline(timeline:TimelineData){
    try {
      const { _id, userId, name, degreeId, semesters, isExtendedCredit, isCoop, courses, coursePools } = timeline;

      if (!userId || !name || !degreeId) {
        throw new Error('User ID, timeline name, and degree ID are required');
      }
      
      //creates a map to store only completed and planned courses
     const courseStatusMap: Record<string,{ status: CourseStatus; semester: string | null } > = 
          Object.fromEntries(
            Object.entries( courses || {})
              .filter(([, course]) => course.status.status !== 'incomplete')
              .map(([courseId, course]) => [
                courseId,
                {
                  status: course.status.status,
                  semester: course.status.semester,
                },
              ])
          );
         
      const exemptionPool = (coursePools || []).find(p => p._id === 'exemptions');
      const deficiencyPool = (coursePools || []).find(p => p._id === 'deficiencies');
      const exemptions  = exemptionPool?.courses ?? [];
      const deficiencies = deficiencyPool?.courses ?? [];
      const record = {
          userId,
          name,
          degreeId,
          semesters: semesters ?? [],
          isExtendedCredit: isExtendedCredit ?? false,
          isCoop: isCoop ?? false,
          courseStatusMap,
          exemptions,
          deficiencies
        }

      let result;
      if (_id)
        result = await this.updateById(_id, record);
      else
        result = await this.create(record)
     

      if (!result?.success) {
        const message = result.error ?? "Failed to save timeline"
        throw new Error(message);
      }

      return result.data;
    } catch (error) {
      this.handleError(error, 'saveTimeline');
    }
  }
  /**
   * Remove a timeline by ID
   */
  async deleteTimeline(timeline_id: string) {
    try {
      const result = await this.deleteById(timeline_id);

       if (!result?.success) {
        throw new Error(`Timeline with this id does not exist`);
      }

      return result.message;
    } catch (error) {
      this.handleError(error, 'deleteTimeline');
    }
  }
    /**
   * Update timeline
   */
  async updateTimeline(
    timeline_id: string,
    updates: Partial<TimelineData>,
  ): Promise<TimelineData> {
    try {
      const result = await this.updateById(timeline_id, updates);

      if (!result.success) {
       const message = result.error ?? 'Timeline not found';
        throw new Error(message);
      }

      return result.data;
    } catch (error) {
      this.handleError(error, 'updateTimeline');
    }
  }

  /**
   * Delete all timelines for a user
   */
  async deleteAllUserTimelines(user_id: string): Promise<number> {
    try {
      const result = await this.deleteMany({ userId: user_id });

      if (!result.success) {
        throw new Error('Failed to delete timelines');
      }

      return result.data || 0;
    } catch (error) {
      this.handleError(error, 'deleteAllUserTimelines');
    }
  }
}

export const timelineController = new TimelineController();
