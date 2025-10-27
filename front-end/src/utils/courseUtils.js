/* eslint-disable prettier/prettier */
// Returns true if the course’s offeredIn data (array or string)
// includes the semester term (e.g. "Fall", "Winter", "Summer") – case-insensitive.
export const isCourseOfferedInSemester = (course, semesterId) => {
    // Extract the term from the semesterId (assumes format like "Fall 2025")
    const semesterTerm = semesterId.split(" ")[0].toLowerCase();

    if (Array.isArray(course.offeredIn) && course.offeredIn.length > 0) {
        // Normalize terms to lowercase before checking.
        const offeredTerms = course.offeredIn.map(term => term.toLowerCase());
        return offeredTerms.includes(semesterTerm);
    }

    if (typeof course.offeredIn === "string" && course.offeredIn.trim() !== "") {
        // If offeredIn is a comma-separated string.
        const offeredTerms = course.offeredIn.split(",").map(term => term.trim().toLowerCase());
        return offeredTerms.includes(semesterTerm);
    }

    // If there is no offering information, we assume the course is not offered in any term.
    return false;
};