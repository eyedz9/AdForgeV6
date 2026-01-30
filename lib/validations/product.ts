/**
 * Zod validation schemas for product data
 * Used for form validation and API input validation
 */

import { z } from "zod";

// Product type options
export const productTypes = [
  "Physical",
  "Digital",
  "Service",
  "Subscription",
  "Software",
  "Course",
  "Membership",
  "Event",
  "Bundle",
  "Other",
] as const;

// Price range options for approximate pricing
export const priceRanges = [
  "Under $25",
  "$25-$50",
  "$50-$100",
  "$100-$250",
  "$250-$500",
  "$500-$1,000",
  "$1,000-$5,000",
  "$5,000+",
  "Custom/Variable",
] as const;

// Core product schema (basic product information)
export const productCoreSchema = z.object({
  name: z
    .string()
    .min(1, "Product name is required")
    .max(255, "Product name must be 255 characters or less"),
  productType: z.enum(productTypes).optional().nullable(),
  shortDescription: z
    .string()
    .max(160, "Short description must be 160 characters or less (optimal for SEO)")
    .optional()
    .nullable(),
  fullDescription: z.string().optional().nullable(),
  sku: z
    .string()
    .max(100, "SKU must be 100 characters or less")
    .optional()
    .nullable(),
  price: z
    .number()
    .min(0, "Price must be a positive number")
    .max(9999999.99, "Price must be less than 10 million")
    .optional()
    .nullable(),
  priceRange: z.enum(priceRanges).optional().nullable(),
});

// Product image schema
export const productImageSchema = z.object({
  url: z.string().url("Must be a valid URL"),
  alt: z.string().max(255).optional(),
  isPrimary: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

// Product video schema
export const productVideoSchema = z.object({
  url: z.string().url("Must be a valid URL"),
  title: z.string().max(255).optional(),
  thumbnailUrl: z.string().url().optional().or(z.literal("")),
  duration: z.number().int().min(0).optional(), // duration in seconds
  sortOrder: z.number().int().min(0).optional(),
});

// Product images array schema
export const productImagesSchema = z.array(productImageSchema).optional();

// Product videos array schema
export const productVideosSchema = z.array(productVideoSchema).optional();

// Variant attribute schema (flexible key-value pairs)
export const variantAttributeSchema = z.record(
  z.string(),
  z.string()
);

// Product variant schema
export const variantSchema = z.object({
  name: z.string().min(1, "Variant name is required").max(255),
  sku: z
    .string()
    .max(100, "SKU must be 100 characters or less")
    .optional()
    .nullable(),
  price: z
    .number()
    .min(0, "Price must be a positive number")
    .max(9999999.99, "Price must be less than 10 million")
    .optional()
    .nullable(),
  attributes: variantAttributeSchema.optional(),
});

// Product variants array schema
export const variantsSchema = z.array(variantSchema).optional();

// Marketing attributes schema
export const marketingAttributesSchema = z.object({
  uvp: z
    .string()
    .max(500, "Unique value proposition must be 500 characters or less")
    .optional()
    .nullable(), // Unique Value Proposition
  benefits: z
    .array(z.string().min(1).max(255))
    .max(10, "Maximum 10 benefits")
    .optional(),
  targetProblems: z
    .array(z.string().min(1).max(255))
    .max(10, "Maximum 10 target problems")
    .optional(),
  competitiveAdvantages: z
    .array(z.string().min(1).max(255))
    .max(10, "Maximum 10 competitive advantages")
    .optional(),
  socialProof: z
    .array(z.string().min(1).max(500))
    .max(10, "Maximum 10 social proof items")
    .optional(),
});

// Combined schema for creating a product
export const createProductSchema = z.object({
  // Required
  brandId: z.string().uuid("Invalid brand ID"),
  name: z
    .string()
    .min(1, "Product name is required")
    .max(255, "Product name must be 255 characters or less"),

  // Core info
  productType: z.enum(productTypes).optional().nullable(),
  shortDescription: z
    .string()
    .max(160, "Short description must be 160 characters or less (optimal for SEO)")
    .optional()
    .nullable(),
  fullDescription: z.string().optional().nullable(),
  sku: z
    .string()
    .max(100, "SKU must be 100 characters or less")
    .optional()
    .nullable(),
  price: z
    .number()
    .min(0, "Price must be a positive number")
    .max(9999999.99, "Price must be less than 10 million")
    .optional()
    .nullable(),
  priceRange: z.enum(priceRanges).optional().nullable(),

  // Media
  images: productImagesSchema.nullable(),
  videos: productVideosSchema.nullable(),

  // Variants
  variants: variantsSchema.nullable(),

  // Marketing
  marketingAttributes: marketingAttributesSchema.optional().nullable(),
});

// Schema for updating a product (all fields optional except for validation)
export const updateProductSchema = z.object({
  name: z
    .string()
    .min(1, "Product name is required")
    .max(255, "Product name must be 255 characters or less")
    .optional(),
  productType: z.enum(productTypes).optional().nullable(),
  shortDescription: z
    .string()
    .max(160, "Short description must be 160 characters or less (optimal for SEO)")
    .optional()
    .nullable(),
  fullDescription: z.string().optional().nullable(),
  sku: z
    .string()
    .max(100, "SKU must be 100 characters or less")
    .optional()
    .nullable(),
  price: z
    .number()
    .min(0, "Price must be a positive number")
    .max(9999999.99, "Price must be less than 10 million")
    .optional()
    .nullable(),
  priceRange: z.enum(priceRanges).optional().nullable(),
  images: productImagesSchema.nullable(),
  videos: productVideosSchema.nullable(),
  variants: variantsSchema.nullable(),
  marketingAttributes: marketingAttributesSchema.optional().nullable(),
});

// Type exports inferred from schemas
export type ProductCore = z.infer<typeof productCoreSchema>;
export type ProductImage = z.infer<typeof productImageSchema>;
export type ProductVideo = z.infer<typeof productVideoSchema>;
export type ProductVariant = z.infer<typeof variantSchema>;
export type MarketingAttributes = z.infer<typeof marketingAttributesSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
