// useNavigationBlocker.js
import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';

export const useNavigationBlocker = (shouldBlock, onBlock) => {
  useEffect(() => {
    if (!shouldBlock) return;

    const unblock = useBlocker(({ nextLocation }) => {
      if (onBlock) onBlock(nextLocation.pathname);
      return true; // Block navigation
    });

    return () => {
      unblock?.(); // Cleanup blocker
    };
  }, [shouldBlock, onBlock]);

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
