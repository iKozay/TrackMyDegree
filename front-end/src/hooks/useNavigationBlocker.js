// useNavigationBlocker.js
import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';

export const useNavigationBlocker = (shouldBlock, onBlock) => {

  useBlocker(({ nextLocation }) => {
    if (shouldBlock) {
      onBlock?.(nextLocation.pathname);
      return true; // Block navigation
    }
    return false; // Allow navigation
  });

  // External navigation (refresh/close)
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (shouldBlock) {
        event.preventDefault();
        event.returnValue =
          'You have unsaved changes. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [shouldBlock]);
};
