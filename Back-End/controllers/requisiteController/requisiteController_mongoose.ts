/**
 * Purpose:
 *  - Controller module for course requisites using Mongoose.
 *  - Provides functions to create, read, update, and delete course requisites.
 * Notes:
 *  - Uses Course model with prerequisites and corequisites arrays.
 *  - Errors are logged to Sentry and then rethrown.
 *  - Maintains same method signatures as SQL version.
 */

import { Course } from '../../models';
import RequisiteTypes from '@controllers/requisiteController/requisite_types';
import { randomUUID } from 'node:crypto';
import * as Sentry from '@sentry/node';

/**
 * Creates a new course requisite if it does not already exist.
 */
async function createRequisite(
  code1: string,
  code2: string,
  type: RequisiteTypes.RequisiteType,
): Promise<RequisiteTypes.Requisite | undefined> {
  try {
    // Check if both courses exist
    const [course1, course2] = await Promise.all([
      Course.findById(code1),
      Course.findById(code2)
    ]);

    if (!course1 || !course2) {
      throw new Error(`One or both courses ('${code1}', '${code2}') do not exist.`);
    }

    // Check if requisite already exists
    const field = type === 'pre' ? 'prerequisites' : 'corequisites';
    if (course1[field].includes(code2)) {
      throw new Error('Requisite with this combination of courses already exists.');
    }

    // Add requisite
    await Course.findByIdAndUpdate(code1, {
      $addToSet: { [field]: code2 }
    });

    return {
      id: randomUUID(),
      code1,
      code2,
      type
    };
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  }
}

/**
 * Reads requisites for a given course.
 */
async function readRequisite(
  code1: string,
  code2?: string,
  type?: RequisiteTypes.RequisiteType,
): Promise<RequisiteTypes.Requisite[] | undefined> {
  try {
    // Validate course exists
    const course = await Course.findById(code1);
    if (!course) {
      throw new Error(`Course '${code1}' does not exist.`);
    }

    const requisites: RequisiteTypes.Requisite[] = [];

    // If specific code2 and type provided
    if (code2 && type) {
      const field = type === 'pre' ? 'prerequisites' : 'corequisites';
      if (course[field].includes(code2)) {
        requisites.push({
          id: randomUUID(),
          code1,
          code2,
          type
        });
      }
      return requisites;
    }

    // Return all requisites for code1
    for (const prereq of course.prerequisites) {
      requisites.push({
        id: randomUUID(),
        code1,
        code2: prereq,
        type: 'pre'
      });
    }

    for (const coreq of course.corequisites) {
      requisites.push({
        id: randomUUID(),
        code1,
        code2: coreq,
        type: 'co'
      });
    }

    return requisites;
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  }
}

/**
 * Updates an existing requisite.
 * This function has the same implementation as createRequisite because
 * adding a requisite is effectively the same as updating it in this schema.
 * NOTE - This is intentional to maintain the same method signature as the SQL version. Refactor later.
 */
async function updateRequisite( // NOSONAR S4144 - Intentional duplicate implementation
  code1: string,
  code2: string,
  type: RequisiteTypes.RequisiteType,
): Promise<RequisiteTypes.Requisite | undefined> {
  try {
    // Check if both courses exist
    const [course1, course2] = await Promise.all([
      Course.findById(code1),
      Course.findById(code2)
    ]);

    if (!course1 || !course2) {
      throw new Error(`One or both courses ('${code1}', '${code2}') do not exist.`);
    }

    const field = type === 'pre' ? 'prerequisites' : 'corequisites';

    // Check if requisite already exists
    if (course1[field].includes(code2)) {
      throw new Error('Requisite with this combination of courses already exists.');
    }

    // Add the requisite
    await Course.findByIdAndUpdate(code1, {
      $addToSet: { [field]: code2 }
    });

    return {
      id: randomUUID(),
      code1,
      code2,
      type
    };
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  }
}

/**
 * Deletes a requisite.
 */
async function deleteRequisite(
  code1: string,
  code2: string,
  type: RequisiteTypes.RequisiteType,
): Promise<string | undefined> {
  try {
    const course = await Course.findById(code1);
    if (!course) {
      throw new Error('Course does not exist.');
    }

    const field = type === 'pre' ? 'prerequisites' : 'corequisites';

    if (!course[field].includes(code2)) {
      throw new Error('Requisite with this id does not exist.');
    }

    // Remove requisite
    await Course.findByIdAndUpdate(code1, {
      $pull: { [field]: code2 }
    });

    return `Requisite with the course combination provided has been successfully deleted.`;
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  }
}

const requisiteController = {
  createRequisite,
  readRequisite,
  updateRequisite,
  deleteRequisite,
};

export default requisiteController;