/* eslint-disable prettier/prettier */
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { decompressTimeline } from '../components/CompressDegree';

export const useLoadTimelineFromUrl = (dispatch) => {
    const location = useLocation();
    const [ecpFromUrl, setEcpFromUrl] = useState(null);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const timelineStringParam = params.get('tstring');
        console.log("Timeline string from URL:", timelineStringParam);

        if (timelineStringParam) {
            const [decompressedTimeline, degreeFromUrl, creditsFromUrl, ecpValue] =
                decompressTimeline(timelineStringParam);

            dispatch({
                type: 'SET',
                payload: {
                    timelineString: timelineStringParam,
                    semesterCourses: decompressedTimeline,
                    exemptionCodes: decompressedTimeline.Exempted ?? [],
                    tempDegId: degreeFromUrl,
                    startingSemester: Object.keys(decompressedTimeline)[1],
                    credsReq: creditsFromUrl,
                },
            });

            setEcpFromUrl(ecpValue);
        }

    }, [location.search, dispatch]);

    return ecpFromUrl;
};
