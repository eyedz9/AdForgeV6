/**
 * Census Validation for Persona Suggestions
 *
 * Validates persona suggestions against US Census data before
 * they reach the user. Suggestions scoring below the threshold
 * are silently regenerated (up to MAX_RETRIES_PER_SLOT times).
 *
 * At suggestion time only `income` and `age` are available
 * (education and householdSize aren't part of PersonaSuggestion).
 * The census-validator adjusts weights automatically for missing fields.
 */

import { validateAgainstCensus } from "@/lib/services/census-validator";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const CENSUS_SCORE_THRESHOLD = 85;
export const MAX_RETRIES_PER_SLOT = 3;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PersonaSuggestion {
  name: string;
  archetype: string;
  headline: string;
  demographics: {
    age: number;
    gender: string;
    location: string;
    income: string;
    occupation: string;
  };
  psychographics: {
    values: string[];
    motivations: string[];
    painPoints: string[];
    aspirations: string[];
  };
  behaviors: {
    purchaseDrivers: string[];
    preferredChannels: string[];
    decisionStyle: string;
  };
  relevanceScore: number;
  reasoning: string;
}

export interface ValidatedSuggestion extends PersonaSuggestion {
  censusScore: number;
  censusPlaceName?: string;
}

// ---------------------------------------------------------------------------
// Income parser
// ---------------------------------------------------------------------------

/**
 * Convert income strings like "$85,000", "$85K", "85000", "85k" to a number.
 * Falls back to 65000 if the string can't be parsed.
 */
export function parseIncomeString(str: string): number {
  if (!str) return 65000;

  const cleaned = str.replace(/[$,\s]/g, "");
  const match = cleaned.match(/(\d+(?:\.\d+)?)/);
  if (!match) return 65000;

  let value = parseFloat(match[1]);

  if (/k/i.test(cleaned)) {
    value *= 1000;
  }

  return Math.round(value) || 65000;
}

// ---------------------------------------------------------------------------
// Single suggestion validation
// ---------------------------------------------------------------------------

/**
 * Validate a single suggestion against Census data.
 * Returns the suggestion enriched with `censusScore` and `censusPlaceName`.
 *
 * If the Census API fails or the location isn't found, the suggestion
 * passes through with censusScore=0 (treated as a pass).
 */
export async function validateSuggestion(
  suggestion: PersonaSuggestion
): Promise<ValidatedSuggestion> {
  try {
    const result = await validateAgainstCensus({
      location: suggestion.demographics.location,
      income: parseIncomeString(suggestion.demographics.income),
      age: suggestion.demographics.age,
    });

    return {
      ...suggestion,
      censusScore: result.realismScore,
      censusPlaceName: result.locationFound ? result.placeName : undefined,
    };
  } catch (error) {
    console.warn("Census validation failed for suggestion, passing through:", error);
    return {
      ...suggestion,
      censusScore: 0,
      censusPlaceName: undefined,
    };
  }
}

// ---------------------------------------------------------------------------
// Batch validation with retry
// ---------------------------------------------------------------------------

interface ValidateAndRetryOptions {
  /** Callback to generate a single replacement suggestion. */
  generateReplacement: (excludeNames: string[]) => Promise<PersonaSuggestion | null>;
}

/**
 * Validate all suggestions in parallel. For any that score below
 * CENSUS_SCORE_THRESHOLD (and score > 0, meaning Census API was reachable),
 * call generateReplacement up to MAX_RETRIES_PER_SLOT times to get a
 * passing replacement.
 */
export async function validateAndRetrySuggestions(
  suggestions: PersonaSuggestion[],
  { generateReplacement }: ValidateAndRetryOptions
): Promise<ValidatedSuggestion[]> {
  // Phase 1: validate all in parallel
  const validated = await Promise.all(
    suggestions.map((s) => validateSuggestion(s))
  );

  // Phase 2: retry any that failed the threshold
  const results: ValidatedSuggestion[] = [];

  for (const item of validated) {
    if (item.censusScore === 0 || item.censusScore >= CENSUS_SCORE_THRESHOLD) {
      // Score is 0 (API failure / location not found) → pass through
      // Score >= threshold → passes
      results.push(item);
      continue;
    }

    // Score > 0 but below threshold → attempt retries
    let current = item;
    const allNames = [
      ...suggestions.map((s) => s.name),
      ...results.map((r) => r.name),
    ];

    for (let attempt = 0; attempt < MAX_RETRIES_PER_SLOT; attempt++) {
      const excludeNames = [...allNames, current.name];

      try {
        const replacement = await generateReplacement(excludeNames);
        if (!replacement) {
          console.warn(`Retry ${attempt + 1}/${MAX_RETRIES_PER_SLOT}: generateReplacement returned null, keeping current`);
          break;
        }

        const validatedReplacement = await validateSuggestion(replacement);
        current = validatedReplacement;

        if (
          validatedReplacement.censusScore === 0 ||
          validatedReplacement.censusScore >= CENSUS_SCORE_THRESHOLD
        ) {
          break;
        }
      } catch (error) {
        console.warn(`Retry ${attempt + 1}/${MAX_RETRIES_PER_SLOT} failed:`, error);
        break;
      }
    }

    if (current.censusScore > 0 && current.censusScore < CENSUS_SCORE_THRESHOLD) {
      console.warn(
        `Suggestion "${current.name}" kept with score ${current.censusScore} after ${MAX_RETRIES_PER_SLOT} retries`
      );
    }

    results.push(current);
  }

  return results;
}
