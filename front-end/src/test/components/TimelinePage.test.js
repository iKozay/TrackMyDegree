import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TimelinePage from "../../pages/TimelinePage";
import { AuthContext } from "../../middleware/AuthContext";


// Minimal mocks to avoid errors
jest.mock("@sentry/react", () => ({
    captureException: jest.fn(),
}));

jest.mock("../../hooks/useDegreeInitialization", () => ({
    useDegreeInitialization: () => ({
        degree_Id: "test-degree",
        startingSemester: "Fall",
        credits_Required: 90,
        extendedCredit: false,
    }),
}));

jest.mock("../../hooks/useFetchCoursesByDegree", () => ({
    useFetchCoursesByDegree: jest.fn(),
}));

jest.mock("../../hooks/useFetchAllCourses", () => ({
    useFetchAllCourses: jest.fn(),
}));

jest.mock("../../hooks/useFetchDegreeRequirements", () => ({
    useFetchDegreeRequirements: jest.fn(),
}));

jest.mock("../../hooks/useLoadTimelineFromUrl", () => ({
    useLoadTimelineFromUrl: () => null,
}));

jest.mock("../../hooks/useNavigationBlocker", () => ({
    useNavigationBlocker: jest.fn(),
}));

jest.mock("../../hooks/useResponsiveUI", () => ({
    useResponsiveUI: jest.fn(),
}));

jest.mock("../../hooks/useDragSensors", () => ({
    useDragSensors: jest.fn(),
}));

jest.mock("../../hooks/useCourseDrag", () => ({
    useCourseDrag: () => ({
        isCourseAssigned: jest.fn(),
        handleDragStart: jest.fn(),
        handleDragEnd: jest.fn(),
        handleDragCancel: jest.fn(),
        handleReturn: jest.fn(),
        handleCourseSelect: jest.fn(),
    }),
}));

// Minimal children component mocks
jest.mock("../../components/TopBar", () => ({
    TopBar: () => <div>TopBar</div>,
}));
jest.mock("../../components/CourseSideBar", () => ({
    CourseSidebar: () => <div>Sidebar</div>,
}));
jest.mock("../../components/SemesterColumn", () => ({
    SemesterColumn: () => <div>SemesterColumn</div>,
}));
jest.mock("../../components/Toast", () => ({
    Toast: () => <div>Toast</div>,
}));
jest.mock("../../components/ConfirmModal", () => ({
    ConfirmModal: () => <div>ConfirmModal</div>,
}));
jest.mock('react-router-dom', () => {
    const originalModule = jest.requireActual('react-router-dom');
    return {
        ...originalModule,
        useBlocker: jest.fn(() => { }), // no-op
        useNavigate: () => jest.fn(),
    };
});

describe("TimelinePage", () => {
    it("renders without crashing", () => {
        const { container } = render(
            <MemoryRouter>
                <AuthContext.Provider value={{ user: { id: "1", name: "Yassine" } }}>
                    <TimelinePage degreeId="1" timelineData={{}} />
                </AuthContext.Provider>
            </MemoryRouter>
        );
        expect(container).toBeInTheDocument();
    });
});
