/**
 * Creative Types and Constants
 *
 * Shared constants for creative validation and type definitions.
 * These are exported from a non-server file so they can be used
 * in both client and server components.
 */

// Creative types and subtypes
export const creativeTypes = ["image", "video"] as const;
export type CreativeType = (typeof creativeTypes)[number];

export const imageSubtypes = [
  "hero_ad",
  "product_focus",
  "lifestyle",
  "testimonial",
  "comparison",
  "ugc_style",
] as const;
export type ImageSubtype = (typeof imageSubtypes)[number];

export const videoSubtypes = ["ugc_style", "product_demo", "testimonial", "dynamic"] as const;
export type VideoSubtype = (typeof videoSubtypes)[number];

export const creativeStatuses = ["generated", "approved", "rejected", "archived"] as const;
export type CreativeStatus = (typeof creativeStatuses)[number];
