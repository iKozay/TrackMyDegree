// BaseModal.test.tsx

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BaseModal } from "../../components/BaseModal";

describe("BaseModal", () => {
  let onCloseMock: (open: boolean, type: string) => void;

  beforeEach(() => {
    onCloseMock = vi.fn();
  });

  it("does not render anything when open is false", () => {
    const { container } = render(
      <BaseModal open={false} onClose={onCloseMock}>
        <div>Modal content</div>
      </BaseModal>
    );

    expect(container.firstChild).toBeNull();
    expect(onCloseMock).not.toHaveBeenCalled();
  });

  it("renders children when open is true", () => {
    render(
      <BaseModal open={true} onClose={onCloseMock}>
        <div>Modal content</div>
      </BaseModal>
    );

    expect(screen.getByText("Modal content")).toBeInTheDocument();
  });

  it("calls onClose with (false, '') when clicking on the backdrop", () => {
    render(
      <BaseModal open={true} onClose={onCloseMock}>
        <div>Modal content</div>
      </BaseModal>
    );

    const backdrop = screen.getByRole("button"); // this *is* the backdrop
    fireEvent.click(backdrop);

    expect(onCloseMock).toHaveBeenCalledTimes(1);
    expect(onCloseMock).toHaveBeenCalledWith(false, "");
  });

  it("calls onClose with (false, '') when clicking the close button", () => {
    render(
      <BaseModal open={true} onClose={onCloseMock}>
        <div>Modal content</div>
      </BaseModal>
    );

    const closeButton = screen.getByRole("button");
    fireEvent.click(closeButton);

    expect(onCloseMock).toHaveBeenCalledTimes(1);
    expect(onCloseMock).toHaveBeenCalledWith(false, "");
  });

  it("does not close when clicking inside modal content", () => {
    render(
      <BaseModal open={true} onClose={onCloseMock}>
        <button>Inside button</button>
      </BaseModal>
    );

    const insideButton = screen.getByText("Inside button");
    fireEvent.click(insideButton);

    expect(onCloseMock).not.toHaveBeenCalled();
  });
});
