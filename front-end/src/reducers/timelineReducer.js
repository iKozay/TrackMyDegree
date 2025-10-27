/* eslint-disable prettier/prettier */
export const initialState = {
    showCourseList: true,
    showCourseDescription: true,
    showDeficiencyModal: false,
    showExemptionsModal: false,
    semesters: [],
    semesterCourses: {},
    isModalOpen: false,
    searchQuery: '',
    isECP: false,
    timelineString: null,
    history: [],
    future: [],
    isShareVisible: false,
    credsReq: 120,
    isDesktop: window.innerWidth > 767,
    addButtonText: '+ Add Semester',
    activeId: null,
    selectedCourse: null,
    returning: false,
    hasUnmetPrerequisites: false,
    totalCredits: 0,
    coursePools: [],
    deficiencyCredits: 0,
    deficiencyCourses: [],
    exemptionCredits: 0,
    exemptionCourses: [],
    exemptionCodes: [],
    loading: true,
    error: null,
    allCourses: [],
    hasUnsavedChanges: false,
    nextPath: null,
    showSaveModal: false,
    showLeaveModal: false,
    timelineName: '',
    tempDegId: null,
    courseInstanceMap: {},
    uniqueIdCounter: 0,
    activeCourseCode: null,
    shakingSemesterId: null,
};

export const timelineReducer = (state, action) => {
    switch (action.type) {
        case 'SET':
            return { ...state, ...action.payload };
        case 'RESET':
            return { ...initialState, ...action.payload };
        default:
            return state;
    }
}
