/**
 * Census Data Validation Service
 *
 * Validates persona demographics against real US Census Bureau
 * ACS 5-Year data. Fetches census data for a persona's location
 * and computes a realism score comparing their demographics
 * to actual population statistics.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CensusEducationDistribution {
  highSchool: number;
  someCollege: number;
  associates: number;
  bachelors: number;
  masters: number;
  professional: number;
  doctorate: number;
}

export interface CensusData {
  medianIncome: number | null;
  medianAge: number | null;
  totalPopulation: number | null;
  malePercent: number | null;
  femalePercent: number | null;
  averageHouseholdSize: number | null;
  educationDistribution: CensusEducationDistribution;
}

export interface CensusComparisonIncome {
  personaValue: number;
  censusMedian: number;
  ratio: number;
  assessment: "well_below" | "below" | "near" | "above" | "well_above";
}

export interface CensusComparisonAge {
  personaValue: number;
  censusMedian: number;
  difference: number;
  assessment: string;
}

export interface CensusComparisonHouseholdSize {
  personaValue: number;
  censusAverage: number;
  assessment: string;
}

export interface CensusComparisonEducation {
  personaLevel: string;
  percentWithSameOrHigher: number;
  assessment: string;
}

export interface CensusValidationResult {
  locationFound: boolean;
  placeName: string;
  censusData: CensusData;
  comparisons: {
    income: CensusComparisonIncome | null;
    age: CensusComparisonAge | null;
    householdSize: CensusComparisonHouseholdSize | null;
    education: CensusComparisonEducation | null;
  };
  realismScore: number;
  notes: string[];
}

// ---------------------------------------------------------------------------
// State FIPS codes — all 50 states + DC
// ---------------------------------------------------------------------------

export const STATE_FIPS: Record<string, string> = {
  alabama: "01",
  alaska: "02",
  arizona: "04",
  arkansas: "05",
  california: "06",
  colorado: "08",
  connecticut: "09",
  delaware: "10",
  "district of columbia": "11",
  florida: "12",
  georgia: "13",
  hawaii: "15",
  idaho: "16",
  illinois: "17",
  indiana: "18",
  iowa: "19",
  kansas: "20",
  kentucky: "21",
  louisiana: "22",
  maine: "23",
  maryland: "24",
  massachusetts: "25",
  michigan: "26",
  minnesota: "27",
  mississippi: "28",
  missouri: "29",
  montana: "30",
  nebraska: "31",
  nevada: "32",
  "new hampshire": "33",
  "new jersey": "34",
  "new mexico": "35",
  "new york": "36",
  "north carolina": "37",
  "north dakota": "38",
  ohio: "39",
  oklahoma: "40",
  oregon: "41",
  pennsylvania: "42",
  "rhode island": "44",
  "south carolina": "45",
  "south dakota": "46",
  tennessee: "47",
  texas: "48",
  utah: "49",
  vermont: "50",
  virginia: "51",
  washington: "53",
  "west virginia": "54",
  wisconsin: "55",
  wyoming: "56",
};

// State abbreviation to full name mapping
export const STATE_ABBREV: Record<string, string> = {
  AL: "alabama",
  AK: "alaska",
  AZ: "arizona",
  AR: "arkansas",
  CA: "california",
  CO: "colorado",
  CT: "connecticut",
  DE: "delaware",
  DC: "district of columbia",
  FL: "florida",
  GA: "georgia",
  HI: "hawaii",
  ID: "idaho",
  IL: "illinois",
  IN: "indiana",
  IA: "iowa",
  KS: "kansas",
  KY: "kentucky",
  LA: "louisiana",
  ME: "maine",
  MD: "maryland",
  MA: "massachusetts",
  MI: "michigan",
  MN: "minnesota",
  MS: "mississippi",
  MO: "missouri",
  MT: "montana",
  NE: "nebraska",
  NV: "nevada",
  NH: "new hampshire",
  NJ: "new jersey",
  NM: "new mexico",
  NY: "new york",
  NC: "north carolina",
  ND: "north dakota",
  OH: "ohio",
  OK: "oklahoma",
  OR: "oregon",
  PA: "pennsylvania",
  RI: "rhode island",
  SC: "south carolina",
  SD: "south dakota",
  TN: "tennessee",
  TX: "texas",
  UT: "utah",
  VT: "vermont",
  VA: "virginia",
  WA: "washington",
  WV: "west virginia",
  WI: "wisconsin",
  WY: "wyoming",
};

// ---------------------------------------------------------------------------
// Module-level cache: state FIPS → Map<city name → place FIPS>
// ---------------------------------------------------------------------------

const placeCache = new Map<string, Map<string, string>>();

// ---------------------------------------------------------------------------
// Census API helpers
// ---------------------------------------------------------------------------

const CENSUS_BASE = "https://api.census.gov/data";
const ACS_DATASET = "2022/acs/acs5"; // Latest ACS 5-Year

function getApiKey(): string {
  const key = process.env.CENSUS_API_KEY;
  if (!key) throw new Error("CENSUS_API_KEY environment variable is not set");
  return key;
}

/**
 * Look up the 5-digit FIPS place code for a city within a state.
 * Results are cached per-state so subsequent lookups are instant.
 */
export async function lookupPlaceFips(
  city: string,
  stateFips: string
): Promise<string | null> {
  const normalizedCity = city.trim().toLowerCase();

  // Check cache first
  if (placeCache.has(stateFips)) {
    return placeCache.get(stateFips)!.get(normalizedCity) ?? null;
  }

  // Fetch all place names in the state
  const url = `${CENSUS_BASE}/${ACS_DATASET}?get=NAME&for=place:*&in=state:${stateFips}&key=${getApiKey()}`;

  const response = await fetch(url);
  if (!response.ok) {
    console.error(`Census place lookup failed: ${response.status} ${response.statusText}`);
    return null;
  }

  const data: string[][] = await response.json();
  // First row is headers: ["NAME", "state", "place"]
  const stateMap = new Map<string, string>();

  for (let i = 1; i < data.length; i++) {
    const [name, , placeFips] = data[i];
    // Census names look like "Austin city, Texas" — extract the city part
    const cityName = name
      .split(",")[0]
      .replace(/\s+(city|town|village|CDP|borough|municipality)$/i, "")
      .trim()
      .toLowerCase();
    stateMap.set(cityName, placeFips);
  }

  placeCache.set(stateFips, stateMap);
  return stateMap.get(normalizedCity) ?? null;
}

/**
 * Fetch key demographic variables from ACS 5-Year data for a specific place.
 */
export async function fetchCensusData(
  stateFips: string,
  placeFips: string
): Promise<CensusData> {
  const variables = [
    "B19013_001E", // Median household income
    "B01002_001E", // Median age
    "B01001_001E", // Total population
    "B01001_002E", // Male population
    "B01001_026E", // Female population
    "B25010_001E", // Average household size
    "B15003_001E", // Educational attainment total (25+)
    "B15003_017E", // High school diploma
    "B15003_019E", // Some college, < 1 year
    "B15003_020E", // Some college, 1+ years
    "B15003_021E", // Associate's degree
    "B15003_022E", // Bachelor's degree
    "B15003_023E", // Master's degree
    "B15003_024E", // Professional school degree
    "B15003_025E", // Doctorate degree
  ].join(",");

  const url = `${CENSUS_BASE}/${ACS_DATASET}?get=${variables}&for=place:${placeFips}&in=state:${stateFips}&key=${getApiKey()}`;

  const response = await fetch(url);
  if (!response.ok) {
    console.error(`Census data fetch failed: ${response.status} ${response.statusText}`);
    return emptyData();
  }

  const rows: string[][] = await response.json();
  if (rows.length < 2) return emptyData();

  const headers = rows[0];
  const values = rows[1];
  const val = (varName: string): number | null => {
    const idx = headers.indexOf(varName);
    if (idx === -1) return null;
    const n = Number(values[idx]);
    return isNaN(n) || n < 0 ? null : n;
  };

  const totalPop = val("B01001_001E");
  const malePop = val("B01001_002E");
  const femalePop = val("B01001_026E");
  const eduTotal = val("B15003_001E");

  const pct = (v: number | null, total: number | null): number => {
    if (v == null || total == null || total === 0) return 0;
    return Math.round((v / total) * 1000) / 10;
  };

  return {
    medianIncome: val("B19013_001E"),
    medianAge: val("B01002_001E"),
    totalPopulation: totalPop,
    malePercent: totalPop ? pct(malePop, totalPop) : null,
    femalePercent: totalPop ? pct(femalePop, totalPop) : null,
    averageHouseholdSize: val("B25010_001E"),
    educationDistribution: {
      highSchool: pct(val("B15003_017E"), eduTotal),
      someCollege: pct(
        (val("B15003_019E") ?? 0) + (val("B15003_020E") ?? 0),
        eduTotal
      ),
      associates: pct(val("B15003_021E"), eduTotal),
      bachelors: pct(val("B15003_022E"), eduTotal),
      masters: pct(val("B15003_023E"), eduTotal),
      professional: pct(val("B15003_024E"), eduTotal),
      doctorate: pct(val("B15003_025E"), eduTotal),
    },
  };
}

function emptyData(): CensusData {
  return {
    medianIncome: null,
    medianAge: null,
    totalPopulation: null,
    malePercent: null,
    femalePercent: null,
    averageHouseholdSize: null,
    educationDistribution: {
      highSchool: 0,
      someCollege: 0,
      associates: 0,
      bachelors: 0,
      masters: 0,
      professional: 0,
      doctorate: 0,
    },
  };
}

// ---------------------------------------------------------------------------
// Location parsing
// ---------------------------------------------------------------------------

interface ParsedLocation {
  city: string;
  state: string;
}

/**
 * Extract city and state from a location string.
 * Supports: "Austin, Texas", "Austin, TX", "Austin TX", "Austin, Texas, US"
 */
function parseLocation(location: string): ParsedLocation | null {
  if (!location) return null;

  // Remove country suffixes
  const cleaned = location
    .replace(/,?\s*(US|USA|United States|U\.S\.A?\.?)$/i, "")
    .trim();

  // Try "City, State" or "City State"
  const commaMatch = cleaned.match(/^(.+?),\s*(.+)$/);
  if (commaMatch) {
    return { city: commaMatch[1].trim(), state: commaMatch[2].trim() };
  }

  // Try "City ST" (two-letter state abbreviation at end)
  const abbrevMatch = cleaned.match(/^(.+?)\s+([A-Z]{2})$/);
  if (abbrevMatch) {
    return { city: abbrevMatch[1].trim(), state: abbrevMatch[2].trim() };
  }

  return null;
}

/**
 * Resolve a state name or abbreviation to a FIPS code.
 */
export function resolveStateFips(state: string): string | null {
  const lower = state.trim().toLowerCase();

  // Direct match on full name
  if (STATE_FIPS[lower]) return STATE_FIPS[lower];

  // Abbreviation
  const upper = state.trim().toUpperCase();
  if (STATE_ABBREV[upper]) {
    return STATE_FIPS[STATE_ABBREV[upper]] ?? null;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Education level mapping
// ---------------------------------------------------------------------------

const EDUCATION_LEVELS: Record<string, number> = {
  "high school": 1,
  "high school diploma": 1,
  "ged": 1,
  "some college": 2,
  "associate": 3,
  "associate's": 3,
  "associates": 3,
  "bachelor": 4,
  "bachelor's": 4,
  "bachelors": 4,
  "bs": 4,
  "ba": 4,
  "master": 5,
  "master's": 5,
  "masters": 5,
  "ms": 5,
  "ma": 5,
  "mba": 5,
  "professional": 6,
  "jd": 6,
  "md": 6,
  "doctorate": 7,
  "phd": 7,
  "ph.d.": 7,
  "doctoral": 7,
};

function normalizeEducationLevel(edu: string): { level: number; label: string } | null {
  const lower = edu.toLowerCase().trim();

  // Direct match
  for (const [key, level] of Object.entries(EDUCATION_LEVELS)) {
    if (lower.includes(key)) {
      const labels: Record<number, string> = {
        1: "High School",
        2: "Some College",
        3: "Associate's",
        4: "Bachelor's",
        5: "Master's",
        6: "Professional",
        7: "Doctorate",
      };
      return { level, label: labels[level] };
    }
  }

  return null;
}

/**
 * Calculate the percentage of the population with the same or higher education level.
 */
function percentWithSameOrHigher(
  level: number,
  dist: CensusEducationDistribution
): number {
  const levelMap: Record<number, number> = {
    1: dist.highSchool + dist.someCollege + dist.associates + dist.bachelors + dist.masters + dist.professional + dist.doctorate,
    2: dist.someCollege + dist.associates + dist.bachelors + dist.masters + dist.professional + dist.doctorate,
    3: dist.associates + dist.bachelors + dist.masters + dist.professional + dist.doctorate,
    4: dist.bachelors + dist.masters + dist.professional + dist.doctorate,
    5: dist.masters + dist.professional + dist.doctorate,
    6: dist.professional + dist.doctorate,
    7: dist.doctorate,
  };
  return Math.round((levelMap[level] ?? 0) * 10) / 10;
}

// ---------------------------------------------------------------------------
// Comparison & scoring
// ---------------------------------------------------------------------------

function compareIncome(
  personaIncome: number,
  censusMedian: number
): CensusComparisonIncome {
  const ratio = personaIncome / censusMedian;
  let assessment: CensusComparisonIncome["assessment"];
  if (ratio < 0.5) assessment = "well_below";
  else if (ratio < 0.8) assessment = "below";
  else if (ratio <= 1.3) assessment = "near";
  else if (ratio <= 2.0) assessment = "above";
  else assessment = "well_above";

  return { personaValue: personaIncome, censusMedian, ratio: Math.round(ratio * 100) / 100, assessment };
}

function compareAge(
  personaAge: number,
  censusMedian: number
): CensusComparisonAge {
  const difference = personaAge - censusMedian;
  const absDiff = Math.abs(difference);

  let assessment: string;
  if (absDiff <= 5) assessment = "Near the local median age";
  else if (difference > 0) assessment = `${Math.round(absDiff)} years above the local median`;
  else assessment = `${Math.round(absDiff)} years below the local median`;

  return { personaValue: personaAge, censusMedian, difference: Math.round(difference * 10) / 10, assessment };
}

function compareHouseholdSize(
  personaSize: number,
  censusAverage: number
): CensusComparisonHouseholdSize {
  const diff = Math.abs(personaSize - censusAverage);
  let assessment: string;
  if (diff <= 0.5) assessment = "Close to the local average";
  else if (personaSize > censusAverage) assessment = "Larger than typical for this area";
  else assessment = "Smaller than typical for this area";

  return { personaValue: personaSize, censusAverage, assessment };
}

function compareEducation(
  personaEducation: string,
  dist: CensusEducationDistribution
): CensusComparisonEducation | null {
  const parsed = normalizeEducationLevel(personaEducation);
  if (!parsed) return null;

  const pctSameOrHigher = percentWithSameOrHigher(parsed.level, dist);

  let assessment: string;
  if (pctSameOrHigher >= 40) assessment = "Very common education level for this area";
  else if (pctSameOrHigher >= 20) assessment = "Fairly common education level for this area";
  else if (pctSameOrHigher >= 5) assessment = "Less common but realistic for this area";
  else assessment = "Uncommon education level for this area";

  return {
    personaLevel: parsed.label,
    percentWithSameOrHigher: pctSameOrHigher,
    assessment,
  };
}

// ---------------------------------------------------------------------------
// Realism scoring
// ---------------------------------------------------------------------------

function computeRealismScore(
  comparisons: CensusValidationResult["comparisons"]
): number {
  let totalWeight = 0;
  let weightedScore = 0;

  // Income: 35% weight
  if (comparisons.income) {
    const incomeWeight = 35;
    totalWeight += incomeWeight;
    const { ratio } = comparisons.income;
    // Score: 100 at ratio=1, dropping off symmetrically
    // Within 0.5-2.0 range gets decent scores
    const logRatio = Math.abs(Math.log(ratio));
    const incomeScore = Math.max(0, 100 - logRatio * 100);
    weightedScore += incomeScore * incomeWeight;
  }

  // Age: 20% weight
  if (comparisons.age) {
    const ageWeight = 20;
    totalWeight += ageWeight;
    // Ages 18-85 are realistic, score based on proximity to median
    const { personaValue, difference } = comparisons.age;
    let ageScore = 100;
    if (personaValue < 18 || personaValue > 95) {
      ageScore = 30;
    } else {
      const absDiff = Math.abs(difference);
      ageScore = Math.max(0, 100 - absDiff * 2);
    }
    weightedScore += ageScore * ageWeight;
  }

  // Education: 25% weight
  if (comparisons.education) {
    const eduWeight = 25;
    totalWeight += eduWeight;
    // Based on % of local population with same+ education level
    const pct = comparisons.education.percentWithSameOrHigher;
    // 30%+ → 100, 5% → 50, 1% → 20
    let eduScore: number;
    if (pct >= 30) eduScore = 100;
    else if (pct >= 15) eduScore = 80 + ((pct - 15) / 15) * 20;
    else if (pct >= 5) eduScore = 50 + ((pct - 5) / 10) * 30;
    else eduScore = Math.max(10, pct * 10);
    weightedScore += eduScore * eduWeight;
  }

  // Household size: 20% weight
  if (comparisons.householdSize) {
    const hsWeight = 20;
    totalWeight += hsWeight;
    const diff = Math.abs(
      comparisons.householdSize.personaValue - comparisons.householdSize.censusAverage
    );
    const hsScore = Math.max(0, 100 - diff * 25);
    weightedScore += hsScore * hsWeight;
  }

  if (totalWeight === 0) return 0;
  return Math.round(weightedScore / totalWeight);
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

interface PersonaDemographics {
  location?: string;
  city?: string;
  state?: string;
  income?: number;
  age?: number;
  education?: string;
  householdSize?: number;
}

/**
 * Validate persona demographics against US Census data.
 *
 * Pass in the persona's demographics object and this function will:
 * 1. Parse the location to extract city + state
 * 2. Look up FIPS codes
 * 3. Fetch Census data for that place
 * 4. Compare demographics and compute a realism score
 */
export async function validateAgainstCensus(
  demographics: PersonaDemographics
): Promise<CensusValidationResult> {
  const notes: string[] = [];

  // 1. Parse location
  const locationStr = demographics.location || (demographics.city && demographics.state
    ? `${demographics.city}, ${demographics.state}`
    : null);

  if (!locationStr) {
    return {
      locationFound: false,
      placeName: "",
      censusData: emptyData(),
      comparisons: { income: null, age: null, householdSize: null, education: null },
      realismScore: 0,
      notes: ["Location not provided — census validation skipped"],
    };
  }

  const parsed = parseLocation(locationStr);
  if (!parsed) {
    return {
      locationFound: false,
      placeName: locationStr,
      censusData: emptyData(),
      comparisons: { income: null, age: null, householdSize: null, education: null },
      realismScore: 0,
      notes: [`Could not parse location: "${locationStr}"`],
    };
  }

  // 2. Resolve FIPS codes
  const stateFips = resolveStateFips(parsed.state);
  if (!stateFips) {
    return {
      locationFound: false,
      placeName: `${parsed.city}, ${parsed.state}`,
      censusData: emptyData(),
      comparisons: { income: null, age: null, householdSize: null, education: null },
      realismScore: 0,
      notes: [`State not recognized: "${parsed.state}"`],
    };
  }

  const placeFips = await lookupPlaceFips(parsed.city, stateFips);
  if (!placeFips) {
    return {
      locationFound: false,
      placeName: `${parsed.city}, ${parsed.state}`,
      censusData: emptyData(),
      comparisons: { income: null, age: null, householdSize: null, education: null },
      realismScore: 0,
      notes: [`City "${parsed.city}" not found in Census data for ${parsed.state}`],
    };
  }

  // 3. Fetch Census data
  const censusData = await fetchCensusData(stateFips, placeFips);
  const placeName = `${parsed.city}, ${parsed.state}`;

  // 4. Build comparisons
  const comparisons: CensusValidationResult["comparisons"] = {
    income: null,
    age: null,
    householdSize: null,
    education: null,
  };

  // Income
  if (demographics.income != null && censusData.medianIncome != null) {
    comparisons.income = compareIncome(demographics.income, censusData.medianIncome);
    const assessmentLabels: Record<string, string> = {
      well_below: "well below",
      below: "below",
      near: "near",
      above: "above",
      well_above: "well above",
    };
    notes.push(
      `Income ($${demographics.income.toLocaleString()}) is ${assessmentLabels[comparisons.income.assessment]} the local median ($${censusData.medianIncome.toLocaleString()})`
    );
  }

  // Age
  if (demographics.age != null && censusData.medianAge != null) {
    comparisons.age = compareAge(demographics.age, censusData.medianAge);
    notes.push(comparisons.age.assessment);
  }

  // Household size
  if (demographics.householdSize != null && censusData.averageHouseholdSize != null) {
    comparisons.householdSize = compareHouseholdSize(
      demographics.householdSize,
      censusData.averageHouseholdSize
    );
    notes.push(comparisons.householdSize.assessment);
  }

  // Education
  if (demographics.education) {
    comparisons.education = compareEducation(
      demographics.education,
      censusData.educationDistribution
    );
    if (comparisons.education) {
      notes.push(
        `${comparisons.education.personaLevel} education: ${comparisons.education.percentWithSameOrHigher}% of local 25+ population has same or higher — ${comparisons.education.assessment.toLowerCase()}`
      );
    }
  }

  // 5. Compute realism score
  const realismScore = computeRealismScore(comparisons);

  if (censusData.totalPopulation) {
    notes.push(`Based on Census data for ${placeName} (pop. ${censusData.totalPopulation.toLocaleString()})`);
  }

  return {
    locationFound: true,
    placeName,
    censusData,
    comparisons,
    realismScore,
    notes,
  };
}
