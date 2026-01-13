import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { downloadJson } from "../../utils/cspDownload";

describe("cspDownload.downloadJson", () => {
  let createObjectURLSpy: any;
  let revokeObjectURLSpy: any;

  beforeEach(() => {
    createObjectURLSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock");
    revokeObjectURLSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a blob url, clicks an anchor, and revokes url", () => {
    const appendSpy = vi.spyOn(document.body, "appendChild");

    const realCreate = document.createElement.bind(document);

    const createElementSpy = vi
      .spyOn(document, "createElement")
      .mockImplementation((tagName: any) => {
        const el = realCreate(tagName);

        if (tagName === "a") {
          vi.spyOn(el, "click").mockImplementation(() => {});
          vi.spyOn(el, "remove").mockImplementation(() => {});
        }

        return el;
      });

    downloadJson("test.json", { hello: "world" });

    expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
    expect(createElementSpy).toHaveBeenCalledWith("a");
    expect(appendSpy).toHaveBeenCalledTimes(1);

    const a = appendSpy.mock.calls[0][0] as HTMLAnchorElement;

    expect(a.href).toBe("blob:mock");
    expect(a.download).toBe("test.json");
    expect((a.click as any)).toHaveBeenCalledTimes(1);
    expect((a.remove as any)).toHaveBeenCalledTimes(1);

    expect(revokeObjectURLSpy).toHaveBeenCalledWith("blob:mock");
  });
});
