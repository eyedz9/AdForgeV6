/**
 * Nano Banana Pro API client for image generation
 *
 * Nano Banana refers to Google's Gemini image generation models:
 * - Nano Banana: Gemini 2.5 Flash Image (gemini-2.5-flash-image) - Speed optimized
 * - Nano Banana Pro: Gemini 3 Pro Image Preview (gemini-3-pro-image-preview) - Quality optimized
 *
 * Documentation: https://ai.google.dev/gemini-api/docs/image-generation
 */

// Gemini API configuration
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * Supported output formats with their dimensions
 * Maps to Gemini aspect ratios
 */
export const outputFormats = {
  "1080x1080": { width: 1024, height: 1024, aspectRatio: "1:1", label: "Square (1:1)" },
  "1080x1920": { width: 768, height: 1376, aspectRatio: "9:16", label: "Story/Reel (9:16)" },
  "1080x1350": { width: 896, height: 1152, aspectRatio: "4:5", label: "Portrait (4:5)" },
  "1200x628": { width: 1376, height: 768, aspectRatio: "16:9", label: "Landscape Link (16:9)" },
  "1920x1080": { width: 1376, height: 768, aspectRatio: "16:9", label: "Landscape HD (16:9)" },
} as const;

export type OutputFormat = keyof typeof outputFormats;

/**
 * Supported style presets for image generation
 * These are translated to prompt modifiers
 */
export const stylePresets = [
  "clean-modern",
  "bold-vibrant",
  "natural-organic",
  "premium-studio",
  "authentic-raw",
] as const;

export type StylePreset = (typeof stylePresets)[number];

/**
 * Style preset display names for UI
 */
export const stylePresetLabels: Record<StylePreset, string> = {
  "clean-modern": "Clean Modern",
  "bold-vibrant": "Bold & Vibrant",
  "natural-organic": "Natural Organic",
  "premium-studio": "Premium Studio",
  "authentic-raw": "Authentic Raw",
};

/**
 * Input image for image editing
 */
export interface InputImage {
  /**
   * URL of the image (can be http URL or data URL)
   */
  url: string;

  /**
   * Base64 data (if already available, avoids re-fetching)
   */
  base64Data?: string;

  /**
   * MIME type of the image
   */
  mimeType?: string;
}

/**
 * Image generation request parameters
 */
export interface GenerateImageRequest {
  /**
   * The prompt describing the image to generate
   */
  prompt: string;

  /**
   * Style preset to apply
   */
  stylePreset: StylePreset;

  /**
   * Output format specifying dimensions
   */
  outputFormat: OutputFormat;

  /**
   * Optional negative prompt to exclude certain elements
   */
  negativePrompt?: string;

  /**
   * Number of images to generate (1-4)
   * @default 1
   */
  count?: number;

  /**
   * Seed for reproducible generation
   */
  seed?: number;

  /**
   * Guidance scale for prompt adherence (1-20)
   * @default 7.5
   */
  guidanceScale?: number;

  /**
   * Number of inference steps (10-50)
   * @default 30
   */
  steps?: number;

  /**
   * Output image size for the Gemini API
   * @default "2K"
   */
  imageSize?: "1K" | "2K";

  /**
   * Optional input images for image editing/composition
   * When provided, Gemini will use these images as reference
   */
  inputImages?: InputImage[];
}

/**
 * Generated image data
 */
export interface GeneratedImage {
  /**
   * URL to the generated image (data URL)
   */
  url: string;

  /**
   * Image dimensions
   */
  width: number;
  height: number;

  /**
   * Content type
   */
  contentType: string;

  /**
   * Seed used for this generation (if available)
   */
  seed: number;

  /**
   * Time taken to generate in milliseconds
   */
  generationTimeMs: number;

  /**
   * Base64 image data
   */
  base64Data: string;
}

/**
 * Image generation result
 */
export interface GenerateImageResult {
  success: true;
  images: GeneratedImage[];
  prompt: string;
  stylePreset: StylePreset;
  outputFormat: OutputFormat;
  totalTimeMs: number;
}

export interface GenerateImageError {
  success: false;
  error: string;
  code: string;
  retryable: boolean;
}

export type GenerateImageResponse = GenerateImageResult | GenerateImageError;

/**
 * Gemini API response structure
 */
interface GeminiApiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
        inlineData?: {
          mimeType: string;
          data: string;
        };
      }>;
    };
    finishReason?: string;
  }>;
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

/**
 * Build style-specific prompt modifiers
 */
function buildStylePrompt(stylePreset: StylePreset): string {
  switch (stylePreset) {
    case "clean-modern":
      return "minimalist, clean lines, modern design, professional, high contrast, sleek, contemporary aesthetic";
    case "bold-vibrant":
      return "bold colors, vibrant, high saturation, eye-catching, dynamic, energetic, impactful";
    case "natural-organic":
      return "natural lighting, organic textures, earthy tones, authentic, warm, soft shadows, lifestyle";
    case "premium-studio":
      return "studio lighting, premium quality, polished, luxury feel, professional photography, high-end";
    case "authentic-raw":
      return "candid, authentic, UGC style, relatable, unpolished, genuine, real-life";
    default:
      return "";
  }
}

/**
 * Build the full prompt with style modifiers
 */
function buildFullPrompt(prompt: string, stylePreset: StylePreset, negativePrompt?: string): string {
  const styleModifier = buildStylePrompt(stylePreset);
  let fullPrompt = `${prompt}, ${styleModifier}, advertising quality, commercial photography`;

  // Add negative prompt guidance if provided
  if (negativePrompt) {
    fullPrompt += `. Avoid: ${negativePrompt}`;
  }

  return fullPrompt;
}

/**
 * Fetch an image and convert it to base64
 */
async function fetchImageAsBase64(imageUrl: string): Promise<{
  success: true;
  base64Data: string;
  mimeType: string;
} | {
  success: false;
  error: string;
}> {
  try {
    // Handle data URLs (already base64)
    if (imageUrl.startsWith("data:")) {
      const matches = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) {
        return { success: false, error: "Invalid data URL format" };
      }
      return {
        success: true,
        base64Data: matches[2],
        mimeType: matches[1],
      };
    }

    // Fetch the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      return {
        success: false,
        error: `Failed to fetch image: ${response.status} ${response.statusText}`,
      };
    }

    const contentType = response.headers.get("Content-Type") || "image/jpeg";
    const arrayBuffer = await response.arrayBuffer();

    // Convert to base64
    const base64Data = Buffer.from(arrayBuffer).toString("base64");

    return {
      success: true,
      base64Data,
      mimeType: contentType,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      error: `Failed to fetch image: ${errorMessage}`,
    };
  }
}

/**
 * Make a single Gemini API call to generate one image.
 * Internal helper used by generateImage.
 */
async function generateSingleImage(
  apiKey: string,
  fullPrompt: string,
  format: { width: number; height: number; aspectRatio: string },
  inputImages?: InputImage[],
  imageSize: "1K" | "2K" = "2K"
): Promise<GenerateImageResponse> {
  const startTime = Date.now();

  try {
    const modelId = "gemini-3-pro-image-preview";
    const url = `${GEMINI_API_URL}/${modelId}:generateContent`;

    // Build parts array - start with any input images, then add the text prompt
    const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

    // Process input images if provided (for image editing/composition)
    if (inputImages && inputImages.length > 0) {
      for (const inputImage of inputImages) {
        let base64Data = inputImage.base64Data;
        let mimeType = inputImage.mimeType || "image/jpeg";

        // Fetch and convert if base64 not provided
        if (!base64Data) {
          const fetchResult = await fetchImageAsBase64(inputImage.url);
          if (fetchResult.success) {
            base64Data = fetchResult.base64Data;
            mimeType = fetchResult.mimeType;
          } else {
            console.warn(`Failed to fetch input image: ${fetchResult.error}`);
            continue;
          }
        }

        parts.push({
          inlineData: {
            mimeType,
            data: base64Data,
          },
        });
      }
    }

    // Add the text prompt after images
    parts.push({ text: fullPrompt });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{
          parts
        }],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
          imageConfig: {
            aspectRatio: format.aspectRatio,
            imageSize: imageSize,
          }
        }
      }),
    });

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      const retrySeconds = retryAfter ? parseInt(retryAfter, 10) : 60;

      return {
        success: false,
        error: `Rate limit exceeded. Please retry after ${retrySeconds} seconds.`,
        code: "RATE_LIMIT_EXCEEDED",
        retryable: true,
      };
    }

    // Handle server errors
    if (response.status >= 500) {
      return {
        success: false,
        error: `Gemini API server error: ${response.status} ${response.statusText}`,
        code: `SERVER_ERROR_${response.status}`,
        retryable: true,
      };
    }

    // Handle client errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as GeminiApiResponse;

      return {
        success: false,
        error: errorData?.error?.message || `API error: ${response.status} ${response.statusText}`,
        code: errorData?.error?.status || `HTTP_${response.status}`,
        retryable: false,
      };
    }

    const data = (await response.json()) as GeminiApiResponse;

    // Check for API-level errors
    if (data.error) {
      return {
        success: false,
        error: data.error.message || "Unknown API error",
        code: data.error.status || "UNKNOWN_ERROR",
        retryable: false,
      };
    }

    // Extract images from response
    const images: GeneratedImage[] = [];
    const endTime = Date.now();
    const generationTimeMs = endTime - startTime;

    if (data.candidates && data.candidates.length > 0) {
      for (const candidate of data.candidates) {
        if (candidate.content?.parts) {
          for (const part of candidate.content.parts) {
            if (part.inlineData) {
              const base64Data = part.inlineData.data;
              const mimeType = part.inlineData.mimeType || "image/png";

              images.push({
                url: `data:${mimeType};base64,${base64Data}`,
                width: format.width,
                height: format.height,
                contentType: mimeType,
                seed: Date.now(), // Gemini doesn't return seeds
                generationTimeMs,
                base64Data,
              });
            }
          }
        }
      }
    }

    if (images.length === 0) {
      // Check if the model refused to generate
      const textResponse = data.candidates?.[0]?.content?.parts?.find(p => p.text)?.text;
      if (textResponse) {
        return {
          success: false,
          error: `Image generation was blocked or failed: ${textResponse.substring(0, 200)}`,
          code: "GENERATION_BLOCKED",
          retryable: false,
        };
      }

      return {
        success: false,
        error: "No images were generated in the response",
        code: "NO_IMAGES",
        retryable: true,
      };
    }

    return {
      success: true,
      images,
      prompt: "",
      stylePreset: "clean-modern",
      outputFormat: "1080x1080",
      totalTimeMs: generationTimeMs,
    };
  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError && error.message.includes("fetch")) {
      return {
        success: false,
        error: "Network error: Unable to connect to Gemini API",
        code: "NETWORK_ERROR",
        retryable: true,
      };
    }

    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    return {
      success: false,
      error: errorMessage,
      code: "UNKNOWN_ERROR",
      retryable: false,
    };
  }
}

/**
 * Generate images using Gemini (Nano Banana Pro)
 *
 * Makes multiple sequential API calls when count > 1, since the
 * Gemini REST API only returns one image per request.
 *
 * @param request - Image generation parameters
 * @returns Generated image data or error
 */
export async function generateImage(
  request: GenerateImageRequest
): Promise<GenerateImageResponse> {
  const apiKey = process.env.NANO_BANANA_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error: "Nano Banana Pro API key is not configured (NANO_BANANA_API_KEY)",
      code: "MISSING_API_KEY",
      retryable: false,
    };
  }

  // Validate output format
  if (!outputFormats[request.outputFormat]) {
    return {
      success: false,
      error: `Invalid output format: ${request.outputFormat}. Supported formats: ${Object.keys(outputFormats).join(", ")}`,
      code: "INVALID_OUTPUT_FORMAT",
      retryable: false,
    };
  }

  // Validate style preset
  if (!stylePresets.includes(request.stylePreset)) {
    return {
      success: false,
      error: `Invalid style preset: ${request.stylePreset}. Supported presets: ${stylePresets.join(", ")}`,
      code: "INVALID_STYLE_PRESET",
      retryable: false,
    };
  }

  const format = outputFormats[request.outputFormat];
  const fullPrompt = buildFullPrompt(request.prompt, request.stylePreset, request.negativePrompt);
  const count = Math.max(1, Math.min(4, request.count || 1));
  const startTime = Date.now();

  // Make sequential API calls for each requested image
  const allImages: GeneratedImage[] = [];
  let lastError: GenerateImageError | null = null;

  for (let i = 0; i < count; i++) {
    const result = await generateSingleImage(
      apiKey,
      fullPrompt,
      format,
      request.inputImages,
      request.imageSize ?? "2K"
    );

    if (result.success) {
      allImages.push(...result.images);
    } else {
      lastError = result;
      console.warn(`Image generation ${i + 1}/${count} failed: ${result.error}`);
    }

    // Small delay between sequential requests to avoid rate limiting
    if (i < count - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  const totalTimeMs = Date.now() - startTime;

  // Return error only if no images were generated at all
  if (allImages.length === 0 && lastError) {
    return lastError;
  }

  if (allImages.length === 0) {
    return {
      success: false,
      error: "No images were generated",
      code: "NO_IMAGES",
      retryable: true,
    };
  }

  return {
    success: true,
    images: allImages,
    prompt: request.prompt,
    stylePreset: request.stylePreset,
    outputFormat: request.outputFormat,
    totalTimeMs,
  };
}

/**
 * Generate images with retry support
 *
 * @param request - Image generation parameters
 * @param maxRetries - Maximum number of retries for retryable errors
 * @param retryDelayMs - Base delay between retries in milliseconds
 * @returns Generated image data or error
 */
export async function generateImageWithRetry(
  request: GenerateImageRequest,
  maxRetries: number = 3,
  retryDelayMs: number = 2000
): Promise<GenerateImageResponse> {
  let lastError: GenerateImageError | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = await generateImage(request);

    if (result.success) {
      return result;
    }

    lastError = result;

    // Don't retry non-retryable errors
    if (!result.retryable) {
      return result;
    }

    // Don't wait after the last attempt
    if (attempt < maxRetries) {
      // Exponential backoff
      const delay = retryDelayMs * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return lastError!;
}

/**
 * Generate multiple images in batch with different formats
 *
 * @param prompt - The image prompt
 * @param stylePreset - Style preset to apply
 * @param formats - Array of output formats to generate
 * @returns Results for each format
 */
export async function generateImageBatch(
  prompt: string,
  stylePreset: StylePreset,
  formats: OutputFormat[]
): Promise<{
  success: boolean;
  results: Map<OutputFormat, GenerateImageResponse>;
  successCount: number;
  errorCount: number;
}> {
  const results = new Map<OutputFormat, GenerateImageResponse>();
  let successCount = 0;
  let errorCount = 0;

  // Generate images sequentially to avoid rate limits
  for (const format of formats) {
    const result = await generateImageWithRetry({
      prompt,
      stylePreset,
      outputFormat: format,
      count: 1,
    });

    results.set(format, result);

    if (result.success) {
      successCount++;
    } else {
      errorCount++;
    }

    // Small delay between requests
    if (formats.indexOf(format) < formats.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return {
    success: successCount > 0,
    results,
    successCount,
    errorCount,
  };
}

/**
 * Download image from URL or convert base64 to binary
 *
 * @param imageUrl - URL of the image (can be data URL or http URL)
 * @returns Image binary data with content type
 */
export async function downloadImage(
  imageUrl: string
): Promise<
  | { success: true; data: ArrayBuffer; contentType: string }
  | { success: false; error: string }
> {
  try {
    // Handle data URLs (base64)
    if (imageUrl.startsWith("data:")) {
      // Parse data URL without regex to handle large payloads efficiently
      const commaIndex = imageUrl.indexOf(",");
      if (commaIndex === -1) {
        return { success: false, error: "Invalid data URL format" };
      }

      const header = imageUrl.substring(0, commaIndex); // e.g. "data:image/jpeg;base64"
      const base64Data = imageUrl.substring(commaIndex + 1);

      // Extract content type from header
      const mimeMatch = header.match(/^data:([^;]+)/);
      const contentType = mimeMatch ? mimeMatch[1] : "image/png";

      // Use Node.js Buffer for efficient base64 decoding
      const buffer = Buffer.from(base64Data, "base64");

      return {
        success: true,
        data: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
        contentType,
      };
    }

    // Handle regular URLs
    const response = await fetch(imageUrl);

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to download image: ${response.status} ${response.statusText}`,
      };
    }

    const contentType = response.headers.get("Content-Type") || "image/png";
    const data = await response.arrayBuffer();

    return {
      success: true,
      data,
      contentType,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      error: `Failed to download image: ${errorMessage}`,
    };
  }
}

// Export constants for use in other files
export const IMAGE_GENERATION_FORMATS = outputFormats;
export const IMAGE_GENERATION_STYLES = stylePresets;
