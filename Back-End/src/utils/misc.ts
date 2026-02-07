import { SEASONS } from '@utils/constants';

export function getTermRanges(term: string): { start: Date; end: Date } {
  let [name, yearStr] = term.split(' ');
  if (name == SEASONS.FALL_WINTER) {
    yearStr = yearStr.split('-')[0];
  }
  const year = Number(yearStr);

  let start: Date;
  let end: Date;

  switch (name.toUpperCase()) {
    case SEASONS.WINTER:
      start = new Date(year, 0, 1); // Jan 1
      end = new Date(year, 4, 4); // May 4
      break;

    case SEASONS.SUMMER:
      start = new Date(year, 4, 5); // May 5
      end = new Date(year, 7, 31); // Aug 31
      break;

    case SEASONS.FALL:
      start = new Date(year, 8, 1); // Sep 1
      end = new Date(year, 11, 31); // Dec 31
      break;
    case SEASONS.FALL_WINTER:
      start = new Date(year, 8, 1); // Sep 1
      end = new Date(year + 1, 3, 30); // Apr 30
      break;
    default:
      throw new Error('Unknown term: ' + name);
  }

  return { start, end };
}

export function isTermInProgress(term: string | undefined): boolean {
  if (!term) return false;

  const today = new Date();
  const { start, end } = getTermRanges(term);

  return today >= start && today <= end;
}
