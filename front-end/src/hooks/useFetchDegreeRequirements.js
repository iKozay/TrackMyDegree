/* eslint-disable prettier/prettier */

import { useEffect } from 'react';
import { request } from '../api/request';

export const useFetchDegreeRequirements = (state, degree_Id, addExemptionCourse) => {
    useEffect(() => {
        const fetchRequirements = async () => {
            const tempId = state.tempDegId || degree_Id;

            if (
                state.allCourses.length > 0 &&
                tempId !== null &&
                state.exemptionCodes.length > 0
            ) {
                try {
                    const data = await request(`/degree-reqs/${tempId}-requirements.txt`);
                    const courseListData = data
                        .split('\n')
                        .map((s) => s.trim().replaceAll(' ', ''));

                    for (const code of state.exemptionCodes) {
                        if (courseListData.includes(code)) {
                            const course = state.allCourses.find((c) => c._id === code);
                            if (course) addExemptionCourse(course);
                        }
                    }
                } catch (err) {
                    console.error('Failed to fetch degree requirements:', err);
                }
            }
        };

        fetchRequirements();
    }, [state.allCourses, state.tempDegId, degree_Id, state.exemptionCodes]);
};
