/**
 * OpenRouter API client for persona generation
 * Uses Claude Haiku 4.5 via OpenRouter to generate consumer personas
 *
 * Documentation: https://openrouter.ai/docs
 */

import type { Brand, Product, IntelligenceReport } from "@/lib/supabase/database.types";
import type { PersonaInput } from "@/lib/validations/persona";
import {
  deviceTypes,
  contentPreferences as contentPreferenceValues,
  screenTimeRanges,
  shoppingChannels,
  decisionFactors as decisionFactorValues,
  priceSensitivities,
  brandLoyaltyLevels,
  purchaseFrequencies,
  researchBehaviors,
  genders,
  educationLevels,
  maritalStatuses,
  companySizes,
  workStyles,
  personalityTraits as personalityTraitValues,
  dietTypes,
  fitnessLevels,
  socialPlatforms as socialPlatformValues,
} from "@/lib/validations/persona";

// OpenRouter API configuration
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "anthropic/claude-haiku-4.5";

// Generation parameters as specified in PRD
const GENERATION_CONFIG = {
  temperature: 0.7,
  max_tokens: 8000,
} as const;

/**
 * Context data for persona generation
 */
export interface PersonaGenerationContext {
  brand: Brand;
  product?: Product | null;
  intelligenceReport?: IntelligenceReport | null;
  existingPersonaNames?: string[];
}

/**
 * Response from persona generation
 */
export interface PersonaGenerationResult {
  success: true;
  persona: PersonaInput;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface PersonaGenerationError {
  success: false;
  error: string;
  code?: string;
}

export type GeneratePersonaResponse = PersonaGenerationResult | PersonaGenerationError;

/**
 * OpenRouter API response structure
 */
interface OpenRouterResponse {
  id: string;
  model: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Build the system prompt for persona generation
 */
function buildSystemPrompt(): string {
  return `You are an expert consumer psychologist and market research specialist. Your task is to generate detailed, realistic consumer personas for advertising and marketing purposes.

CRITICAL REQUIREMENTS:
1. ALL values must be SPECIFIC, not ranges:
   - Age must be a specific number (e.g., 32), NOT a range like "25-35"
   - Income must be a specific number (e.g., 75000), NOT a range like "$50k-$100k"
   - Location must be a specific city and state in the United States (e.g., "Austin, Texas"), NOT vague like "urban areas"
   - Household size must be a specific number (e.g., 3), NOT a range

2. Create a CONCRETE, BELIEVABLE individual, not a demographic category
3. The persona should feel like a real person with consistent traits
4. Ensure all sections are internally consistent (age matches career stage, education matches job, etc.)
5. Use a simple full name WITHOUT nicknames or quotes in the name field (e.g., "David Rodriguez", NOT "David \\"Dave\\" Rodriguez")
6. Each persona must be UNIQUE — vary the name, age, gender, location, income level, and background significantly

OUTPUT FORMAT:
You must respond with ONLY a valid JSON object. No markdown code blocks, no backticks, no text before or after. Ensure all string values have properly escaped quotes.`;
}

/**
 * Build the user prompt with brand, product, and intelligence context
 */
function buildUserPrompt(context: PersonaGenerationContext, existingNames: string[] = []): string {
  const { brand, product, intelligenceReport } = context;

  let prompt = `Generate a detailed consumer persona for the following brand:\n\n`;

  // Instruct uniqueness if there are existing personas
  if (existingNames.length > 0) {
    prompt += `## IMPORTANT: UNIQUENESS REQUIREMENT\n`;
    prompt += `The following personas already exist. You MUST create a COMPLETELY DIFFERENT person — different name, different age, different gender or background, different location, different profession:\n`;
    prompt += existingNames.map((n) => `- ${n}`).join("\n");
    prompt += `\n\n`;
  }

  // Brand context
  prompt += `## BRAND INFORMATION\n`;
  prompt += `- Name: ${brand.name}\n`;
  if (brand.business_type) prompt += `- Business Type: ${brand.business_type}\n`;
  if (brand.industry) prompt += `- Industry: ${brand.industry}\n`;
  if (brand.sub_industry) prompt += `- Sub-Industry: ${brand.sub_industry}\n`;
  if (brand.website) prompt += `- Website: ${brand.website}\n`;

  // Brand voice and tone (if available)
  const voiceTone = brand.voice_tone as Record<string, unknown> | null;
  if (voiceTone) {
    prompt += `\n### Brand Voice & Tone\n`;
    if (voiceTone.brandVoice) prompt += `- Brand Voice: ${voiceTone.brandVoice}\n`;
    if (Array.isArray(voiceTone.toneCharacteristics)) {
      prompt += `- Tone: ${voiceTone.toneCharacteristics.join(", ")}\n`;
    }
    if (Array.isArray(voiceTone.keyMessages)) {
      prompt += `- Key Messages: ${voiceTone.keyMessages.join("; ")}\n`;
    }
  }

  // Product context (if available)
  if (product) {
    prompt += `\n## PRODUCT INFORMATION\n`;
    prompt += `- Name: ${product.name}\n`;
    if (product.product_type) prompt += `- Type: ${product.product_type}\n`;
    if (product.short_description) prompt += `- Description: ${product.short_description}\n`;
    if (product.price) prompt += `- Price: $${product.price}\n`;
    if (product.price_range) prompt += `- Price Range: ${product.price_range}\n`;

    const marketingAttrs = product.marketing_attributes as Record<string, unknown> | null;
    if (marketingAttrs) {
      prompt += `\n### Marketing Attributes\n`;
      if (marketingAttrs.uvp) prompt += `- Unique Value Proposition: ${marketingAttrs.uvp}\n`;
      if (Array.isArray(marketingAttrs.benefits)) {
        prompt += `- Key Benefits: ${marketingAttrs.benefits.join(", ")}\n`;
      }
      if (Array.isArray(marketingAttrs.targetProblems)) {
        prompt += `- Problems Solved: ${marketingAttrs.targetProblems.join(", ")}\n`;
      }
    }
  }

  // Intelligence report context (if available)
  if (intelligenceReport) {
    prompt += `\n## MARKET INTELLIGENCE\n`;

    const audienceInsights = intelligenceReport.audience_insights as Record<string, unknown> | null;
    if (audienceInsights) {
      prompt += `\n### Audience Insights\n`;
      prompt += JSON.stringify(audienceInsights, null, 2);
    }

    const searchTrends = intelligenceReport.search_trends as Record<string, unknown> | null;
    if (searchTrends) {
      prompt += `\n### Search Trends\n`;
      prompt += JSON.stringify(searchTrends, null, 2);
    }

    const socialConversations = intelligenceReport.social_conversations as Record<string, unknown> | null;
    if (socialConversations) {
      prompt += `\n### Social Conversations\n`;
      prompt += JSON.stringify(socialConversations, null, 2);
    }
  }

  // Schema specification
  prompt += `\n## OUTPUT SCHEMA

Generate a JSON object with the following structure. All fields marked as required MUST be included:

{
  "name": "string (required) - A realistic full name for this persona",
  "backstory": "string (required) - 100-300 word narrative about this person's life story",
  "quote": "string (required) - A characteristic quote this person might say",
  "dayInLife": "string (optional) - Description of a typical day",
  "photoPrompt": "string (optional) - A detailed prompt to generate a photo of this persona",

  "demographics": {
    "age": number (required) - SPECIFIC age, e.g., 32,
    "gender": "string (required) - One of: Male, Female, Non-binary, Other",
    "location": "string (required) - Specific US city and state, e.g., 'Austin, Texas'",
    "city": "string (optional)",
    "state": "string (optional)",
    "country": "string (required) - Default to 'United States'",
    "education": "string (required) - One of: High School, Some College, Associate Degree, Bachelor's Degree, Master's Degree, Doctorate, Professional Degree, Trade/Vocational, Other",
    "maritalStatus": "string (required) - One of: Single, In a relationship, Engaged, Married, Divorced, Widowed, Separated",
    "hasChildren": boolean (required),
    "numberOfChildren": number (optional),
    "householdSize": number (required) - SPECIFIC number, e.g., 3,
    "income": number (required) - SPECIFIC annual income in USD, e.g., 75000,
    "ethnicity": "string (optional)"
  },

  "professional": {
    "jobTitle": "string (required) - Specific job title",
    "occupation": "string (required) - General occupation/role",
    "industry": "string (required)",
    "company": "string (optional) - Representative company name",
    "companySize": "string (required) - One of: Self-employed, 1-10 employees, 11-50 employees, 51-200 employees, 201-500 employees, 501-1000 employees, 1001-5000 employees, 5000+ employees",
    "yearsExperience": number (required) - SPECIFIC number,
    "workStyle": "string (required) - One of: Remote, Hybrid, On-site, Freelance, Entrepreneur",
    "careerGoals": ["string array (required) - 1-5 specific career goals"],
    "weeklyWorkHours": number (optional),
    "commuteMinutes": number (optional)
  },

  "psychographics": {
    "values": ["string array (required) - 3-7 core values"],
    "motivations": ["string array (required) - 2-5 key motivations"],
    "fears": ["string array (required) - 2-5 fears/concerns"],
    "aspirations": ["string array (required) - 2-5 aspirations"],
    "personalityTraits": ["string array (required) - 3-7 traits from: Introverted, Extroverted, Analytical, Creative, Ambitious, Cautious, Adventurous, Practical, Idealistic, Spontaneous, Organized, Empathetic, Competitive, Collaborative, Independent, Detail-oriented, Big-picture thinker, Risk-taker, Risk-averse, Optimistic, Pragmatic"],
    "attitudes": ["string array (optional) - up to 5 attitudes"]
  },

  "lifestyle": {
    "hobbies": ["string array (required) - 3-10 specific hobbies"],
    "interests": ["string array (required) - 3-10 specific interests"],
    "activities": ["string array (required) - 2-10 regular activities"],
    "sports": ["string array (optional)"],
    "travel": ["string array (optional)"],
    "diet": "string (required) - One of: No restrictions, Vegetarian, Vegan, Pescatarian, Keto, Paleo, Gluten-free, Halal, Kosher, Low-carb, Organic-focused, Other",
    "fitnessLevel": "string (required) - One of: Sedentary, Lightly active, Moderately active, Very active, Extremely active",
    "wakeTime": "string (optional) - e.g., '6:30 AM'",
    "sleepTime": "string (optional) - e.g., '10:30 PM'"
  },

  "mediaTech": {
    "socialPlatforms": ["string array (required) - 1-10 from: Instagram, Facebook, TikTok, Twitter/X, LinkedIn, YouTube, Pinterest, Snapchat, Reddit, Discord, Threads, BeReal, WhatsApp, Telegram"],
    "primaryPlatform": "string (optional) - most used platform",
    "newsSources": ["string array (required) - 1-5 specific news sources"],
    "podcastsStreaming": ["string array (optional)"],
    "devices": ["string array (required) - 1-10 from: iPhone, Android Phone, iPad, Android Tablet, Windows PC, Mac, Chromebook, Smart TV, Gaming Console, Smart Watch, Smart Home Devices, VR Headset"],
    "primaryDevice": "string (optional)",
    "contentPreferences": ["string array (required) - 1-7 from: Short-form video, Long-form video, Podcasts, Articles/Blogs, Social media posts, Live streams, Newsletters, Books/E-books, Interactive content, Infographics, User-generated content"],
    "screenTime": "string (required) - One of: Less than 2 hours, 2-4 hours, 4-6 hours, 6-8 hours, 8-10 hours, More than 10 hours",
    "influencersFollowed": ["string array (optional)"]
  },

  "buyingBehavior": {
    "shoppingPreferences": ["string array (required) - 1-5 from: Online - desktop, Online - mobile, In-store, Social commerce, Marketplace (Amazon, eBay), Brand website, Subscription services"],
    "primaryChannel": "string (optional)",
    "priceSensitivity": "string (required) - One of: Very price-sensitive, Somewhat price-sensitive, Balanced, Quality over price, Premium buyer",
    "brandLoyalty": "string (required) - One of: Not loyal - always shops around, Somewhat loyal, Moderately loyal, Very loyal, Extremely loyal - brand advocate",
    "decisionFactors": ["string array (required) - 3-7 from: Price, Quality, Brand reputation, Reviews/Ratings, Recommendations, Convenience, Sustainability, Features, Design/Aesthetics, Customer service, Return policy, Shipping speed, Social proof, Exclusivity, Innovation"],
    "purchaseFrequency": "string (required) - One of: Rarely (few times a year), Occasionally (monthly), Regularly (weekly), Frequently (multiple times per week), Daily",
    "preferredChannels": ["string array (optional)"],
    "researchBehavior": "string (required) - One of: Impulse buyer - minimal research, Quick researcher - basic comparison, Moderate researcher - reads reviews, Thorough researcher - extensive comparison, Expert researcher - deep analysis",
    "currentBrands": ["string array (optional) - brands they currently use"],
    "averageMonthlySpend": number (optional) - in the product category,
    "purchaseTriggers": ["string array (optional)"]
  },

  "beliefsAttitudes": {
    "categoryBeliefs": ["string array (optional) - beliefs about the product category"],
    "advertisingAttitude": "string (optional) - attitude toward marketing",
    "socialConsciousness": "string (optional)",
    "trustLevel": "string (optional)"
  }
}

IMPORTANT: Return ONLY the JSON object, no additional text or markdown formatting.`;

  return prompt;
}

// ---------------------------------------------------------------------------
// Enum normalization — maps common AI-generated variations to valid values
// ---------------------------------------------------------------------------

/** Alias map: lowercased alias → canonical enum value */
const enumAliases: Record<string, string> = {
  // Devices
  "macbook": "Mac",
  "macbook pro": "Mac",
  "macbook air": "Mac",
  "imac": "Mac",
  "apple watch": "Smart Watch",
  "fitbit": "Smart Watch",
  "samsung phone": "Android Phone",
  "pixel": "Android Phone",
  "galaxy": "Android Phone",
  "laptop": "Windows PC",
  "desktop": "Windows PC",
  "pc": "Windows PC",
  "tablet": "iPad",
  "alexa": "Smart Home Devices",
  "google home": "Smart Home Devices",
  "echo": "Smart Home Devices",
  "roku": "Smart TV",
  "fire tv": "Smart TV",
  "apple tv": "Smart TV",
  "chromecast": "Smart TV",
  "playstation": "Gaming Console",
  "xbox": "Gaming Console",
  "nintendo switch": "Gaming Console",
  "oculus": "VR Headset",
  "meta quest": "VR Headset",

  // Content preferences
  "educational videos": "Long-form video",
  "video tutorials": "Long-form video",
  "tutorials": "Long-form video",
  "documentaries": "Long-form video",
  "webinars": "Long-form video",
  "online courses": "Long-form video",
  "reels": "Short-form video",
  "shorts": "Short-form video",
  "tiktoks": "Short-form video",
  "health newsletters": "Newsletters",
  "email newsletters": "Newsletters",
  "industry newsletters": "Newsletters",
  "blog posts": "Articles/Blogs",
  "blogs": "Articles/Blogs",
  "articles": "Articles/Blogs",
  "news articles": "Articles/Blogs",
  "research papers": "Articles/Blogs",
  "white papers": "Articles/Blogs",
  "ebooks": "Books/E-books",
  "audiobooks": "Books/E-books",
  "social media": "Social media posts",
  "social posts": "Social media posts",
  "ugc": "User-generated content",
  "streaming": "Live streams",
  "live video": "Live streams",

  // Shopping preferences
  "pharmacy in-store": "In-store",
  "in-store pharmacy": "In-store",
  "pharmacy": "In-store",
  "retail store": "In-store",
  "brick and mortar": "In-store",
  "physical store": "In-store",
  "retail": "In-store",
  "online shopping": "Online - desktop",
  "mobile shopping": "Online - mobile",
  "amazon": "Marketplace (Amazon, eBay)",
  "ebay": "Marketplace (Amazon, eBay)",
  "online marketplace": "Marketplace (Amazon, eBay)",
  "direct from brand": "Brand website",
  "brand direct": "Brand website",
  "subscription": "Subscription services",
  "subscription box": "Subscription services",
  "social media shopping": "Social commerce",

  // Decision factors
  "scientific evidence": "Quality",
  "clinical evidence": "Quality",
  "evidence-based": "Quality",
  "research-backed": "Quality",
  "quality and efficacy": "Quality",
  "efficacy": "Quality",
  "safety profile": "Quality",
  "safety": "Quality",
  "professional recommendations": "Recommendations",
  "doctor recommendations": "Recommendations",
  "pharmacist recommendations": "Recommendations",
  "expert recommendations": "Recommendations",
  "peer recommendations": "Recommendations",
  "word of mouth": "Recommendations",
  "healthcare professional recommendations": "Recommendations",
  "user reviews": "Reviews/Ratings",
  "online reviews": "Reviews/Ratings",
  "ratings": "Reviews/Ratings",
  "product reviews": "Reviews/Ratings",
  "reviews and ratings": "Reviews/Ratings",
  "customer reviews": "Reviews/Ratings",
  "value for money": "Price",
  "affordability": "Price",
  "cost": "Price",
  "durability": "Quality",
  "reliability": "Quality",
  "eco-friendly": "Sustainability",
  "environmental impact": "Sustainability",
  "green": "Sustainability",
  "ease of use": "Convenience",
  "accessibility": "Convenience",
  "aesthetics": "Design/Aesthetics",
  "design": "Design/Aesthetics",
  "look and feel": "Design/Aesthetics",
  "brand trust": "Brand reputation",
  "brand image": "Brand reputation",
  "support": "Customer service",
  "after-sales service": "Customer service",
  "fast shipping": "Shipping speed",
  "delivery speed": "Shipping speed",
  "limited edition": "Exclusivity",
  "unique": "Exclusivity",
  "new technology": "Innovation",
  "cutting-edge": "Innovation",
  "trending": "Social proof",
  "popularity": "Social proof",

  // Screen time
  "1-2 hours": "Less than 2 hours",
  "3-4 hours": "2-4 hours",
  "5-6 hours": "4-6 hours",
  "7-8 hours": "6-8 hours",
  "9-10 hours": "8-10 hours",
  "10+ hours": "More than 10 hours",
  "over 10 hours": "More than 10 hours",

  // Brand loyalty
  "not loyal": "Not loyal - always shops around",
  "extremely loyal": "Extremely loyal - brand advocate",

  // Social platforms
  "twitter": "Twitter/X",
  "x": "Twitter/X",
};

/**
 * Find the best matching enum value for a given AI-generated string.
 * 1. Exact match
 * 2. Case-insensitive match
 * 3. Alias lookup
 * 4. Substring / starts-with matching
 * Returns null if no match found.
 */
function matchEnumValue(input: string, validValues: readonly string[]): string | null {
  // 1. Exact match
  if ((validValues as readonly string[]).includes(input)) return input;

  const lower = input.toLowerCase().trim();

  // 2. Case-insensitive match
  for (const v of validValues) {
    if (v.toLowerCase() === lower) return v;
  }

  // 3. Alias lookup
  const aliased = enumAliases[lower];
  if (aliased && (validValues as readonly string[]).includes(aliased)) return aliased;

  // 4. Substring match — if input contains a valid value or vice versa
  for (const v of validValues) {
    const vLower = v.toLowerCase();
    if (lower.includes(vLower) || vLower.includes(lower)) return v;
  }

  return null;
}

/**
 * Normalize an array of AI-generated values against valid enum values.
 * Filters out values that can't be matched.
 */
function normalizeEnumArray(values: string[], validValues: readonly string[]): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const v of values) {
    const matched = matchEnumValue(v, validValues);
    if (matched && !seen.has(matched)) {
      result.push(matched);
      seen.add(matched);
    }
  }
  return result;
}

/**
 * Normalize a single enum value. Returns the fallback if no match found.
 */
function normalizeEnumSingle(
  value: string | undefined | null,
  validValues: readonly string[],
  fallback: string
): string {
  if (!value) return fallback;
  return matchEnumValue(value, validValues) ?? fallback;
}

/**
 * Normalize all enum fields in a parsed persona to match the Zod schema.
 * Exported for use in other persona generation routes.
 */
export function normalizePersonaEnums(persona: PersonaInput): PersonaInput {
  // Demographics
  if (persona.demographics) {
    persona.demographics.gender = normalizeEnumSingle(
      persona.demographics.gender, genders, "Other"
    ) as PersonaInput["demographics"]["gender"];
    persona.demographics.education = normalizeEnumSingle(
      persona.demographics.education, educationLevels, "Other"
    ) as PersonaInput["demographics"]["education"];
    persona.demographics.maritalStatus = normalizeEnumSingle(
      persona.demographics.maritalStatus, maritalStatuses, "Single"
    ) as PersonaInput["demographics"]["maritalStatus"];
  }

  // Professional
  if (persona.professional) {
    persona.professional.companySize = normalizeEnumSingle(
      persona.professional.companySize, companySizes, "51-200 employees"
    ) as PersonaInput["professional"]["companySize"];
    persona.professional.workStyle = normalizeEnumSingle(
      persona.professional.workStyle, workStyles, "Hybrid"
    ) as PersonaInput["professional"]["workStyle"];
  }

  // Psychographics — personality traits
  if (persona.psychographics?.personalityTraits) {
    persona.psychographics.personalityTraits = normalizeEnumArray(
      persona.psychographics.personalityTraits, personalityTraitValues
    ) as PersonaInput["psychographics"]["personalityTraits"];
    // Ensure at least 3 traits
    if (persona.psychographics.personalityTraits.length < 3) {
      const defaults = ["Analytical", "Practical", "Organized"];
      for (const d of defaults) {
        if (persona.psychographics.personalityTraits.length >= 3) break;
        if (!(persona.psychographics.personalityTraits as string[]).includes(d)) {
          (persona.psychographics.personalityTraits as string[]).push(d);
        }
      }
    }
  }

  // Lifestyle
  if (persona.lifestyle) {
    persona.lifestyle.diet = normalizeEnumSingle(
      persona.lifestyle.diet, dietTypes, "No restrictions"
    ) as PersonaInput["lifestyle"]["diet"];
    persona.lifestyle.fitnessLevel = normalizeEnumSingle(
      persona.lifestyle.fitnessLevel, fitnessLevels, "Moderately active"
    ) as PersonaInput["lifestyle"]["fitnessLevel"];
  }

  // Media & Tech
  if (persona.mediaTech) {
    persona.mediaTech.socialPlatforms = normalizeEnumArray(
      persona.mediaTech.socialPlatforms, socialPlatformValues
    ) as PersonaInput["mediaTech"]["socialPlatforms"];
    if (persona.mediaTech.socialPlatforms.length === 0) {
      (persona.mediaTech.socialPlatforms as string[]).push("Instagram");
    }

    persona.mediaTech.devices = normalizeEnumArray(
      persona.mediaTech.devices, deviceTypes
    ) as PersonaInput["mediaTech"]["devices"];
    if (persona.mediaTech.devices.length === 0) {
      (persona.mediaTech.devices as string[]).push("iPhone");
    }

    persona.mediaTech.contentPreferences = normalizeEnumArray(
      persona.mediaTech.contentPreferences, contentPreferenceValues
    ) as PersonaInput["mediaTech"]["contentPreferences"];
    if (persona.mediaTech.contentPreferences.length === 0) {
      (persona.mediaTech.contentPreferences as string[]).push("Short-form video");
    }

    persona.mediaTech.screenTime = normalizeEnumSingle(
      persona.mediaTech.screenTime, screenTimeRanges, "4-6 hours"
    ) as PersonaInput["mediaTech"]["screenTime"];

    if (persona.mediaTech.primaryPlatform) {
      const matched = matchEnumValue(persona.mediaTech.primaryPlatform, socialPlatformValues);
      persona.mediaTech.primaryPlatform = (matched ?? undefined) as PersonaInput["mediaTech"]["primaryPlatform"];
    }

    if (persona.mediaTech.primaryDevice) {
      const matched = matchEnumValue(persona.mediaTech.primaryDevice, deviceTypes);
      persona.mediaTech.primaryDevice = (matched ?? undefined) as PersonaInput["mediaTech"]["primaryDevice"];
    }
  }

  // Buying behavior
  if (persona.buyingBehavior) {
    persona.buyingBehavior.shoppingPreferences = normalizeEnumArray(
      persona.buyingBehavior.shoppingPreferences, shoppingChannels
    ) as PersonaInput["buyingBehavior"]["shoppingPreferences"];
    if (persona.buyingBehavior.shoppingPreferences.length === 0) {
      (persona.buyingBehavior.shoppingPreferences as string[]).push("Online - mobile");
    }

    if (persona.buyingBehavior.primaryChannel) {
      const matched = matchEnumValue(persona.buyingBehavior.primaryChannel, shoppingChannels);
      persona.buyingBehavior.primaryChannel = (matched ?? undefined) as PersonaInput["buyingBehavior"]["primaryChannel"];
    }

    persona.buyingBehavior.priceSensitivity = normalizeEnumSingle(
      persona.buyingBehavior.priceSensitivity, priceSensitivities, "Balanced"
    ) as PersonaInput["buyingBehavior"]["priceSensitivity"];

    persona.buyingBehavior.brandLoyalty = normalizeEnumSingle(
      persona.buyingBehavior.brandLoyalty, brandLoyaltyLevels, "Moderately loyal"
    ) as PersonaInput["buyingBehavior"]["brandLoyalty"];

    persona.buyingBehavior.decisionFactors = normalizeEnumArray(
      persona.buyingBehavior.decisionFactors, decisionFactorValues
    ) as PersonaInput["buyingBehavior"]["decisionFactors"];
    if (persona.buyingBehavior.decisionFactors.length < 3) {
      const defaults = ["Quality", "Price", "Reviews/Ratings"];
      for (const d of defaults) {
        if (persona.buyingBehavior.decisionFactors.length >= 3) break;
        if (!(persona.buyingBehavior.decisionFactors as string[]).includes(d)) {
          (persona.buyingBehavior.decisionFactors as string[]).push(d);
        }
      }
    }

    persona.buyingBehavior.purchaseFrequency = normalizeEnumSingle(
      persona.buyingBehavior.purchaseFrequency, purchaseFrequencies, "Occasionally (monthly)"
    ) as PersonaInput["buyingBehavior"]["purchaseFrequency"];

    persona.buyingBehavior.researchBehavior = normalizeEnumSingle(
      persona.buyingBehavior.researchBehavior, researchBehaviors, "Moderate researcher - reads reviews"
    ) as PersonaInput["buyingBehavior"]["researchBehavior"];
  }

  return persona;
}

/**
 * Fix common JSON issues produced by AI models:
 * - Unescaped double quotes inside string values (e.g., "Patricia "Pat" Richardson")
 * - Smart/curly quotes
 */
function sanitizeJsonString(raw: string): string {
  // Replace smart/curly quotes with straight quotes
  let s = raw
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'");

  // Fix unescaped double quotes inside JSON string values.
  // Strategy: walk through the string tracking whether we're inside a JSON string,
  // and if we encounter a quote that isn't preceded by a backslash and isn't a
  // structural boundary (key/value delimiter), escape it.
  const chars = [...s];
  const result: string[] = [];
  let inString = false;
  let stringStart = -1;

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const prev = i > 0 ? chars[i - 1] : "";

    if (ch === '"' && prev !== "\\") {
      if (!inString) {
        // Opening quote
        inString = true;
        stringStart = i;
        result.push(ch);
      } else {
        // We're inside a string and hit an unescaped quote.
        // Is this the CLOSING quote? Look ahead to see if the next non-whitespace
        // char is a structural JSON character (: , } ] or end-of-string)
        let nextNonWs = "";
        for (let j = i + 1; j < chars.length; j++) {
          if (chars[j] !== " " && chars[j] !== "\t" && chars[j] !== "\n" && chars[j] !== "\r") {
            nextNonWs = chars[j];
            break;
          }
        }
        if (nextNonWs === ":" || nextNonWs === "," || nextNonWs === "}" || nextNonWs === "]" || nextNonWs === "") {
          // This is the real closing quote
          inString = false;
          result.push(ch);
        } else {
          // This is an embedded quote inside a string value — escape it
          result.push('\\"');
        }
      }
    } else {
      result.push(ch);
    }
  }

  return result.join("");
}

/**
 * Parse the AI response and extract the persona JSON
 */
function parsePersonaResponse(content: string): PersonaInput {
  // Try to extract JSON from the response
  let jsonStr = content.trim();

  // Remove markdown code blocks if present
  if (jsonStr.startsWith("```json")) {
    jsonStr = jsonStr.slice(7);
  } else if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.slice(3);
  }
  if (jsonStr.endsWith("```")) {
    jsonStr = jsonStr.slice(0, -3);
  }

  jsonStr = jsonStr.trim();

  // If the string doesn't start with {, try to find JSON object in the content
  if (!jsonStr.startsWith("{")) {
    const firstBrace = jsonStr.indexOf("{");
    const lastBrace = jsonStr.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
    }
  }

  // Sanitize common JSON issues (unescaped quotes, smart quotes)
  jsonStr = sanitizeJsonString(jsonStr);

  // Parse the JSON
  const parsed = JSON.parse(jsonStr);

  // Map the response to the PersonaInput format
  const persona: PersonaInput = {
    name: parsed.name,
    backstory: parsed.backstory,
    quote: parsed.quote,
    dayInLife: parsed.dayInLife,
    photoPrompt: parsed.photoPrompt,

    demographics: {
      age: parsed.demographics.age,
      gender: parsed.demographics.gender,
      location: parsed.demographics.location,
      city: parsed.demographics.city,
      state: parsed.demographics.state,
      country: parsed.demographics.country,
      education: parsed.demographics.education,
      maritalStatus: parsed.demographics.maritalStatus,
      hasChildren: parsed.demographics.hasChildren,
      numberOfChildren: parsed.demographics.numberOfChildren,
      householdSize: parsed.demographics.householdSize,
      income: parsed.demographics.income,
      ethnicity: parsed.demographics.ethnicity,
    },

    professional: {
      jobTitle: parsed.professional.jobTitle,
      occupation: parsed.professional.occupation,
      industry: parsed.professional.industry,
      company: parsed.professional.company,
      companySize: parsed.professional.companySize,
      yearsExperience: parsed.professional.yearsExperience,
      workStyle: parsed.professional.workStyle,
      careerGoals: parsed.professional.careerGoals,
      weeklyWorkHours: parsed.professional.weeklyWorkHours,
      commuteMinutes: parsed.professional.commuteMinutes,
    },

    psychographics: {
      values: parsed.psychographics.values,
      motivations: parsed.psychographics.motivations,
      fears: parsed.psychographics.fears,
      aspirations: parsed.psychographics.aspirations,
      personalityTraits: parsed.psychographics.personalityTraits,
      attitudes: parsed.psychographics.attitudes,
    },

    lifestyle: {
      hobbies: parsed.lifestyle.hobbies,
      interests: parsed.lifestyle.interests,
      activities: parsed.lifestyle.activities,
      sports: parsed.lifestyle.sports,
      travel: parsed.lifestyle.travel,
      diet: parsed.lifestyle.diet,
      fitnessLevel: parsed.lifestyle.fitnessLevel,
      wakeTime: parsed.lifestyle.wakeTime,
      sleepTime: parsed.lifestyle.sleepTime,
    },

    mediaTech: {
      socialPlatforms: parsed.mediaTech.socialPlatforms,
      primaryPlatform: parsed.mediaTech.primaryPlatform,
      newsSources: parsed.mediaTech.newsSources,
      podcastsStreaming: parsed.mediaTech.podcastsStreaming,
      devices: parsed.mediaTech.devices,
      primaryDevice: parsed.mediaTech.primaryDevice,
      contentPreferences: parsed.mediaTech.contentPreferences,
      screenTime: parsed.mediaTech.screenTime,
      influencersFollowed: parsed.mediaTech.influencersFollowed,
    },

    buyingBehavior: {
      shoppingPreferences: parsed.buyingBehavior.shoppingPreferences,
      primaryChannel: parsed.buyingBehavior.primaryChannel,
      priceSensitivity: parsed.buyingBehavior.priceSensitivity,
      brandLoyalty: parsed.buyingBehavior.brandLoyalty,
      decisionFactors: parsed.buyingBehavior.decisionFactors,
      purchaseFrequency: parsed.buyingBehavior.purchaseFrequency,
      preferredChannels: parsed.buyingBehavior.preferredChannels,
      researchBehavior: parsed.buyingBehavior.researchBehavior,
      currentBrands: parsed.buyingBehavior.currentBrands,
      averageMonthlySpend: parsed.buyingBehavior.averageMonthlySpend,
      purchaseTriggers: parsed.buyingBehavior.purchaseTriggers,
    },

    beliefsAttitudes: parsed.beliefsAttitudes
      ? {
          categoryBeliefs: parsed.beliefsAttitudes.categoryBeliefs,
          advertisingAttitude: parsed.beliefsAttitudes.advertisingAttitude,
          socialConsciousness: parsed.beliefsAttitudes.socialConsciousness,
          trustLevel: parsed.beliefsAttitudes.trustLevel,
        }
      : undefined,

    generationModel: OPENROUTER_MODEL,
    validationStatus: "pending",
  };

  // Normalize AI-generated enum values to match the Zod schema
  return normalizePersonaEnums(persona);
}

/**
 * Generate a persona using Claude Haiku 4.5 via OpenRouter
 *
 * @param context - Brand, product, and intelligence data for context
 * @returns Generated persona data matching the schema
 */
export async function generatePersona(
  context: PersonaGenerationContext,
  existingNames: string[] = []
): Promise<GeneratePersonaResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error: "OpenRouter API key is not configured",
      code: "MISSING_API_KEY",
    };
  }

  let rawContent: string | undefined;
  try {
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(context, existingNames);

    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://adforge.app",
        "X-Title": "AdForge Persona Generator",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: GENERATION_CONFIG.temperature,
        max_tokens: GENERATION_CONFIG.max_tokens,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        (errorData as { error?: { message?: string } })?.error?.message ||
        `OpenRouter API error: ${response.status} ${response.statusText}`;

      console.error("OpenRouter API error:", {
        status: response.status,
        statusText: response.statusText,
        errorData,
        errorMessage,
      });

      return {
        success: false,
        error: errorMessage,
        code: `HTTP_${response.status}`,
      };
    }

    const responseText = await response.text();
    let data: OpenRouterResponse;
    try {
      data = JSON.parse(responseText) as OpenRouterResponse;
    } catch {
      console.error("Failed to parse OpenRouter API response:", responseText.substring(0, 500));
      return {
        success: false,
        error: "Failed to parse OpenRouter API response",
        code: "API_PARSE_ERROR",
      };
    }

    if (!data.choices || data.choices.length === 0) {
      return {
        success: false,
        error: "No response generated from the model",
        code: "EMPTY_RESPONSE",
      };
    }

    const finishReason = data.choices[0].finish_reason;
    const content = data.choices[0].message.content;
    rawContent = content;

    console.log("OpenRouter response:", {
      model: data.model,
      finishReason,
      contentLength: content?.length,
      usage: data.usage,
    });

    if (!content) {
      return {
        success: false,
        error: "Empty content in model response",
        code: "EMPTY_CONTENT",
      };
    }

    // Check for truncated response
    if (finishReason === "length") {
      console.error("OpenRouter response was truncated (finish_reason: length). Content length:", content.length);
      console.error("Truncated content (last 200 chars):", content.slice(-200));
      return {
        success: false,
        error: "Model response was truncated. The persona JSON was too long for the token limit.",
        code: "RESPONSE_TRUNCATED",
      };
    }

    // Parse the persona from the response
    const persona = parsePersonaResponse(content);

    return {
      success: true,
      persona,
      model: data.model,
      usage: {
        prompt_tokens: data.usage?.prompt_tokens ?? 0,
        completion_tokens: data.usage?.completion_tokens ?? 0,
        total_tokens: data.usage?.total_tokens ?? 0,
      },
    };
  } catch (error) {
    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      console.error("JSON parse error in persona generation:", error.message);
      console.error("Raw content (first 500 chars):", rawContent?.substring(0, 500));
      return {
        success: false,
        error: "Failed to parse persona response as JSON",
        code: "PARSE_ERROR",
      };
    }

    // Handle other errors
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Persona generation error:", errorMessage, error);

    return {
      success: false,
      error: errorMessage,
      code: "UNKNOWN_ERROR",
    };
  }
}

/**
 * Generate multiple personas in batch
 *
 * @param context - Brand, product, and intelligence data for context
 * @param count - Number of personas to generate (1-5)
 * @returns Array of generated personas
 */
export async function generatePersonas(
  context: PersonaGenerationContext,
  count: number = 1
): Promise<{
  success: boolean;
  personas: PersonaInput[];
  errors: string[];
  usage: {
    total_prompt_tokens: number;
    total_completion_tokens: number;
    total_tokens: number;
  };
}> {
  // Clamp count between 1 and 5
  const targetCount = Math.max(1, Math.min(5, count));

  const personas: PersonaInput[] = [];
  const errors: string[] = [];
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;

  // Collect existing names (from context + newly generated) to avoid duplicates
  const allNames: string[] = [...(context.existingPersonaNames || [])];

  // Generate personas sequentially to ensure variety
  for (let i = 0; i < targetCount; i++) {
    const result = await generatePersona(context, allNames);

    if (result.success) {
      allNames.push(result.persona.name);
      personas.push(result.persona);
      totalPromptTokens += result.usage.prompt_tokens;
      totalCompletionTokens += result.usage.completion_tokens;
    } else {
      errors.push(`Persona ${i + 1}: ${result.error}`);
    }
  }

  return {
    success: personas.length > 0,
    personas,
    errors,
    usage: {
      total_prompt_tokens: totalPromptTokens,
      total_completion_tokens: totalCompletionTokens,
      total_tokens: totalPromptTokens + totalCompletionTokens,
    },
  };
}

// Export the model constant for use in other files
export const PERSONA_GENERATION_MODEL = OPENROUTER_MODEL;
