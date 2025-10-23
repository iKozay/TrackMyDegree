// useNavigationBlocker.js
import { useEffect } from 'react';

export const useNavigationBlocker = (shouldBlock) => {

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
