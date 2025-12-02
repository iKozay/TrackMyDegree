import { vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TimelineError } from "../../components/TimelineError";

describe("TimelineError", () => {
  it("renders default title and message when no props are given", () => {
    render(<TimelineError />);

    // Title
    expect(
      screen.getByRole("heading", { name: /something went wrong/i })
    ).toBeInTheDocument();

    // Default message
    expect(
      screen.getByText(/could not load timeline data\./i)
    ).toBeInTheDocument();

    // No retry button by default (since onRetry not provided)
    expect(screen.queryByRole("button", { name: /try again/i })).toBeNull();
  });

  it("renders a custom error message when provided", () => {
    const customMessage = "Backend is temporarily unavailable.";

    render(<TimelineError message={customMessage} />);

    expect(screen.getByText(customMessage)).toBeInTheDocument();
  });

  it("renders retry button when onRetry is provided and calls it on click", () => {
    const onRetry = vi.fn();

    render(<TimelineError onRetry={onRetry} />);

    const button = screen.getByRole("button", { name: /try again/i });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("applies the expected layout classes", () => {
    const { container } = render(<TimelineError />);

    expect(container.querySelector(".planner-fullscreen")).toBeInTheDocument();

    expect(container.querySelector(".planner-card-error")).toBeInTheDocument();

    expect(container.querySelector(".planner-icon-error")).toBeInTheDocument();
  });
});
