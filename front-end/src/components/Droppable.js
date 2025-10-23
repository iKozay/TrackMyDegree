/* eslint-disable prettier/prettier */
import React from 'react';
import { useDroppable } from '@dnd-kit/core';

export const Droppable = ({ id, children, className = 'semester-spot' }) => {
  const { setNodeRef } = useDroppable({
    id,
    data: {
      type: 'semester',
      containerId: id,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={className}
      data-semester-id={id}
      data-testid={id}
    >
      {children}
    </div>
  );
};