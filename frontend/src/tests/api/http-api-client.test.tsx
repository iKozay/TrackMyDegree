import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { api } from "../../api/http-api-client";
import * as requestModule from "../../api/request";

vi.mock("../../api/request", () => ({
  request: vi.fn(),
}));

vi.mock("../../config", () => ({
  ENV: {
    API_SERVER: "http://localhost:8000",
  },
}));

describe("http-api-client", () => {
  const mockRequest = vi.mocked(requestModule.request);

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("api.get", () => {
    it("should make a GET request with correct URL and options", async () => {
      const mockResponse = { data: "test" };
      mockRequest.mockResolvedValue(mockResponse);

      const result = await api.get("/test");

      expect(mockRequest).toHaveBeenCalledWith(
        "http://localhost:8000/test",
        expect.objectContaining({
          method: "GET",
          credentials: "include",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it("should include authorization header when token exists", async () => {
      localStorage.setItem("token", "test-token");
      mockRequest.mockResolvedValue({});

      await api.get("/test");

      expect(mockRequest).toHaveBeenCalledWith(
        "http://localhost:8000/test",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
          }),
        })
      );
    });
  });

  describe("api.post", () => {
    it("should make a POST request with JSON data", async () => {
      const mockResponse = { id: 1 };
      const postData = { name: "test" };
      mockRequest.mockResolvedValue(mockResponse);

      const result = await api.post("/test", postData);

      expect(mockRequest).toHaveBeenCalledWith(
        "http://localhost:8000/test",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(postData),
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it("should handle FormData without Content-Type header", async () => {
      mockRequest.mockResolvedValue({});
      const formData = new FormData();
      formData.append("file", "test");

      await api.post("/upload", formData);

      expect(mockRequest).toHaveBeenCalledWith(
        "http://localhost:8000/upload",
        expect.objectContaining({
          method: "POST",
          body: formData,
        })
      );

      const callHeaders = mockRequest.mock.calls[0][1]?.headers as Record<
        string,
        string
      >;
      expect(callHeaders["Content-Type"]).toBeUndefined();
    });

    it("should handle null data", async () => {
      mockRequest.mockResolvedValue({});

      await api.post("/test", null);

      expect(mockRequest).toHaveBeenCalledWith(
        "http://localhost:8000/test",
        expect.objectContaining({
          method: "POST",
        })
      );
      const callOptions = mockRequest.mock.calls[0][1];
      expect(callOptions?.body).toBeUndefined();
    });
  });

  describe("api.put", () => {
    it("should make a PUT request with JSON data", async () => {
      const mockResponse = { updated: true };
      const putData = { name: "updated" };
      mockRequest.mockResolvedValue(mockResponse);

      const result = await api.put("/test/1", putData);

      expect(mockRequest).toHaveBeenCalledWith(
        "http://localhost:8000/test/1",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify(putData),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it("should handle null data in PUT", async () => {
      mockRequest.mockResolvedValue({});

      await api.put("/test/1", null);

      expect(mockRequest).toHaveBeenCalledWith(
        "http://localhost:8000/test/1",
        expect.objectContaining({
          method: "PUT",
        })
      );
      const callOptions = mockRequest.mock.calls[0][1];
      expect(callOptions?.body).toBeUndefined();
    });
  });

  describe("api.patch", () => {
    it("should make a PATCH request with JSON data", async () => {
      const mockResponse = { patched: true };
      const patchData = { status: "active" };
      mockRequest.mockResolvedValue(mockResponse);

      const result = await api.patch("/test/1", patchData);

      expect(mockRequest).toHaveBeenCalledWith(
        "http://localhost:8000/test/1",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify(patchData),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it("should handle null data in PATCH", async () => {
      mockRequest.mockResolvedValue({});

      await api.patch("/test/1", null);

      expect(mockRequest).toHaveBeenCalledWith(
        "http://localhost:8000/test/1",
        expect.objectContaining({
          method: "PATCH",
        })
      );
      const callOptions = mockRequest.mock.calls[0][1];
      expect(callOptions?.body).toBeUndefined();
    });
  });

  describe("api.delete", () => {
    it("should make a DELETE request", async () => {
      const mockResponse = { deleted: true };
      mockRequest.mockResolvedValue(mockResponse);

      const result = await api.delete("/test/1");

      expect(mockRequest).toHaveBeenCalledWith(
        "http://localhost:8000/test/1",
        expect.objectContaining({
          method: "DELETE",
          credentials: "include",
        })
      );
      expect(result).toEqual(mockResponse);
    });
  });
});
