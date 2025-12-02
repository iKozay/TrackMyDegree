module.exports = {
  Pages: [
    {
      Texts: [
        { y: -1, R: [{ T: 'COMP' }] },
        { y: -1, R: [{ T: '248' }] },
        { y: -1, R: [{ T: 'AA' }] },
        ...'Very Long Course Title That Goes On And On For Many Words More Words Even More'
          .split(' ')
          .map((w) => ({ y: -1, R: [{ T: w }] })),
        { y: -1, R: [{ T: '3.00' }] },
        { y: -1, R: [{ T: 'A-' }] },
      ],
    },
  ],
};
