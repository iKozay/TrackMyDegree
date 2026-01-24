import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../api/request", () => ({
  request: vi.fn(),
}));

import { api } from "../../api/http-api-client";
import { request } from "../../api/request";

describe("http-api-client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => null);
  });

  it("sends GET request with default options", async () => {
    vi.mocked(request).mockResolvedValueOnce("ok" as any);

    await api.get("/test");

    expect(request).toHaveBeenCalledWith(
      expect.stringContaining("/test"),
      expect.objectContaining({
        method: "GET",
        credentials: "include",
      })
    );
  });

  it("sends POST request with JSON body and auth header", async () => {
    vi.mocked(request).mockResolvedValueOnce("ok" as any);
    vi.spyOn(Storage.prototype, "getItem").mockReturnValue("token");

    await api.post("/timeline", { name: "T1" });

    const options = vi.mocked(request).mock.calls[0][1] as RequestInit;
    expect(options.method).toBe("POST");
    expect(options.headers).toMatchObject({
      "Content-Type": "application/json",
      Authorization: "Bearer token",
    });
    expect(options.body).toBe(JSON.stringify({ name: "T1" }));
  });

  it("omits JSON header for FormData payload", async () => {
    vi.mocked(request).mockResolvedValueOnce("ok" as any);
    const formData = new FormData();
    formData.append("file", new Blob(["x"]), "test.txt");

    await api.post("/upload", formData);

    const options = vi.mocked(request).mock.calls[0][1] as RequestInit;
    expect(options.method).toBe("POST");
    expect(options.headers).not.toHaveProperty("Content-Type");
    expect(options.body).toBe(formData);
  });

  it("sends DELETE request", async () => {
    vi.mocked(request).mockResolvedValueOnce("ok" as any);

    await api.delete("/timeline/1");

    expect(request).toHaveBeenCalledWith(
      expect.stringContaining("/timeline/1"),
      expect.objectContaining({ method: "DELETE" })
    );
  });
});
