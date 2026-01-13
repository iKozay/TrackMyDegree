import type { Season, SequenceTemplate, SequenceTerm, GeneratedSequence } from "../types/coopSequencePlannerTypes";

const SEASON_ORDER: Season[] = ["Fall", "Winter", "Summer"];

function nextSeason(season: Season): Season {
  const idx = SEASON_ORDER.indexOf(season);
  return SEASON_ORDER[(idx + 1) % SEASON_ORDER.length];
}

function nextYearIfNeeded(currentSeason: Season, next: Season, year: number): number {
  // Fall -> Winter crosses into next year (Fall 2026 -> Winter 2027)
  if (currentSeason === "Fall" && next === "Winter") return year + 1;
  return year;
}

function makeId(): string {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function generateFromTemplate(
  template: SequenceTemplate,
  startSeason: Season = "Fall",
  startYear: number = 2026
): GeneratedSequence {
  let season: Season = startSeason;
  let year = startYear;

  const terms: SequenceTerm[] = template.terms.map((t, index) => {
    const termNumber = index + 1;

    const term: SequenceTerm =
      t.type === "Academic"
        ? {
            id: makeId(),
            termNumber,
            season,
            year,
            type: "Academic",
            courses: [...t.courses],
          }
        : {
            id: makeId(),
            termNumber,
            season,
            year,
            type: "Co-op",
            coopLabel: t.coopLabel,
          };

    const next = nextSeason(season);
    year = nextYearIfNeeded(season, next, year);
    season = next;

    return term;
  });

  return {
    programId: template.programId,
    programName: template.programName,
    templateId: template.id,
    validated: false,
    defaultTerms: terms.map((x) => ({ ...x, id: x.id })), // shallow copy ok
    currentTerms: terms.map((x) => ({ ...x, id: x.id })),
  };
}

export function computeCoopCount(terms: SequenceTerm[]): number {
  return terms.filter((t) => t.type === "Co-op").length;
}

export function getLastTerm(terms: SequenceTerm[]): SequenceTerm | null {
  if (terms.length === 0) return null;
  return terms[terms.length - 1];
}

export function computeNextTermSeasonYear(
  lastSeason: Season,
  lastYear: number
): { season: Season; year: number } {
  const ns = nextSeason(lastSeason);
  const ny = nextYearIfNeeded(lastSeason, ns, lastYear);
  return { season: ns, year: ny };
}
