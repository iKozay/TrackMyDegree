const mockPdfParser = {
  on: jest.fn(),
  loadPDF: jest.fn(),
};

const mockPDFParser = jest.fn(() => mockPdfParser);

// Set up default behavior
mockPdfParser.on.mockImplementation((event, callback) => {
  if (event === 'pdfParser_dataReady') {
    process.nextTick(() => {
      callback({
        Pages: [
          {
            Texts: [
              // Student information section (positive Y, low indices)
              { R: [{ T: 'John%20Doe%20Student' }], y: 10 },
              { R: [{ T: 'Student%20ID%3A%20123456789' }], y: 9.5 },
              { R: [{ T: '123%20Main%20Street' }], y: 9 },
              { R: [{ T: 'Montreal%2C%20QC' }], y: 8.5 },
              { R: [{ T: 'Canada%20H3A%201B1' }], y: 8 },
              { R: [{ T: 'Birthdate%3A%201995-01-15' }], y: 7.5 },
              { R: [{ T: 'Permanent%20Code%3A%20ABC12345678' }], y: 7 },
              { R: [{ T: 'Telephone%3A%20(514)%20555-0123' }], y: 6.5 },
              { R: [{ T: 'Active%20in%20Program' }], y: 6 },
              { R: [{ T: 'Fall%202020' }], y: 5.5 },
              { R: [{ T: 'Bachelor%20of%20Engineering' }], y: 5 },
              { R: [{ T: 'Software%20Engineering' }], y: 4.5 },
              { R: [{ T: 'Extended%20Credit%20Program' }], y: 4 },
              { R: [{ T: 'Career%20Edge' }], y: 3.5 },
              { R: [{ T: 'Admit%20Term' }], y: 3 },
              { R: [{ T: 'Fall%202020' }], y: 2.5 },
              { R: [{ T: 'Matriculated' }], y: 2 },
              { R: [{ T: 'Min.%20Credits%20Required%3A' }], y: 1.5 },
              { R: [{ T: '120.00' }], y: 1 },
              { R: [{ T: 'Program%20Credits%20Earned%3A' }], y: 0.5 },
              { R: [{ T: '90.50' }], y: 0 },
              { R: [{ T: 'Cumulative%20GPA%3A' }], y: -0.5 },
              { R: [{ T: '3.75' }], y: -1 },
              {
                R: [{ T: 'Writing%20Skills%20Requirement%3A%20Satisfied' }],
                y: -1.5,
              },

              // Fall 2020 courses (same as before)
              { R: [{ T: 'COMP' }], y: -5 },
              { R: [{ T: '248' }], y: -5 },
              { R: [{ T: 'A' }], y: -5 },
              { R: [{ T: 'Introduction%20to%20Programming' }], y: -5 },
              { R: [{ T: '3.00' }], y: -5 },
              { R: [{ T: 'A-' }], y: -5 },
              { R: [{ T: '3.67' }], y: -5 },
              { R: [{ T: '2.85' }], y: -5 },
              { R: [{ T: '156' }], y: -5 },
              { R: [{ T: '3.00' }], y: -5 },

              { R: [{ T: 'ENGR' }], y: -6 },
              { R: [{ T: '201' }], y: -6 },
              { R: [{ T: 'B' }], y: -6 },
              { R: [{ T: 'Engineering%20Design' }], y: -6 },
              { R: [{ T: '2.00' }], y: -6 },
              { R: [{ T: 'B+' }], y: -6 },
              { R: [{ T: '3.33' }], y: -6 },
              { R: [{ T: '2.95' }], y: -6 },
              { R: [{ T: '98' }], y: -6 },
              { R: [{ T: '2.00' }], y: -6 },

              { R: [{ T: 'MATH' }], y: -7 },
              { R: [{ T: '205' }], y: -7 },
              { R: [{ T: 'C' }], y: -7 },
              { R: [{ T: 'Calculus%20I' }], y: -7 },
              { R: [{ T: '3.00' }], y: -7 },
              { R: [{ T: 'A' }], y: -7 },
              { R: [{ T: '4.00' }], y: -7 },
              { R: [{ T: '3.20' }], y: -7 },
              { R: [{ T: '201' }], y: -7 },
              { R: [{ T: '3.00' }], y: -7 },

              { R: [{ T: 'Term%20GPA%203.67' }], y: -8 },
              {
                R: [
                  { T: '20/08/2021%3A%20ASSESSED%3A%20ACCEPTABLE%20STANDING' },
                ],
                y: -9,
              },

              // Winter 2021 courses (gap of 20+ indices)
              ...new Array(20).fill({ R: [{ T: '' }], y: -15 }),

              { R: [{ T: 'COMP' }], y: -25 },
              { R: [{ T: '249' }], y: -25 },
              { R: [{ T: 'A' }], y: -25 },
              { R: [{ T: 'OBJ-ORIENTED%20PROGRAMMING%20II' }], y: -25 },
              { R: [{ T: '3.75' }], y: -25 },
              { R: [{ T: 'A' }], y: -25 },
              { R: [{ T: '4.00' }], y: -25 },
              { R: [{ T: '3.15' }], y: -25 },
              { R: [{ T: '142' }], y: -25 },
              { R: [{ T: '3.75' }], y: -25 },

              { R: [{ T: 'ENGR' }], y: -26 },
              { R: [{ T: '202' }], y: -26 },
              { R: [{ T: 'B' }], y: -26 },
              { R: [{ T: 'Engineering%20Materials' }], y: -26 },
              { R: [{ T: '3.00' }], y: -26 },
              { R: [{ T: 'B' }], y: -26 },
              { R: [{ T: '3.00' }], y: -26 },
              { R: [{ T: '2.80' }], y: -26 },
              { R: [{ T: '89' }], y: -26 },
              { R: [{ T: '3.00' }], y: -26 },

              { R: [{ T: 'MATH' }], y: -27 },
              { R: [{ T: '206' }], y: -27 },
              { R: [{ T: 'C' }], y: -27 },
              { R: [{ T: 'Calculus%20II' }], y: -27 },
              { R: [{ T: '3.00' }], y: -27 },
              { R: [{ T: 'A-' }], y: -27 },
              { R: [{ T: '3.67' }], y: -27 },
              { R: [{ T: '3.05' }], y: -27 },
              { R: [{ T: '178' }], y: -27 },
              { R: [{ T: '3.00' }], y: -27 },

              { R: [{ T: 'Term%20GPA%203.56' }], y: -28 },

              // Transfer Credits Section - needs pipe-separated format
              {
                R: [
                  {
                    T: 'MATH%20%7C%20101%20%7C%20Precalculus%20%7C%20EX%20%7C%202019%20%7C%203.00%20%7C%20YEAR%20ATTENDED',
                  },
                ],
                y: -35,
              },
              {
                R: [
                  {
                    T: 'PHYS%20%7C%20101%20%7C%20General%20Physics%20%7C%20PASS%20%7C%202019%20%7C%204.00%20%7C%20YEAR%20ATTENDED',
                  },
                ],
                y: -36,
              },

              // Summer 2021 courses (gap of 20+ indices)
              ...new Array(20).fill({ R: [{ T: '' }], y: -40 }),

              { R: [{ T: 'COMP' }], y: -60 },
              { R: [{ T: '352' }], y: -60 },
              { R: [{ T: 'A' }], y: -60 },
              { R: [{ T: 'Data%20Structures%20and%20Algorithms' }], y: -60 },
              { R: [{ T: '3.75' }], y: -60 },
              { R: [{ T: 'A+' }], y: -60 },
              { R: [{ T: '4.00' }], y: -60 },
              { R: [{ T: '2.90' }], y: -60 },
              { R: [{ T: '67' }], y: -60 },
              { R: [{ T: '3.75' }], y: -60 },

              { R: [{ T: 'ELEC' }], y: -61 },
              { R: [{ T: '273' }], y: -61 },
              { R: [{ T: 'A' }], y: -61 },
              { R: [{ T: 'Digital%20Systems' }], y: -61 },
              { R: [{ T: '3.75' }], y: -61 },
              { R: [{ T: 'B+' }], y: -61 },
              { R: [{ T: '3.33' }], y: -61 },
              { R: [{ T: '2.75' }], y: -61 },
              { R: [{ T: '45' }], y: -61 },
              { R: [{ T: '3.75' }], y: -61 },

              { R: [{ T: 'Term%20GPA%203.67' }], y: -62 },
            ],
          },
        ],
      });
    });
  }
});

module.exports = mockPDFParser;
