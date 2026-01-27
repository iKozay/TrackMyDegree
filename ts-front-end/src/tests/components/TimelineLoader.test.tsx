import { render, screen } from "@testing-library/react";
import { TimelineLoader } from "../../components/TimelineLoader"; // adjust path if needed

describe("TimelineLoader", () => {
  it("renders the main loader heading and message", () => {
    render(<TimelineLoader />);

    // Heading
    expect(
      screen.getByRole("heading", { name: /preparing your academic plan/i })
    ).toBeInTheDocument();

    // Subtitle text
    expect(
      screen.getByText(/fetching your courses, pools, and semesters/i)
    ).toBeInTheDocument();
  });

  it("renders the spinner and progress bar", () => {
    const { container } = render(<TimelineLoader />);

    // Spinner wrapper
    const spinner = container.querySelector(".planner-spinner-icon");
    expect(spinner).toBeInTheDocument();

    // Progress bar outer + inner
    const progressBar = container.querySelector(".planner-progress-bar");
    const progressInner = container.querySelector(".planner-progress-inner");

    expect(progressBar).toBeInTheDocument();
    expect(progressInner).toBeInTheDocument();
  });

  it("uses the fullscreen + card layout classes", () => {
    const { container } = render(<TimelineLoader />);

    const fullscreen = container.querySelector(".planner-fullscreen");
    const card = container.querySelector(".planner-card");

    expect(fullscreen).toBeInTheDocument();
    expect(card).toBeInTheDocument();
  });
});
