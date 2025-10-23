/* eslint-disable prettier/prettier */
// Helper function to generate 2 years of semesters (6 semesters for 3 terms per year)
// TODO: Extract to a utility file - this function has no dependency
// TODO: 12 should be constant: NUM_SEMESTERS_TO_GENERATE
export const generateFourYearSemesters = (startSem) => {
    const termOrder = ['Winter', 'Summer', 'Fall'];
    const parts = startSem.split(' ');
    if (parts.length < 2) return [];
    let currentTerm = parts[0];
    let currentYear = parseInt(parts[1], 10);
    const semesters = [];
    for (let i = 0; i < 12; i++) {
        semesters.push(`${currentTerm} ${currentYear}`);
        // Get next term
        let currentIndex = termOrder.indexOf(currentTerm);
        currentIndex++;
        if (currentIndex >= termOrder.length) {
            currentIndex = 0;
            currentYear++;
        }
        currentTerm = termOrder[currentIndex];
    }
    return semesters;
};

// ---------------- ADD / REMOVE Semesters ----------------
// TODO: Extract to config file
// BUG?: SEASON_ORDER uses Fall_Winter, but rest of code uses "Fall/Winter" 
const SEASON_ORDER = {
    Winter: 1,
    Fall_Winter: 2,
    Summer: 3,
    Fall: 4,

};

export const compareSemesters = (a, b) => {
    // a.name might be "Fall 2026" => [ "Fall", "2026" ]
    const [seasonA, yearA] = a.name.split(' ');
    const [seasonB, yearB] = b.name.split(' ');

    // Convert year from string to number
    const yearNumA = parseInt(yearA, 10);
    const yearNumB = parseInt(yearB, 10);

    // First compare the numeric year
    if (yearNumA !== yearNumB) {
        return yearNumA - yearNumB;
    }
    // If same year, compare season order
    return SEASON_ORDER[seasonA] - SEASON_ORDER[seasonB];
}


