import React from 'react';
import { render, screen, fireEvent } from "@testing-library/react";
import { CourseScheduleModal } from "../../components/CourseScheduleModal";

describe("CourseScheduleModal", () => {
    it("renders without crashing", () => {
        render(<CourseScheduleModal title="COMP 248" hidden={false} />);
        const button = screen.getByRole("button", { name: /Show Course Schedule/i });
        expect(button).toBeInTheDocument();
    });



});
