import { BaseMongoController } from './baseMongoController';
import { Course } from '@models';
import { CourseData } from '@trackmydegree/shared';
import {
  resolveEntityVersion,
  resolveEntityVersions,
} from '@services/catalogVersionService';

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
      academicYear?: string;
    } = {},
  ) {
      const { pool, search, page, limit, sort, academicYear } = params;

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
      const courses = result || [];

      return resolveEntityVersions('Course', courses, academicYear);
  }

  async getCoursesByCodes(
    courseCodes: string[],
    academicYear?: string,
  ): Promise<CourseData[]> {
      const uniqueCodes = [...new Set(courseCodes)];
      if (uniqueCodes.length === 0) {
        return [];
      }

      const courses = await Course.find({ _id: { $in: uniqueCodes } })
        .lean<CourseData[]>()
        .exec();

      return resolveEntityVersions('Course', courses, academicYear);
  }

  async getAllCourseCodes(): Promise<string[]> {
      const result = await this.findAll({}, { fields: ['_id'] });

      if (!result) {
        return [];
      }
      return result.map((course: any) => course._id);
  }

  /**
   * Get course by code
   */
  async getCourseByCode(code: string, academicYear?: string) {
      const result = await this.findById(code);

      const resolved = await resolveEntityVersion({
        entityType: 'Course',
        entityId: code,
        baseEntity: result.data,
        academicYear,
      });

      return resolved.entity;
  }

  /**
   * Get courses by pool
   */
  async getCoursesByPool(poolName: string, academicYear?: string) {
      const result = await this.findAll({ offeredIn: poolName });

      return resolveEntityVersions('Course', result|| [], academicYear);
  }

  /**
   * Delete a course by code
   */
  async deleteCourse(code: string): Promise<string> {
      return await this.deleteById(code);
  }
}

export const courseController = new CourseController();
