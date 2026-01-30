/**
 * API Route: Generate Persona Portrait
 *
 * Generates a professional portrait image for a persona using
 * the Nano Banana Pro API based on Age, Gender, Ethnicity, and Occupation.
 *
 * Supports multiple portrait styles:
 * - corporate-studio: Professional studio headshot with neutral background
 * - creative-outdoor: Natural light outdoor portrait
 * - job-adaptive: Adapts background/clothing to match profession
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  generateImageWithRetry,
  downloadImage,
  type StylePreset,
} from "@/lib/api/nano-banana";
import { checkQuota, decrementQuota } from "@/lib/services/usage";
import { buildUgcPortraitPrompt } from "@/lib/services/portrait-prompts";

/**
 * Request body schema
 */
interface GeneratePortraitRequest {
  personaId?: string;
  brandId: string;
  age: number;
  gender: string;
  ethnicity?: string;
  occupation?: string;
  style?: string; // kept for backwards compat; ignored — always uses UGC selfie style
}

/**
 * Upload portrait to Supabase Storage
 */
async function uploadPortraitToStorage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  brandId: string,
  imageData: ArrayBuffer,
  contentType: string
): Promise<{ success: true; path: string; publicUrl: string } | { success: false; error: string }> {
  const timestamp = Date.now();
  const extension = contentType.includes("png") ? "png" : contentType.includes("jpeg") || contentType.includes("jpg") ? "jpg" : "png";
  const filename = `persona-portrait-${timestamp}-${Math.random().toString(36).substring(7)}.${extension}`;
  const path = `${userId}/personas/${brandId}/${filename}`;

  // Convert ArrayBuffer to Uint8Array for Supabase Storage compatibility
  const uploadData = new Uint8Array(imageData);
  console.log("[portrait] Storage upload:", { bucket: "creatives", path, contentType, size: uploadData.byteLength });

  const { error: uploadError } = await supabase.storage
    .from("creatives")
    .upload(path, uploadData, {
      contentType,
      upsert: false,
    });

  if (uploadError) {
    console.error("[portrait] Storage upload error:", {
      message: uploadError.message,
      name: uploadError.name,
      cause: (uploadError as Error & { cause?: unknown }).cause,
      statusCode: (uploadError as Error & { statusCode?: string }).statusCode,
    });
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
    const body = (await request.json()) as GeneratePortraitRequest;

    // Validate required fields
    if (!body.brandId) {
      return NextResponse.json(
        { error: "brandId is required" },
        { status: 400 }
      );
    }

    if (!body.age || typeof body.age !== "number" || body.age < 18 || body.age > 100) {
      return NextResponse.json(
        { error: "age must be a number between 18 and 100" },
        { status: 400 }
      );
    }

    if (!body.gender) {
      return NextResponse.json(
        { error: "gender is required" },
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
      .select("id, name")
      .eq("id", body.brandId)
      .eq("user_id", user.id)
      .single();

    if (brandError || !brand) {
      return NextResponse.json(
        { error: "Brand not found or access denied" },
        { status: 404 }
      );
    }

    // Check quota
    const quotaCheck = await checkQuota(supabase, user.id, "images", 1);
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

    // Build the UGC selfie portrait prompt (randomly selects one of 10 styles)
    const prompt = buildUgcPortraitPrompt(
      body.age,
      body.gender,
      body.ethnicity
    );

    console.log("[portrait] Generating UGC selfie portrait:", {
      personaId: body.personaId,
      age: body.age,
      gender: body.gender,
      ethnicity: body.ethnicity,
      promptLength: prompt.length,
    });

    // Use authentic-raw preset to match UGC selfie aesthetic
    const stylePreset: StylePreset = "authentic-raw";

    // Generate portrait image - square format for profile pictures
    const generationResult = await generateImageWithRetry({
      prompt,
      stylePreset,
      outputFormat: "1080x1080", // Square format for profile pictures
      count: 1,
      imageSize: "1K",
      negativePrompt: "cartoon, illustration, anime, distorted, deformed, ugly, bad anatomy, bad proportions, watermark, text, logo, unrealistic, artificial, plastic skin, multiple people, group photo, heavy filters, duck lips",
    });

    if (!generationResult.success) {
      console.error("[portrait] Generation failed:", {
        error: generationResult.error,
        code: generationResult.code,
        retryable: generationResult.retryable,
      });
      return NextResponse.json(
        {
          error: "Failed to generate portrait",
          details: generationResult.error,
          code: generationResult.code,
          retryable: generationResult.retryable,
        },
        { status: generationResult.code === "RATE_LIMIT_EXCEEDED" ? 429 : 500 }
      );
    }

    console.log("[portrait] Generation succeeded, images:", generationResult.images.length);

    // Get the generated image
    const generatedImage = generationResult.images[0];
    if (!generatedImage) {
      console.error("[portrait] No image in result despite success=true");
      return NextResponse.json(
        { error: "No image was generated" },
        { status: 500 }
      );
    }

    // Convert base64 image to binary for upload
    console.log("[portrait] Converting image data...");
    let imageData: ArrayBuffer;
    let imageContentType: string;

    if (generatedImage.base64Data) {
      // Use the raw base64 data directly (more efficient than re-parsing data URL)
      const buffer = Buffer.from(generatedImage.base64Data, "base64");
      imageData = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
      imageContentType = generatedImage.contentType || "image/png";
    } else {
      // Fallback: download from URL
      const downloadResult = await downloadImage(generatedImage.url);
      if (!downloadResult.success) {
        console.error("[portrait] Download failed:", downloadResult.error);
        return NextResponse.json(
          { error: `Failed to download image: ${downloadResult.error}` },
          { status: 500 }
        );
      }
      imageData = downloadResult.data;
      imageContentType = downloadResult.contentType;
    }

    // Upload to Supabase Storage
    console.log("[portrait] Uploading to storage, size:", imageData.byteLength);
    const uploadResult = await uploadPortraitToStorage(
      supabase,
      user.id,
      body.brandId,
      imageData,
      imageContentType
    );

    if (!uploadResult.success) {
      console.error("[portrait] Upload failed:", uploadResult.error);
      return NextResponse.json(
        { error: `Failed to upload image: ${uploadResult.error}` },
        { status: 500 }
      );
    }

    console.log("[portrait] Upload succeeded:", uploadResult.publicUrl);

    // Decrement quota
    await decrementQuota(supabase, user.id, "images", 1);

    // If personaId was provided, update the persona with the new photo
    if (body.personaId) {
      const { error: updateError } = await supabase
        .from("personas")
        .update({
          photo_url: uploadResult.publicUrl,
          photo_prompt: prompt,
        } as never)
        .eq("id", body.personaId)
        .eq("brand_id", body.brandId);

      if (updateError) {
        console.error("Error updating persona with portrait:", updateError);
        // Don't fail the request - the image was still generated successfully
      }
    }

    return NextResponse.json({
      success: true,
      photoUrl: uploadResult.publicUrl,
      photoPrompt: prompt,
      style: "ugc-selfie",
      generation: {
        seed: generatedImage.seed,
        generationTimeMs: generatedImage.generationTimeMs,
      },
      usage: {
        quota: {
          remaining: quotaCheck.remaining - 1,
          limit: quotaCheck.limit,
        },
      },
    });
  } catch (error) {
    console.error("[portrait] Unhandled error:", error instanceof Error ? error.stack : error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to generate portrait",
      },
      { status: 500 }
    );
  }
}
