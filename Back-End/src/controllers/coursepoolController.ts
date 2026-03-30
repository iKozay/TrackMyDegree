import { BaseMongoController } from './baseMongoController';
import { CoursePool } from '@models';
import * as Sentry from '@sentry/node';
import { NotFoundError } from '@utils/errors';

export interface CoursePoolData {
  _id: string;
  name: string;
  creditsRequired: number;
  courses?: string[];
}

export class CoursePoolController extends BaseMongoController<any> {
  constructor() {
    super(CoursePool, 'CoursePool');
  }

  // ==========================
  // COURSE POOL OPERATIONS
  // ==========================

  /**
   * Create course pools in bulk
   */
  async bulkCreateCoursePools(
    coursePoolData: CoursePoolData[],
  ): Promise<boolean> {
      const result = await this.bulkWrite(coursePoolData);

      return true;

  }

  /**
   * Update an existing course pool
   */
  async updateCoursePool(
    pool_id: string,
    updateData: Partial<CoursePoolData>,
  ): Promise<CoursePoolData | null> {
      const result = await this.updateById(pool_id, updateData);

      if (!result.success) {
        if (result.error?.toLowerCase().includes('not found')) {
          throw new NotFoundError(result.error); 
        }
        throw new Error(result.error || 'Failed to update course pool');
      }

      return {
        _id: result.data._id,
        name: result.data.name,
        creditsRequired: result.data.creditsRequired,
        courses: result.data.courses || [],
      };
  }

  /**
   * Get all course pools
   */
  async getAllCoursePools(): Promise<CoursePoolData[]> {
      const result = await this.findAll();

      return (result || []).map((cp: any) => ({
        _id: cp._id,
        name: cp.name,
        creditsRequired: cp.creditsRequired,
        courses: cp.courses || [],
      }));

  }

  /**
   * Get a specific course pool by ID
   */
  async getCoursePool(pool_id: string): Promise<CoursePoolData> {
      const result = await this.findById(pool_id);

      return {
        _id: result.data._id,
        name: result.data.name,
        creditsRequired: result.data.creditsRequired,
        courses: result.data.courses || [],
      };
  }

  /**
   * Delete a course pool by ID
   */
  async deleteCoursePool(pool_id: string): Promise<string> {
     return await this.deleteById(pool_id);
  }
}

export const coursepoolController = new CoursePoolController();
