// src/pages/CourseListPage/hooks/useResponsive.js
import { useState, useEffect } from 'react';

/**
 * Custom hook for detecting desktop vs mobile viewport
 * @param {number} breakpoint - Width breakpoint in pixels (default: 767)
 */
const useResponsive = (breakpoint = 767) => {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth > breakpoint);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth > breakpoint);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);

  return {
    isDesktop,
    isMobile: !isDesktop,
  };
};

export default useResponsive;
