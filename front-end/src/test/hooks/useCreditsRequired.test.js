import { renderHook } from '@testing-library/react';
import { useCreditsRequired } from '../../hooks/useCreditsRequired';
import * as timelineUtils from '../../utils/timelineUtils';

describe('useCreditsRequired', () => {
  let dispatchMock;

  beforeEach(() => {
    dispatchMock = jest.fn();
    jest.spyOn(timelineUtils, 'calculatedCreditsRequired');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('dispatches correct credits when extendedCredit is false', () => {
    timelineUtils.calculatedCreditsRequired.mockReturnValue(90);
    const state = { coursePools: ['pool1', 'pool2'] };
    renderHook(() => useCreditsRequired(state, false, dispatchMock));
    expect(dispatchMock).toHaveBeenCalledWith({ type: 'SET', payload: { credsReq: 90 } });
  });

  it('adds extra credits when extendedCredit is true', () => {
    timelineUtils.calculatedCreditsRequired.mockReturnValue(90);
    const state = { coursePools: ['pool1', 'pool2'] };
    renderHook(() => useCreditsRequired(state, true, dispatchMock));
    expect(dispatchMock).toHaveBeenCalledWith({ type: 'SET', payload: { credsReq: 120 } });
  });

  it('recalculates credits when coursePools change', () => {
    timelineUtils.calculatedCreditsRequired.mockReturnValueOnce(60).mockReturnValueOnce(80);
    const state = { coursePools: ['pool1'] };
    const { rerender } = renderHook(
      ({ state, extendedCredit }) => useCreditsRequired(state, extendedCredit, dispatchMock),
      { initialProps: { state, extendedCredit: false } },
    );
    expect(dispatchMock).toHaveBeenCalledWith({ type: 'SET', payload: { credsReq: 60 } });

    rerender({ state: { coursePools: ['pool1', 'pool2'] }, extendedCredit: false });
    expect(dispatchMock).toHaveBeenCalledWith({ type: 'SET', payload: { credsReq: 80 } });
  });

  it('recalculates credits when extendedCredit changes', () => {
    timelineUtils.calculatedCreditsRequired.mockReturnValue(100);
    const state = { coursePools: ['pool1'] };
    const { rerender } = renderHook(
      ({ state, extendedCredit }) => useCreditsRequired(state, extendedCredit, dispatchMock),
      { initialProps: { state, extendedCredit: false } },
    );
    expect(dispatchMock).toHaveBeenCalledWith({ type: 'SET', payload: { credsReq: 100 } });

    rerender({ state, extendedCredit: true });
    expect(dispatchMock).toHaveBeenCalledWith({ type: 'SET', payload: { credsReq: 130 } });
  });
});
