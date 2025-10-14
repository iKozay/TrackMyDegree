/**
 * Purpose:
 *  - Controller module to fetch comprehensive user data.
 *  - Combines user profile, timeline, deficiencies, exemptions, and degree info.
 * Notes:
 *  - Errors are logged to Sentry and returned as 500 Internal Server Error.
 *  - If `Database.getConnection()` fails, returns 500 immediately.
 *  - Checks that user exists and returns 404 if not found.
 */

import { Request, Response } from 'express';
import Database from '@controllers/DBController/DBController';
import { UserDataResponse } from './user_data_types';
import * as Sentry from '@sentry/node';

// Extract user ID from the request body
export const getUserData = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { id } = req.body;

  // If no user ID is provided, return a 400 Bad Request response
  if (!id) {
    res.status(400).json({ message: 'User ID is required' });
    return;
  }

  // Attempt to connect to the database
  const conn = await Database.getConnection();

  // If connection fails, log the issue to Sentry and return 500 Internal Server Error
  if (!conn) {
    res.status(500).json({ message: 'Database connection failed' });
    Sentry.captureMessage('Database connection failed');
    return;
  }

  try {
    // Check if the user exists in the AppUser table and retrieve basic profile info
    const userCheckResult = await conn
      .request()
      .input('id', Database.msSQL.VarChar, id)
      .query(
        `SELECT id, email, fullname, degree, type 
                 FROM AppUser 
                 WHERE id = @id`,
      );

    // If no user is found, return 404 Not Found
    if (userCheckResult.recordset.length === 0) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const userData = userCheckResult.recordset[0];

    // Fetch the user's timeline (courses taken per season and year)
    const timelineResult = await conn
      .request()
      .input('id', Database.msSQL.VarChar, id)
      .query(
        `SELECT season, year, coursecode 
                 FROM Timeline 
                 WHERE user_id = @id`,
      );

    // Fetch all deficiencies associated with the user (credits they still need)
    const deficiencyResult = await conn
      .request()
      .input('id', Database.msSQL.VarChar, id)
      .query(
        `SELECT coursepool, creditsRequired 
                 FROM Deficiency 
                 WHERE user_id = @id`,
      );

    // Fetch all exemptions for the user (courses they are exempt from)
    const exemptionResult = await conn
      .request()
      .input('id', Database.msSQL.VarChar, id)
      .query(
        `SELECT coursecode 
                 FROM Exemption 
                 WHERE user_id = @id`,
      );

    // Fetch detailed degree information by joining AppUser and Degree tables
    const degreeResult = await conn
      .request()
      .input('id', Database.msSQL.VarChar, id)
      .query(
        `SELECT Degree.id, Degree.name, Degree.totalCredits 
                 FROM AppUser 
                 JOIN Degree ON AppUser.degree = Degree.id 
                 WHERE AppUser.id = @id`,
      );

    // Combine all retrieved data into a structured response object
    const response: UserDataResponse = {
      user: {
        id: userData.id,
        email: userData.email,
        fullname: userData.fullname,
        type: userData.type,
        degree: userData.degree, // This is the foreign key ID (may be null)
      },
      timeline: timelineResult.recordset,
      deficiencies: deficiencyResult.recordset,
      exemptions: exemptionResult.recordset,
      degree: degreeResult.recordset[0] || null, // Detailed degree info (or null)
    };

    // Send the structured response back to the client
    res.status(200).json(response);
  } catch (error) {
    // Log and report any unexpected errors, then return 500 Internal Server Error
    console.error('Error fetching user data:', error);
    Sentry.captureException(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export default getUserData;
