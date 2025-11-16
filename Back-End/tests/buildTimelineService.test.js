
const { buildTimeline } = require("../services/timeline/timelineService"); // adjust path if needed

describe("buildTimeline (stub)", () => {
    test("handles type 'file' and resolves with { status: 'done' }", async () => {
        const buffer = Buffer.from("fake pdf data");

        const result = await buildTimeline({
            type: "file",
            data: buffer,
        });

        expect(result).toEqual({ status: "done" });
    });

    test("handles type 'form' and resolves with { status: 'done' }", async () => {
        const formData = { degree: "CS", term: "Fall", year: 2025 };

        const result = await buildTimeline({
            type: "form",
            data: formData,
        });

        expect(result).toEqual({ status: "done" });
    });
});
