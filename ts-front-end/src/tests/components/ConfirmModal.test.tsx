import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConfirmModal } from "../../components/ConfirmModal";

describe("ConfirmModal", () => {
  it("returns null when closed", () => {
    const { container } = render(
      <ConfirmModal open={false} title="X" onConfirm={() => {}} onCancel={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders title/description and triggers confirm/cancel", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <ConfirmModal
        open
        title="Reset?"
        description="Are you sure?"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Reset?")).toBeInTheDocument();
    expect(screen.getByText("Are you sure?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /Confirm/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
