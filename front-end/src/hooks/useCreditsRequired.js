/* eslint-disable prettier/prettier */
import { useEffect } from 'react';
import { calculatedCreditsRequired } from '../utils/timelineUtils';

export const useCreditsRequired = (state, extendedCredit, dispatch) => {
    const ECP_EXTRA_CREDITS = 30;
    useEffect(() => {
        let creds = calculatedCreditsRequired(state.coursePools);

        if (extendedCredit) {
            creds += ECP_EXTRA_CREDITS;
        }

        dispatch({ type: 'SET', payload: { credsReq: creds } });
    }, [state.coursePools, extendedCredit, dispatch]);
};
