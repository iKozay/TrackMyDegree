import { useSensor, useSensors, MouseSensor, TouchSensor } from '@dnd-kit/core';

export const useDragSensors = () => {
    const mouseSensor = useSensor(MouseSensor, {
        activationConstraint: { distance: 5 },
    });

    const touchSensor = useSensor(TouchSensor, {
        activationConstraint: { delay: 100, tolerance: 5 },
    });

    const sensors = useSensors(mouseSensor, touchSensor);

    return sensors;
};
