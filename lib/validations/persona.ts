/**
 * Zod validation schemas for persona data
 * Used for form validation and API input validation
 *
 * IMPORTANT: All demographic and profile fields require SPECIFIC values,
 * not ranges. For example: age must be a specific number (32), not a range ("25-35").
 * This ensures personas are concrete, actionable consumer archetypes.
 */

import { z } from "zod";

// Gender options
export const genders = [
  "Male",
  "Female",
  "Non-binary",
  "Other",
] as const;

// Education level options
export const educationLevels = [
  "High School",
  "Some College",
  "Associate Degree",
  "Bachelor's Degree",
  "Master's Degree",
  "Doctorate",
  "Professional Degree",
  "Trade/Vocational",
  "Other",
] as const;

// Marital status options
export const maritalStatuses = [
  "Single",
  "In a relationship",
  "Engaged",
  "Married",
  "Divorced",
  "Widowed",
  "Separated",
] as const;

// Company size options
export const companySizes = [
  "Self-employed",
  "1-10 employees",
  "11-50 employees",
  "51-200 employees",
  "201-500 employees",
  "501-1000 employees",
  "1001-5000 employees",
  "5000+ employees",
] as const;

// Work style options
export const workStyles = [
  "Remote",
  "Hybrid",
  "On-site",
  "Freelance",
  "Entrepreneur",
] as const;

// Personality trait options (Big Five and common traits)
export const personalityTraits = [
  "Introverted",
  "Extroverted",
  "Analytical",
  "Creative",
  "Ambitious",
  "Cautious",
  "Adventurous",
  "Practical",
  "Idealistic",
  "Spontaneous",
  "Organized",
  "Empathetic",
  "Competitive",
  "Collaborative",
  "Independent",
  "Detail-oriented",
  "Big-picture thinker",
  "Risk-taker",
  "Risk-averse",
  "Optimistic",
  "Pragmatic",
] as const;

// Fitness level options
export const fitnessLevels = [
  "Sedentary",
  "Lightly active",
  "Moderately active",
  "Very active",
  "Extremely active",
] as const;

// Diet options
export const dietTypes = [
  "No restrictions",
  "Vegetarian",
  "Vegan",
  "Pescatarian",
  "Keto",
  "Paleo",
  "Gluten-free",
  "Halal",
  "Kosher",
  "Low-carb",
  "Organic-focused",
  "Other",
] as const;

// Social platform options
export const socialPlatforms = [
  "Instagram",
  "Facebook",
  "TikTok",
  "Twitter/X",
  "LinkedIn",
  "YouTube",
  "Pinterest",
  "Snapchat",
  "Reddit",
  "Discord",
  "Threads",
  "BeReal",
  "WhatsApp",
  "Telegram",
] as const;

// Device options
export const deviceTypes = [
  "iPhone",
  "Android Phone",
  "iPad",
  "Android Tablet",
  "Windows PC",
  "Mac",
  "Chromebook",
  "Smart TV",
  "Gaming Console",
  "Smart Watch",
  "Smart Home Devices",
  "VR Headset",
] as const;

// Screen time options
export const screenTimeRanges = [
  "Less than 2 hours",
  "2-4 hours",
  "4-6 hours",
  "6-8 hours",
  "8-10 hours",
  "More than 10 hours",
] as const;

// Content preference options
export const contentPreferences = [
  "Short-form video",
  "Long-form video",
  "Podcasts",
  "Articles/Blogs",
  "Social media posts",
  "Live streams",
  "Newsletters",
  "Books/E-books",
  "Interactive content",
  "Infographics",
  "User-generated content",
] as const;

// Price sensitivity options
export const priceSensitivities = [
  "Very price-sensitive",
  "Somewhat price-sensitive",
  "Balanced",
  "Quality over price",
  "Premium buyer",
] as const;

// Brand loyalty options
export const brandLoyaltyLevels = [
  "Not loyal - always shops around",
  "Somewhat loyal",
  "Moderately loyal",
  "Very loyal",
  "Extremely loyal - brand advocate",
] as const;

// Purchase frequency options
export const purchaseFrequencies = [
  "Rarely (few times a year)",
  "Occasionally (monthly)",
  "Regularly (weekly)",
  "Frequently (multiple times per week)",
  "Daily",
] as const;

// Shopping channel options
export const shoppingChannels = [
  "Online - desktop",
  "Online - mobile",
  "In-store",
  "Social commerce",
  "Marketplace (Amazon, eBay)",
  "Brand website",
  "Subscription services",
] as const;

// Research behavior options
export const researchBehaviors = [
  "Impulse buyer - minimal research",
  "Quick researcher - basic comparison",
  "Moderate researcher - reads reviews",
  "Thorough researcher - extensive comparison",
  "Expert researcher - deep analysis",
] as const;

// Decision factor options
export const decisionFactors = [
  "Price",
  "Quality",
  "Brand reputation",
  "Reviews/Ratings",
  "Recommendations",
  "Convenience",
  "Sustainability",
  "Features",
  "Design/Aesthetics",
  "Customer service",
  "Return policy",
  "Shipping speed",
  "Social proof",
  "Exclusivity",
  "Innovation",
] as const;

// Validation status options
export const validationStatuses = [
  "pending",
  "validated",
  "rejected",
  "needs_revision",
] as const;

// ============================================================================
// DEMOGRAPHICS SCHEMA
// All fields require SPECIFIC values, not ranges
// ============================================================================

export const demographicsSchema = z.object({
  // Age must be a specific number, not a range
  age: z
    .number()
    .int("Age must be a whole number")
    .min(13, "Age must be at least 13")
    .max(120, "Age must be realistic"),

  gender: z.enum(genders),

  // Location must be specific, not "urban areas"
  location: z
    .string()
    .min(1, "Location is required")
    .max(255, "Location must be 255 characters or less"),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z
    .string()
    .min(1, "Country is required")
    .max(100),

  education: z.enum(educationLevels),

  maritalStatus: z.enum(maritalStatuses),

  hasChildren: z.boolean(),

  // Specific number of children and household members
  numberOfChildren: z
    .number()
    .int()
    .min(0)
    .max(20)
    .optional(),
  householdSize: z
    .number()
    .int("Household size must be a whole number")
    .min(1, "Household size must be at least 1")
    .max(20, "Household size seems unrealistic"),

  // Income must be a specific number, not a range
  income: z
    .number()
    .min(0, "Income must be positive")
    .max(100000000, "Income must be realistic"),

  // Ethnicity is optional but should be specific
  ethnicity: z.string().max(100).optional(),
});

// ============================================================================
// PROFESSIONAL SCHEMA
// Career and work-related attributes with specific values
// ============================================================================

export const professionalSchema = z.object({
  // Specific job title, not a category
  jobTitle: z
    .string()
    .min(1, "Job title is required")
    .max(255, "Job title must be 255 characters or less"),

  // Specific occupation/role
  occupation: z
    .string()
    .min(1, "Occupation is required")
    .max(255),

  industry: z
    .string()
    .min(1, "Industry is required")
    .max(100),

  // Specific company name (can be fictional but representative)
  company: z.string().max(255).optional(),

  companySize: z.enum(companySizes),

  // Specific number of years, not a range
  yearsExperience: z
    .number()
    .int("Years of experience must be a whole number")
    .min(0, "Years of experience must be positive")
    .max(60, "Years of experience seems unrealistic"),

  workStyle: z.enum(workStyles),

  // Specific career goals
  careerGoals: z
    .array(z.string().min(1).max(255))
    .min(1, "At least one career goal is required")
    .max(5, "Maximum 5 career goals"),

  // Annual work hours (specific number)
  weeklyWorkHours: z
    .number()
    .int()
    .min(0)
    .max(168)
    .optional(),

  // Commute time in minutes (specific number)
  commuteMinutes: z
    .number()
    .int()
    .min(0)
    .max(300)
    .optional(),
});

// ============================================================================
// PSYCHOGRAPHICS SCHEMA
// Values, motivations, and psychological attributes
// ============================================================================

export const psychographicsSchema = z.object({
  // Core values (specific, not generic)
  values: z
    .array(z.string().min(1).max(100))
    .min(3, "At least 3 values are required")
    .max(7, "Maximum 7 values"),

  // Specific motivations
  motivations: z
    .array(z.string().min(1).max(255))
    .min(2, "At least 2 motivations are required")
    .max(5, "Maximum 5 motivations"),

  // Specific fears and concerns
  fears: z
    .array(z.string().min(1).max(255))
    .min(2, "At least 2 fears are required")
    .max(5, "Maximum 5 fears"),

  // Specific aspirations
  aspirations: z
    .array(z.string().min(1).max(255))
    .min(2, "At least 2 aspirations are required")
    .max(5, "Maximum 5 aspirations"),

  // Personality traits from predefined list
  personalityTraits: z
    .array(z.enum(personalityTraits))
    .min(3, "At least 3 personality traits are required")
    .max(7, "Maximum 7 personality traits"),

  // Specific attitudes and beliefs
  attitudes: z
    .array(z.string().min(1).max(255))
    .max(5, "Maximum 5 attitudes")
    .optional(),
});

// ============================================================================
// LIFESTYLE SCHEMA
// Hobbies, interests, and daily life patterns
// ============================================================================

export const lifestyleSchema = z.object({
  // Specific hobbies
  hobbies: z
    .array(z.string().min(1).max(100))
    .min(3, "At least 3 hobbies are required")
    .max(10, "Maximum 10 hobbies"),

  // Specific interests
  interests: z
    .array(z.string().min(1).max(100))
    .min(3, "At least 3 interests are required")
    .max(10, "Maximum 10 interests"),

  // Regular activities
  activities: z
    .array(z.string().min(1).max(100))
    .min(2, "At least 2 activities are required")
    .max(10, "Maximum 10 activities"),

  // Specific sports or fitness activities
  sports: z
    .array(z.string().min(1).max(100))
    .max(5, "Maximum 5 sports")
    .optional(),

  // Specific travel destinations or preferences
  travel: z
    .array(z.string().min(1).max(100))
    .max(5, "Maximum 5 travel preferences")
    .optional(),

  diet: z.enum(dietTypes),

  fitnessLevel: z.enum(fitnessLevels),

  // Typical wake time (specific, e.g., "6:30 AM")
  wakeTime: z.string().max(20).optional(),

  // Typical sleep time (specific, e.g., "10:30 PM")
  sleepTime: z.string().max(20).optional(),
});

// ============================================================================
// MEDIA & TECH SCHEMA
// Media consumption and technology preferences
// ============================================================================

export const mediaTechSchema = z.object({
  // Social platforms used (from predefined list)
  socialPlatforms: z
    .array(z.enum(socialPlatforms))
    .min(1, "At least one social platform is required")
    .max(10, "Maximum 10 social platforms"),

  // Primary social platform (most used)
  primaryPlatform: z.enum(socialPlatforms).optional(),

  // Specific news sources
  newsSources: z
    .array(z.string().min(1).max(100))
    .min(1, "At least one news source is required")
    .max(5, "Maximum 5 news sources"),

  // Specific podcasts or streaming services
  podcastsStreaming: z
    .array(z.string().min(1).max(100))
    .max(10, "Maximum 10 podcasts/streaming services")
    .optional(),

  // Devices owned (from predefined list)
  devices: z
    .array(z.enum(deviceTypes))
    .min(1, "At least one device is required")
    .max(10, "Maximum 10 devices"),

  // Primary device
  primaryDevice: z.enum(deviceTypes).optional(),

  // Content format preferences (from predefined list)
  contentPreferences: z
    .array(z.enum(contentPreferences))
    .min(1, "At least one content preference is required")
    .max(7, "Maximum 7 content preferences"),

  // Daily screen time
  screenTime: z.enum(screenTimeRanges),

  // Specific influencers or creators they follow
  influencersFollowed: z
    .array(z.string().min(1).max(100))
    .max(10, "Maximum 10 influencers")
    .optional(),
});

// ============================================================================
// BUYING BEHAVIOR SCHEMA
// Shopping habits and purchase patterns
// ============================================================================

export const buyingBehaviorSchema = z.object({
  // Shopping preferences (from predefined list)
  shoppingPreferences: z
    .array(z.enum(shoppingChannels))
    .min(1, "At least one shopping preference is required")
    .max(5, "Maximum 5 shopping preferences"),

  // Primary shopping channel
  primaryChannel: z.enum(shoppingChannels).optional(),

  priceSensitivity: z.enum(priceSensitivities),

  brandLoyalty: z.enum(brandLoyaltyLevels),

  // Decision factors when making purchases (from predefined list)
  decisionFactors: z
    .array(z.enum(decisionFactors))
    .min(3, "At least 3 decision factors are required")
    .max(7, "Maximum 7 decision factors"),

  purchaseFrequency: z.enum(purchaseFrequencies),

  // Preferred channels for this persona
  preferredChannels: z
    .array(z.string().min(1).max(100))
    .max(5, "Maximum 5 preferred channels")
    .optional(),

  researchBehavior: z.enum(researchBehaviors),

  // Specific brands they currently use
  currentBrands: z
    .array(z.string().min(1).max(100))
    .max(10, "Maximum 10 current brands")
    .optional(),

  // Average monthly spend in their category (specific number)
  averageMonthlySpend: z
    .number()
    .min(0)
    .max(1000000)
    .optional(),

  // Specific triggers that prompt purchases
  purchaseTriggers: z
    .array(z.string().min(1).max(255))
    .max(5, "Maximum 5 purchase triggers")
    .optional(),
});

// ============================================================================
// BELIEFS & ATTITUDES SCHEMA (Optional)
// Additional psychological attributes
// ============================================================================

export const beliefsAttitudesSchema = z.object({
  // Specific beliefs about the product category/industry
  categoryBeliefs: z
    .array(z.string().min(1).max(255))
    .max(5, "Maximum 5 category beliefs")
    .optional(),

  // Attitudes toward marketing/advertising
  advertisingAttitude: z.string().max(500).optional(),

  // Environmental/social consciousness level
  socialConsciousness: z.string().max(500).optional(),

  // Trust level in brands/institutions
  trustLevel: z.string().max(500).optional(),
}).optional();

// ============================================================================
// COMBINED PERSONA SCHEMA
// Full persona with all sections
// ============================================================================

export const personaSchema = z.object({
  // Core persona info
  name: z
    .string()
    .min(1, "Persona name is required")
    .max(100, "Persona name must be 100 characters or less"),

  photoPrompt: z.string().max(2000).optional(),
  photoUrl: z.string().url().max(500).optional().or(z.literal("")),

  // Narrative elements
  backstory: z
    .string()
    .min(50, "Backstory should be at least 50 characters")
    .max(5000, "Backstory must be 5000 characters or less")
    .optional(),

  quote: z
    .string()
    .max(500, "Quote must be 500 characters or less")
    .optional(),

  dayInLife: z
    .string()
    .max(5000, "Day in life must be 5000 characters or less")
    .optional(),

  // All the detailed sections
  demographics: demographicsSchema,
  professional: professionalSchema,
  psychographics: psychographicsSchema,
  lifestyle: lifestyleSchema,
  mediaTech: mediaTechSchema,
  buyingBehavior: buyingBehaviorSchema,
  beliefsAttitudes: beliefsAttitudesSchema,

  // Generation metadata
  generationModel: z.string().max(100).default("claude-haiku-4-5"),
  generationParams: z.record(z.string(), z.unknown()).optional(),

  // Validation
  validationStatus: z.enum(validationStatuses).default("pending"),
  validationNotes: z.string().max(2000).optional(),
});

// ============================================================================
// CREATE/UPDATE SCHEMAS
// For API operations
// ============================================================================

export const createPersonaSchema = personaSchema.extend({
  brandId: z.string().uuid("Invalid brand ID"),
  productId: z.string().uuid("Invalid product ID").optional().nullable(),
  intelligenceReportId: z.string().uuid("Invalid intelligence report ID").optional().nullable(),
});

export const updatePersonaSchema = personaSchema.partial().extend({
  // Name is required if provided
  name: z
    .string()
    .min(1, "Persona name is required")
    .max(100, "Persona name must be 100 characters or less")
    .optional(),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Demographics = z.infer<typeof demographicsSchema>;
export type Professional = z.infer<typeof professionalSchema>;
export type Psychographics = z.infer<typeof psychographicsSchema>;
export type Lifestyle = z.infer<typeof lifestyleSchema>;
export type MediaTech = z.infer<typeof mediaTechSchema>;
export type BuyingBehavior = z.infer<typeof buyingBehaviorSchema>;
export type BeliefsAttitudes = z.infer<typeof beliefsAttitudesSchema>;
export type PersonaInput = z.infer<typeof personaSchema>;
export type CreatePersonaInput = z.infer<typeof createPersonaSchema>;
export type UpdatePersonaInput = z.infer<typeof updatePersonaSchema>;

// Export option arrays for use in form dropdowns
export type Gender = (typeof genders)[number];
export type EducationLevel = (typeof educationLevels)[number];
export type MaritalStatus = (typeof maritalStatuses)[number];
export type CompanySize = (typeof companySizes)[number];
export type WorkStyle = (typeof workStyles)[number];
export type PersonalityTrait = (typeof personalityTraits)[number];
export type FitnessLevel = (typeof fitnessLevels)[number];
export type DietType = (typeof dietTypes)[number];
export type SocialPlatform = (typeof socialPlatforms)[number];
export type DeviceType = (typeof deviceTypes)[number];
export type ScreenTimeRange = (typeof screenTimeRanges)[number];
export type ContentPreference = (typeof contentPreferences)[number];
export type PriceSensitivity = (typeof priceSensitivities)[number];
export type BrandLoyaltyLevel = (typeof brandLoyaltyLevels)[number];
export type PurchaseFrequency = (typeof purchaseFrequencies)[number];
export type ShoppingChannel = (typeof shoppingChannels)[number];
export type ResearchBehavior = (typeof researchBehaviors)[number];
export type DecisionFactor = (typeof decisionFactors)[number];
export type ValidationStatus = (typeof validationStatuses)[number];
