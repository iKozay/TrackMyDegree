import { timelineReducer, initialState } from '../../reducers/timelineReducer';

describe('timelineReducer', () => {
  it('should handle SET action and merge payload', () => {
    const payload = {
      showCourseList: false,
      timelineName: 'My Timeline',
    };
    const newState = timelineReducer(initialState, { type: 'SET', payload });
    expect(newState.showCourseList).toBe(false);
    expect(newState.timelineName).toBe('My Timeline');
    // Other properties remain unchanged
    expect(newState.credsReq).toBe(initialState.credsReq);
  });

  it('should handle RESET action and merge payload', () => {
    const payload = {
      timelineName: 'Reset Timeline',
      totalCredits: 42,
    };
    const newState = timelineReducer(initialState, { type: 'RESET', payload });
    expect(newState.timelineName).toBe('Reset Timeline');
    expect(newState.totalCredits).toBe(42);
    // Other properties are reset to initialState
    expect(newState.showCourseList).toBe(true);
  });

  it('should return current state for unknown action type', () => {
    const newState = timelineReducer(initialState, { type: 'UNKNOWN', payload: { showCourseList: false } });
    expect(newState).toEqual(initialState);
  });
});
