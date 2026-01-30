/**
 * Video Generation API Route
 *
 * Generates advertising videos using Veo 3.1 API
 * with persona and brand data as context.
 *
 * POST /api/generate/video
 * GET /api/generate/video?brand_id=...
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  generateVideoWithRetry,
  downloadVideo,
  type VideoDuration,
  type AspectRatio,
  type VideoType,
  videoDurations,
  aspectRatios,
  videoTypes,
  aspectRatioResolutions,
} from "@/lib/api/veo";
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
 * Request body schema
 */
interface GenerateVideoRequest {
  persona_id: string;
  brand_id: string;
  product_id?: string | null;
  video_type: VideoType;
  duration: VideoDuration;
  aspect_ratio: AspectRatio;
  starting_image_url?: string | null;
}

/**
 * Response type for generated creative
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
  duration_seconds: number | null;
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
 * Build video generation prompt from persona and brand data
 */
function buildVideoPrompt(
  persona: Persona,
  brand: Brand,
  product: Product | null,
  videoType: VideoType
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
  const productDescription = product?.short_description || "";

  // Build prompt based on video type
  let prompt = "";

  switch (videoType) {
    case "ugc-style":
      prompt = `User-generated content style video featuring ${personaDescription}`;
      if (productName) {
        prompt += ` authentically using ${productName}`;
      }
      if (activities.length > 0) {
        prompt += ` while ${activities[0].toLowerCase()}`;
      }
      prompt += `. Handheld smartphone camera feel, casual and relatable.`;
      if (vibeWords.length > 0) {
        prompt += ` Person appears ${vibeWords.slice(0, 2).join(" and ")}.`;
      }
      prompt += " Natural movements, unscripted feeling, genuine reactions.";
      prompt += " Slightly imperfect framing for authenticity.";
      break;

    case "product-demo":
      prompt = `Product demonstration video featuring ${personaDescription}`;
      if (productName) {
        prompt += ` showcasing ${productName}`;
        if (productDescription) {
          prompt += ` (${productDescription})`;
        }
      }
      prompt += `. Clear product focus, smooth camera movements.`;
      prompt += ` ${visualStyle} aesthetic, professional lighting.`;
      if (primaryColor) {
        prompt += ` Brand color accent: ${primaryColor}.`;
      }
      prompt += " Demonstrating key features and benefits, professional commercial quality.";
      break;

    case "testimonial":
      prompt = `Testimonial style video of ${personaDescription}`;
      if (productName) {
        prompt += ` sharing their positive experience with ${productName}`;
      }
      prompt += `. Person speaking naturally to camera with genuine expression.`;
      if (vibeWords.length > 0) {
        prompt += ` Personality shows ${vibeWords.slice(0, 2).join(" and ")}.`;
      }
      prompt += ` Conversational tone, engaging and believable.`;
      prompt += ` ${visualStyle} aesthetic, clean background with subtle depth.`;
      if (primaryColor) {
        prompt += ` Brand color accent: ${primaryColor}.`;
      }
      break;

    case "dynamic":
      prompt = `Dynamic advertising video featuring ${personaDescription}`;
      if (productName) {
        prompt += ` with ${productName}`;
      }
      if (activities.length > 0) {
        prompt += ` engaging in ${activities.slice(0, 2).join(" and ")}`;
      }
      prompt += `. Fast-paced, energetic, eye-catching transitions.`;
      if (vibeWords.length > 0) {
        prompt += ` Energy conveys ${vibeWords.slice(0, 2).join(" and ")}.`;
      }
      prompt += ` ${visualStyle} aesthetic, bold visuals.`;
      if (primaryColor) {
        prompt += ` Brand color accent: ${primaryColor}.`;
      }
      prompt += " Action-packed moments, engaging motion, professional production.";
      break;

    default:
      prompt = `Advertising video featuring ${personaDescription}`;
      if (productName) {
        prompt += ` with ${productName}`;
      }
      prompt += `. ${visualStyle} aesthetic, ${photographyStyle} style.`;
      prompt += " Professional commercial quality.";
  }

  // Add brand voice context
  if (voiceTone?.brandVoice) {
    prompt += ` Overall tone: ${voiceTone.brandVoice}.`;
  }

  return prompt;
}

/**
 * Upload video to Supabase Storage
 */
async function uploadVideoToStorage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  brandId: string,
  videoData: ArrayBuffer,
  contentType: string
): Promise<{ success: true; path: string; publicUrl: string } | { success: false; error: string }> {
  const timestamp = Date.now();
  const extension = contentType.includes("mp4")
    ? "mp4"
    : contentType.includes("webm")
    ? "webm"
    : contentType.includes("quicktime") || contentType.includes("mov")
    ? "mov"
    : "mp4";
  const filename = `${timestamp}-${Math.random().toString(36).substring(7)}.${extension}`;
  const path = `${userId}/creatives/${brandId}/${filename}`;

  const { error: uploadError } = await supabase.storage
    .from("creatives")
    .upload(path, videoData, {
      contentType,
      upsert: false,
    });

  if (uploadError) {
    console.error("Error uploading video:", uploadError);
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

/**
 * Upload thumbnail to Supabase Storage (if available)
 */
async function uploadThumbnailToStorage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  brandId: string,
  thumbnailUrl: string
): Promise<string | null> {
  try {
    // Download thumbnail
    const response = await fetch(thumbnailUrl);
    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get("Content-Type") || "image/jpeg";
    const data = await response.arrayBuffer();

    const timestamp = Date.now();
    const extension = contentType.includes("png") ? "png" : "jpg";
    const filename = `${timestamp}-thumb-${Math.random().toString(36).substring(7)}.${extension}`;
    const path = `${userId}/creatives/${brandId}/${filename}`;

    const { error: uploadError } = await supabase.storage
      .from("creatives")
      .upload(path, data, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error("Error uploading thumbnail:", uploadError);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("creatives")
      .getPublicUrl(path);

    return urlData.publicUrl;
  } catch (error) {
    console.error("Error processing thumbnail:", error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = (await request.json()) as GenerateVideoRequest;

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

    // Validate video_type
    if (!body.video_type || !videoTypes.includes(body.video_type)) {
      return NextResponse.json(
        { error: `video_type must be one of: ${videoTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate duration
    if (!body.duration || !videoDurations.includes(body.duration)) {
      return NextResponse.json(
        { error: `duration must be one of: ${videoDurations.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate aspect_ratio
    if (!body.aspect_ratio || !aspectRatios.includes(body.aspect_ratio)) {
      return NextResponse.json(
        { error: `aspect_ratio must be one of: ${aspectRatios.join(", ")}` },
        { status: 400 }
      );
    }

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
    const quotaCheck = await checkQuota(supabase, user.id, "videos", 1);
    if (!quotaCheck.allowed) {
      return NextResponse.json(
        {
          error: quotaCheck.message || "Video generation quota exceeded",
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

    // Build prompt
    const prompt = buildVideoPrompt(
      persona as Persona,
      brand as Brand,
      product,
      body.video_type
    );

    // Generate video via Veo 3.1
    const generationResult = await generateVideoWithRetry({
      prompt,
      duration: body.duration,
      aspectRatio: body.aspect_ratio,
      videoType: body.video_type,
      startingImageUrl: body.starting_image_url || undefined,
    });

    if (!generationResult.success) {
      return NextResponse.json(
        {
          error: "Failed to generate video",
          details: generationResult.error,
          code: generationResult.code,
          retryable: generationResult.retryable,
        },
        { status: generationResult.code === "RATE_LIMIT_EXCEEDED" ? 429 : 500 }
      );
    }

    // Download video data
    const downloadResult = await downloadVideo(generationResult.video.url);

    if (!downloadResult.success) {
      return NextResponse.json(
        {
          error: "Failed to download generated video",
          details: downloadResult.error,
        },
        { status: 500 }
      );
    }

    // Upload to Supabase Storage
    const uploadResult = await uploadVideoToStorage(
      supabase,
      user.id,
      body.brand_id,
      downloadResult.data,
      downloadResult.contentType
    );

    if (!uploadResult.success) {
      return NextResponse.json(
        {
          error: "Failed to upload video to storage",
          details: uploadResult.error,
        },
        { status: 500 }
      );
    }

    // Upload thumbnail if available
    let thumbnailUrl: string | null = null;
    if (generationResult.video.thumbnailUrl) {
      thumbnailUrl = await uploadThumbnailToStorage(
        supabase,
        user.id,
        body.brand_id,
        generationResult.video.thumbnailUrl
      );
    }

    // Get dimensions from aspect ratio
    const dimensions = aspectRatioResolutions[body.aspect_ratio];

    // Create creative record
    const creativeInsert: CreativeInsert = {
      brand_id: body.brand_id,
      product_id: body.product_id || null,
      persona_id: body.persona_id,
      audience_id: null,
      creative_type: "video",
      subtype: body.video_type,
      file_url: uploadResult.publicUrl,
      thumbnail_url: thumbnailUrl,
      file_size: downloadResult.data.byteLength,
      dimensions: { width: dimensions.width, height: dimensions.height } as unknown as Json,
      duration_seconds: generationResult.video.durationSeconds,
      generation_prompt: prompt,
      generation_params: {
        video_type: body.video_type,
        duration: body.duration,
        aspect_ratio: body.aspect_ratio,
        starting_image: body.starting_image_url ? true : false,
        seed: generationResult.video.seed,
        generation_time_ms: generationResult.video.generationTimeMs,
      } as unknown as Json,
      generation_model: "veo-3.1",
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
      return NextResponse.json(
        {
          error: "Failed to save video creative",
          details: insertError.message,
        },
        { status: 500 }
      );
    }

    // Decrement quota (increment usage)
    await decrementQuota(supabase, user.id, "videos", 1);

    const typedCreative = savedCreative as Creative;

    const creativeResponse: GeneratedCreativeResponse = {
      id: typedCreative.id,
      file_url: typedCreative.file_url,
      thumbnail_url: typedCreative.thumbnail_url,
      creative_type: typedCreative.creative_type,
      subtype: typedCreative.subtype,
      dimensions: typedCreative.dimensions as { width: number; height: number } | null,
      duration_seconds: typedCreative.duration_seconds,
      generation_prompt: typedCreative.generation_prompt,
      created_at: typedCreative.created_at,
    };

    // Return response
    return NextResponse.json({
      success: true,
      creative: creativeResponse,
      usage: {
        quota: {
          remaining: quotaCheck.remaining - 1,
          limit: quotaCheck.limit,
        },
      },
      generation: {
        prompt,
        video_type: body.video_type,
        duration: body.duration,
        aspect_ratio: body.aspect_ratio,
        total_time_ms: generationResult.totalTimeMs,
      },
    });
  } catch (error) {
    console.error("Error generating video:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate video",
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler to retrieve existing video creatives for a brand
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get("brand_id");
    const personaId = searchParams.get("persona_id");
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

    // Build query - filter to video type only
    let query = supabase
      .from("creatives")
      .select("*")
      .eq("brand_id", brandId)
      .eq("creative_type", "video")
      .order("created_at", { ascending: false });

    // Apply optional filters
    if (personaId) {
      query = query.eq("persona_id", personaId);
    }

    if (subtype) {
      query = query.eq("subtype", subtype);
    }

    // Apply limit
    const limit = limitParam ? Math.min(100, Math.max(1, parseInt(limitParam, 10))) : 50;
    query = query.limit(limit);

    const { data: creatives, error: creativesError } = await query;

    if (creativesError) {
      console.error("Error fetching video creatives:", creativesError);
      return NextResponse.json(
        { error: "Failed to fetch video creatives" },
        { status: 500 }
      );
    }

    return NextResponse.json({ creatives: creatives || [] });
  } catch (error) {
    console.error("Error fetching video creatives:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch video creatives",
      },
      { status: 500 }
    );
  }
}
