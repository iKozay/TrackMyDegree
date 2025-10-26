/* eslint-disable prettier/prettier */
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { api } from '../api/http-api-client';

export const useFetchCoursesByDegree = (degree_Id, extendedCredit, dispatch) => {
    const location = useLocation();

    useEffect(() => {
        const fetchCoursesByDegree = async () => {
            try {

                if (!degree_Id) {
                    return;
                }

                const primaryData = await api.post("/courses/getByDegreeGrouped", {
                    degree: degree_Id,
                });

                let combinedData = primaryData;

                // If extendedCredit is true, fetch and merge ECP courses
                if (extendedCredit) {
                    const extendedData = await api.post("/courses/getByDegreeGrouped", {
                        degree: "ECP",
                    });
                    combinedData = [...primaryData, ...extendedData];
                }

                dispatch({ type: 'SET', payload: { coursePools: combinedData, loading: false } });

            } catch (err) {
                console.error('Error fetching courses:', err);
                dispatch({ type: 'SET', payload: { error: err.message, loading: false } });
            }
        };

        fetchCoursesByDegree();
    }, [degree_Id, extendedCredit, location.state?.creditDeficiency, dispatch]);
};