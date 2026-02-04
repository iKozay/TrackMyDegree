import { getTermRanges, isTermInProgress } from '@utils/misc';
import { SEASONS } from '@utils/constants';

describe('misc', () => {
  describe('getTermRanges', () => {
    it('returns Winter term range (Jan 1 - May 4)', () => {
      const { start, end } = getTermRanges('Winter 2024');
      expect(start).toEqual(new Date(2024, 0, 1));
      expect(end).toEqual(new Date(2024, 4, 4));
    });

    it('returns Summer term range (May 5 - Aug 31)', () => {
      const { start, end } = getTermRanges('Summer 2024');
      expect(start).toEqual(new Date(2024, 4, 5));
      expect(end).toEqual(new Date(2024, 7, 31));
    });

    it('returns Fall term range (Sep 1 - Dec 31)', () => {
      const { start, end } = getTermRanges('Fall 2024');
      expect(start).toEqual(new Date(2024, 8, 1));
      expect(end).toEqual(new Date(2024, 11, 31));
    });

    it('returns Fall/Winter term range and parses year from hyphenated form', () => {
      const { start, end } = getTermRanges(`${SEASONS.FALL_WINTER} 2024-2025`);
      expect(start).toEqual(new Date(2024, 8, 1));
      expect(end).toEqual(new Date(2025, 3, 30));
    });

    it('accepts lowercase term name (switch uses toUpperCase)', () => {
      const { start, end } = getTermRanges('fall 2024');
      expect(start).toEqual(new Date(2024, 8, 1));
      expect(end).toEqual(new Date(2024, 11, 31));
    });

    it('throws for unknown term name', () => {
      expect(() => getTermRanges('Unknown 2024')).toThrow('Unknown term: Unknown');
    });
  });

  describe('isTermInProgress', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('returns false when term is undefined', () => {
      expect(isTermInProgress(undefined)).toBe(false);
    });

    it('returns false when term is null', () => {
      expect(isTermInProgress(null as unknown as undefined)).toBe(false);
    });

    it('returns false when today is before term start', () => {
      // Winter 2024: Jan 1 - May 4. Set "today" to Dec 15, 2023
      jest.setSystemTime(new Date(2023, 11, 15));
      expect(isTermInProgress('Winter 2024')).toBe(false);
    });

    it('returns false when today is after term end', () => {
      // Winter 2024: Jan 1 - May 4. Set "today" to Jun 1, 2024
      jest.setSystemTime(new Date(2024, 5, 1));
      expect(isTermInProgress('Winter 2024')).toBe(false);
    });

    it('returns true when today is within term range', () => {
      // Winter 2024: Jan 1 - May 4. Set "today" to Feb 15, 2024
      jest.setSystemTime(new Date(2024, 1, 15));
      expect(isTermInProgress('Winter 2024')).toBe(true);
    });

    it('returns true when today equals term start', () => {
      jest.setSystemTime(new Date(2024, 0, 1));
      expect(isTermInProgress('Winter 2024')).toBe(true);
    });

    it('returns true when today equals term end', () => {
      jest.setSystemTime(new Date(2024, 4, 4));
      expect(isTermInProgress('Winter 2024')).toBe(true);
    });
  });
});
