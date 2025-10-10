import DegreeModel from '../../models/degreeModel'; // Adjust path to your models folder
import DegreeTypes from '@controllers/degreeController/degree_types';
import { captureException } from '@sentry/node';

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
    const existingDegree = await DegreeModel.findOne({ $or: [{ id }, { name }] });

    if (existingDegree) {
      throw new Error('Degree with this id or name already exists.');
    }

    const newDegree = new DegreeModel({
      id,
      name,
      totalCredits,
    });

    await newDegree.save();

    // .lean() returns a plain JS object, which is good practice
    return newDegree.toObject();
  } catch (error) {
    captureException(error);
    throw error;
  }
}

/**
 * Retrieves a degree by its ID.
 */
async function readDegree(id: string): Promise<DegreeTypes.Degree | undefined> {
  try {
    const degree = await DegreeModel.findOne({ id }).lean();

    if (!degree) {
      throw new Error('Degree with this id does not exist.');
    }

    return degree;
  } catch (error) {
    captureException(error);
    throw error;
  }
}
/**
 * Retrieves all degrees from the database.
 */
async function readAllDegrees(): Promise<DegreeTypes.Degree[] | undefined> {
  try {
    // In MongoDB, "!=" is represented by the "$ne" (not equal) operator
    const degrees = await DegreeModel.find({ id: { $ne: 'ECP' } }).lean();
    return degrees;
  } catch (error) {
    captureException(error);
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
    // findOneAndUpdate is an atomic operation. { new: true } returns the updated document.
    const updatedDegree = await DegreeModel.findOneAndUpdate(
      { id },
      { name, totalCredits },
      { new: true },
    ).lean();

    if (!updatedDegree) {
      throw new Error('Degree with this id does not exist.');
    }

    return updatedDegree;
  } catch (error) {
    captureException(error);
    throw error;
  }
}
/**
 * Deletes a degree from the database by its ID.
 */
async function deleteDegree(id: string): Promise<string | undefined> {
  try {
    const deletedDegree = await DegreeModel.findOneAndDelete({ id });

    if (!deletedDegree) {
      throw new Error('Degree with this id does not exist.');
    }

    return `Degree with id ${id} has been successfully deleted.`;
  } catch (error) {
    captureException(error);
    throw error;
  }
}

async function getCreditsForDegree(
  degreeId: string,
): Promise<number | undefined> {
  try {
    const degree = await DegreeModel.findOne({ id: degreeId }).lean();

    if (!degree) {
      throw new Error('Degree with this id does not exist.');
    }

    return degree.totalCredits;
  } catch (error) {
    captureException(error);
    throw error;
  }
}

//Namespace
const degreeControllerMongo = {
  createDegree,
  readDegree,
  updateDegree,
  deleteDegree,
  readAllDegrees,
  getCreditsForDegree,
};

export default degreeControllerMongo;