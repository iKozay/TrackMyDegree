/**
 * Purpose:
 *  - Controller module to fetch comprehensive user data from MongoDB.
 *  - Combines user profile, timeline, deficiencies, exemptions, and degree info.
 * Notes:
 *  - Errors are logged to console and returned as 500 Internal Server Error.
 *  - Checks that user exists and returns 404 if not found.
 */

import { Request, Response } from 'express';
import { User } from '../../models/User';
import { Degree } from '../../models/Degree';
import { Timeline } from '../../models/Timeline';
import { UserDataResponse, TimelineEntry } from './user_data_types';
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

  try {
    // Check if the user exists and retrieve basic profile info
    const user = await User.findById(id);

    // If no user is found, return 404 Not Found
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Fetch the user's timeline (flatten nested structure to match SQL output format)
    const timelineResult = await Timeline.find({ userId: id });
    const timeline: TimelineEntry[] = [];

    // Flatten timeline items to match the SQL structure (season, year, coursecode)
    for (const tl of timelineResult) {
      for (const item of tl.items) {
        for (const coursecode of item.courses) {
          timeline.push({
            season: item.season,
            year: item.year,
            coursecode: coursecode,
          });
        }
      }
    }

    // Fetch all deficiencies from the user document (already embedded)
    const deficiencies = user.deficiencies.map((def) => ({
      coursepool: def.coursepool,
      creditsRequired: def.creditsRequired,
    }));

    // Fetch all exemptions from the user document (already embedded as course references)
    const exemptions = user.exemptions.map((coursecode) => ({
      coursecode: coursecode,
    }));

    // Fetch detailed degree information if user has a degree assigned
    let degree = null;
    if (user.degree) {
      const degreeDoc = await Degree.findById(user.degree);
      if (degreeDoc) {
        degree = {
          id: degreeDoc._id,
          name: degreeDoc.name,
          totalCredits: degreeDoc.totalCredits,
        };
      }
    }

    // Combine all retrieved data into a structured response object
    const response: UserDataResponse = {
      user: {
        id: user._id as string,
        email: user.email,
        fullname: user.fullname,
        type: user.type,
        degree: user.degree || null,
      },
      timeline,
      deficiencies,
      exemptions,
      degree: degree
        ? {
            id: degree.id,
            name: degree.name,
            totalCredits: degree.totalCredits,
          }
        : null,
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
