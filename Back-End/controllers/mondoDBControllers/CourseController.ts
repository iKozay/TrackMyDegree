/**
 * Optimized Course Controller
 *
 * Extends BaseMongoController to provide course-specific operations.
 */

import { Request, Response } from 'express';
import { BaseMongoController } from './BaseMongoController';
import { Course } from '../../models';
import CourseTypes from '../courseController/course_types';

export class CourseController extends BaseMongoController<any> {
  constructor() {
    super(Course, 'Course');
  }

  /**
   * Get all courses with optional filtering
   */
  async getAllCourses(req: Request, res: Response): Promise<Response> {
    try {
      const { pool, search, page, limit, sort } = req.query;

      const filter: any = {};
      if (pool) {
        filter.offeredIn = pool;
      }

      const options = {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        sort: sort ? { [sort as string]: 1 as 1 } : { title: 1 as 1 },
        search: search as string,
        fields: ['title', 'description', '_id'],
      };

      const result = await this.findAll(filter, options);

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result.data);
    } catch (error) {
      return res.status(500).json({ error: (error as Error).message });
    }
  }

  /**
   * Get course by code
   */
  async getCourseByCode(req: Request, res: Response): Promise<Response> {
    try {
      const { code } = req.params;
      const result = await this.findById(code);

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result.data);
    } catch (error) {
      return res.status(500).json({ error: (error as Error).message });
    }
  }

  /**
   * Create new course
   */
  async createCourse(req: Request, res: Response): Promise<Response> {
    try {
      const courseData: CourseTypes.CourseInfoDB = req.body;

      // Check if course already exists
      const existsResult = await this.exists({ _id: courseData.code });
      if (existsResult.success && existsResult.data) {
        return res.status(400).json({ error: 'Course already exists' });
      }

      const result = await this.create(courseData);

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(201).json(result.data);
    } catch (error) {
      return res.status(500).json({ error: (error as Error).message });
    }
  }

  /**
   * Update course
   */
  async updateCourse(req: Request, res: Response): Promise<Response> {
    try {
      const { code } = req.params;
      const updates = req.body;

      const result = await this.updateById(code, updates);

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result.data);
    } catch (error) {
      return res.status(500).json({ error: (error as Error).message });
    }
  }

  /**
   * Delete course
   */
  async deleteCourse(req: Request, res: Response): Promise<Response> {
    try {
      const { code } = req.params;
      const result = await this.deleteById(code);

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json({ message: result.message });
    } catch (error) {
      return res.status(500).json({ error: (error as Error).message });
    }
  }

  /**
   * Get courses by pool
   */
  async getCoursesByPool(req: Request, res: Response): Promise<Response> {
    try {
      const { poolName } = req.params;
      const result = await this.findAll({ offeredIn: poolName });

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result.data);
    } catch (error) {
      return res.status(500).json({ error: (error as Error).message });
    }
  }
}

export const courseController = new CourseController();
