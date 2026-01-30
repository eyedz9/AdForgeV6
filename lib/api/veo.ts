/**
 * Veo 3.1 API client for video generation
 * Uses Google's Veo 3.1 model to generate high-quality advertising videos
 *
 * Documentation: https://cloud.google.com/vertex-ai/docs/generative-ai/video/overview
 */

// Veo 3.1 API configuration
const VEO_API_URL =
  process.env.VEO_API_URL ||
  `https://generativelanguage.googleapis.com/v1beta/models/veo-3.1:generateVideo`;

/**
 * Supported video durations in seconds
 */
export const videoDurations = [4, 6, 8, 12, 15, 30] as const;

export type VideoDuration = (typeof videoDurations)[number];

/**
 * Duration labels for UI display
 */
export const videoDurationLabels: Record<VideoDuration, string> = {
  4: "4 seconds (Quick)",
  6: "6 seconds (Short)",
  8: "8 seconds (Standard)",
  12: "12 seconds (Extended)",
  15: "15 seconds (Long)",
  30: "30 seconds (Full)",
};

/**
 * Supported aspect ratios
 */
export const aspectRatios = ["9:16", "1:1", "16:9"] as const;

export type AspectRatio = (typeof aspectRatios)[number];

/**
 * Aspect ratio labels for UI display
 */
export const aspectRatioLabels: Record<AspectRatio, string> = {
  "9:16": "Vertical (9:16) - Stories, Reels, TikTok",
  "1:1": "Square (1:1) - Feed Posts",
  "16:9": "Horizontal (16:9) - YouTube, TV",
};

/**
 * Resolution mapping based on aspect ratio
 */
export const aspectRatioResolutions: Record<
  AspectRatio,
  { width: number; height: number }
> = {
  "9:16": { width: 1080, height: 1920 },
  "1:1": { width: 1080, height: 1080 },
  "16:9": { width: 1920, height: 1080 },
};

/**
 * Video type presets for different ad formats
 */
export const videoTypes = [
  "ugc-style",
  "product-demo",
  "testimonial",
  "dynamic",
] as const;

export type VideoType = (typeof videoTypes)[number];

/**
 * Video type labels for UI display
 */
export const videoTypeLabels: Record<VideoType, string> = {
  "ugc-style": "UGC Style",
  "product-demo": "Product Demo",
  testimonial: "Testimonial",
  dynamic: "Dynamic",
};

/**
 * Video generation request parameters
 */
export interface GenerateVideoRequest {
  /**
   * The prompt describing the video to generate
   */
  prompt: string;

  /**
   * Video duration in seconds
   */
  duration: VideoDuration;

  /**
   * Aspect ratio for the video
   */
  aspectRatio: AspectRatio;

  /**
   * Optional URL of starting image (image-to-video generation)
   */
  startingImageUrl?: string;

  /**
   * Optional video type for style guidance
   */
  videoType?: VideoType;

  /**
   * Optional negative prompt to exclude certain elements
   */
  negativePrompt?: string;

  /**
   * Seed for reproducible generation
   */
  seed?: number;

  /**
   * Motion amount (1-10, higher = more motion)
   * @default 5
   */
  motionAmount?: number;

  /**
   * CFG scale for prompt adherence (1-20)
   * @default 7.5
   */
  cfgScale?: number;
}

/**
 * Generated video data
 */
export interface GeneratedVideo {
  /**
   * URL to the generated video
   */
  url: string;

  /**
   * Video dimensions
   */
  width: number;
  height: number;

  /**
   * Video duration in seconds
   */
  durationSeconds: number;

  /**
   * Content type
   */
  contentType: string;

  /**
   * Seed used for this generation
   */
  seed: number;

  /**
   * Time taken to generate in milliseconds
   */
  generationTimeMs: number;

  /**
   * Thumbnail URL if available
   */
  thumbnailUrl?: string;
}

/**
 * Video generation result
 */
export interface GenerateVideoResult {
  success: true;
  video: GeneratedVideo;
  prompt: string;
  duration: VideoDuration;
  aspectRatio: AspectRatio;
  totalTimeMs: number;
}

export interface GenerateVideoError {
  success: false;
  error: string;
  code: string;
  retryable: boolean;
}

export type GenerateVideoResponse = GenerateVideoResult | GenerateVideoError;

/**
 * Veo 3.1 API response structure
 */
interface VeoApiResponse {
  name?: string; // Operation name for async polling
  done?: boolean;
  result?: {
    video?: {
      uri: string;
      mimeType: string;
      width: number;
      height: number;
      durationSeconds: number;
      thumbnailUri?: string;
    };
    seed?: number;
    generationTimeMs?: number;
  };
  error?: {
    code: number;
    message: string;
    status?: string;
  };
  metadata?: {
    "@type": string;
  };
}

/**
 * Build video type-specific prompt modifiers
 */
function buildVideoTypePrompt(videoType?: VideoType): string {
  if (!videoType) return "";

  switch (videoType) {
    case "ugc-style":
      return "user-generated content style, authentic, handheld camera feel, casual, relatable, natural movements, unscripted feeling";
    case "product-demo":
      return "product demonstration, clear product focus, smooth camera movements, professional lighting, showcasing features";
    case "testimonial":
      return "testimonial style, person speaking to camera, genuine expression, conversational tone, engaging";
    case "dynamic":
      return "dynamic motion, fast cuts, energetic, eye-catching transitions, bold visuals, action-packed";
    default:
      return "";
  }
}

/**
 * Build the full prompt with video type modifiers
 */
function buildFullPrompt(prompt: string, videoType?: VideoType): string {
  const typeModifier = buildVideoTypePrompt(videoType);
  const basePrompt = typeModifier
    ? `${prompt}, ${typeModifier}`
    : prompt;
  return `${basePrompt}, high-quality video, professional production, advertising quality`;
}

/**
 * Default negative prompt to ensure video quality
 */
const DEFAULT_NEGATIVE_PROMPT =
  "blurry, low quality, distorted, glitchy, watermark, logo overlay, text overlay, grainy, pixelated, static, choppy motion, artifacts";

/**
 * Poll for video generation completion
 */
async function pollForCompletion(
  operationName: string,
  apiKey: string,
  maxWaitMs: number = 300000, // 5 minutes max
  pollIntervalMs: number = 5000 // Poll every 5 seconds
): Promise<VeoApiResponse> {
  const baseUrl = process.env.VEO_API_URL
    ? process.env.VEO_API_URL.replace(/\/models\/.*$/, "")
    : "https://generativelanguage.googleapis.com/v1beta";

  const pollUrl = `${baseUrl}/operations/${operationName}?key=${apiKey}`;
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const response = await fetch(pollUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Poll request failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as VeoApiResponse;

    if (data.done) {
      return data;
    }

    if (data.error) {
      return data;
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error("Video generation timed out");
}

/**
 * Generate video using Veo 3.1
 *
 * @param request - Video generation parameters
 * @returns Generated video data or error
 */
export async function generateVideo(
  request: GenerateVideoRequest
): Promise<GenerateVideoResponse> {
  const apiKey = process.env.VEO_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      error: "Veo API key is not configured",
      code: "MISSING_API_KEY",
      retryable: false,
    };
  }

  // Validate duration
  if (!videoDurations.includes(request.duration)) {
    return {
      success: false,
      error: `Invalid duration: ${request.duration}. Supported durations: ${videoDurations.join(", ")}`,
      code: "INVALID_DURATION",
      retryable: false,
    };
  }

  // Validate aspect ratio
  if (!aspectRatios.includes(request.aspectRatio)) {
    return {
      success: false,
      error: `Invalid aspect ratio: ${request.aspectRatio}. Supported ratios: ${aspectRatios.join(", ")}`,
      code: "INVALID_ASPECT_RATIO",
      retryable: false,
    };
  }

  const resolution = aspectRatioResolutions[request.aspectRatio];
  const fullPrompt = buildFullPrompt(request.prompt, request.videoType);
  const negativePrompt = request.negativePrompt || DEFAULT_NEGATIVE_PROMPT;

  try {
    const requestBody: Record<string, unknown> = {
      prompt: fullPrompt,
      negativePrompt: negativePrompt,
      durationSeconds: request.duration,
      aspectRatio: request.aspectRatio,
      outputWidth: resolution.width,
      outputHeight: resolution.height,
      motionAmount: request.motionAmount ?? 5,
      cfgScale: request.cfgScale ?? 7.5,
    };

    // Add starting image for image-to-video if provided
    if (request.startingImageUrl) {
      requestBody.imageUri = request.startingImageUrl;
      requestBody.generationMode = "IMAGE_TO_VIDEO";
    } else {
      requestBody.generationMode = "TEXT_TO_VIDEO";
    }

    // Add seed if provided
    if (request.seed !== undefined) {
      requestBody.seed = request.seed;
    }

    const apiUrl = `${VEO_API_URL}?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Client-Id": "adforge",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: fullPrompt,
              },
            ],
          },
        ],
        generationConfig: requestBody,
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

    // Handle quota exceeded
    if (response.status === 403) {
      return {
        success: false,
        error: "Quota exceeded or access denied. Please check your Veo API access.",
        code: "QUOTA_EXCEEDED",
        retryable: false,
      };
    }

    // Handle server errors
    if (response.status >= 500) {
      return {
        success: false,
        error: `Veo server error: ${response.status} ${response.statusText}`,
        code: `SERVER_ERROR_${response.status}`,
        retryable: true,
      };
    }

    // Handle client errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const apiError = errorData as { error?: { code?: number; message?: string } };

      return {
        success: false,
        error: apiError?.error?.message || `API error: ${response.status} ${response.statusText}`,
        code: apiError?.error?.code?.toString() || `HTTP_${response.status}`,
        retryable: false,
      };
    }

    const data = (await response.json()) as VeoApiResponse;

    // Handle async operation - need to poll for completion
    if (data.name && !data.done) {
      const startTime = Date.now();
      const completedData = await pollForCompletion(data.name, apiKey);
      const totalTimeMs = Date.now() - startTime;

      if (completedData.error) {
        return {
          success: false,
          error: completedData.error.message,
          code: completedData.error.status || `ERROR_${completedData.error.code}`,
          retryable: completedData.error.code >= 500,
        };
      }

      if (!completedData.result?.video) {
        return {
          success: false,
          error: "No video in response after completion",
          code: "NO_VIDEO_RESULT",
          retryable: false,
        };
      }

      const video = completedData.result.video;
      const generatedVideo: GeneratedVideo = {
        url: video.uri,
        width: video.width,
        height: video.height,
        durationSeconds: video.durationSeconds,
        contentType: video.mimeType || "video/mp4",
        seed: completedData.result.seed ?? Math.floor(Math.random() * 1000000),
        generationTimeMs: completedData.result.generationTimeMs ?? totalTimeMs,
        thumbnailUrl: video.thumbnailUri,
      };

      return {
        success: true,
        video: generatedVideo,
        prompt: request.prompt,
        duration: request.duration,
        aspectRatio: request.aspectRatio,
        totalTimeMs,
      };
    }

    // Handle synchronous response (if API returns immediately)
    if (data.error) {
      return {
        success: false,
        error: data.error.message,
        code: data.error.status || `ERROR_${data.error.code}`,
        retryable: data.error.code >= 500,
      };
    }

    if (!data.result?.video) {
      return {
        success: false,
        error: "No video in API response",
        code: "NO_VIDEO_RESULT",
        retryable: false,
      };
    }

    const video = data.result.video;
    const generatedVideo: GeneratedVideo = {
      url: video.uri,
      width: video.width,
      height: video.height,
      durationSeconds: video.durationSeconds,
      contentType: video.mimeType || "video/mp4",
      seed: data.result.seed ?? Math.floor(Math.random() * 1000000),
      generationTimeMs: data.result.generationTimeMs ?? 0,
      thumbnailUrl: video.thumbnailUri,
    };

    return {
      success: true,
      video: generatedVideo,
      prompt: request.prompt,
      duration: request.duration,
      aspectRatio: request.aspectRatio,
      totalTimeMs: generatedVideo.generationTimeMs,
    };
  } catch (error) {
    // Handle timeout
    if (error instanceof Error && error.message.includes("timed out")) {
      return {
        success: false,
        error: "Video generation timed out. Please try again.",
        code: "TIMEOUT",
        retryable: true,
      };
    }

    // Handle network errors
    if (error instanceof TypeError && error.message.includes("fetch")) {
      return {
        success: false,
        error: "Network error: Unable to connect to Veo API",
        code: "NETWORK_ERROR",
        retryable: true,
      };
    }

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return {
      success: false,
      error: errorMessage,
      code: "UNKNOWN_ERROR",
      retryable: false,
    };
  }
}

/**
 * Generate video with retry support
 *
 * @param request - Video generation parameters
 * @param maxRetries - Maximum number of retries for retryable errors
 * @param retryDelayMs - Base delay between retries in milliseconds
 * @returns Generated video data or error
 */
export async function generateVideoWithRetry(
  request: GenerateVideoRequest,
  maxRetries: number = 3,
  retryDelayMs: number = 5000
): Promise<GenerateVideoResponse> {
  let lastError: GenerateVideoError | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = await generateVideo(request);

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
 * Download video as binary data
 *
 * @param videoUrl - URL of the video to download
 * @returns Video binary data with content type
 */
export async function downloadVideo(
  videoUrl: string
): Promise<
  | { success: true; data: ArrayBuffer; contentType: string }
  | { success: false; error: string }
> {
  try {
    const response = await fetch(videoUrl);

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to download video: ${response.status} ${response.statusText}`,
      };
    }

    const contentType = response.headers.get("Content-Type") || "video/mp4";
    const data = await response.arrayBuffer();

    return {
      success: true,
      data,
      contentType,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      error: `Failed to download video: ${errorMessage}`,
    };
  }
}

// Export constants for use in other files
export const VIDEO_DURATIONS = videoDurations;
export const VIDEO_ASPECT_RATIOS = aspectRatios;
export const VIDEO_TYPES = videoTypes;
