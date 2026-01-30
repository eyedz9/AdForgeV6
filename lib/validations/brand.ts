/**
 * Zod validation schemas for brand data
 * Used for form validation and API input validation
 */

import { z } from "zod";

// Business type options
export const businessTypes = [
  "B2B",
  "B2C",
  "D2C",
  "B2B2C",
  "Marketplace",
  "SaaS",
  "E-commerce",
  "Service",
  "Non-profit",
  "Other",
] as const;

// Industry options
export const industries = [
  "Technology",
  "Healthcare",
  "Finance",
  "Retail",
  "Manufacturing",
  "Education",
  "Real Estate",
  "Food & Beverage",
  "Travel & Hospitality",
  "Entertainment",
  "Fashion & Apparel",
  "Beauty & Cosmetics",
  "Automotive",
  "Home & Garden",
  "Sports & Fitness",
  "Professional Services",
  "Media & Publishing",
  "Telecommunications",
  "Energy",
  "Agriculture",
  "Other",
] as const;

// Brand voice options
export const brandVoices = [
  "Professional",
  "Friendly",
  "Authoritative",
  "Playful",
  "Inspirational",
  "Educational",
  "Conversational",
  "Bold",
  "Sophisticated",
  "Empathetic",
  "Minimalist",
  "Luxurious",
] as const;

// Tone characteristics options
export const toneCharacteristics = [
  "Warm",
  "Confident",
  "Approachable",
  "Trustworthy",
  "Innovative",
  "Sincere",
  "Witty",
  "Energetic",
  "Calm",
  "Direct",
  "Thoughtful",
  "Optimistic",
  "Reassuring",
  "Passionate",
  "Humble",
] as const;

// Visual style options
export const visualStyles = [
  "Minimalist",
  "Bold & Vibrant",
  "Classic & Elegant",
  "Modern & Clean",
  "Playful & Fun",
  "Natural & Organic",
  "Tech & Futuristic",
  "Vintage & Retro",
  "Luxurious & Premium",
  "Earthy & Rustic",
] as const;

// Photography style options
export const photographyStyles = [
  "Lifestyle",
  "Product-focused",
  "Editorial",
  "Documentary",
  "Studio/White Background",
  "Environmental",
  "Action/Dynamic",
  "Candid",
  "Flat Lay",
  "Abstract",
] as const;

// Social profiles schema
export const socialProfilesSchema = z.object({
  instagram: z.string().url().optional().or(z.literal("")),
  facebook: z.string().url().optional().or(z.literal("")),
  twitter: z.string().url().optional().or(z.literal("")),
  linkedin: z.string().url().optional().or(z.literal("")),
  tiktok: z.string().url().optional().or(z.literal("")),
  youtube: z.string().url().optional().or(z.literal("")),
  pinterest: z.string().url().optional().or(z.literal("")),
}).passthrough();

// Brand identity schema (Step 1 of wizard)
export const brandIdentitySchema = z.object({
  name: z
    .string()
    .min(1, "Brand name is required")
    .max(255, "Brand name must be 255 characters or less"),
  businessType: z.enum(businessTypes).optional(),
  industry: z.enum(industries).optional(),
  subIndustry: z
    .string()
    .max(100, "Sub-industry must be 100 characters or less")
    .optional(),
  website: z
    .string()
    .url("Please enter a valid URL")
    .max(500, "Website URL must be 500 characters or less")
    .optional()
    .or(z.literal("")),
  socialProfiles: socialProfilesSchema.optional(),
});

// Logo variants schema
export const logoVariantsSchema = z.object({
  primary: z.string().url().optional().or(z.literal("")),
  secondary: z.string().url().optional().or(z.literal("")),
  icon: z.string().url().optional().or(z.literal("")),
  dark: z.string().url().optional().or(z.literal("")),
  light: z.string().url().optional().or(z.literal("")),
}).passthrough();

// Hex color validation
const hexColorSchema = z
  .string()
  .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Must be a valid hex color (e.g., #FF5733)");

// Visual guidelines schema (Step 3 of wizard)
export const visualGuidelinesSchema = z.object({
  primaryColor: hexColorSchema.optional(),
  secondaryColors: z.array(hexColorSchema).max(5, "Maximum 5 secondary colors").optional(),
  accentColor: hexColorSchema.optional(),
  headingFont: z.string().max(100).optional(),
  bodyFont: z.string().max(100).optional(),
  visualStyle: z.array(z.enum(visualStyles)).optional(),
  photographyStyle: z.array(z.enum(photographyStyles)).optional(),
});

// Voice and tone schema (Step 4 of wizard)
export const voiceToneSchema = z.object({
  brandVoice: z.enum(brandVoices).optional(),
  toneCharacteristics: z
    .array(z.enum(toneCharacteristics))
    .min(3, "Select at least 3 tone characteristics")
    .max(5, "Select at most 5 tone characteristics")
    .optional(),
  keyMessages: z
    .array(z.string().min(1).max(500))
    .min(3, "Provide at least 3 key messages")
    .max(5, "Provide at most 5 key messages")
    .optional(),
  tagline: z.string().max(200, "Tagline must be 200 characters or less").optional(),
  wordsToAvoid: z.array(z.string().max(50)).optional(),
});

// Combined schema for creating a brand
export const createBrandSchema = z.object({
  // Identity (required)
  name: z
    .string()
    .min(1, "Brand name is required")
    .max(255, "Brand name must be 255 characters or less"),
  businessType: z.enum(businessTypes).optional().nullable(),
  industry: z.enum(industries).optional().nullable(),
  subIndustry: z
    .string()
    .max(100, "Sub-industry must be 100 characters or less")
    .optional()
    .nullable(),
  website: z
    .string()
    .url("Please enter a valid URL")
    .max(500, "Website URL must be 500 characters or less")
    .optional()
    .nullable()
    .or(z.literal("")),
  socialProfiles: socialProfilesSchema.optional().nullable(),

  // Logo
  logoUrl: z
    .string()
    .url("Please enter a valid URL")
    .max(500)
    .optional()
    .nullable()
    .or(z.literal("")),
  logoVariants: logoVariantsSchema.optional().nullable(),

  // Visual guidelines
  visualGuidelines: visualGuidelinesSchema.optional().nullable(),

  // Voice and tone
  voiceTone: voiceToneSchema.optional().nullable(),
});

// Schema for updating a brand (all fields optional)
export const updateBrandSchema = z.object({
  name: z
    .string()
    .min(1, "Brand name is required")
    .max(255, "Brand name must be 255 characters or less")
    .optional(),
  businessType: z.enum(businessTypes).optional().nullable(),
  industry: z.enum(industries).optional().nullable(),
  subIndustry: z
    .string()
    .max(100, "Sub-industry must be 100 characters or less")
    .optional()
    .nullable(),
  website: z
    .string()
    .url("Please enter a valid URL")
    .max(500, "Website URL must be 500 characters or less")
    .optional()
    .nullable()
    .or(z.literal("")),
  socialProfiles: socialProfilesSchema.optional().nullable(),
  logoUrl: z
    .string()
    .url("Please enter a valid URL")
    .max(500)
    .optional()
    .nullable()
    .or(z.literal("")),
  logoVariants: logoVariantsSchema.optional().nullable(),
  visualGuidelines: visualGuidelinesSchema.optional().nullable(),
  voiceTone: voiceToneSchema.optional().nullable(),
});

// Type exports inferred from schemas
export type BrandIdentity = z.infer<typeof brandIdentitySchema>;
export type VisualGuidelines = z.infer<typeof visualGuidelinesSchema>;
export type VoiceTone = z.infer<typeof voiceToneSchema>;
export type SocialProfiles = z.infer<typeof socialProfilesSchema>;
export type LogoVariants = z.infer<typeof logoVariantsSchema>;
export type CreateBrandInput = z.infer<typeof createBrandSchema>;
export type UpdateBrandInput = z.infer<typeof updateBrandSchema>;
