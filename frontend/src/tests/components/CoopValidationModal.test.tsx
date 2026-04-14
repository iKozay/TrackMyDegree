import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import { CoopValidationModal } from "../../components/CoopValidationModal";
import { api } from "../../api/http-api-client.ts";

// --- mock data ---
const mockResult = {
  valid: false,
  errors: [
    {
      ruleId: "SEQ_STARTS_WITH_STUDY",
      message: "Degree must begin with a study term",
      severity: "ERROR",
    },
    {
      ruleId: "THREE_WORK_TERMS_REQUIRED",
      message: "Must complete exactly 3 work terms",
      severity: "ERROR",
    },
  ],
  warnings: [
    {
      ruleId: "LONG_SEQUENCE_WARNING",
      message: "Sequence is long",
      severity: "WARNING",
    },
  ],
  metadata: { totalTerms: 13, studyTerms: 10, workTerms: 3 },
};

// --- mocks ---
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<any>("react-router-dom");
  return {
    ...actual,
    useParams: () => ({ jobId: "123" }),
  };
});

vi.mock("../../api/http-api-client.ts", () => ({
  api: {
    get: vi.fn(),
  },
}));

describe("CoopValidationModal (content)", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("fetches validation using jobId and renders rules/issues", async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockResult as any);

    render(<CoopValidationModal />);

    // Wait for the effect to run and API to be called
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/coop/validate/123");
    });

    // Now assert UI
    expect(await screen.findByText(/Co-op Validation/i)).toBeInTheDocument();
    expect(
      await screen.findByText(/Degree must begin with a study term/i),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/Must complete exactly 3 work terms/i),
    ).toBeInTheDocument();
    expect(await screen.findByText(/Sequence is long/i)).toBeInTheDocument();
    expect(
      await screen.findByText(
        /This sequence does not follow co-op regulations listed below/i,
      ),
    ).toBeInTheDocument();
  });

  it("shows error message if API fails", async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error("fail"));

    render(<CoopValidationModal />);

    // Wait until the error state has been set
    expect(
      await screen.findByText(/Failed to fetch validation results\./i),
    ).toBeInTheDocument();
  });

  it("downloads auto-filled form and renders returned notes", async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockResult as any);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: (name: string) => {
          if (name === "X-Coop-Form-Notes") {
            return encodeURIComponent(
              JSON.stringify(["Skipped extra courses for Winter 2025"]),
            );
          }
          return null;
        },
      },
      blob: () => Promise.resolve(new Blob(["pdf-bytes"], { type: "application/pdf" })),
    });

    const createObjectURLMock = vi.fn(() => "blob:test-url");
    const revokeObjectURLMock = vi.fn();
    const clickMock = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);

    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("URL", {
      createObjectURL: createObjectURLMock,
      revokeObjectURL: revokeObjectURLMock,
    } as unknown as typeof URL);

    render(<CoopValidationModal />);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/coop/validate/123");
    });

    fireEvent.click(
      await screen.findByRole("button", {
        name: /Download Auto-Filled Sequence Change Form/i,
      }),
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/coop/form/123"),
        {
          method: "GET",
          credentials: "include",
        },
      );
    });

    expect(await screen.findByText(/Form notes/i)).toBeInTheDocument();
    expect(
      await screen.findByText(/Skipped extra courses for Winter 2025/i),
    ).toBeInTheDocument();
    expect(createObjectURLMock).toHaveBeenCalled();
    expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:test-url");

    clickMock.mockRestore();
  });

  it("shows download error when form generation fails", async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockResult as any);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      headers: {
        get: () => null,
      },
      blob: () => Promise.resolve(new Blob([""], { type: "application/pdf" })),
    });

    vi.stubGlobal("fetch", fetchMock);

    render(<CoopValidationModal />);

    fireEvent.click(
      await screen.findByRole("button", {
        name: /Download Auto-Filled Sequence Change Form/i,
      }),
    );

    expect(
      await screen.findByText(/Failed to generate and download the co-op PDF form\./i),
    ).toBeInTheDocument();
  });
});
