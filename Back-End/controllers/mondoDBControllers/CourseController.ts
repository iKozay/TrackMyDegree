/**
 * Optimized Course Controller
 *
 * Provides course-specific operations using MongoDB.
 * Decoupled from Express for better reusability.
 */

import { BaseMongoController } from './BaseMongoController';
import { Course } from '../../models';

export interface CourseData {
  _id?: string;
  code?: string;
  title: string;
  description?: string;
  credits: number;
  prerequisites?: string[];
  corequisites?: string[];
  offeredIn?: string[];
  [key: string]: unknown;
}

export class CourseController extends BaseMongoController<any> {
  constructor() {
    super(Course, 'Course');
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
   * Create new course
   */
  async createCourse(courseData: CourseData) {
    try {
      // Check if course already exists
      const existsResult = await this.exists({
        _id: courseData.code || courseData._id,
      });
      if (existsResult.data) {
        throw new Error('Course already exists');
      }

      const result = await this.create(courseData);

      if (!result.success) {
        throw new Error(result.error || 'Failed to create course');
      }

      return result.data;
    } catch (error) {
      this.handleError(error, 'createCourse');
    }
  }

  /**
   * Update course by code
   */
  async updateCourse(code: string, updates: Partial<CourseData>) {
    try {
      const result = await this.updateById(code, updates);

      if (!result.success) {
        throw new Error(result.error || 'Failed to update course');
      }

      return result.data;
    } catch (error) {
      this.handleError(error, 'updateCourse');
    }
  }

  /**
   * Delete course by code
   */
  async deleteCourse(code: string) {
    try {
      const result = await this.deleteById(code);

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete course');
      }

      return result.message;
    } catch (error) {
      this.handleError(error, 'deleteCourse');
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
   * Bulk create courses
   */
  async bulkCreateCourses(courses: CourseData[]) {
    try {
      const result = await this.bulkCreate(courses);

      if (!result.success) {
        throw new Error(result.error || 'Failed to bulk create courses');
      }

      return result.data;
    } catch (error) {
      this.handleError(error, 'bulkCreateCourses');
    }
  }
}

export const courseController = new CourseController();
