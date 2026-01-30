/**
 * Image Generation API Route
 *
 * Generates advertising images using Nano Banana Pro API
 * with persona and brand data as context.
 *
 * POST /api/generate/image
 * GET /api/generate/image?brand_id=...
 */

export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  generateImageWithRetry,
  downloadImage,
  type StylePreset,
  type OutputFormat,
  type InputImage,
  stylePresets,
  outputFormats,
} from "@/lib/api/nano-banana";
import { checkQuota, decrementQuota } from "@/lib/services/usage";
import type {
  Brand,
  Persona,
  Product,
  Creative,
  CreativeInsert,
  Json,
  VisualGuidelines,
  VoiceTone,
} from "@/lib/supabase/database.types";

/**
 * Supported image types for generation
 */
export const imageTypes = [
  "hero-ad",
  "product-focus",
  "lifestyle",
  "testimonial",
  "comparison",
  "ugc-style",
] as const;

export type ImageType = (typeof imageTypes)[number];

/**
 * Image type display names for UI
 */
export const imageTypeLabels: Record<ImageType, string> = {
  "hero-ad": "Hero Ad",
  "product-focus": "Product Focus",
  "lifestyle": "Lifestyle",
  "testimonial": "Testimonial",
  "comparison": "Comparison",
  "ugc-style": "UGC Style",
};

/**
 * Request body schema
 */
interface GenerateImageRequest {
  persona_id: string;
  brand_id: string;
  product_id?: string | null;
  image_type: ImageType;
  style_preset: StylePreset;
  output_format: OutputFormat;
  count?: number;
}

/**
 * Response type for generated creatives
 */
interface GeneratedCreativeResponse {
  id: string;
  file_url: string;
  thumbnail_url: string | null;
  creative_type: string;
  subtype: string | null;
  dimensions: {
    width: number;
    height: number;
  } | null;
  generation_prompt: string;
  created_at: string;
}

/**
 * Persona demographics interface for prompt building
 */
interface PersonaDemographics {
  age?: number;
  gender?: string;
  location?: string;
  ethnicity?: string;
}

/**
 * Persona lifestyle interface for prompt building
 */
interface PersonaLifestyle {
  hobbies?: string[];
  interests?: string[];
  activities?: string[];
}

/**
 * Persona psychographics interface for prompt building
 */
interface PersonaPsychographics {
  values?: string[];
  aspirations?: string[];
  personalityTraits?: string[];
}

/**
 * Product image interface (as stored in database)
 */
interface ProductImageData {
  url: string;
  alt?: string;
  isPrimary?: boolean;
  sortOrder?: number;
}

/**
 * Get the primary product image from the images array
 */
function getPrimaryProductImage(images: unknown): ProductImageData | null {
  if (!images || !Array.isArray(images) || images.length === 0) {
    return null;
  }

  // Find the primary image, or fall back to first image
  const primary = images.find((img: ProductImageData) => img.isPrimary === true);
  if (primary && typeof primary === "object" && "url" in primary) {
    return primary as ProductImageData;
  }

  // Sort by sortOrder and take first, or just take first image
  const sorted = [...images].sort((a: ProductImageData, b: ProductImageData) =>
    (a.sortOrder ?? 999) - (b.sortOrder ?? 999)
  );

  const first = sorted[0];
  if (first && typeof first === "object" && "url" in first) {
    return first as ProductImageData;
  }

  return null;
}

/**
 * Build image generation prompt from persona and brand data
 * When hasProductImage is true, prompt emphasizes using the provided product image
 */
function buildImagePrompt(
  persona: Persona,
  brand: Brand,
  product: Product | null,
  imageType: ImageType,
  hasProductImage: boolean = false
): string {
  // Parse persona data
  const demographics = persona.demographics as PersonaDemographics | null;
  const lifestyle = persona.lifestyle as PersonaLifestyle | null;
  const psychographics = persona.psychographics as PersonaPsychographics | null;

  // Parse brand data
  const visualGuidelines = brand.visual_guidelines as VisualGuidelines | null;
  const voiceTone = brand.voice_tone as VoiceTone | null;

  // Base persona description
  const personaAge = demographics?.age || 35;
  const personaGender = demographics?.gender || "person";
  const personaEthnicity = demographics?.ethnicity || "";
  const personaLocation = demographics?.location || "";

  let personaDescription = `${personaAge}-year-old ${personaEthnicity ? personaEthnicity + " " : ""}${personaGender}`;
  if (personaLocation) {
    personaDescription += ` from ${personaLocation}`;
  }

  // Lifestyle context
  const interests = lifestyle?.interests?.slice(0, 3) || [];
  const hobbies = lifestyle?.hobbies?.slice(0, 3) || [];
  const activities = [...interests, ...hobbies].slice(0, 4);

  // Personality/vibe context
  const traits = psychographics?.personalityTraits?.slice(0, 3) || [];
  const values = psychographics?.values?.slice(0, 2) || [];
  const vibeWords = [...traits, ...values].slice(0, 4);

  // Brand visual style
  const visualStyle = visualGuidelines?.visualStyle?.join(", ") || "professional";
  const photographyStyle = visualGuidelines?.photographyStyle?.join(", ") || "commercial";
  const primaryColor = visualGuidelines?.primaryColor || "";

  // Product details
  const productName = product?.name || "";
  const productType = product?.product_type || "";
  const productDescription = product?.short_description || "";

  // Build prompt based on image type
  let prompt = "";

  // Add product image instruction when a product image is provided
  const productImageInstruction = hasProductImage
    ? "IMPORTANT: Use the provided product image exactly as shown. Keep the product appearance, packaging, colors, and branding identical to the reference image. "
    : "";

  switch (imageType) {
    case "hero-ad":
      prompt = productImageInstruction;
      prompt += `Hero advertising image featuring ${personaDescription}`;
      if (productName) {
        prompt += hasProductImage
          ? ` holding/displaying the EXACT product shown in the reference image (${productName})`
          : ` using ${productName}`;
      }
      prompt += `. ${vibeWords.length > 0 ? `Person appears ${vibeWords.join(", ")}` : "Confident, aspirational look"}.`;
      if (activities.length > 0) {
        prompt += ` Lifestyle setting suggesting interests in ${activities.join(", ")}.`;
      }
      prompt += ` Professional advertising photography, ${visualStyle} aesthetic, ${photographyStyle} style.`;
      if (primaryColor) {
        prompt += ` Brand color accent: ${primaryColor}.`;
      }
      prompt += " Clean background, dramatic lighting, high-end advertising campaign quality.";
      if (hasProductImage) {
        prompt += " The product must look EXACTLY like the provided reference - same shape, colors, labels, and packaging.";
      }
      break;

    case "product-focus":
      prompt = productImageInstruction;
      prompt += hasProductImage
        ? `Product-focused advertising image using the EXACT product from the reference image`
        : `Product photography featuring ${productName || "product"}`;
      if (productDescription) {
        prompt += ` (${productDescription})`;
      }
      prompt += ` with ${personaDescription} interacting with or holding the product.`;
      prompt += ` ${visualStyle} aesthetic, ${photographyStyle} style.`;
      if (primaryColor) {
        prompt += ` Brand color accent: ${primaryColor}.`;
      }
      prompt += " Product clearly visible, soft lighting, professional commercial photography.";
      if (hasProductImage) {
        prompt += " Keep the product identical to the reference image - same packaging, colors, branding, shape, and size.";
      }
      break;

    case "lifestyle":
      prompt = productImageInstruction;
      prompt += `Lifestyle photography of ${personaDescription}`;
      if (activities.length > 0) {
        prompt += ` enjoying ${activities[0]}`;
      }
      if (productName) {
        prompt += hasProductImage
          ? `, naturally incorporating the EXACT product from the reference image into the scene`
          : `, naturally incorporating ${productName} into the scene`;
      }
      prompt += `.`;
      if (vibeWords.length > 0) {
        prompt += ` Authentic moment capturing ${vibeWords.slice(0, 2).join(" and ")} energy.`;
      }
      prompt += ` ${photographyStyle} photography style, natural lighting, relatable and aspirational.`;
      if (hasProductImage) {
        prompt += " The product must match the reference image exactly.";
      }
      break;

    case "testimonial":
      prompt = productImageInstruction;
      prompt += `Testimonial-style portrait of ${personaDescription}`;
      if (productName) {
        prompt += hasProductImage
          ? ` holding/showing the EXACT product from the reference image`
          : ` satisfied customer of ${productName}`;
      }
      prompt += `. Genuine smile, approachable expression, looking at camera.`;
      if (vibeWords.length > 0) {
        prompt += ` Person exudes ${vibeWords.slice(0, 2).join(" and ")}.`;
      }
      prompt += ` Professional headshot quality, ${visualStyle} aesthetic, clean background with subtle depth.`;
      if (primaryColor) {
        prompt += ` Brand color accent: ${primaryColor}.`;
      }
      if (hasProductImage) {
        prompt += " Product visible in the shot must match the reference exactly.";
      }
      break;

    case "comparison":
      prompt = productImageInstruction;
      prompt += `Before/after or comparison advertising image featuring ${personaDescription}`;
      if (productName) {
        prompt += hasProductImage
          ? ` showcasing the EXACT product from the reference image`
          : ` showcasing the benefits of ${productName}`;
      }
      prompt += `. Clear transformation or improvement visible.`;
      prompt += ` ${visualStyle} aesthetic, clean composition, professional advertising quality.`;
      if (primaryColor) {
        prompt += ` Brand color accent: ${primaryColor}.`;
      }
      prompt += " Split composition or side-by-side format suggested.";
      if (hasProductImage) {
        prompt += " The product shown must be identical to the reference image.";
      }
      break;

    case "ugc-style":
      prompt = productImageInstruction;
      prompt += `User-generated content style image of ${personaDescription}`;
      if (productName) {
        prompt += hasProductImage
          ? ` naturally using the EXACT product from the reference image`
          : ` naturally using ${productName}`;
      }
      if (activities.length > 0) {
        prompt += ` while ${activities[0].toLowerCase()}`;
      }
      prompt += `. Candid, authentic moment, smartphone photography aesthetic.`;
      if (vibeWords.length > 0) {
        prompt += ` Person appears ${vibeWords.slice(0, 2).join(" and ")}.`;
      }
      prompt += " Casual setting, natural lighting, relatable and genuine feel, slight imperfection that makes it feel real.";
      if (hasProductImage) {
        prompt += " Keep the product identical to the reference image.";
      }
      break;

    default:
      prompt = productImageInstruction;
      prompt += `Advertising image featuring ${personaDescription}`;
      if (productName) {
        prompt += ` with ${hasProductImage ? "the EXACT product from the reference image" : productName}`;
      }
      prompt += `. ${visualStyle} aesthetic, ${photographyStyle} style, professional commercial quality.`;
      if (hasProductImage) {
        prompt += " The product must match the reference image exactly.";
      }
  }

  // Add brand voice context
  if (voiceTone?.brandVoice) {
    prompt += ` Overall tone: ${voiceTone.brandVoice}.`;
  }

  return prompt;
}

/**
 * Upload image to Supabase Storage
 */
async function uploadImageToStorage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  brandId: string,
  imageData: ArrayBuffer,
  contentType: string
): Promise<{ success: true; path: string; publicUrl: string } | { success: false; error: string }> {
  const timestamp = Date.now();
  const extension = contentType.includes("png") ? "png" : contentType.includes("jpeg") || contentType.includes("jpg") ? "jpg" : "png";
  const filename = `${timestamp}-${Math.random().toString(36).substring(7)}.${extension}`;
  const path = `${userId}/creatives/${brandId}/${filename}`;

  const { error: uploadError } = await supabase.storage
    .from("creatives")
    .upload(path, imageData, {
      contentType,
      upsert: false,
    });

  if (uploadError) {
    console.error("Error uploading image:", uploadError);
    return {
      success: false,
      error: uploadError.message,
    };
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("creatives")
    .getPublicUrl(path);

  return {
    success: true,
    path,
    publicUrl: urlData.publicUrl,
  };
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = (await request.json()) as GenerateImageRequest;

    // Validate required fields
    if (!body.brand_id) {
      return NextResponse.json(
        { error: "brand_id is required" },
        { status: 400 }
      );
    }

    if (!body.persona_id) {
      return NextResponse.json(
        { error: "persona_id is required" },
        { status: 400 }
      );
    }

    // Validate image_type
    if (!body.image_type || !imageTypes.includes(body.image_type)) {
      return NextResponse.json(
        { error: `image_type must be one of: ${imageTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate style_preset
    if (!body.style_preset || !stylePresets.includes(body.style_preset)) {
      return NextResponse.json(
        { error: `style_preset must be one of: ${stylePresets.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate output_format
    if (!body.output_format || !outputFormats[body.output_format]) {
      return NextResponse.json(
        { error: `output_format must be one of: ${Object.keys(outputFormats).join(", ")}` },
        { status: 400 }
      );
    }

    // Validate count
    const count = Math.max(1, Math.min(5, body.count || 1));

    // Get Supabase client
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Verify user owns the brand
    const { data: brand, error: brandError } = await supabase
      .from("brands")
      .select("*")
      .eq("id", body.brand_id)
      .eq("user_id", user.id)
      .single();

    if (brandError || !brand) {
      return NextResponse.json(
        { error: "Brand not found or access denied" },
        { status: 404 }
      );
    }

    // Get persona
    const { data: persona, error: personaError } = await supabase
      .from("personas")
      .select("*")
      .eq("id", body.persona_id)
      .eq("brand_id", body.brand_id)
      .single();

    if (personaError || !persona) {
      return NextResponse.json(
        { error: "Persona not found or does not belong to this brand" },
        { status: 404 }
      );
    }

    // Check quota using centralized usage service
    const quotaCheck = await checkQuota(supabase, user.id, "images", count);
    if (!quotaCheck.allowed) {
      return NextResponse.json(
        {
          error: quotaCheck.message || "Image generation quota exceeded",
          remaining: quotaCheck.remaining,
          limit: quotaCheck.limit,
        },
        { status: 429 }
      );
    }

    // Get product if provided
    let product: Product | null = null;
    if (body.product_id) {
      const { data: productData, error: productError } = await supabase
        .from("products")
        .select("*")
        .eq("id", body.product_id)
        .eq("brand_id", body.brand_id)
        .single();

      if (productError || !productData) {
        return NextResponse.json(
          { error: "Product not found or does not belong to this brand" },
          { status: 404 }
        );
      }

      product = productData;
    }

    // Get product image if available
    let productImage: ProductImageData | null = null;
    let inputImages: InputImage[] = [];

    if (product) {
      const productData = product as Product;
      if (productData.images) {
        productImage = getPrimaryProductImage(productData.images);
        if (productImage && productImage.url) {
          inputImages = [{ url: productImage.url }];
          console.log(`Using product image for creative generation: ${productImage.url}`);
        }
      }
    }

    // Build prompt (with product image flag if we have one)
    const hasProductImage = inputImages.length > 0;
    const prompt = buildImagePrompt(
      persona as Persona,
      brand as Brand,
      product,
      body.image_type,
      hasProductImage
    );

    // Generate images via Nano Banana Pro (Gemini)
    // When inputImages are provided, Gemini will use them as reference
    const generationResult = await generateImageWithRetry({
      prompt,
      stylePreset: body.style_preset,
      outputFormat: body.output_format,
      count,
      inputImages: hasProductImage ? inputImages : undefined,
    });

    if (!generationResult.success) {
      return NextResponse.json(
        {
          error: "Failed to generate images",
          details: generationResult.error,
          code: generationResult.code,
          retryable: generationResult.retryable,
        },
        { status: generationResult.code === "RATE_LIMIT_EXCEEDED" ? 429 : 500 }
      );
    }

    // Process and save each generated image
    const savedCreatives: GeneratedCreativeResponse[] = [];
    const errors: string[] = [];

    for (const image of generationResult.images) {
      // Download image data
      const downloadResult = await downloadImage(image.url);

      if (!downloadResult.success) {
        errors.push(`Failed to download image: ${downloadResult.error}`);
        continue;
      }

      // Upload to Supabase Storage
      const uploadResult = await uploadImageToStorage(
        supabase,
        user.id,
        body.brand_id,
        downloadResult.data,
        downloadResult.contentType
      );

      if (!uploadResult.success) {
        errors.push(`Failed to upload image: ${uploadResult.error}`);
        continue;
      }

      // Create creative record
      const creativeInsert: CreativeInsert = {
        brand_id: body.brand_id,
        product_id: body.product_id || null,
        persona_id: body.persona_id,
        audience_id: null,
        creative_type: "image",
        subtype: body.image_type,
        file_url: uploadResult.publicUrl,
        thumbnail_url: uploadResult.publicUrl, // Use same URL for thumbnail for now
        file_size: downloadResult.data.byteLength,
        dimensions: { width: image.width, height: image.height } as unknown as Json,
        duration_seconds: null,
        generation_prompt: prompt,
        generation_params: {
          style_preset: body.style_preset,
          output_format: body.output_format,
          seed: image.seed,
          generation_time_ms: image.generationTimeMs,
          used_product_image: hasProductImage,
          product_image_url: productImage?.url || null,
        } as unknown as Json,
        generation_model: "nano-banana-pro",
        generation_cost: null, // Could track API costs if needed
        headline: null,
        subheadline: null,
        cta: null,
        body_copy: null,
        status: "generated",
        rating: null,
        tags: [] as unknown as Json,
      };

      const { data: savedCreative, error: insertError } = await supabase
        .from("creatives")
        .insert(creativeInsert as never)
        .select()
        .single();

      if (insertError) {
        console.error("Error saving creative:", insertError);
        errors.push(`Failed to save creative: ${insertError.message}`);
        continue;
      }

      const typedCreative = savedCreative as Creative;

      savedCreatives.push({
        id: typedCreative.id,
        file_url: typedCreative.file_url,
        thumbnail_url: typedCreative.thumbnail_url,
        creative_type: typedCreative.creative_type,
        subtype: typedCreative.subtype,
        dimensions: typedCreative.dimensions as { width: number; height: number } | null,
        generation_prompt: typedCreative.generation_prompt,
        created_at: typedCreative.created_at,
      });
    }

    // Decrement quota (increment usage) for successfully saved images
    if (savedCreatives.length > 0) {
      await decrementQuota(supabase, user.id, "images", savedCreatives.length);
    }

    // Return response
    return NextResponse.json({
      success: true,
      creatives: savedCreatives,
      generated: savedCreatives.length,
      requested: count,
      errors: errors.length > 0 ? errors : undefined,
      usage: {
        quota: {
          remaining: quotaCheck.remaining - savedCreatives.length,
          limit: quotaCheck.limit,
        },
      },
      generation: {
        prompt,
        style_preset: body.style_preset,
        output_format: body.output_format,
        total_time_ms: generationResult.totalTimeMs,
        used_product_image: hasProductImage,
        product_image_url: productImage?.url || null,
      },
    });
  } catch (error) {
    console.error("Error generating images:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate images",
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler to retrieve existing creatives for a brand
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get("brand_id");
    const personaId = searchParams.get("persona_id");
    const creativeType = searchParams.get("type");
    const subtype = searchParams.get("subtype");
    const limitParam = searchParams.get("limit");

    if (!brandId) {
      return NextResponse.json(
        { error: "brand_id query parameter is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user owns the brand
    const { data: brand, error: brandError } = await supabase
      .from("brands")
      .select("id")
      .eq("id", brandId)
      .eq("user_id", user.id)
      .single();

    if (brandError || !brand) {
      return NextResponse.json(
        { error: "Brand not found or access denied" },
        { status: 404 }
      );
    }

    // Build query
    let query = supabase
      .from("creatives")
      .select("*")
      .eq("brand_id", brandId)
      .order("created_at", { ascending: false });

    // Apply optional filters
    if (personaId) {
      query = query.eq("persona_id", personaId);
    }

    if (creativeType) {
      query = query.eq("creative_type", creativeType);
    }

    if (subtype) {
      query = query.eq("subtype", subtype);
    }

    // Apply limit
    const limit = limitParam ? Math.min(100, Math.max(1, parseInt(limitParam, 10))) : 50;
    query = query.limit(limit);

    const { data: creatives, error: creativesError } = await query;

    if (creativesError) {
      console.error("Error fetching creatives:", creativesError);
      return NextResponse.json(
        { error: "Failed to fetch creatives" },
        { status: 500 }
      );
    }

    return NextResponse.json({ creatives: creatives || [] });
  } catch (error) {
    console.error("Error fetching creatives:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch creatives",
      },
      { status: 500 }
    );
  }
}
