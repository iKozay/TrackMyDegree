/**
 * Optimized DegreeXCP Controller
 *
 * Handles degree-coursepool mappings with improved error handling.
 */

import { BaseMongoController } from './BaseMongoController';
import { Degree } from '../../models';
import DegreeXCPTypes from '../DegreeXCPController/DegreeXCP_types';
import CoursePoolTypes from '../coursepoolController/coursepool_types';
import DB_OPS from '@Util/DB_Ops';
import * as Sentry from '@sentry/node';

export class DegreeXCPController extends BaseMongoController<any> {
  constructor() {
    super(Degree, 'DegreeXCP');
  }

  /**
   * Creates a new DegreeXCoursePool record in the database.
   */
  async createDegreeXCP(
    new_record: DegreeXCPTypes.NewDegreeXCP,
  ): Promise<DB_OPS> {
    try {
      // Destructure the new_record object
      const { degree_id, coursepool_id, credits } = new_record;

      // Check if the degree exists
      const degree = await Degree.findById(degree_id);
      if (!degree) {
        console.log(`Degree with id ${degree_id} not found.`);
        return DB_OPS.FAILURE;
      }

      // Check if the course pool already exists in the degree
      const coursePool = degree.coursePools.find(
        (cp) => cp.id === coursepool_id,
      );
      if (coursePool) {
        console.log(
          `CoursePool with id ${coursepool_id} already exists in Degree ${degree_id}.`,
        );
        return DB_OPS.FAILURE;
      }

      // Add the new course pool to the degree
      degree.coursePools.push({
        id: coursepool_id,
        name: '<CoursePool Name>', // TODO: Set name appropriately
        creditsRequired: credits,
        courses: [],
      });

      await degree.save();

      return DB_OPS.SUCCESS;
    } catch (error) {
      Sentry.captureException(error);
      console.log('Error creating DegreeXCP:', error);
      return DB_OPS.FAILURE;
    }
  }

  /**
   * Retrieves all course pools associated with a specific degree.
   */
  async getAllDegreeXCP(
    degree_id: string,
  ): Promise<{ course_pools: CoursePoolTypes.CoursePoolItem[] }> {
    try {
      const degree = await Degree.findById(degree_id);
      if (degree) {
        return {
          course_pools: degree.coursePools as CoursePoolTypes.CoursePoolItem[],
        };
      } else {
        console.log(`Degree with id ${degree_id} not found.`);
      }

      return { course_pools: [] };
    } catch (error) {
      Sentry.captureException(error);
      console.log('Error fetching DegreeXCP:', error);
      return { course_pools: [] };
    }
  }

  /**
   * Updates an existing DegreeXCoursePool record.
   */
  async updateDegreeXCP(
    update_record: DegreeXCPTypes.DegreeXCPItem,
  ): Promise<DB_OPS> {
    try {
      // Destructure the update_record object
      const { id, degree_id, coursepool_id, credits } = update_record;

      // Find the degree that currently contains the coursepool_id
      let degree = await this.findCoursePool(coursepool_id);
      const coursePool = degree?.coursePools.find(
        (cp) => cp.id === coursepool_id,
      );

      // If course pool not found in any degree
      if (!degree || !coursePool) {
        console.log(
          `CoursePool with id ${coursepool_id} not found in any degree.`,
        );
        return DB_OPS.FAILURE;
      }

      // If the course pool is already in the target degree, just update it
      if (degree._id.toString() === degree_id) {
        coursePool.creditsRequired = credits;
        await degree.save();
        return DB_OPS.SUCCESS;
      }

      // If different degrees, move the course pool
      // First, check if target degree exists
      const targetDegree = await Degree.findById(degree_id);
      if (!targetDegree) {
        console.log(`Target degree with id ${degree_id} not found.`);
        return DB_OPS.FAILURE;
      }

      // Remove from current degree
      degree.coursePools.pull({ id: coursepool_id });
      await degree.save();

      // Add to target degree with updated credits
      targetDegree.coursePools.push({
        id: coursepool_id,
        name: coursePool.name,
        creditsRequired: credits,
        courses: coursePool.courses,
      });

      await targetDegree.save();

      return DB_OPS.SUCCESS;
    } catch (error) {
      Sentry.captureException(error);
      console.log('Error updating DegreeXCP:', error);
      return DB_OPS.FAILURE;
    }
  }

  /**
   * Removes a DegreeXCoursePool record from the database.
   */
  async removeDegreeXCP(
    delete_record: DegreeXCPTypes.DegreeXCP,
  ): Promise<DB_OPS> {
    try {
      const { degree_id, coursepool_id } = delete_record;

      // Find the degree that contains the coursepool_id
      const degree = await Degree.findById(degree_id);
      const coursePool = degree?.coursePools.find(
        (cp) => cp.id === coursepool_id,
      );
      if (!degree || !coursePool) {
        console.log(
          `CoursePool with id ${coursepool_id} not found in Degree ${degree_id}.`,
        );
        return DB_OPS.FAILURE;
      }

      // Remove the course pool from the degree
      degree.coursePools.pull({ id: coursepool_id });
      await degree.save();

      return DB_OPS.SUCCESS;
    } catch (error) {
      Sentry.captureException(error);
      console.log('Error removing DegreeXCP:', error);
      return DB_OPS.FAILURE;
    }
  }

  /**
   * Helper method to find a course pool across all degrees
   */
  private async findCoursePool(
    coursepool_id: string,
  ): Promise<InstanceType<typeof Degree> | null> {
    try {
      const allDegrees = await Degree.find();
      for (const degree of allDegrees) {
        const foundCoursePool = degree.coursePools.find(
          (cp) => cp.id === coursepool_id,
        );
        if (foundCoursePool) {
          return degree;
        }
      }
      return null;
    } catch (error) {
      Sentry.captureException(error);
      console.log('Error finding course pool:', error);
      return null;
    }
  }
}

export const degreeXCPController = new DegreeXCPController();
