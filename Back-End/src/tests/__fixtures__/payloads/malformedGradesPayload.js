module.exports = {
  Pages: [
    {
      Texts: [
        // course with empty string grade
        { y: -1, R: [{ T: 'COMP' }] },
        { y: -1, R: [{ T: '101' }] },
        { y: -1, R: [{ T: 'AA' }] },
        { y: -1, R: [{ T: 'Programming' }] },
        { y: -1, R: [{ T: '3.00' }] },
        { y: -1, R: [{ T: '' }] }, // empty grade
        { y: -1, R: [{ T: '3.00' }] },
        // course with unknown grade code
        { y: -10, R: [{ T: 'MATH' }] },
        { y: -10, R: [{ T: '201' }] },
        { y: -10, R: [{ T: 'BB' }] },
        { y: -10, R: [{ T: 'Calculus' }] },
        { y: -10, R: [{ T: '4.00' }] },
        { y: -10, R: [{ T: 'XYZ' }] }, // unknown grade code
        { y: -10, R: [{ T: '4.00' }] },
        // course with special characters in grade
        { y: -20, R: [{ T: 'PHYS' }] },
        { y: -20, R: [{ T: '101' }] },
        { y: -20, R: [{ T: 'CC' }] },
        { y: -20, R: [{ T: 'Physics' }] },
        { y: -20, R: [{ T: '3.00' }] },
        { y: -20, R: [{ T: 'A*#' }] }, // grade with special chars
        { y: -20, R: [{ T: '3.00' }] },
        // course with numeric-like but invalid grade
        { y: -30, R: [{ T: 'CHEM' }] },
        { y: -30, R: [{ T: '101' }] },
        { y: -30, R: [{ T: 'DD' }] },
        { y: -30, R: [{ T: 'Chemistry' }] },
        { y: -30, R: [{ T: '3.00' }] },
        { y: -30, R: [{ T: '99.99' }] }, // invalid numeric grade
        { y: -30, R: [{ T: '3.00' }] },
        // course with null-like grade
        { y: -40, R: [{ T: 'BIOL' }] },
        { y: -40, R: [{ T: '101' }] },
        { y: -40, R: [{ T: 'EE' }] },
        { y: -40, R: [{ T: 'Biology' }] },
        { y: -40, R: [{ T: '3.00' }] },
        { y: -40, R: [{ T: 'null' }] }, // string "null"
        { y: -40, R: [{ T: '3.00' }] },
      ],
    },
  ],
};
