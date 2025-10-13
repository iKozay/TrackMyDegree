import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

export const useDegreeInitialization = (degreeId, isExtendedCredit) => {
    const location = useLocation();
    return useMemo(() => {
        let { degree_Id, startingSemester, credits_Required, extendedCredit } = location.state || {};

        if (isExtendedCredit) extendedCredit = true;
        if (isExtendedCredit === null && extendedCredit === null) extendedCredit = false;
        if (!degree_Id) degree_Id = degreeId;

        return { degree_Id, startingSemester, credits_Required, extendedCredit };

    }, [location.state, degreeId, isExtendedCredit]);
};
