import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DownloadPromptModal } from "../../components/DownloadPromptModal";

describe("DownloadPromptModal", () => {
  it("returns null when closed", () => {
    const { container } = render(
      <DownloadPromptModal open={false} onClose={() => {}} onDownloadAnyway={() => {}} onValidateFirst={() => {}} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("calls handlers for the three actions", () => {
    const onClose = vi.fn();
    const onDownloadAnyway = vi.fn();
    const onValidateFirst = vi.fn();

    render(
      <DownloadPromptModal
        open
        onClose={onClose}
        onDownloadAnyway={onDownloadAnyway}
        onValidateFirst={onValidateFirst}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /Download Anyway/i }));
    expect(onDownloadAnyway).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /Validate First/i }));
    expect(onValidateFirst).toHaveBeenCalledTimes(1);
  });
});
