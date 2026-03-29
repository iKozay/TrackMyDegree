import { BaseMongoController } from './baseMongoController';
import { Course } from '@models';
import { CourseData } from '@shared/degree';
import { NotFoundError } from '@utils/errors';

export class CourseController extends BaseMongoController<any> {
  constructor() {
    super(Course, 'Course');
  }

  // ==========================
  // COURSE OPERATIONS
  // ==========================

  /**
   * Create multiple courses in bulk
   */
  async bulkCreateCourses(courseData: CourseData[]): Promise<boolean> {
      const result = await this.bulkWrite(courseData);
      return true;
  }

  /**
   * Update an existing course
   */
  async updateCourse(
    _id: string,
    updateData: Partial<CourseData>,
  ): Promise<CourseData | null> { 
      return await this.updateById(_id, updateData);
  }

  /**
   * Get all courses with optional filtering and pagination
   */
  async getAllCourses(
    params: {
      pool?: string;
      search?: string;
      page?: number;
      limit?: number;
      sort?: string;
    } = {},
  ) {
      const { pool, search, page, limit, sort } = params;

      const filter: Record<string, unknown> = {};
      if (pool) {
        filter.offeredIn = pool;
      }

      const options = {
        page,
        limit,
        sort: sort ? { [sort]: 1 as const } : { title: 1 as const },
        search,
        fields: ['title', 'description', '_id'],
      };

      const result = await this.findAll(filter, options);
      return result || [];
  }

  async getAllCourseCodes(): Promise<string[]> {
      const result = await this.findAll({}, { fields: ['_id'] });
      return result.map((course: any) => course._id);
  }

  /**
   * Get course by code
   */
  async getCourseByCode(code: string) {
      return await this.findById(code);
  }

  /**
   * Get courses by pool
   */
  async getCoursesByPool(poolName: string) {
    return await this.findAll({ offeredIn: poolName });
  }

  /**
   * Delete a course by code
   */
  async deleteCourse(code: string): Promise<string> {
      return await this.deleteById(code);
  }
}

export const courseController = new CourseController();
