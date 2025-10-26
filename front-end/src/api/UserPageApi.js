import { UserPageError } from '../middleware/SentryErrors';

/** Fetch degree credits for a given degree ID. */
export const getDegreeCredits = async (degreeId) => {
  try {
    const response = await fetch(`${process.env.REACT_APP_SERVER}/degree/getCredits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ degreeId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new UserPageError(errorData.message || 'Failed to fetch degree credits.');
    }

    const data = await response.json();
    return data;
  } catch (e) {
    console.error('Error fetching degree credits:', e);
    return null;
  }
};

/** Fetch all timelines belonging to a user. */
export const getUserTimelines = async (user_id) => {
  try {
    const response = await fetch(`${process.env.REACT_APP_SERVER}/timeline/getAll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new UserPageError(errorData.message || 'Failed to fetch user timelines.');
    }

    const data = await response.json();

    if (Array.isArray(data)) {
      return data.sort((a, b) => new Date(b.last_modified) - new Date(a.last_modified));
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
    const response = await fetch(`${process.env.REACT_APP_SERVER}/timeline/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timeline_id }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new UserPageError(errorData.message || 'Failed to delete timeline.');
    }
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
