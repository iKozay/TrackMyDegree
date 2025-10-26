import moment from 'moment';

const SERVER = process.env.REACT_APP_SERVER;

/** Generic POST with JSON; throws on non-2xx. */
async function apiPost(path, body, { signal } = {}) {
  const res = await fetch(`${SERVER}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
    signal,
  });

  // Try to parse JSON if possible; fall back to empty object
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data?.message || `Request failed: ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/** Get total degree credits; returns number (fallback handled by caller). */
export async function getDegreeCredits(degreeId, options = {}) {
  return apiPost('/degree/getCredits', { degreeId }, options);
}

/** Fetch timelines for a user; returns an array sorted by last_modified desc. */
export async function fetchUserTimelines(userId, options = {}) {
  const data = await apiPost('/timeline/getAll', { user_id: userId }, options);
  if (!Array.isArray(data)) return [];
  return data
    .slice()
    .sort((a, b) => new Date(b.last_modified) - new Date(a.last_modified));
}

/** Delete a timeline by id. */
export async function deleteUserTimeline(timelineId, options = {}) {
  await apiPost('/timeline/delete', { timeline_id: timelineId }, options);
}

/** Convert backend items to transcriptData shape expected by timeline page. */
export function toTranscriptData(items = []) {
  return items.map(({ season, year, courses }) => ({
    term: `${season} ${year}`,
    courses: courses || [],
    grade: 'A',
  }));
}

/** Small helpers to keep the page clean. */
export const formatLastModified = (dateStr) =>
  moment(dateStr).format('MMM DD, YYYY h:mm A');

export const isStudent = (user) => !!user && user.type === 'student';
