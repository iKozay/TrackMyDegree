import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import EulaPage from "../../../src/pages/EulaPage";

describe("EulaPage", () => {
  it("renders key EULA content and controls", () => {
    render(<EulaPage />);

    expect(
      screen.getByRole("heading", { name: "User Consent and End-User License Agreement (EULA)" })
    ).toBeInTheDocument();
    expect(screen.getByText("2025-10-10")).toBeInTheDocument();
    expect(screen.getByText("2026-04-12")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "1. Introduction" })).toHaveAttribute(
      "href",
      "#section-1-introduction"
    );
    expect(screen.getByRole("button", { name: "Go back to top" })).toBeInTheDocument();
  });
});