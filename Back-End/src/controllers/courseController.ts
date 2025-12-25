import { BaseMongoController } from './baseMongoController';
import { Course } from '@models';

export interface CourseData {
  _id: string;
  code?: string;
  title: string;
  description?: string;
  credits: number;
  offeredIn?: string[];
  "prerequisites/corequisites"?: string;
  rules?: {
    prereq?: string[][];
    coreq?: string[][];
    not_taken?: string[];
  };
}

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
    try {
      const result = await this.bulkWrite(courseData);

      if (!result.success) {
        throw new Error(result.error || 'Failed to create courses');
      }

      return true;
    } catch (error) {
      this.handleError(error, 'bulkCreateCourse');
      return false;
    }
  }

  /**
   * Update an existing course
   */
  async updateCourse(
    _id: string,
    updateData: Partial<CourseData>,
  ): Promise<CourseData | null> {
    try {
      const result = await this.updateById(_id, updateData);
      if (!result.success) {
        throw new Error(result.error || 'Failed to update course');
      }
      return result.data;
    } catch (error) {
      this.handleError(error, 'updateCourse');
      return null;
    }
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
    try {
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
      return result.data || [];
    } catch (error) {
      this.handleError(error, 'getAllCourses');
    }
  }

  /**
   * Get course by code
   */
  async getCourseByCode(code: string) {
    try {
      const result = await this.findById(code);

      if (!result.success) {
        throw new Error(result.error || 'Course not found');
      }

      return result.data;
    } catch (error) {
      this.handleError(error, 'getCourseByCode');
    }
  }

  /**
   * Get courses by pool
   */
  async getCoursesByPool(poolName: string) {
    try {
      const result = await this.findAll({ offeredIn: poolName });

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch courses');
      }

      return result.data || [];
    } catch (error) {
      this.handleError(error, 'getCoursesByPool');
    }
  }

  /**
   * Delete a course by code
   */
  async deleteCourse(code: string): Promise<string> {
    try {
      const result = await this.deleteById(code);

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete course');
      }
      return `Course '${code}' deleted successfully.`;
    } catch (error) {
      this.handleError(error, 'deleteCourse');
    }
  }
}

export const courseController = new CourseController();
