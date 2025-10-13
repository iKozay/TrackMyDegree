// useNavigationBlocker.js
import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';


export const useNavigationBlocker = (shouldBlock, onBlock) => {
    // Internal React Router navigation
    useBlocker(({ nextLocation }) => {
        if (shouldBlock) {
            if (onBlock) onBlock(nextLocation.pathname);
            return true; // Block navigation
        }
        return false; // Allow navigation
    });

    // External browser navigation (refresh/close)
    useEffect(() => {
        const handleBeforeUnload = (event) => {
            if (shouldBlock) {
                event.preventDefault();
                event.returnValue = "You have unsaved changes. Are you sure you want to leave?";
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [shouldBlock, onBlock]);
};
