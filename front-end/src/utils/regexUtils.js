
/**
 ** Regex pattern to match degree name
 * @param {string} text 
 */
function matchDegree(text) {
  const degreePattern =
    /Bachelor of (?:Engineering|Computer Science|Science),\s*(\b[A-Za-z]+\b\s\b[A-Za-z]+\b)(?:Option:?\s*([A-Za-z\s-]+))?/i;
  return text.match(degreePattern);
}

//* Regex for courses
const coursePattern = /([A-Z]{3,4})\s+(\d{3})\s+([A-Z0-9]+(?:-\s*\d+)?)\s+([A-Z][A-Za-z\s\-.()/,&+':]+?)\s+(\d\.\d{2})\s+([A-D][+-]\s*|PASS|EX|FNS|DISC|NR)?(?:\s+([\d.]+))?(?:\s+[\d.]+\s+\d+\s+[\d.]+)?/g;
//* Regex for exemptions
const exemptPattern = /([A-Za-z]{3,4})\s+(\d{3})\s+(.+?)\s+(EX|TRC)\b/g;
//* Regex for term separators (Table headers)
const separatorPattern = /COURSE\s*DESCRIPTION\s*ATTEMPTED\s*GRADE\s*NOTATION/g;
//* Regex for terms (Winter 2020, Fall 2024-25)
const termPattern = /(Fall|Winter|Summer|Fall\/Winter)\s*(?:20)?(\d{2})(?:\s*-\s*(\d{2}))?\s*(?=COURSE|Bachelor\s*)/gi;
//* Regex for Extended credits
const extendedCredits = /\s*Extended\s*Credit\s*Program\s*/g;

/**
 ** Function to verify if the text is that of a transcript 
 * @param {string} text 
 * @returns 
 */
function isTranscript(text) {
  return /Student Record|Unofficial Transcript/i.test(text);
}

const regex = {
  coursePattern,
  exemptPattern,
  separatorPattern,
  termPattern,
  extendedCredits,
  matchDegree,
  isTranscript
};

export default regex;