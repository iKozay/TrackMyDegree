import { api } from './http-api-client';

/** Fetch degree credits for a given degree ID. */
export const getDegreeCredits = async (degreeId) => {
  try {
    const response = await api.get(`/degree/${degreeId}/credits`);
    return response.totalCredits;
  } catch (e) {
    console.error('Error fetching degree credits:', e);
    return null;
  }
};

/** Fetch all timelines belonging to a user. */
export const getUserTimelines = async (user_id) => {
  try {
    const response = await api.get(`/timeline/user/${user_id}`);

    if (Array.isArray(response.timelines)) {
      return response.timelines.sort((a, b) => new Date(b.last_modified) - new Date(a.last_modified));
    }
    return [];
  } catch (e) {
    console.error('Error fetching timelines:', e);
    return [];
  }
};

/** Request the backend to delete a specific timeline. */
export const deleteTimelineById = async (timeline_id) => {
  try {
    await api.delete(`/timeline/${timeline_id}`);
  } catch (e) {
    console.error('Error deleting timeline:', e);
    throw e;
  }
};

/** Transform timeline items into transcript format. */
export const buildTranscriptData = (items = []) => {
  return items.map(({ season, year, courses }) => ({
    term: `${season} ${year}`,
    courses,
    grade: 'A',
  }));
};
