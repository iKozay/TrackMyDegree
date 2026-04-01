import { BaseMongoController } from './baseMongoController';
import { Timeline } from '@models';
import { TimelineResult, TimelineDocument, CourseStatus} from '@trackmydegree/shared';
import { BadRequestError } from '@utils/errors';


export class TimelineController extends BaseMongoController<any> {
  constructor() {
    super(Timeline, 'Timeline');
  }

  /**
   * Save or update a timeline (upsert operation)
   * Optimized with single database operation
   */
  async saveTimeline(userId:string, timelineName:string, timeline:TimelineResult){
      const { _id, degree, semesters, isExtendedCredit, isCoop, courses, pools } = timeline;

      if (!userId || !timelineName || !degree?._id) {
        throw new BadRequestError('User ID, timeline name, and degree ID are required');
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
         
      const exemptionPool = (pools || []).find(p => p._id === 'exemptions');
      const deficiencyPool = (pools || []).find(p => p._id === 'deficiencies');
      const exemptions  = exemptionPool?.courses ?? [];
      const deficiencies = deficiencyPool?.courses ?? [];
      const record = {
          userId,
          name: timelineName,
          degreeId: degree?._id,
          semesters: semesters ?? [],
          isExtendedCredit: isExtendedCredit ?? false,
          isCoop: isCoop ?? false,
          courseStatusMap,
          exemptions,
          deficiencies
        }

      if (_id)
        return await this.updateById(_id, record);
      else
        return await this.create(record)
   
  }
  /**
   * Remove a timeline by ID
   */
  async deleteTimeline(timeline_id: string) {
    return await this.deleteById(timeline_id);
  }
    /**
   * Update timeline
   */
  async updateTimeline( timeline_id: string, updates: Partial<TimelineDocument>) {
      return await this.updateById(timeline_id, updates);
  }

  /**
   * Delete all timelines for a user
   */
  async deleteAllUserTimelines(user_id: string): Promise<number> {
      return await this.deleteMany({ userId: user_id });
  }
}
export const timelineController = new TimelineController();
