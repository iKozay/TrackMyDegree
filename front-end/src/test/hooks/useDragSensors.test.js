import { renderHook } from '@testing-library/react';
import { useDragSensors } from '../../hooks/useDragSensors';
import { MouseSensor, TouchSensor } from '@dnd-kit/core';

// Mock dnd-kit functions
jest.mock('@dnd-kit/core', () => ({
    useSensor: jest.fn((sensor, options) => ({ sensor, options })),
    useSensors: jest.fn((...sensors) => sensors),
    MouseSensor: jest.fn(),
    TouchSensor: jest.fn(),
}));

describe('useDragSensors', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('returns mouse and touch sensors', () => {
        const { result } = renderHook(() => useDragSensors());

        expect(result.current).toHaveLength(2);

        const [mouseSensor, touchSensor] = result.current;

        expect(mouseSensor.sensor).toBe(MouseSensor);
        expect(mouseSensor.options).toEqual({ activationConstraint: { distance: 5 } });

        expect(touchSensor.sensor).toBe(TouchSensor);
        expect(touchSensor.options).toEqual({ activationConstraint: { delay: 100, tolerance: 5 } });
    });
});
