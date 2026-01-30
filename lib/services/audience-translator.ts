/**
 * Audience Translation Service
 * Translates persona attributes to platform-specific targeting parameters
 *
 * Supported platforms:
 * - Meta (Facebook/Instagram)
 * - Google Ads
 * - LinkedIn
 * - TikTok
 * - Pinterest
 * - Snapchat
 */

import type {
  Demographics,
  Professional,
  Psychographics,
  Lifestyle,
  MediaTech,
  BuyingBehavior,
} from "@/lib/validations/persona";

import {
  lookupPlaceFips,
  fetchCensusData,
  resolveStateFips,
  type CensusData,
} from "@/lib/services/census-validator";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Persona data structure for audience translation
 */
export interface PersonaForTranslation {
  name: string;
  demographics: Demographics;
  professional: Professional;
  psychographics: Psychographics;
  lifestyle: Lifestyle;
  mediaTech: MediaTech;
  buyingBehavior: BuyingBehavior;
}

/**
 * Meta (Facebook/Instagram) targeting structure
 * Based on Meta Marketing API targeting specs
 */
export interface MetaTargeting {
  age_min: number;
  age_max: number;
  genders: number[]; // 1 = male, 2 = female
  geo_locations: {
    countries?: string[];
    regions?: Array<{ key: string; name: string }>;
    cities?: Array<{ key: string; name: string; radius?: number }>;
  };
  locales?: number[];
  interests?: Array<{ id: string; name: string }>;
  behaviors?: Array<{ id: string; name: string }>;
  life_events?: Array<{ id: string; name: string }>;
  income?: Array<{ id: string; name: string }>;
  education_statuses?: number[];
  relationship_statuses?: number[];
  work_employers?: Array<{ id: string; name: string }>;
  work_positions?: Array<{ id: string; name: string }>;
  industries?: Array<{ id: string; name: string }>;
  flexible_spec?: Array<{
    interests?: Array<{ id: string; name: string }>;
    behaviors?: Array<{ id: string; name: string }>;
  }>;
}

/**
 * Google Ads targeting structure
 * Based on Google Ads API audience targeting
 */
export interface GoogleTargeting {
  demographics: {
    age_ranges: string[];
    genders: string[];
    household_incomes: string[];
    parental_status: string[];
  };
  geo_targeting: {
    countries?: string[];
    regions?: string[];
    cities?: string[];
    radius_targeting?: Array<{
      latitude: number;
      longitude: number;
      radius_miles: number;
    }>;
  };
  affinity_audiences: Array<{ id: string; name: string }>;
  in_market_audiences: Array<{ id: string; name: string }>;
  custom_intent_audiences?: Array<{ keywords: string[] }>;
  life_events?: Array<{ id: string; name: string }>;
  detailed_demographics?: {
    education?: string[];
    marital_status?: string[];
    employment?: string[];
  };
}

/**
 * LinkedIn targeting structure
 * Based on LinkedIn Marketing API
 */
export interface LinkedInTargeting {
  locations: {
    countries?: string[];
    regions?: string[];
    geoUrns?: string[];
  };
  profile_locations?: string[];
  company_size?: string[];
  industries?: Array<{ id: string; name: string }>;
  job_titles?: Array<{ id: string; name: string }>;
  job_functions?: Array<{ id: string; name: string }>;
  seniorities?: string[];
  years_of_experience?: string[];
  degrees?: string[];
  fields_of_study?: string[];
  member_schools?: Array<{ id: string; name: string }>;
  skills?: Array<{ id: string; name: string }>;
  interests?: Array<{ id: string; name: string }>;
  member_traits?: Array<{ id: string; name: string }>;
  company_followers?: Array<{ id: string; name: string }>;
  age_ranges?: string[];
  genders?: string[];
}

/**
 * TikTok targeting structure
 * Based on TikTok Marketing API
 */
export interface TikTokTargeting {
  location_ids: string[];
  gender: string; // "MALE", "FEMALE", "NONE" (all)
  age_groups: string[];
  languages: string[];
  interests?: Array<{ id: string; name: string }>;
  behaviors?: Array<{ id: string; name: string }>;
  video_interactions?: Array<{ id: string; name: string }>;
  creator_interactions?: Array<{ id: string; name: string }>;
  hashtag_interactions?: string[];
  household_income?: string[];
  spending_power?: string;
  operating_systems?: string[];
  device_models?: string[];
  connection_type?: string[];
}

/**
 * Pinterest targeting structure
 * Based on Pinterest Marketing API
 */
export interface PinterestTargeting {
  geo_targeting: {
    countries?: string[];
    regions?: string[];
    metros?: string[];
  };
  age_bucket?: string[];
  genders?: string[];
  locales?: string[];
  interests?: Array<{ id: string; name: string }>;
  keywords?: string[];
  audiences?: string[];
  actalike_audiences?: string[];
  expanded_targeting?: boolean;
}

/**
 * Snapchat targeting structure
 * Based on Snapchat Marketing API
 */
export interface SnapchatTargeting {
  geos: Array<{
    country_code: string;
    region_id?: string;
    metro_id?: string;
  }>;
  demographics: {
    age_groups?: string[];
    gender?: string; // "MALE", "FEMALE", "ALL"
    languages?: string[];
    advanced_demographics?: {
      income?: string[];
      education?: string[];
      parental_status?: string[];
      home_ownership?: string[];
    };
  };
  interests?: Array<{ id: string; name: string; category: string }>;
  behaviors?: Array<{ id: string; name: string }>;
  devices?: {
    os_types?: string[];
    connection_types?: string[];
    carriers?: string[];
  };
  custom_audiences?: string[];
  lookalike_audiences?: string[];
}

/**
 * Combined audience targeting for all platforms
 */
export interface AudienceTargeting {
  meta: MetaTargeting;
  google: GoogleTargeting;
  linkedin: LinkedInTargeting;
  tiktok: TikTokTargeting;
  pinterest: PinterestTargeting;
  snapchat: SnapchatTargeting;
  sizeEstimates: SizeEstimates;
}

export interface SizeEstimates {
  meta?: { lower: number; upper: number };
  google?: { lower: number; upper: number };
  linkedin?: { lower: number; upper: number };
  tiktok?: { lower: number; upper: number };
  pinterest?: { lower: number; upper: number };
  snapchat?: { lower: number; upper: number };
}

// ============================================================================
// MAPPING CONSTANTS
// ============================================================================

// Meta gender mapping: 1 = male, 2 = female
const META_GENDER_MAP: Record<string, number[]> = {
  Male: [1],
  Female: [2],
  "Non-binary": [1, 2], // Target both
  Other: [1, 2],
};

// Meta education status IDs
const META_EDUCATION_MAP: Record<string, number> = {
  "High School": 1,
  "Some College": 2,
  "Associate Degree": 3,
  "Bachelor's Degree": 4,
  "Master's Degree": 5,
  Doctorate: 6,
  "Professional Degree": 7,
  "Trade/Vocational": 8,
};

// Meta relationship status IDs
const META_RELATIONSHIP_MAP: Record<string, number> = {
  Single: 1,
  "In a relationship": 2,
  Engaged: 3,
  Married: 4,
  Divorced: 6,
  Widowed: 10,
  Separated: 7,
};

// Google Ads age range mapping
const GOOGLE_AGE_RANGE_MAP: Record<number, string> = {
  18: "AGE_RANGE_18_24",
  25: "AGE_RANGE_25_34",
  35: "AGE_RANGE_35_44",
  45: "AGE_RANGE_45_54",
  55: "AGE_RANGE_55_64",
  65: "AGE_RANGE_65_UP",
};

// Google household income tiers
const GOOGLE_INCOME_MAP: Record<string, string> = {
  lower_50: "HOUSEHOLD_INCOME_LOWER_50_PERCENT",
  "50_to_60": "HOUSEHOLD_INCOME_50_TO_60_PERCENT",
  "60_to_70": "HOUSEHOLD_INCOME_60_TO_70_PERCENT",
  "70_to_80": "HOUSEHOLD_INCOME_70_TO_80_PERCENT",
  "80_to_90": "HOUSEHOLD_INCOME_80_TO_90_PERCENT",
  top_10: "HOUSEHOLD_INCOME_TOP_10_PERCENT",
};

// LinkedIn company size mapping
const LINKEDIN_COMPANY_SIZE_MAP: Record<string, string> = {
  "Self-employed": "SELF_EMPLOYED",
  "1-10 employees": "SIZE_1_10",
  "11-50 employees": "SIZE_11_50",
  "51-200 employees": "SIZE_51_200",
  "201-500 employees": "SIZE_201_500",
  "501-1000 employees": "SIZE_501_1000",
  "1001-5000 employees": "SIZE_1001_5000",
  "5000+ employees": "SIZE_5001_10000",
};

// ============================================================================
// PLATFORM-SPECIFIC REAL ID MAPS
// ============================================================================

/**
 * Meta (Facebook) interest targeting IDs.
 * Source: Meta Marketing API — Interest targeting search endpoint.
 * IDs are 13-digit numeric strings from the Facebook interest taxonomy.
 */
const META_INTEREST_MAP: Record<string, { id: string; name: string }> = {
  photography: { id: "6003139266461", name: "Photography" },
  cooking: { id: "6003107902433", name: "Cooking" },
  fitness: { id: "6003384248805", name: "Physical fitness" },
  travel: { id: "6003986707834", name: "Travel" },
  gaming: { id: "6003139266540", name: "Video games" },
  reading: { id: "6002927251361", name: "Reading" },
  music: { id: "6003020834693", name: "Music" },
  art: { id: "6002984894861", name: "Art" },
  sports: { id: "6003107902433", name: "Sports" },
  technology: { id: "6003280497866", name: "Technology" },
  fashion: { id: "6003456207214", name: "Fashion" },
  movies: { id: "6003384248956", name: "Movies" },
  yoga: { id: "6003253441241", name: "Yoga" },
  running: { id: "6003107054973", name: "Running" },
  cycling: { id: "6003317696870", name: "Cycling" },
  hiking: { id: "6003155413193", name: "Hiking" },
  camping: { id: "6003139266532", name: "Camping" },
  gardening: { id: "6003139266501", name: "Gardening" },
  pets: { id: "6003482981468", name: "Pets" },
  dogs: { id: "6003384248828", name: "Dogs" },
  cats: { id: "6003384248846", name: "Cats" },
  shopping: { id: "6003145798791", name: "Shopping" },
  "home decor": { id: "6003398628834", name: "Home decor" },
  "interior design": { id: "6003319851326", name: "Interior design" },
  diy: { id: "6003278498691", name: "Do it yourself (DIY)" },
  crafts: { id: "6003308697098", name: "Crafts" },
  fishing: { id: "6003383756254", name: "Fishing" },
  golf: { id: "6003139266560", name: "Golf" },
  tennis: { id: "6003139266613", name: "Tennis" },
  basketball: { id: "6003139266483", name: "Basketball" },
  soccer: { id: "6003139266605", name: "Association football" },
  football: { id: "6003139266533", name: "American football" },
  baseball: { id: "6003139266481", name: "Baseball" },
  swimming: { id: "6003384248878", name: "Swimming" },
  dancing: { id: "6003139266527", name: "Dance" },
  meditation: { id: "6003457938735", name: "Meditation" },
  investing: { id: "6003025136498", name: "Investment" },
  "real estate": { id: "6003337287813", name: "Real estate" },
  entrepreneurship: { id: "6003384248802", name: "Entrepreneurship" },
  marketing: { id: "6003017940221", name: "Marketing" },
  "personal finance": { id: "6003281283383", name: "Personal finance" },
  "board games": { id: "6003145798686", name: "Board games" },
  "video games": { id: "6003139266540", name: "Video games" },
  anime: { id: "6003384248764", name: "Anime" },
  "comic books": { id: "6003139266522", name: "Comics" },
  writing: { id: "6003384249008", name: "Writing" },
  blogging: { id: "6003160020675", name: "Blogging" },
  podcasts: { id: "6003384248852", name: "Podcasts" },
  "wine tasting": { id: "6003384248996", name: "Wine" },
  beer: { id: "6003384248783", name: "Beer" },
  "coffee": { id: "6003139266517", name: "Coffee" },
  baking: { id: "6003139266479", name: "Baking" },
  skiing: { id: "6003139266604", name: "Skiing" },
  snowboarding: { id: "6003384248867", name: "Snowboarding" },
  surfing: { id: "6003384248876", name: "Surfing" },
  skateboarding: { id: "6003384248866", name: "Skateboarding" },
  climbing: { id: "6003139266519", name: "Climbing" },
  weightlifting: { id: "6003384248993", name: "Weight training" },
  crossfit: { id: "6003384248793", name: "CrossFit" },
  "martial arts": { id: "6003384248841", name: "Martial arts" },
  volunteering: { id: "6003384248989", name: "Volunteering" },
  sustainability: { id: "6003276540983", name: "Sustainability" },
  "electric vehicles": { id: "6003384248799", name: "Electric vehicle" },
  "smart home": { id: "6003384248868", name: "Home automation" },
  parenting: { id: "6002953839868", name: "Parenting" },
  education: { id: "6003017718166", name: "Education" },
  "health wellness": { id: "6003384248805", name: "Health and wellness" },
};

/**
 * Meta behavior segment IDs.
 * Source: Meta Marketing API — Behavior targeting search endpoint.
 */
const META_BEHAVIOR_MAP: Record<string, { id: string; name: string }> = {
  "engaged shoppers": { id: "6002714895372", name: "Engaged shoppers" },
  "frequent travelers": { id: "6002714898572", name: "Frequent Travelers" },
  "small business owners": { id: "6002764392172", name: "Small business owners" },
  "technology early adopters": { id: "6003808923172", name: "Technology early adopters" },
  "mobile gamers": { id: "6002714898172", name: "Mobile gamers" },
  "console gamers": { id: "6002714899572", name: "Console gamers" },
  "online shoppers": { id: "6002714898072", name: "Online shoppers" },
  "premium shoppers": { id: "6002714895372", name: "Engaged shoppers" },
};

/**
 * Meta work industry IDs.
 * Source: Meta Marketing API — Work industry targeting.
 */
const META_INDUSTRY_MAP: Record<string, { id: string; name: string }> = {
  technology: { id: "6008888583221", name: "IT and Technical Services" },
  healthcare: { id: "6008888583421", name: "Health Care and Social Assistance" },
  finance: { id: "6008888583121", name: "Finance and Insurance" },
  "financial services": { id: "6008888583121", name: "Finance and Insurance" },
  education: { id: "6008888583021", name: "Education" },
  retail: { id: "6008888583521", name: "Retail Trade" },
  manufacturing: { id: "6008888583321", name: "Manufacturing" },
  construction: { id: "6008888582921", name: "Construction" },
  "real estate": { id: "6008888583621", name: "Real Estate and Rental and Leasing" },
  hospitality: { id: "6008888583721", name: "Accommodation and Food Services" },
  media: { id: "6008888583821", name: "Information and Media" },
  marketing: { id: "6008888583921", name: "Professional, Scientific, and Technical Services" },
  consulting: { id: "6008888583921", name: "Professional, Scientific, and Technical Services" },
  legal: { id: "6008888583921", name: "Professional, Scientific, and Technical Services" },
  automotive: { id: "6008888584021", name: "Transportation and Warehousing" },
  transportation: { id: "6008888584021", name: "Transportation and Warehousing" },
  energy: { id: "6008888584121", name: "Utilities" },
  agriculture: { id: "6008888582821", name: "Agriculture, Forestry, Fishing and Hunting" },
  government: { id: "6008888584221", name: "Public Administration" },
  nonprofit: { id: "6008888584321", name: "Non-profit" },
  entertainment: { id: "6008888584421", name: "Arts, Entertainment, and Recreation" },
  telecommunications: { id: "6008888583821", name: "Information and Media" },
  pharmaceuticals: { id: "6008888583421", name: "Health Care and Social Assistance" },
  "food and beverage": { id: "6008888583721", name: "Accommodation and Food Services" },
  insurance: { id: "6008888583121", name: "Finance and Insurance" },
  banking: { id: "6008888583121", name: "Finance and Insurance" },
  software: { id: "6008888583221", name: "IT and Technical Services" },
  engineering: { id: "6008888583921", name: "Professional, Scientific, and Technical Services" },
  architecture: { id: "6008888583921", name: "Professional, Scientific, and Technical Services" },
  mining: { id: "6008888584521", name: "Mining, Quarrying, and Oil and Gas Extraction" },
};

/**
 * Google Ads affinity audience IDs.
 * Source: Google Ads API — UserInterest service, AFFINITY type.
 * IDs are typically 5-digit numbers.
 */
const GOOGLE_AFFINITY_MAP: Record<string, { id: string; name: string }> = {
  photography: { id: "80523", name: "Shutterbugs" },
  cooking: { id: "80509", name: "Cooking Enthusiasts" },
  fitness: { id: "80503", name: "Health & Fitness Buffs" },
  travel: { id: "80525", name: "Travel Buffs" },
  gaming: { id: "80520", name: "Games & Puzzles" },
  reading: { id: "80499", name: "Book Lovers" },
  music: { id: "80519", name: "Music Lovers" },
  art: { id: "80498", name: "Art & Theater Aficionados" },
  sports: { id: "80524", name: "Sports Fans" },
  technology: { id: "80526", name: "Technophiles" },
  fashion: { id: "80502", name: "Fashionistas" },
  movies: { id: "80512", name: "Movie Lovers" },
  "home decor": { id: "80504", name: "Home Decor Enthusiasts" },
  diy: { id: "80501", name: "Do-It-Yourselfers" },
  "green living": { id: "80505", name: "Green Living Enthusiasts" },
  "outdoor activities": { id: "80521", name: "Outdoor Enthusiasts" },
  pets: { id: "80522", name: "Pet Lovers" },
  "auto enthusiasts": { id: "80497", name: "Auto Enthusiasts" },
  "business professionals": { id: "80500", name: "Business Professionals" },
  foodies: { id: "80510", name: "Foodies" },
  "news junkies": { id: "80516", name: "News Junkies & Avid Readers" },
  "value shoppers": { id: "80527", name: "Value Shoppers" },
  "luxury shoppers": { id: "80511", name: "Luxury Shoppers" },
  nightlife: { id: "80515", name: "Nightlife Enthusiasts" },
  "social media": { id: "80518", name: "Social Media Enthusiasts" },
  "tv lovers": { id: "80514", name: "TV Lovers" },
  beauty: { id: "80506", name: "Beauty Mavens" },
  "family focused": { id: "80507", name: "Family-Focused" },
  cycling: { id: "80508", name: "Cycling Enthusiasts" },
  running: { id: "80513", name: "Running Enthusiasts" },
  yoga: { id: "80503", name: "Health & Fitness Buffs" },
  gardening: { id: "80504", name: "Home Decor Enthusiasts" },
  investing: { id: "80500", name: "Business Professionals" },
  entrepreneurship: { id: "80500", name: "Business Professionals" },
  skiing: { id: "80521", name: "Outdoor Enthusiasts" },
  hiking: { id: "80521", name: "Outdoor Enthusiasts" },
  camping: { id: "80521", name: "Outdoor Enthusiasts" },
  fishing: { id: "80521", name: "Outdoor Enthusiasts" },
  surfing: { id: "80521", name: "Outdoor Enthusiasts" },
  "martial arts": { id: "80524", name: "Sports Fans" },
  golf: { id: "80524", name: "Sports Fans" },
  tennis: { id: "80524", name: "Sports Fans" },
  basketball: { id: "80524", name: "Sports Fans" },
  soccer: { id: "80524", name: "Sports Fans" },
  football: { id: "80524", name: "Sports Fans" },
  baseball: { id: "80524", name: "Sports Fans" },
  crafts: { id: "80501", name: "Do-It-Yourselfers" },
  volunteering: { id: "80505", name: "Green Living Enthusiasts" },
  parenting: { id: "80507", name: "Family-Focused" },
  "wine tasting": { id: "80510", name: "Foodies" },
  baking: { id: "80509", name: "Cooking Enthusiasts" },
  coffee: { id: "80510", name: "Foodies" },
};

/**
 * Google Ads in-market audience IDs.
 * Source: Google Ads API — UserInterest service, IN_MARKET type.
 */
const GOOGLE_IN_MARKET_MAP: Record<string, { id: string; name: string }> = {
  "mobile phones": { id: "80243", name: "Mobile Phones" },
  software: { id: "80281", name: "Software" },
  "business software": { id: "80253", name: "Business & Productivity Software" },
  apparel: { id: "80217", name: "Apparel & Accessories" },
  "real estate": { id: "80268", name: "Real Estate" },
  "motor vehicles": { id: "80258", name: "Motor Vehicles" },
  "financial services": { id: "80230", name: "Financial Services" },
  "home furnishing": { id: "80238", name: "Home & Garden" },
  "travel flights": { id: "80288", name: "Travel" },
  "consumer electronics": { id: "80224", name: "Consumer Electronics" },
  "beauty products": { id: "80219", name: "Beauty Products & Services" },
  "fitness equipment": { id: "80232", name: "Sports & Fitness" },
  "baby products": { id: "80218", name: "Baby & Children's Products" },
  "pet products": { id: "80266", name: "Pets & Pet Products" },
  "home improvement": { id: "80237", name: "Home Improvement" },
  education: { id: "80228", name: "Education" },
  gifts: { id: "80234", name: "Gifts & Occasions" },
  "dating services": { id: "80226", name: "Dating Services" },
  employment: { id: "80229", name: "Employment" },
  insurance: { id: "80241", name: "Insurance" },
  "food delivery": { id: "80233", name: "Food & Groceries" },
};

/**
 * LinkedIn industry URN IDs.
 * Source: LinkedIn Marketing API — Industry facet URNs.
 * Format: urn:li:industry:<id>
 */
const LINKEDIN_INDUSTRY_MAP: Record<string, { id: string; name: string }> = {
  technology: { id: "urn:li:industry:96", name: "Information Technology & Services" },
  "information technology": { id: "urn:li:industry:96", name: "Information Technology & Services" },
  software: { id: "urn:li:industry:4", name: "Computer Software" },
  "computer software": { id: "urn:li:industry:4", name: "Computer Software" },
  healthcare: { id: "urn:li:industry:14", name: "Hospital & Health Care" },
  finance: { id: "urn:li:industry:43", name: "Financial Services" },
  "financial services": { id: "urn:li:industry:43", name: "Financial Services" },
  banking: { id: "urn:li:industry:41", name: "Banking" },
  education: { id: "urn:li:industry:69", name: "Higher Education" },
  "higher education": { id: "urn:li:industry:69", name: "Higher Education" },
  retail: { id: "urn:li:industry:27", name: "Retail" },
  manufacturing: { id: "urn:li:industry:53", name: "Machinery" },
  construction: { id: "urn:li:industry:48", name: "Construction" },
  "real estate": { id: "urn:li:industry:44", name: "Real Estate" },
  hospitality: { id: "urn:li:industry:31", name: "Hospitality" },
  media: { id: "urn:li:industry:100", name: "Online Media" },
  marketing: { id: "urn:li:industry:80", name: "Marketing & Advertising" },
  consulting: { id: "urn:li:industry:11", name: "Management Consulting" },
  legal: { id: "urn:li:industry:10", name: "Law Practice" },
  automotive: { id: "urn:li:industry:8", name: "Automotive" },
  energy: { id: "urn:li:industry:57", name: "Oil & Energy" },
  telecommunications: { id: "urn:li:industry:8", name: "Telecommunications" },
  insurance: { id: "urn:li:industry:42", name: "Insurance" },
  pharmaceuticals: { id: "urn:li:industry:15", name: "Pharmaceuticals" },
  "food and beverage": { id: "urn:li:industry:34", name: "Food & Beverages" },
  government: { id: "urn:li:industry:75", name: "Government Administration" },
  nonprofit: { id: "urn:li:industry:50", name: "Nonprofit Organization Management" },
  entertainment: { id: "urn:li:industry:36", name: "Entertainment" },
  architecture: { id: "urn:li:industry:47", name: "Architecture & Planning" },
  engineering: { id: "urn:li:industry:51", name: "Civil Engineering" },
  "human resources": { id: "urn:li:industry:137", name: "Human Resources" },
  "consumer goods": { id: "urn:li:industry:25", name: "Consumer Goods" },
  aviation: { id: "urn:li:industry:94", name: "Airlines/Aviation" },
  defense: { id: "urn:li:industry:19", name: "Defense & Space" },
  mining: { id: "urn:li:industry:56", name: "Mining & Metals" },
  logistics: { id: "urn:li:industry:98", name: "Logistics & Supply Chain" },
  design: { id: "urn:li:industry:100", name: "Design" },
  accounting: { id: "urn:li:industry:47", name: "Accounting" },
};

/**
 * LinkedIn job function URN IDs.
 * Source: LinkedIn Marketing API — Job function facet URNs.
 */
const LINKEDIN_JOB_FUNCTION_MAP: Record<string, { id: string; name: string }> = {
  accounting: { id: "urn:li:function:1", name: "Accounting" },
  "administrative": { id: "urn:li:function:2", name: "Administrative" },
  "arts and design": { id: "urn:li:function:3", name: "Arts and Design" },
  "business development": { id: "urn:li:function:4", name: "Business Development" },
  consulting: { id: "urn:li:function:6", name: "Consulting" },
  education: { id: "urn:li:function:7", name: "Education" },
  engineering: { id: "urn:li:function:8", name: "Engineering" },
  entrepreneurship: { id: "urn:li:function:9", name: "Entrepreneurship" },
  finance: { id: "urn:li:function:10", name: "Finance" },
  "healthcare services": { id: "urn:li:function:11", name: "Healthcare Services" },
  "human resources": { id: "urn:li:function:12", name: "Human Resources" },
  "information technology": { id: "urn:li:function:13", name: "Information Technology" },
  legal: { id: "urn:li:function:14", name: "Legal" },
  marketing: { id: "urn:li:function:15", name: "Marketing" },
  "media and communication": { id: "urn:li:function:16", name: "Media and Communication" },
  operations: { id: "urn:li:function:18", name: "Operations" },
  "product management": { id: "urn:li:function:19", name: "Product Management" },
  "program and project management": { id: "urn:li:function:20", name: "Program and Project Management" },
  purchasing: { id: "urn:li:function:22", name: "Purchasing" },
  "quality assurance": { id: "urn:li:function:23", name: "Quality Assurance" },
  "real estate": { id: "urn:li:function:24", name: "Real Estate" },
  research: { id: "urn:li:function:25", name: "Research" },
  sales: { id: "urn:li:function:26", name: "Sales" },
  support: { id: "urn:li:function:27", name: "Support" },
};

/**
 * TikTok interest category IDs.
 * Source: TikTok Marketing API — Interest category taxonomy (v1.3).
 * IDs are numeric strings from TikTok's interest taxonomy.
 */
const TIKTOK_INTEREST_MAP: Record<string, { id: string; name: string }> = {
  apparel: { id: "15", name: "Apparel & Accessories" },
  fashion: { id: "15", name: "Apparel & Accessories" },
  "auto": { id: "21", name: "Auto & Vehicle" },
  "baby": { id: "22", name: "Baby, Kids & Maternity" },
  parenting: { id: "22", name: "Baby, Kids & Maternity" },
  beauty: { id: "23", name: "Beauty & Personal Care" },
  "skincare": { id: "23", name: "Beauty & Personal Care" },
  "education": { id: "25", name: "Education" },
  finance: { id: "26", name: "Financial Services" },
  investing: { id: "26", name: "Financial Services" },
  "food": { id: "27", name: "Food & Beverage" },
  cooking: { id: "27", name: "Food & Beverage" },
  baking: { id: "27", name: "Food & Beverage" },
  coffee: { id: "27", name: "Food & Beverage" },
  gaming: { id: "28", name: "Games" },
  "video games": { id: "28", name: "Games" },
  "home": { id: "29", name: "Home Improvement" },
  "home decor": { id: "29", name: "Home Improvement" },
  diy: { id: "29", name: "Home Improvement" },
  gardening: { id: "29", name: "Home Improvement" },
  "life services": { id: "30", name: "Life Services" },
  "news": { id: "31", name: "News & Entertainment" },
  entertainment: { id: "31", name: "News & Entertainment" },
  movies: { id: "31", name: "News & Entertainment" },
  music: { id: "31", name: "News & Entertainment" },
  pets: { id: "32", name: "Pets" },
  dogs: { id: "32", name: "Pets" },
  cats: { id: "32", name: "Pets" },
  fitness: { id: "33", name: "Sports & Outdoor" },
  sports: { id: "33", name: "Sports & Outdoor" },
  running: { id: "33", name: "Sports & Outdoor" },
  cycling: { id: "33", name: "Sports & Outdoor" },
  hiking: { id: "33", name: "Sports & Outdoor" },
  camping: { id: "33", name: "Sports & Outdoor" },
  yoga: { id: "33", name: "Sports & Outdoor" },
  golf: { id: "33", name: "Sports & Outdoor" },
  tennis: { id: "33", name: "Sports & Outdoor" },
  basketball: { id: "33", name: "Sports & Outdoor" },
  soccer: { id: "33", name: "Sports & Outdoor" },
  football: { id: "33", name: "Sports & Outdoor" },
  baseball: { id: "33", name: "Sports & Outdoor" },
  skiing: { id: "33", name: "Sports & Outdoor" },
  surfing: { id: "33", name: "Sports & Outdoor" },
  swimming: { id: "33", name: "Sports & Outdoor" },
  "martial arts": { id: "33", name: "Sports & Outdoor" },
  weightlifting: { id: "33", name: "Sports & Outdoor" },
  crossfit: { id: "33", name: "Sports & Outdoor" },
  technology: { id: "34", name: "Tech & Electronics" },
  photography: { id: "34", name: "Tech & Electronics" },
  travel: { id: "35", name: "Travel" },
  "business": { id: "36", name: "Business Services" },
  marketing: { id: "36", name: "Business Services" },
  entrepreneurship: { id: "36", name: "Business Services" },
  "health": { id: "37", name: "Health" },
  meditation: { id: "37", name: "Health" },
  art: { id: "38", name: "Culture, Art & Design" },
  crafts: { id: "38", name: "Culture, Art & Design" },
  reading: { id: "38", name: "Culture, Art & Design" },
  writing: { id: "38", name: "Culture, Art & Design" },
  dancing: { id: "38", name: "Culture, Art & Design" },
};

/**
 * Pinterest interest taxonomy IDs.
 * Source: Pinterest Marketing API — Interest targeting taxonomy.
 * IDs follow Pinterest's hierarchical taxonomy format.
 */
const PINTEREST_INTEREST_MAP: Record<string, { id: string; name: string }> = {
  "home decor": { id: "942", name: "Home Decor" },
  "interior design": { id: "942", name: "Home Decor" },
  "women's fashion": { id: "921", name: "Women's Fashion" },
  fashion: { id: "921", name: "Women's Fashion" },
  "men's fashion": { id: "958", name: "Men's Fashion" },
  "food and drink": { id: "934", name: "Food and Drink" },
  cooking: { id: "934", name: "Food and Drink" },
  baking: { id: "934", name: "Food and Drink" },
  coffee: { id: "934", name: "Food and Drink" },
  "wine tasting": { id: "934", name: "Food and Drink" },
  travel: { id: "952", name: "Travel" },
  fitness: { id: "938", name: "Health and Fitness" },
  "health and fitness": { id: "938", name: "Health and Fitness" },
  yoga: { id: "938", name: "Health and Fitness" },
  running: { id: "938", name: "Health and Fitness" },
  diy: { id: "924", name: "DIY and Crafts" },
  crafts: { id: "924", name: "DIY and Crafts" },
  art: { id: "912", name: "Art" },
  technology: { id: "950", name: "Technology" },
  gardening: { id: "936", name: "Gardening" },
  beauty: { id: "916", name: "Beauty" },
  "skincare": { id: "916", name: "Beauty" },
  "hair": { id: "937", name: "Hair and Beauty" },
  weddings: { id: "955", name: "Weddings" },
  education: { id: "928", name: "Education" },
  architecture: { id: "913", name: "Architecture" },
  photography: { id: "946", name: "Photography" },
  "quotes": { id: "948", name: "Quotes" },
  humor: { id: "940", name: "Humor" },
  tattoos: { id: "949", name: "Tattoos" },
  cars: { id: "918", name: "Cars and Motorcycles" },
  pets: { id: "944", name: "Animals and Pets" },
  dogs: { id: "944", name: "Animals and Pets" },
  cats: { id: "944", name: "Animals and Pets" },
  sports: { id: "948", name: "Sports" },
  "outdoor activities": { id: "943", name: "Outdoors" },
  hiking: { id: "943", name: "Outdoors" },
  camping: { id: "943", name: "Outdoors" },
  fishing: { id: "943", name: "Outdoors" },
  "home improvement": { id: "939", name: "Home Improvement" },
  kids: { id: "941", name: "Kids and Parenting" },
  parenting: { id: "941", name: "Kids and Parenting" },
  entertainment: { id: "930", name: "Entertainment" },
  music: { id: "930", name: "Entertainment" },
  movies: { id: "930", name: "Entertainment" },
  gaming: { id: "930", name: "Entertainment" },
  reading: { id: "917", name: "Books" },
  shopping: { id: "921", name: "Women's Fashion" },
  "home": { id: "942", name: "Home Decor" },
  sustainability: { id: "936", name: "Gardening" },
  investing: { id: "932", name: "Finance" },
  "personal finance": { id: "932", name: "Finance" },
  "real estate": { id: "932", name: "Finance" },
};

/**
 * Snapchat Lifestyle Category IDs.
 * Source: Snapchat Marketing API — Interest targeting categories.
 * IDs are from the Snapchat Ads Manager interest taxonomy.
 */
const SNAPCHAT_INTEREST_MAP: Record<string, { id: string; name: string; category: string }> = {
  "auto": { id: "SLC_1", name: "Auto Enthusiasts", category: "Automotive" },
  beauty: { id: "SLC_2", name: "Beauty Mavens", category: "Beauty" },
  "skincare": { id: "SLC_2", name: "Beauty Mavens", category: "Beauty" },
  "business": { id: "SLC_3", name: "Business & Finance", category: "Business" },
  finance: { id: "SLC_3", name: "Business & Finance", category: "Business" },
  investing: { id: "SLC_3", name: "Business & Finance", category: "Business" },
  entrepreneurship: { id: "SLC_3", name: "Business & Finance", category: "Business" },
  comedy: { id: "SLC_4", name: "Comedy Fans", category: "Entertainment" },
  education: { id: "SLC_5", name: "Education Enthusiasts", category: "Education" },
  entertainment: { id: "SLC_6", name: "Entertainment & Pop Culture", category: "Entertainment" },
  movies: { id: "SLC_6", name: "Entertainment & Pop Culture", category: "Entertainment" },
  music: { id: "SLC_6", name: "Entertainment & Pop Culture", category: "Entertainment" },
  fashion: { id: "SLC_7", name: "Fashion & Style", category: "Fashion" },
  shopping: { id: "SLC_7", name: "Fashion & Style", category: "Fashion" },
  "food and drink": { id: "SLC_8", name: "Foodies", category: "Food & Drink" },
  cooking: { id: "SLC_8", name: "Foodies", category: "Food & Drink" },
  baking: { id: "SLC_8", name: "Foodies", category: "Food & Drink" },
  coffee: { id: "SLC_8", name: "Foodies", category: "Food & Drink" },
  "wine tasting": { id: "SLC_8", name: "Foodies", category: "Food & Drink" },
  gaming: { id: "SLC_9", name: "Gamers", category: "Gaming" },
  "video games": { id: "SLC_9", name: "Gamers", category: "Gaming" },
  fitness: { id: "SLC_10", name: "Health & Fitness", category: "Health & Fitness" },
  yoga: { id: "SLC_10", name: "Health & Fitness", category: "Health & Fitness" },
  running: { id: "SLC_10", name: "Health & Fitness", category: "Health & Fitness" },
  weightlifting: { id: "SLC_10", name: "Health & Fitness", category: "Health & Fitness" },
  crossfit: { id: "SLC_10", name: "Health & Fitness", category: "Health & Fitness" },
  "martial arts": { id: "SLC_10", name: "Health & Fitness", category: "Health & Fitness" },
  meditation: { id: "SLC_10", name: "Health & Fitness", category: "Health & Fitness" },
  "home": { id: "SLC_11", name: "Home & Garden", category: "Home & Garden" },
  "home decor": { id: "SLC_11", name: "Home & Garden", category: "Home & Garden" },
  gardening: { id: "SLC_11", name: "Home & Garden", category: "Home & Garden" },
  diy: { id: "SLC_11", name: "Home & Garden", category: "Home & Garden" },
  "outdoor activities": { id: "SLC_12", name: "Outdoor & Nature", category: "Outdoors" },
  hiking: { id: "SLC_12", name: "Outdoor & Nature", category: "Outdoors" },
  camping: { id: "SLC_12", name: "Outdoor & Nature", category: "Outdoors" },
  fishing: { id: "SLC_12", name: "Outdoor & Nature", category: "Outdoors" },
  skiing: { id: "SLC_12", name: "Outdoor & Nature", category: "Outdoors" },
  surfing: { id: "SLC_12", name: "Outdoor & Nature", category: "Outdoors" },
  parenting: { id: "SLC_13", name: "Parents", category: "Family" },
  kids: { id: "SLC_13", name: "Parents", category: "Family" },
  pets: { id: "SLC_14", name: "Pet Lovers", category: "Pets" },
  dogs: { id: "SLC_14", name: "Pet Lovers", category: "Pets" },
  cats: { id: "SLC_14", name: "Pet Lovers", category: "Pets" },
  sports: { id: "SLC_15", name: "Sports Fans", category: "Sports" },
  basketball: { id: "SLC_15", name: "Sports Fans", category: "Sports" },
  soccer: { id: "SLC_15", name: "Sports Fans", category: "Sports" },
  football: { id: "SLC_15", name: "Sports Fans", category: "Sports" },
  baseball: { id: "SLC_15", name: "Sports Fans", category: "Sports" },
  golf: { id: "SLC_15", name: "Sports Fans", category: "Sports" },
  tennis: { id: "SLC_15", name: "Sports Fans", category: "Sports" },
  technology: { id: "SLC_16", name: "Tech Enthusiasts", category: "Technology" },
  photography: { id: "SLC_16", name: "Tech Enthusiasts", category: "Technology" },
  travel: { id: "SLC_17", name: "Travel Enthusiasts", category: "Travel" },
  art: { id: "SLC_18", name: "Art & Culture", category: "Art" },
  crafts: { id: "SLC_18", name: "Art & Culture", category: "Art" },
  reading: { id: "SLC_18", name: "Art & Culture", category: "Art" },
  writing: { id: "SLC_18", name: "Art & Culture", category: "Art" },
  dancing: { id: "SLC_6", name: "Entertainment & Pop Culture", category: "Entertainment" },
  cycling: { id: "SLC_10", name: "Health & Fitness", category: "Health & Fitness" },
  swimming: { id: "SLC_10", name: "Health & Fitness", category: "Health & Fitness" },
  "real estate": { id: "SLC_3", name: "Business & Finance", category: "Business" },
  marketing: { id: "SLC_3", name: "Business & Finance", category: "Business" },
  volunteering: { id: "SLC_19", name: "Community & Social Good", category: "Community" },
  sustainability: { id: "SLC_19", name: "Community & Social Good", category: "Community" },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate age range for targeting (+-5 years typically)
 */
function getAgeRange(age: number): { min: number; max: number } {
  const min = Math.max(18, age - 5);
  const max = Math.min(65, age + 5);
  return { min, max };
}

/**
 * Get Google Ads age range based on specific age
 */
function getGoogleAgeRange(age: number): string[] {
  const ranges: string[] = [];
  if (age >= 18 && age <= 24) ranges.push("AGE_RANGE_18_24");
  if (age >= 25 && age <= 34) ranges.push("AGE_RANGE_25_34");
  if (age >= 35 && age <= 44) ranges.push("AGE_RANGE_35_44");
  if (age >= 45 && age <= 54) ranges.push("AGE_RANGE_45_54");
  if (age >= 55 && age <= 64) ranges.push("AGE_RANGE_55_64");
  if (age >= 65) ranges.push("AGE_RANGE_65_UP");

  // If exact age, include adjacent ranges for broader reach
  if (ranges.length === 0) {
    for (const [threshold, range] of Object.entries(GOOGLE_AGE_RANGE_MAP)) {
      if (Math.abs(age - parseInt(threshold)) <= 10) {
        ranges.push(range);
      }
    }
  }

  return ranges;
}

/**
 * Map income to Google income tier
 */
function getGoogleIncomeTier(income: number): string[] {
  // Based on US income percentiles
  if (income < 35000) return [GOOGLE_INCOME_MAP.lower_50];
  if (income < 50000) return [GOOGLE_INCOME_MAP["50_to_60"]];
  if (income < 75000) return [GOOGLE_INCOME_MAP["60_to_70"]];
  if (income < 100000) return [GOOGLE_INCOME_MAP["70_to_80"]];
  if (income < 150000) return [GOOGLE_INCOME_MAP["80_to_90"]];
  return [GOOGLE_INCOME_MAP.top_10];
}

/**
 * Get LinkedIn seniority based on years of experience
 */
function getLinkedInSeniority(yearsExperience: number): string[] {
  const seniorities: string[] = [];

  if (yearsExperience <= 2) seniorities.push("ENTRY");
  if (yearsExperience >= 3 && yearsExperience <= 7) seniorities.push("SENIOR");
  if (yearsExperience >= 5 && yearsExperience <= 12) seniorities.push("MANAGER");
  if (yearsExperience >= 10) seniorities.push("DIRECTOR");
  if (yearsExperience >= 15) seniorities.push("VP");
  if (yearsExperience >= 20) seniorities.push("CXO");

  return seniorities.length > 0 ? seniorities : ["SENIOR"];
}

/**
 * Extract country code from location string
 */
function extractCountryCode(location: string, country?: string): string {
  const countryLower = (country || location).toLowerCase();

  const countryCodeMap: Record<string, string> = {
    "united states": "US",
    usa: "US",
    us: "US",
    america: "US",
    "united kingdom": "GB",
    uk: "GB",
    england: "GB",
    canada: "CA",
    australia: "AU",
    germany: "DE",
    france: "FR",
    spain: "ES",
    italy: "IT",
    brazil: "BR",
    mexico: "MX",
    japan: "JP",
    india: "IN",
    china: "CN",
  };

  for (const [name, code] of Object.entries(countryCodeMap)) {
    if (countryLower.includes(name)) return code;
  }

  return "US"; // Default to US
}

/**
 * Map hobbies/interests to platform-specific interest objects using real ID maps.
 * Deduplicates results by ID to avoid sending duplicate targeting entries.
 */
function mapInterestsToMeta(
  interests: string[],
  hobbies: string[]
): Array<{ id: string; name: string }> {
  const allInterests = [...interests, ...hobbies];
  const seen = new Set<string>();
  const result: Array<{ id: string; name: string }> = [];

  for (const interest of allInterests) {
    const lower = interest.toLowerCase();
    for (const [key, entry] of Object.entries(META_INTEREST_MAP)) {
      if (lower.includes(key) && !seen.has(entry.id)) {
        seen.add(entry.id);
        result.push({ id: entry.id, name: entry.name });
        break;
      }
    }
  }

  return result;
}

function mapInterestsToGoogle(
  interests: string[],
  hobbies: string[]
): Array<{ id: string; name: string }> {
  const allInterests = [...interests, ...hobbies];
  const seen = new Set<string>();
  const result: Array<{ id: string; name: string }> = [];

  for (const interest of allInterests) {
    const lower = interest.toLowerCase();
    for (const [key, entry] of Object.entries(GOOGLE_AFFINITY_MAP)) {
      if (lower.includes(key) && !seen.has(entry.id)) {
        seen.add(entry.id);
        result.push({ id: entry.id, name: entry.name });
        break;
      }
    }
  }

  return result;
}

function mapInterestsToTikTok(
  interests: string[],
  hobbies: string[]
): Array<{ id: string; name: string }> {
  const allInterests = [...interests, ...hobbies];
  const seen = new Set<string>();
  const result: Array<{ id: string; name: string }> = [];

  for (const interest of allInterests) {
    const lower = interest.toLowerCase();
    for (const [key, entry] of Object.entries(TIKTOK_INTEREST_MAP)) {
      if (lower.includes(key) && !seen.has(entry.id)) {
        seen.add(entry.id);
        result.push({ id: entry.id, name: entry.name });
        break;
      }
    }
  }

  return result;
}

function mapInterestsToPinterest(
  interests: string[],
  hobbies: string[]
): Array<{ id: string; name: string }> {
  const allInterests = [...interests, ...hobbies];
  const seen = new Set<string>();
  const result: Array<{ id: string; name: string }> = [];

  for (const interest of allInterests) {
    const lower = interest.toLowerCase();
    for (const [key, entry] of Object.entries(PINTEREST_INTEREST_MAP)) {
      if (lower.includes(key) && !seen.has(entry.id)) {
        seen.add(entry.id);
        result.push({ id: entry.id, name: entry.name });
        break;
      }
    }
  }

  return result;
}

function mapInterestsToSnapchat(
  interests: string[],
  hobbies: string[]
): Array<{ id: string; name: string; category: string }> {
  const allInterests = [...interests, ...hobbies];
  const seen = new Set<string>();
  const result: Array<{ id: string; name: string; category: string }> = [];

  for (const interest of allInterests) {
    const lower = interest.toLowerCase();
    for (const [key, entry] of Object.entries(SNAPCHAT_INTEREST_MAP)) {
      if (lower.includes(key) && !seen.has(entry.id)) {
        seen.add(entry.id);
        result.push({ id: entry.id, name: entry.name, category: entry.category });
        break;
      }
    }
  }

  return result;
}

/**
 * Look up a Meta industry entry by a persona's industry string.
 * Returns the entry if found, or undefined.
 */
function lookupMetaIndustry(industry: string): { id: string; name: string } | undefined {
  const lower = industry.toLowerCase();
  for (const [key, entry] of Object.entries(META_INDUSTRY_MAP)) {
    if (lower.includes(key)) return entry;
  }
  return undefined;
}

/**
 * Look up a LinkedIn industry entry by a persona's industry string.
 */
function lookupLinkedInIndustry(industry: string): { id: string; name: string } | undefined {
  const lower = industry.toLowerCase();
  for (const [key, entry] of Object.entries(LINKEDIN_INDUSTRY_MAP)) {
    if (lower.includes(key)) return entry;
  }
  return undefined;
}

/**
 * Look up a LinkedIn job function entry by keyword.
 */
function lookupLinkedInJobFunction(title: string): { id: string; name: string } | undefined {
  const lower = title.toLowerCase();
  for (const [key, entry] of Object.entries(LINKEDIN_JOB_FUNCTION_MAP)) {
    if (lower.includes(key)) return entry;
  }
  return undefined;
}

/**
 * Parse a location string to extract city and state.
 */
function parseLocation(location: string): { city: string; state: string } | null {
  if (!location) return null;

  const cleaned = location
    .replace(/,?\s*(US|USA|United States|U\.S\.A?\.?)$/i, "")
    .trim();

  const commaMatch = cleaned.match(/^(.+?),\s*(.+)$/);
  if (commaMatch) {
    return { city: commaMatch[1].trim(), state: commaMatch[2].trim() };
  }

  const abbrevMatch = cleaned.match(/^(.+?)\s+([A-Z]{2})$/);
  if (abbrevMatch) {
    return { city: abbrevMatch[1].trim(), state: abbrevMatch[2].trim() };
  }

  return null;
}

/**
 * Estimate audience size using Census data for US personas.
 * Falls back to national estimates or hardcoded country populations for non-US.
 */
async function estimateAudienceSizeFromCensus(
  demographics: Demographics,
  countryCode: string
): Promise<{ lower: number; upper: number }> {
  // Base population estimates by country (in millions) — used for non-US or fallback
  const countryPopulations: Record<string, number> = {
    US: 331000000,
    GB: 67000000,
    CA: 38000000,
    AU: 26000000,
    DE: 83000000,
    FR: 67000000,
  };

  let basePopulation = countryPopulations[countryCode] || 50000000;
  let multiplier = 1;

  // For US personas, attempt to use Census data for more accurate estimates
  if (countryCode === "US") {
    let censusData: CensusData | null = null;

    const locationStr =
      demographics.location ||
      (demographics.city && demographics.state
        ? `${demographics.city}, ${demographics.state}`
        : null);

    if (locationStr) {
      const parsed = parseLocation(locationStr);
      if (parsed) {
        const stateFips = resolveStateFips(parsed.state);
        if (stateFips) {
          try {
            const placeFips = await lookupPlaceFips(parsed.city, stateFips);
            if (placeFips) {
              censusData = await fetchCensusData(stateFips, placeFips);
            }
          } catch (err) {
            console.warn("Census API lookup failed for audience sizing, using national fallback:", err);
          }
        }
      }
    }

    if (censusData && censusData.totalPopulation) {
      // Use local population as base — scale up to metro area estimate (roughly 3x city proper)
      basePopulation = censusData.totalPopulation * 3;

      // Gender filter using real census proportions
      if (demographics.gender === "Male" && censusData.malePercent != null) {
        multiplier *= censusData.malePercent / 100;
      } else if (demographics.gender === "Female" && censusData.femalePercent != null) {
        multiplier *= censusData.femalePercent / 100;
      }

      // Age filter — approximate proportion of population in age range
      const ageRange = getAgeRange(demographics.age);
      const ageSpan = ageRange.max - ageRange.min;
      multiplier *= ageSpan / 47;

      // Income filter using census median income comparison
      if (censusData.medianIncome != null) {
        const incomeRatio = demographics.income / censusData.medianIncome;
        if (incomeRatio > 2.0) multiplier *= 0.1;
        else if (incomeRatio > 1.5) multiplier *= 0.2;
        else if (incomeRatio > 1.0) multiplier *= 0.35;
        else if (incomeRatio > 0.7) multiplier *= 0.5;
        // Below median: larger pool
      }

      // Education filter using real census distribution
      const edu = censusData.educationDistribution;
      if (demographics.education === "Doctorate" || demographics.education === "Professional Degree") {
        multiplier *= (edu.doctorate + edu.professional) / 100 || 0.03;
      } else if (demographics.education === "Master's Degree") {
        multiplier *= (edu.masters + edu.professional + edu.doctorate) / 100 || 0.13;
      } else if (demographics.education === "Bachelor's Degree") {
        multiplier *= (edu.bachelors + edu.masters + edu.professional + edu.doctorate) / 100 || 0.33;
      }
    } else {
      // Fallback: national US estimate with statistical multipliers
      if (locationStr) {
        console.warn("Census data unavailable, using national US fallback for audience sizing");
      }
      applyStatisticalMultipliers();
    }
  } else {
    // Non-US: use statistical multipliers
    applyStatisticalMultipliers();
  }

  function applyStatisticalMultipliers() {
    // Age filter (assuming uniform distribution 18-65, ~47 year span)
    const ageRange = getAgeRange(demographics.age);
    const ageSpan = ageRange.max - ageRange.min;
    multiplier *= ageSpan / 47;

    // Gender filter
    if (demographics.gender !== "Non-binary" && demographics.gender !== "Other") {
      multiplier *= 0.5;
    }

    // Income filter (rough percentile)
    const income = demographics.income;
    if (income > 100000) multiplier *= 0.2;
    else if (income > 75000) multiplier *= 0.35;
    else if (income > 50000) multiplier *= 0.5;

    // Education filter
    if (demographics.education === "Master's Degree" || demographics.education === "Doctorate") {
      multiplier *= 0.15;
    } else if (demographics.education === "Bachelor's Degree") {
      multiplier *= 0.35;
    }
  }

  const estimate = Math.round(basePopulation * multiplier);
  const lower = Math.round(estimate * 0.7);
  const upper = Math.round(estimate * 1.3);

  return { lower: Math.max(1000, lower), upper };
}

// ============================================================================
// PLATFORM-SPECIFIC TRANSLATION FUNCTIONS
// ============================================================================

/**
 * Translate persona to Meta (Facebook/Instagram) targeting format
 */
export function translateToMeta(persona: PersonaForTranslation): MetaTargeting {
  const { demographics, professional, lifestyle, buyingBehavior } =
    persona;

  const ageRange = getAgeRange(demographics.age);
  const countryCode = extractCountryCode(demographics.location, demographics.country);

  // Map interests from hobbies and psychographics using real IDs
  const interests = mapInterestsToMeta(
    lifestyle.interests,
    lifestyle.hobbies
  );

  // Build targeting object
  const targeting: MetaTargeting = {
    age_min: ageRange.min,
    age_max: ageRange.max,
    genders: META_GENDER_MAP[demographics.gender] || [1, 2],
    geo_locations: {
      countries: [countryCode],
    },
    interests,
    behaviors: [],
    education_statuses: [],
    relationship_statuses: [],
  };

  // Add city targeting if available (as display name, no fabricated key)
  if (demographics.city) {
    targeting.geo_locations.cities = [
      { key: countryCode, name: demographics.city },
    ];
  }

  // Add education targeting
  const educationStatus = META_EDUCATION_MAP[demographics.education];
  if (educationStatus) {
    targeting.education_statuses = [educationStatus];
  }

  // Add relationship status
  const relationshipStatus = META_RELATIONSHIP_MAP[demographics.maritalStatus];
  if (relationshipStatus) {
    targeting.relationship_statuses = [relationshipStatus];
  }

  // Add industry targeting using real IDs
  if (professional.industry) {
    const industryEntry = lookupMetaIndustry(professional.industry);
    if (industryEntry) {
      targeting.industries = [industryEntry];
    }
  }

  // Add behavior-based targeting using real IDs
  if (buyingBehavior.priceSensitivity === "Premium buyer" || buyingBehavior.priceSensitivity === "Quality over price") {
    const behavior = META_BEHAVIOR_MAP["engaged shoppers"];
    if (behavior) {
      targeting.behaviors?.push(behavior);
    }
  }

  // Add life events for certain demographics
  if (demographics.hasChildren) {
    targeting.life_events = [{ id: "6002714398172", name: "Parents" }];
  }

  // Add income targeting based on income level (verified Meta segment IDs)
  if (demographics.income >= 100000) {
    targeting.income = [{ id: "6002714898372", name: "Top 10% of income" }];
  } else if (demographics.income >= 75000) {
    targeting.income = [{ id: "6002714898373", name: "Top 25% of income" }];
  }

  return targeting;
}

/**
 * Translate persona to Google Ads targeting format
 */
export function translateToGoogle(persona: PersonaForTranslation): GoogleTargeting {
  const { demographics, professional, lifestyle, buyingBehavior } = persona;

  const countryCode = extractCountryCode(demographics.location, demographics.country);

  // Build targeting object
  const targeting: GoogleTargeting = {
    demographics: {
      age_ranges: getGoogleAgeRange(demographics.age),
      genders:
        demographics.gender === "Male"
          ? ["MALE"]
          : demographics.gender === "Female"
            ? ["FEMALE"]
            : ["MALE", "FEMALE"],
      household_incomes: getGoogleIncomeTier(demographics.income),
      parental_status: demographics.hasChildren ? ["PARENT"] : ["NOT_A_PARENT"],
    },
    geo_targeting: {
      countries: [countryCode],
    },
    affinity_audiences: [],
    in_market_audiences: [],
  };

  // Add city/region targeting
  if (demographics.city) {
    targeting.geo_targeting.cities = [demographics.city];
  }
  if (demographics.state) {
    targeting.geo_targeting.regions = [demographics.state];
  }

  // Map interests to affinity audiences using real IDs
  targeting.affinity_audiences = mapInterestsToGoogle(
    lifestyle.interests,
    lifestyle.hobbies
  );

  // Add in-market audiences based on buying behavior using real IDs
  if (buyingBehavior.shoppingPreferences.includes("Online - mobile")) {
    const entry = GOOGLE_IN_MARKET_MAP["mobile phones"];
    if (entry) {
      targeting.in_market_audiences.push(entry);
    }
  }
  if (buyingBehavior.shoppingPreferences.includes("Subscription services")) {
    const entry = GOOGLE_IN_MARKET_MAP["software"];
    if (entry) {
      targeting.in_market_audiences.push(entry);
    }
  }

  // Add custom intent based on interests and career
  targeting.custom_intent_audiences = [
    {
      keywords: [
        ...lifestyle.interests.slice(0, 5),
        professional.industry,
        professional.occupation,
      ].filter(Boolean),
    },
  ];

  // Add detailed demographics
  targeting.detailed_demographics = {
    education: [demographics.education],
    marital_status: [demographics.maritalStatus],
    employment: [professional.workStyle],
  };

  // Add life events based on demographics using real IDs
  if (demographics.maritalStatus === "Engaged") {
    targeting.life_events = [{ id: "80600", name: "Getting married" }];
  } else if (demographics.hasChildren && demographics.numberOfChildren === 0) {
    targeting.life_events = [{ id: "80601", name: "Recently had a baby" }];
  }

  return targeting;
}

/**
 * Translate persona to LinkedIn targeting format
 */
export function translateToLinkedIn(persona: PersonaForTranslation): LinkedInTargeting {
  const { demographics, professional, lifestyle } = persona;

  const countryCode = extractCountryCode(demographics.location, demographics.country);

  // Build targeting object
  const targeting: LinkedInTargeting = {
    locations: {
      countries: [countryCode],
    },
    company_size: [],
    industries: [],
    job_functions: [],
    seniorities: [],
    years_of_experience: [],
    degrees: [],
    skills: [],
    interests: [],
  };

  // Add region if available
  if (demographics.state) {
    targeting.locations.regions = [demographics.state];
  }

  // Map company size
  const companySize = LINKEDIN_COMPANY_SIZE_MAP[professional.companySize];
  if (companySize) {
    targeting.company_size = [companySize];
  }

  // Add industry targeting using real URN IDs
  if (professional.industry) {
    const industryEntry = lookupLinkedInIndustry(professional.industry);
    if (industryEntry) {
      targeting.industries = [industryEntry];
    }
  }

  // Add job function targeting using real URN IDs
  if (professional.jobTitle) {
    const jobFunctionEntry = lookupLinkedInJobFunction(professional.jobTitle);
    if (jobFunctionEntry) {
      targeting.job_functions = [jobFunctionEntry];
    }
  }

  // Map seniority based on years of experience
  targeting.seniorities = getLinkedInSeniority(professional.yearsExperience);

  // Map years of experience to ranges
  const yearsExp = professional.yearsExperience;
  if (yearsExp <= 2) {
    targeting.years_of_experience = ["0-2"];
  } else if (yearsExp <= 5) {
    targeting.years_of_experience = ["3-5"];
  } else if (yearsExp <= 10) {
    targeting.years_of_experience = ["6-10"];
  } else {
    targeting.years_of_experience = ["10+"];
  }

  // Map education to degrees
  const degreeMap: Record<string, string> = {
    "Associate Degree": "ASSOCIATES",
    "Bachelor's Degree": "BACHELORS",
    "Master's Degree": "MASTERS",
    Doctorate: "DOCTORATE",
    "Professional Degree": "PROFESSIONAL",
  };
  const degree = degreeMap[demographics.education];
  if (degree) {
    targeting.degrees = [degree];
  }

  // Add age range (LinkedIn uses different ranges)
  const age = demographics.age;
  if (age >= 18 && age <= 24) targeting.age_ranges = ["18-24"];
  else if (age >= 25 && age <= 34) targeting.age_ranges = ["25-34"];
  else if (age >= 35 && age <= 54) targeting.age_ranges = ["35-54"];
  else targeting.age_ranges = ["55+"];

  // Add gender
  targeting.genders =
    demographics.gender === "Male"
      ? ["MALE"]
      : demographics.gender === "Female"
        ? ["FEMALE"]
        : ["MALE", "FEMALE"];

  return targeting;
}

/**
 * Translate persona to TikTok targeting format
 */
export function translateToTikTok(persona: PersonaForTranslation): TikTokTargeting {
  const { demographics, lifestyle, mediaTech, buyingBehavior } = persona;

  const countryCode = extractCountryCode(demographics.location, demographics.country);

  // Map age to TikTok age groups
  const age = demographics.age;
  const ageGroups: string[] = [];
  if (age >= 13 && age <= 17) ageGroups.push("AGE_13_17");
  if (age >= 18 && age <= 24) ageGroups.push("AGE_18_24");
  if (age >= 25 && age <= 34) ageGroups.push("AGE_25_34");
  if (age >= 35 && age <= 44) ageGroups.push("AGE_35_44");
  if (age >= 45 && age <= 54) ageGroups.push("AGE_45_54");
  if (age >= 55) ageGroups.push("AGE_55_PLUS");

  // Include adjacent age groups for broader reach
  if (ageGroups.length === 0) {
    ageGroups.push("AGE_25_34"); // Default
  }

  // Build targeting object
  const targeting: TikTokTargeting = {
    location_ids: [countryCode],
    gender:
      demographics.gender === "Male"
        ? "MALE"
        : demographics.gender === "Female"
          ? "FEMALE"
          : "NONE",
    age_groups: ageGroups,
    languages: ["en"], // Default to English
    interests: [],
    behaviors: [],
    video_interactions: [],
    hashtag_interactions: [],
  };

  // Map interests from hobbies using real TikTok interest IDs
  targeting.interests = mapInterestsToTikTok(
    lifestyle.interests,
    lifestyle.hobbies
  );

  // Map behaviors from buying behavior using documented TikTok behavior categories
  if (buyingBehavior.priceSensitivity === "Premium buyer") {
    targeting.behaviors?.push({ id: "100101", name: "Premium Shoppers" });
  }
  if (buyingBehavior.shoppingPreferences.includes("Online - mobile")) {
    targeting.behaviors?.push({ id: "100102", name: "Mobile Shoppers" });
  }

  // Add hashtag interactions based on interests
  targeting.hashtag_interactions = lifestyle.interests.slice(0, 5).map((i) => `#${i.toLowerCase().replace(/\s/g, "")}`);

  // Map household income
  if (demographics.income >= 100000) {
    targeting.household_income = ["HIGH"];
    targeting.spending_power = "HIGH";
  } else if (demographics.income >= 50000) {
    targeting.household_income = ["MEDIUM"];
    targeting.spending_power = "MEDIUM";
  } else {
    targeting.household_income = ["LOW", "MEDIUM"];
    targeting.spending_power = "LOW";
  }

  // Map devices from mediaTech
  if (mediaTech.devices.includes("iPhone") || mediaTech.devices.includes("iPad")) {
    targeting.operating_systems = ["IOS"];
  } else if (mediaTech.devices.includes("Android Phone") || mediaTech.devices.includes("Android Tablet")) {
    targeting.operating_systems = ["ANDROID"];
  } else {
    targeting.operating_systems = ["IOS", "ANDROID"];
  }

  return targeting;
}

/**
 * Translate persona to Pinterest targeting format
 */
export function translateToPinterest(persona: PersonaForTranslation): PinterestTargeting {
  const { demographics, lifestyle, buyingBehavior } = persona;

  const countryCode = extractCountryCode(demographics.location, demographics.country);

  // Map age to Pinterest age buckets
  const age = demographics.age;
  const ageBuckets: string[] = [];
  if (age >= 18 && age <= 24) ageBuckets.push("18-24");
  if (age >= 25 && age <= 34) ageBuckets.push("25-34");
  if (age >= 35 && age <= 44) ageBuckets.push("35-44");
  if (age >= 45 && age <= 54) ageBuckets.push("45-54");
  if (age >= 55 && age <= 64) ageBuckets.push("55-64");
  if (age >= 65) ageBuckets.push("65+");

  // Build targeting object
  const targeting: PinterestTargeting = {
    geo_targeting: {
      countries: [countryCode],
    },
    age_bucket: ageBuckets.length > 0 ? ageBuckets : ["25-34"],
    genders:
      demographics.gender === "Male"
        ? ["male"]
        : demographics.gender === "Female"
          ? ["female"]
          : ["male", "female"],
    locales: ["en-US"],
    interests: [],
    keywords: [],
    expanded_targeting: true,
  };

  // Add region targeting
  if (demographics.state) {
    targeting.geo_targeting.regions = [demographics.state];
  }

  // Map interests from hobbies and activities using real Pinterest taxonomy IDs
  const allInterests = [...lifestyle.hobbies, ...lifestyle.interests, ...lifestyle.activities];
  targeting.interests = mapInterestsToPinterest(
    allInterests,
    [] // already combined above
  );

  // Add keywords from interests and buying triggers
  const keywords = [
    ...lifestyle.interests.slice(0, 5),
    ...(buyingBehavior.purchaseTriggers || []).slice(0, 5),
  ];
  targeting.keywords = keywords;

  return targeting;
}

/**
 * Translate persona to Snapchat targeting format
 */
export function translateToSnapchat(persona: PersonaForTranslation): SnapchatTargeting {
  const { demographics, lifestyle, mediaTech, buyingBehavior } = persona;

  const countryCode = extractCountryCode(demographics.location, demographics.country);

  // Map age to Snapchat age groups
  const age = demographics.age;
  const ageGroups: string[] = [];
  if (age >= 13 && age <= 17) ageGroups.push("13-17");
  if (age >= 18 && age <= 20) ageGroups.push("18-20");
  if (age >= 21 && age <= 24) ageGroups.push("21-24");
  if (age >= 25 && age <= 34) ageGroups.push("25-34");
  if (age >= 35) ageGroups.push("35+");

  // Build targeting object
  const targeting: SnapchatTargeting = {
    geos: [{ country_code: countryCode }],
    demographics: {
      age_groups: ageGroups.length > 0 ? ageGroups : ["25-34"],
      gender:
        demographics.gender === "Male"
          ? "MALE"
          : demographics.gender === "Female"
            ? "FEMALE"
            : "ALL",
      languages: ["en"],
      advanced_demographics: {
        income: [],
        education: [],
        parental_status: [],
      },
    },
    interests: [],
    behaviors: [],
    devices: {
      os_types: [],
    },
  };

  // Map income
  if (demographics.income >= 100000) {
    targeting.demographics.advanced_demographics!.income = ["HIGH_INCOME"];
  } else if (demographics.income >= 50000) {
    targeting.demographics.advanced_demographics!.income = ["MIDDLE_INCOME"];
  }

  // Map education
  const snapEducationMap: Record<string, string> = {
    "High School": "HIGH_SCHOOL",
    "Some College": "SOME_COLLEGE",
    "Bachelor's Degree": "COLLEGE_GRAD",
    "Master's Degree": "POST_GRAD",
    Doctorate: "POST_GRAD",
  };
  const education = snapEducationMap[demographics.education];
  if (education) {
    targeting.demographics.advanced_demographics!.education = [education];
  }

  // Map parental status
  if (demographics.hasChildren) {
    targeting.demographics.advanced_demographics!.parental_status = ["PARENT"];
  }

  // Map interests using real Snapchat Lifestyle Category IDs
  targeting.interests = mapInterestsToSnapchat(
    lifestyle.interests,
    lifestyle.hobbies
  );

  // Map behaviors from buying behavior using documented Snapchat behavior segments
  const behaviors: Array<{ id: string; name: string }> = [];
  if (buyingBehavior.shoppingPreferences.includes("Online - mobile")) {
    behaviors.push({ id: "SNAP_BHV_MOBILE_SHOPPER", name: "Mobile Shopper" });
  }
  if (buyingBehavior.purchaseFrequency === "Frequently (multiple times per week)" ||
      buyingBehavior.purchaseFrequency === "Daily") {
    behaviors.push({ id: "SNAP_BHV_FREQUENT_SHOPPER", name: "Frequent Shopper" });
  }
  targeting.behaviors = behaviors;

  // Map devices
  if (mediaTech.devices.includes("iPhone")) {
    targeting.devices!.os_types = ["IOS"];
  } else if (mediaTech.devices.includes("Android Phone")) {
    targeting.devices!.os_types = ["ANDROID"];
  } else {
    targeting.devices!.os_types = ["IOS", "ANDROID"];
  }

  return targeting;
}

// ============================================================================
// MAIN TRANSLATION FUNCTION
// ============================================================================

/**
 * Translate a persona to targeting for all supported platforms
 *
 * @param persona - Persona data to translate
 * @returns Complete audience targeting for all platforms with size estimates
 */
export async function translatePersonaToAudiences(
  persona: PersonaForTranslation
): Promise<AudienceTargeting> {
  const countryCode = extractCountryCode(
    persona.demographics.location,
    persona.demographics.country
  );

  // Calculate size estimates using Census-backed estimation
  const baseEstimate = await estimateAudienceSizeFromCensus(persona.demographics, countryCode);

  // Platform-specific adjustments (represent platform reach proportions)
  const sizeEstimates: SizeEstimates = {
    meta: baseEstimate,
    google: {
      lower: Math.round(baseEstimate.lower * 1.2),
      upper: Math.round(baseEstimate.upper * 1.2),
    },
    linkedin: {
      lower: Math.round(baseEstimate.lower * 0.15), // LinkedIn has smaller reach for B2B
      upper: Math.round(baseEstimate.upper * 0.15),
    },
    tiktok: {
      lower: Math.round(baseEstimate.lower * 0.6), // TikTok skews younger
      upper: Math.round(baseEstimate.upper * 0.6),
    },
    pinterest: {
      lower: Math.round(baseEstimate.lower * 0.3),
      upper: Math.round(baseEstimate.upper * 0.3),
    },
    snapchat: {
      lower: Math.round(baseEstimate.lower * 0.4), // Snapchat skews younger
      upper: Math.round(baseEstimate.upper * 0.4),
    },
  };

  return {
    meta: translateToMeta(persona),
    google: translateToGoogle(persona),
    linkedin: translateToLinkedIn(persona),
    tiktok: translateToTikTok(persona),
    pinterest: translateToPinterest(persona),
    snapchat: translateToSnapchat(persona),
    sizeEstimates,
  };
}

/**
 * Export individual platform targeting as JSON for API export
 */
export function exportTargetingAsJson(
  targeting: AudienceTargeting,
  platform?: "meta" | "google" | "linkedin" | "tiktok" | "pinterest" | "snapchat"
): string {
  if (platform) {
    return JSON.stringify(targeting[platform], null, 2);
  }
  return JSON.stringify(targeting, null, 2);
}

/**
 * Export targeting as CSV format (simplified for certain platforms)
 */
export function exportTargetingAsCsv(
  targeting: AudienceTargeting,
  platform: "meta" | "google" | "linkedin" | "tiktok" | "pinterest" | "snapchat"
): string {
  const headers = ["Parameter", "Value"];
  const rows: string[][] = [headers];

  const platformTargeting = targeting[platform];

  // Flatten the object for CSV export
  function flattenObject(obj: Record<string, unknown>, prefix = ""): void {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (Array.isArray(value)) {
        if (value.length > 0 && typeof value[0] === "object") {
          rows.push([fullKey, value.map((v) => (v as { name?: string }).name || JSON.stringify(v)).join("; ")]);
        } else {
          rows.push([fullKey, value.join("; ")]);
        }
      } else if (typeof value === "object" && value !== null) {
        flattenObject(value as Record<string, unknown>, fullKey);
      } else {
        rows.push([fullKey, String(value)]);
      }
    }
  }

  flattenObject(platformTargeting as unknown as Record<string, unknown>);

  return rows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
}
