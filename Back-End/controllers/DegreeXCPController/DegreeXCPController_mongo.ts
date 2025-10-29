import { Degree } from '../../models/Degree';
import DegreeXCPTypes from '@controllers/DegreeXCPController/DegreeXCP_types';
import CoursePoolTypes from '@controllers/coursepoolController/coursepool_types';
import DB_OPS from '@Util/DB_Ops';

/**
 * Creates a new DegreeXCoursePool record in the database.
 *
 * @param {DegreeXCPTypes.NewDegreeXCP} new_record - The new degreeXcoursepool record to be created.
 * @returns {Promise<DB_OPS>} - The result of the operation (SUCCESS, MOSTLY_OK, or FAILURE).
 */
async function createDegreeXCP(
  new_record: DegreeXCPTypes.NewDegreeXCP,
): Promise<DB_OPS> {
  // Destructure the new_record object
  const { degree_id, coursepool_id, credits } = new_record;

  // Check if the degree exists
  const degree = await Degree.findById(degree_id);
  if (!degree) {
    console.log(`Degree with id ${degree_id} not found.`);
    return DB_OPS.FAILURE;
  }

  // Check if the course pool already exists in the degree
  const coursePool = degree.coursePools.find((cp) => cp.id === coursepool_id);
  if (coursePool) {
    console.log(
      `CoursePool with id ${coursepool_id} already exists in Degree ${degree_id}.`,
    );
    return DB_OPS.FAILURE;
  }

  // Add the new course pool to the degree
  degree.coursePools.push({
    id: coursepool_id,
    name: '<CoursePool Name>', // NOSONAR TODO: Set name appropriately
    creditsRequired: credits,
    courses: [],
  });

  await degree.save();

  return DB_OPS.SUCCESS;
}

/**
 * Retrieves all course pools associated with a specific degree.
 *
 * @param {string} degree_id - The ID of the degree.
 * @returns {Promise<{course_pools: CoursePoolTypes.CoursePoolItem[]} | undefined>} - A list of course pools associated with the degree, or undefined if an error occurs.
 */
async function getAllDegreeXCP(
  degree_id: string,
): Promise<{ course_pools: CoursePoolTypes.CoursePoolItem[] }> {
  const degree = await Degree.findById(degree_id);
  if (degree) {
    return {
      course_pools: degree.coursePools as CoursePoolTypes.CoursePoolItem[],
    };
  } else {
    console.log(`Degree with id ${degree_id} not found.`);
  }

  return { course_pools: [] };
}

/**
 * Updates an existing DegreeXCoursePool record.
 *
 * @param {DegreeXCPTypes.DegreeXCPItem} update_record - The degreeXcoursepool record with updated information.
 * @returns {Promise<DB_OPS>} - The result of the operation (SUCCESS, MOSTLY_OK, or FAILURE).
 *
 * here the SET clause in SQL should include commas which it lacks at the moment
 */
async function updateDegreeXCP(
  update_record: DegreeXCPTypes.DegreeXCPItem,
): Promise<DB_OPS> {
  // Destructure the update_record object
  // Here we ignore the id field because it refers to the DegreeXCoursePool record itself
  // and we don't need it for the MongoDB operation
  const { degree_id, coursepool_id, credits } = update_record;

  // Find the degree that currently contains the coursepool_id
  let degree = await findCoursePool(coursepool_id);
  const coursePool = degree?.coursePools.find((cp) => cp.id === coursepool_id);

  // If course pool not found in any degree
  if (!degree || !coursePool) {
    console.log(`CoursePool with id ${coursepool_id} not found in any degree.`);
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
}

/**
 * Removes a DegreeXCoursePool record from the database.
 *
 * @param {DegreeXCPTypes.DegreeXCP} delete_record - The degreeXcoursepool record to be deleted.
 * @returns {Promise<DB_OPS>} - The result of the operation (SUCCESS, MOSTLY_OK, or FAILURE).
 */
async function removeDegreeXCP(
  delete_record: DegreeXCPTypes.DegreeXCP,
): Promise<DB_OPS> {
  const { degree_id, coursepool_id } = delete_record;

  // Find the degree that contains the coursepool_id
  const degree = await Degree.findById(degree_id);
  const coursePool = degree?.coursePools.find((cp) => cp.id === coursepool_id);
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
}

async function findCoursePool(
  coursepool_id: string,
): Promise<InstanceType<typeof Degree> | null> {
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
}

// Exported controller API
const DegreeXCPController = {
  createDegreeXCP,
  getAllDegreeXCP,
  updateDegreeXCP,
  removeDegreeXCP,
};

export default DegreeXCPController;
