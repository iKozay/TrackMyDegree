const createMockPdfParser = (payload) => {
  return {
    on: jest.fn((e, cb) => {
      if (e === 'pdfParser_dataReady') {
        process.nextTick(() => cb(payload));
      }
    }),
    loadPDF: jest.fn(),
  };
};

module.exports = { createMockPdfParser };
