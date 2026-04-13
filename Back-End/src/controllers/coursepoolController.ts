import { BaseMongoController } from './baseMongoController';
import { CoursePool } from '@models';
import { CoursePoolData } from '@trackmydegree/shared';
import {
  resolveEntityVersion,
  resolveEntityVersions,
} from '@services/catalogVersionService';

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
      await this.bulkWrite(coursePoolData);
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

      return {
        _id: result._id,
        name: result.name,
        creditsRequired: result.creditsRequired,
        courses: result.courses || [],
        rules: result.rules || [],
      };
  }

  /**
   * Get all course pools
   */
  async getAllCoursePools(academicYear?: string): Promise<CoursePoolData[]> {
      const result = await this.findAll();


      return resolveEntityVersions(
        'CoursePool',
        (result || []).map((cp: any) => ({
          _id: cp._id,
          name: cp.name,
          creditsRequired: cp.creditsRequired,
          courses: cp.courses || [],
          rules: cp.rules || [],
          baseAcademicYear: cp.baseAcademicYear,
        })),
        academicYear,
      );
  }

  /**
   * Get a specific course pool by ID
   */
  async getCoursePool(
    pool_id: string,
    academicYear?: string,
  ): Promise<CoursePoolData | undefined> {
      const result = await this.findById(pool_id);

      const resolved = await resolveEntityVersion({
        entityType: 'CoursePool',
        entityId: pool_id,
        baseEntity: {
          _id: result._id,
          name: result.name,
          creditsRequired: result.creditsRequired,
          courses: result.courses || [],
          rules: result.rules || [],
          baseAcademicYear: result.baseAcademicYear,
        },
        academicYear,
      });

      return {
        _id: resolved.entity._id,
        name: resolved.entity.name,
        creditsRequired: resolved.entity.creditsRequired,
        courses: resolved.entity.courses || [],
        rules: resolved.entity.rules || [],
        baseAcademicYear: resolved.entity.baseAcademicYear,
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
