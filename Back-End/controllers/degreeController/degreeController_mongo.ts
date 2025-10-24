// controllers/degreeController/degreeController_mongo.ts

import DegreeTypes from '@controllers/degreeController/degree_types';
import * as Sentry from '@sentry/node';

// Use existing Degree model
import { Degree } from '../../models/Degree';
const notExistString = 'Degree with this id does not exist.';
/**
 * Creates a new degree in the database.
 */
async function createDegree(
  id: string,
  name: string,
  totalCredits: number,
): Promise<DegreeTypes.Degree | undefined> {
  try {
    // Check if a degree with the same id or name already exists
    const existingDegree = await Degree.findOne({
      $or: [{ _id: id }, { name }],
    });

    if (existingDegree) {
      throw new Error('Degree with this id or name already exists.');
    }

    const newDegree = new Degree({
      _id: id,
      name,
      totalCredits,
    });

    await newDegree.save();

    // Return plain object
    return {
      id: newDegree._id,
      name: newDegree.name,
      totalCredits: newDegree.totalCredits,
    };
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  }
}

/**
 * Retrieves a degree by its ID.
 */
async function readDegree(id: string): Promise<DegreeTypes.Degree | undefined> {
  try {
    const degree = await Degree.findOne({ _id: id }).lean();

    if (!degree) {
      throw new Error(notExistString);
    }

    return {
      id: degree._id,
      name: degree.name,
      totalCredits: degree.totalCredits,
    };
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  }
}

/**
 * Retrieves all degrees from the database (excluding ECP).
 */
async function readAllDegrees(): Promise<DegreeTypes.Degree[] | undefined> {
  try {
    const degrees = await Degree.find({ _id: { $ne: 'ECP' } }).lean();
    return degrees.map((degree) => ({
      id: degree._id,
      name: degree.name,
      totalCredits: degree.totalCredits,
    }));
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  }
}

/**
 * Updates an existing degree with new information.
 */
async function updateDegree(
  id: string,
  name: string,
  totalCredits: number,
): Promise<DegreeTypes.Degree | undefined> {
  try {
    const updatedDegree = await Degree.findOneAndUpdate(
      { _id: id },
      { name, totalCredits },
      { new: true },
    ).lean();

    if (!updatedDegree) {
      throw new Error(notExistString);
    }

    return {
      id: updatedDegree._id,
      name: updatedDegree.name,
      totalCredits: updatedDegree.totalCredits,
    };
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  }
}

/**
 * Deletes a degree from the database by its ID.
 */
async function deleteDegree(id: string): Promise<string | undefined> {
  try {
    const deletedDegree = await Degree.findOneAndDelete({ _id: id });

    if (!deletedDegree) {
      throw new Error(notExistString);
    }

    return `Degree with id ${id} has been successfully deleted.`;
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  }
}

async function getCreditsForDegree(
  degreeId: string,
): Promise<number | undefined> {
  try {
    const degree = await Degree.findOne({ _id: degreeId }).lean();

    if (!degree) {
      throw new Error(notExistString);
    }

    return degree.totalCredits;
  } catch (error) {
    Sentry.captureException(error);
    throw error;
  }
}

// Namespace
const degreeControllerMongo = {
  createDegree,
  readDegree,
  updateDegree,
  deleteDegree,
  readAllDegrees,
  getCreditsForDegree,
};

export default degreeControllerMongo;
