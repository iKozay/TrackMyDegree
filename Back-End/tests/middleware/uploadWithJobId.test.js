const path = require("path");

let storageConfig;

// Mock fs so no real directories are created
jest.mock("fs", () => ({
    existsSync: jest.fn().mockReturnValue(true),
    mkdirSync: jest.fn(),
}));

// Mock multer to capture diskStorage config
jest.mock("multer", () => {
    const multerMock = jest.fn(() => ({
        single: jest.fn(), // we don't test .single here
    }));

    multerMock.diskStorage = jest.fn((config) => {
        storageConfig = config; // capture destination & filename callbacks
        return config; // no real storage engine needed
    });

    return multerMock;
});

// Require AFTER mocks so they apply correctly
const { uploadWithJobId } = require("../../middleware/uploadWithJobId");

describe("uploadWithJobId multer storage", () => {
    it("uses ./tmp/pdf-uploads as destination", () => {
        const cb = jest.fn();

        // call destination callback stored from diskStorage
        storageConfig.destination({}, {}, cb);

        expect(cb).toHaveBeenCalledWith(null, "./tmp/pdf-uploads");
    });

    it("generates filename using jobId and original file extension", () => {
        const req = { jobId: "1234-uuid" };
        const file = { originalname: "myfile.pdf" };
        const cb = jest.fn();

        storageConfig.filename(req, file, cb);

        expect(cb).toHaveBeenCalledWith(null, "1234-uuid.pdf");
    });

    it("defaults to .pdf when original file has no extension", () => {
        const req = { jobId: "abcd-uuid" };
        const file = { originalname: "noextension" };
        const cb = jest.fn();

        storageConfig.filename(req, file, cb);

        // path.extname("noextension") === "" → your code falls back to ".pdf"
        expect(cb).toHaveBeenCalledWith(null, "abcd-uuid.pdf");
    });
});
