import { useEffect } from 'react';

export const useResponsiveUI = (dispatch) => {
    useEffect(() => {
        const handleResize = () => {
            const isDesktop = window.innerWidth > 767;
            const addButtonText = window.innerWidth > 999 ? '+ Add Semester' : '+';

            dispatch({
                type: 'SET',
                payload: {
                    isDesktop,
                    addButtonText,
                    // If switching to mobile, hide course list and description
                    ...(isDesktop
                        ? {}
                        : { showCourseList: false, showCourseDescription: false }),
                },
            });
        };

        window.addEventListener('resize', handleResize);
        handleResize(); // set initial values

        return () => window.removeEventListener('resize', handleResize);
    }, [dispatch]);
};
