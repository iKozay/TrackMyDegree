/**
 * Optimized Degree Controller
 *
 * Provides degree-specific operations with improved error handling and query optimization.
 */

import { BaseMongoController } from './BaseMongoController';
import { Degree } from '../../models';

export interface DegreeData {
  id: string;
  name: string;
  totalCredits: number;
}

export class DegreeController extends BaseMongoController<any> {
  constructor() {
    super(Degree, 'Degree');
  }

  /**
   * Create a new degree
   */
  async createDegree(
    id: string,
    name: string,
    totalCredits: number,
  ): Promise<DegreeData> {
    try {
      // Check if degree already exists (optimized with single query)
      const existsResult = await this.exists({ $or: [{ _id: id }, { name }] });
      if (existsResult.data) {
        throw new Error('Degree with this id or name already exists.');
      }

      const result = await this.create({ _id: id, name, totalCredits });

      if (!result.success) {
        throw new Error(result.error || 'Failed to create degree');
      }

      return {
        id: result.data._id,
        name: result.data.name,
        totalCredits: result.data.totalCredits,
      };
    } catch (error) {
      this.handleError(error, 'createDegree');
    }
  }

  /**
   * Get degree by ID
   */
  async readDegree(id: string): Promise<DegreeData> {
    try {
      const result = await this.findById(id, 'name totalCredits');

      if (!result.success) {
        throw new Error('Degree with this id does not exist.');
      }

      return {
        id: result.data._id,
        name: result.data.name,
        totalCredits: result.data.totalCredits,
      };
    } catch (error) {
      this.handleError(error, 'readDegree');
    }
  }

  /**
   * Get all degrees (excluding ECP)
   */
  async readAllDegrees(): Promise<DegreeData[]> {
    try {
      const result = await this.findAll(
        { _id: { $ne: 'ECP' } },
        { select: 'name totalCredits', sort: { name: 1 } },
      );

      if (!result.success) {
        throw new Error('Failed to fetch degrees');
      }

      return (result.data || []).map((degree) => ({
        id: degree._id,
        name: degree.name,
        totalCredits: degree.totalCredits,
      }));
    } catch (error) {
      this.handleError(error, 'readAllDegrees');
    }
  }

  /**
   * Update degree
   */
  async updateDegree(
    id: string,
    name: string,
    totalCredits: number,
  ): Promise<DegreeData> {
    try {
      const result = await this.updateById(id, { name, totalCredits });

      if (!result.success) {
        throw new Error('Degree with this id does not exist.');
      }

      return {
        id: result.data._id,
        name: result.data.name,
        totalCredits: result.data.totalCredits,
      };
    } catch (error) {
      this.handleError(error, 'updateDegree');
    }
  }

  /**
   * Delete degree
   */
  async deleteDegree(id: string): Promise<string> {
    try {
      const result = await this.deleteById(id);

      if (!result.success) {
        throw new Error('Degree with this id does not exist.');
      }

      return `Degree with id ${id} has been successfully deleted.`;
    } catch (error) {
      this.handleError(error, 'deleteDegree');
    }
  }

  /**
   * Get credits for degree (optimized - only fetches totalCredits field)
   */
  async getCreditsForDegree(degreeId: string): Promise<number> {
    try {
      const result = await this.findById(degreeId, 'totalCredits');

      if (!result.success) {
        throw new Error('Degree with this id does not exist.');
      }

      return result.data.totalCredits;
    } catch (error) {
      this.handleError(error, 'getCreditsForDegree');
    }
  }
}

export const degreeController = new DegreeController();
