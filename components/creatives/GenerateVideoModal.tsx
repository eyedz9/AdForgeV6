/**
 * GenerateVideoModal Component
 *
 * Modal for generating AI-powered advertising videos from the UI.
 *
 * Features:
 * - Select persona (required)
 * - Video type selector: UGC Style, Product Demo, Testimonial, Dynamic
 * - Duration selector: 4s, 6s, 8s, 12s, 15s, 30s
 * - Aspect ratio selector: 9:16, 1:1, 16:9
 * - Optional starting image upload
 * - Generate button triggers API
 * - Loading state (videos take longer)
 * - Success shows generated video
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { getPersonas } from "@/app/actions/personas";
import { getProducts } from "@/app/actions/products";
import type { Persona, Product } from "@/lib/supabase/database.types";

// Video type options
const videoTypes = [
  {
    value: "ugc-style",
    label: "UGC Style",
    description: "Handheld smartphone feel, casual and relatable",
  },
  {
    value: "product-demo",
    label: "Product Demo",
    description: "Clear product focus, professional demonstration",
  },
  {
    value: "testimonial",
    label: "Testimonial",
    description: "Person speaking naturally, genuine expression",
  },
  {
    value: "dynamic",
    label: "Dynamic",
    description: "Fast-paced, energetic, eye-catching transitions",
  },
] as const;

type VideoType = (typeof videoTypes)[number]["value"];

// Duration options
const durationOptions = [
  { value: "4s", label: "4s", description: "Quick teaser" },
  { value: "6s", label: "6s", description: "Bumper ad" },
  { value: "8s", label: "8s", description: "Short form" },
  { value: "12s", label: "12s", description: "Standard" },
  { value: "15s", label: "15s", description: "Pre-roll" },
  { value: "30s", label: "30s", description: "Full spot" },
] as const;

type VideoDuration = (typeof durationOptions)[number]["value"];

// Aspect ratio options
const aspectRatioOptions = [
  {
    value: "9:16",
    label: "Vertical",
    description: "Stories, Reels, TikTok",
    width: 9,
    height: 16,
    resolution: "1080 × 1920",
  },
  {
    value: "1:1",
    label: "Square",
    description: "Feed posts",
    width: 1,
    height: 1,
    resolution: "1080 × 1080",
  },
  {
    value: "16:9",
    label: "Horizontal",
    description: "YouTube, TV",
    width: 16,
    height: 9,
    resolution: "1920 × 1080",
  },
] as const;

type AspectRatio = (typeof aspectRatioOptions)[number]["value"];

// Demographics type for display
interface DemographicsData {
  age?: number;
  gender?: string;
  location?: string;
}

// Generated creative response from API
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

// API response types
interface GenerateApiResponse {
  success: boolean;
  creative: GeneratedCreativeResponse;
  usage?: {
    quota: { remaining: number; limit: number };
  };
  generation?: {
    prompt: string;
    video_type: string;
    duration: string;
    aspect_ratio: string;
    total_time_ms: number;
  };
}

interface QuotaErrorResponse {
  error: string;
  remaining: number;
  limit: number;
}

// Props for the modal
interface GenerateVideoModalProps {
  brandId: string;
  isOpen: boolean;
  onClose: () => void;
  onGenerated: () => void;
}

// Persona selector card component
function PersonaSelectorCard({
  persona,
  isSelected,
  onClick,
}: {
  persona: Persona;
  isSelected: boolean;
  onClick: () => void;
}) {
  const demographics = persona.demographics as DemographicsData | null;

  const demographicParts: string[] = [];
  if (demographics?.age) demographicParts.push(`${demographics.age}y`);
  if (demographics?.gender) demographicParts.push(demographics.gender);
  if (demographics?.location) demographicParts.push(demographics.location);

  return (
    <div
      className={`persona-selector-card ${isSelected ? "selected" : ""}`}
      onClick={onClick}
    >
      <div className="persona-selector-avatar">
        {persona.photo_url ? (
          <img src={persona.photo_url} alt={persona.name} />
        ) : (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        )}
      </div>
      <div className="persona-selector-info">
        <span className="persona-name">{persona.name}</span>
        {demographicParts.length > 0 && (
          <span className="persona-demographics">
            {demographicParts.join(" • ")}
          </span>
        )}
      </div>
      {isSelected && (
        <div className="selected-check">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}
    </div>
  );
}

// Generated video card component
function GeneratedVideoCard({
  creative,
}: {
  creative: GeneratedCreativeResponse;
}) {
  // Format duration for display
  const formatDuration = (seconds: number | null) => {
    if (seconds == null) return "";
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="generated-video-card">
      <div className="video-preview">
        {creative.thumbnail_url ? (
          <img src={creative.thumbnail_url} alt="Video thumbnail" />
        ) : (
          <div className="video-placeholder">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
        )}
        <div className="video-play-overlay">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        </div>
        {creative.duration_seconds != null && (
          <span className="video-duration">
            {formatDuration(creative.duration_seconds)}
          </span>
        )}
      </div>
      <div className="video-info">
        {creative.dimensions && (
          <span className="video-dimensions">
            {creative.dimensions.width} × {creative.dimensions.height}
          </span>
        )}
        {creative.subtype && (
          <span className="video-subtype">
            {creative.subtype
              .replace(/-/g, " ")
              .replace(/\b\w/g, (c) => c.toUpperCase())}
          </span>
        )}
      </div>
    </div>
  );
}

export default function GenerateVideoModal({
  brandId,
  isOpen,
  onClose,
  onGenerated,
}: GenerateVideoModalProps) {
  // State
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>("");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [videoType, setVideoType] = useState<VideoType>("ugc-style");
  const [duration, setDuration] = useState<VideoDuration>("8s");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("9:16");
  const [startingImageUrl, setStartingImageUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedCreative, setGeneratedCreative] =
    useState<GeneratedCreativeResponse | null>(null);
  const [quotaInfo, setQuotaInfo] = useState<{
    remaining: number;
    limit: number;
  } | null>(null);

  // Fetch personas and products when modal opens
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [personasResult, productsResult] = await Promise.all([
        getPersonas(brandId),
        getProducts(brandId),
      ]);

      if (personasResult.success) {
        setPersonas(personasResult.data);
        // Auto-select if only one persona
        if (personasResult.data.length === 1) {
          setSelectedPersonaId(personasResult.data[0].id);
        }
      } else {
        setPersonas([]);
        console.warn("Failed to fetch personas:", personasResult.error);
      }

      if (productsResult.success) {
        setProducts(productsResult.data);
        // Auto-select if only one product
        if (productsResult.data.length === 1) {
          setSelectedProductId(productsResult.data[0].id);
        }
      } else {
        setProducts([]);
        console.warn("Failed to fetch products:", productsResult.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    }

    setLoading(false);
  }, [brandId]);

  useEffect(() => {
    if (isOpen) {
      fetchData();
      // Reset state when modal opens
      setGeneratedCreative(null);
      setQuotaInfo(null);
      setSelectedPersonaId("");
      setSelectedProductId("");
      setVideoType("ugc-style");
      setDuration("8s");
      setAspectRatio("9:16");
      setStartingImageUrl("");
    }
  }, [isOpen, fetchData]);

  // Clear starting image
  const clearStartingImage = () => {
    setStartingImageUrl("");
  };

  // Handle generate button click
  const handleGenerate = async () => {
    // Validate required fields
    if (!selectedPersonaId) {
      setError("Please select a persona");
      return;
    }

    setGenerating(true);
    setError(null);
    setGeneratedCreative(null);

    try {
      const response = await fetch("/api/generate/video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          brand_id: brandId,
          persona_id: selectedPersonaId,
          product_id: selectedProductId || null,
          video_type: videoType,
          duration: duration,
          aspect_ratio: aspectRatio,
          starting_image_url: startingImageUrl || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Handle quota exceeded
        if (response.status === 429) {
          const quotaError = errorData as QuotaErrorResponse;
          setQuotaInfo({
            remaining: quotaError.remaining,
            limit: quotaError.limit,
          });
          setError(quotaError.error);
          setGenerating(false);
          return;
        }

        setError(errorData.error || "Failed to generate video");
        setGenerating(false);
        return;
      }

      const data: GenerateApiResponse = await response.json();

      if (data.success) {
        setGeneratedCreative(data.creative);
        if (data.usage?.quota) {
          setQuotaInfo(data.usage.quota);
        }
      } else {
        setError("Failed to generate video");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate video");
    }

    setGenerating(false);
  };

  // Handle close
  const handleClose = () => {
    if (generatedCreative) {
      onGenerated();
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Generate Video</h3>
          <button
            className="modal-close"
            onClick={handleClose}
            disabled={generating}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {/* Loading state */}
          {loading && (
            <div className="modal-loading">
              <div className="spinner" />
              <p>Loading options...</p>
            </div>
          )}

          {/* Generation in progress */}
          {generating && (
            <div className="modal-generating">
              <div className="generating-animation">
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="generating-icon"
                >
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </div>
              <h4>Generating Video...</h4>
              <p className="generating-message">
                Our AI is creating a high-quality video tailored to your
                persona. Video generation takes longer than images, please be
                patient.
              </p>
              <div className="generating-steps">
                <div className="step active">
                  <span className="step-dot" />
                  Building persona-aware script
                </div>
                <div className="step active">
                  <span className="step-dot" />
                  Applying {videoTypes.find((t) => t.value === videoType)?.label}{" "}
                  style
                </div>
                <div className="step active">
                  <span className="step-dot" />
                  Rendering {duration} video at{" "}
                  {aspectRatioOptions.find((a) => a.value === aspectRatio)
                    ?.resolution || aspectRatio}
                </div>
              </div>
              <p className="generating-time-note">
                This may take 30-60 seconds depending on duration
              </p>
            </div>
          )}

          {/* Success state */}
          {!loading && !generating && generatedCreative && (
            <div className="modal-success">
              <div className="success-header">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#059669"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <div>
                  <h4>Video Generated Successfully!</h4>
                  {quotaInfo && (
                    <p className="quota-remaining">
                      {quotaInfo.remaining} of {quotaInfo.limit} videos remaining
                      this month
                    </p>
                  )}
                </div>
              </div>

              <div className="generated-video-container">
                <video
                  src={generatedCreative.file_url}
                  controls
                  poster={generatedCreative.thumbnail_url || undefined}
                  className="generated-video-player"
                />
              </div>

              <div className="generated-video-details">
                <GeneratedVideoCard creative={generatedCreative} />
              </div>
            </div>
          )}

          {/* Form state */}
          {!loading && !generating && !generatedCreative && (
            <div className="modal-form">
              {/* Error display */}
              {error && (
                <div className="form-error">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{error}</span>
                  {quotaInfo && quotaInfo.remaining === 0 && (
                    <a href="/settings/subscription" className="upgrade-link">
                      Upgrade Plan
                    </a>
                  )}
                </div>
              )}

              {/* No personas warning */}
              {personas.length === 0 && (
                <div className="form-warning">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <div>
                    <strong>No personas available</strong>
                    <p>
                      Create a persona first to generate videos tailored to your
                      target audience.
                    </p>
                  </div>
                </div>
              )}

              {/* Persona selection */}
              {personas.length > 0 && (
                <div className="form-group">
                  <label>
                    Select Persona <span className="required">*</span>
                  </label>
                  <div className="persona-selector-grid">
                    {personas.map((persona) => (
                      <PersonaSelectorCard
                        key={persona.id}
                        persona={persona}
                        isSelected={selectedPersonaId === persona.id}
                        onClick={() => setSelectedPersonaId(persona.id)}
                      />
                    ))}
                  </div>
                  <p className="form-hint">
                    Videos will feature this persona&apos;s characteristics.
                  </p>
                </div>
              )}

              {/* Product selection (optional) */}
              {products.length > 0 && (
                <div className="form-group">
                  <label htmlFor="product-select">Product (Optional)</label>
                  <select
                    id="product-select"
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="form-select"
                  >
                    <option value="">No specific product</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                  <p className="form-hint">
                    Optionally feature a product in the video.
                  </p>
                </div>
              )}

              {/* Video type selection */}
              <div className="form-group">
                <label>Video Type</label>
                <div className="options-grid video-type-grid">
                  {videoTypes.map((type) => (
                    <div
                      key={type.value}
                      className={`option-card ${
                        videoType === type.value ? "selected" : ""
                      }`}
                      onClick={() => setVideoType(type.value)}
                    >
                      <span className="option-label">{type.label}</span>
                      <span className="option-description">
                        {type.description}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Duration selection */}
              <div className="form-group">
                <label>Duration</label>
                <div className="duration-options">
                  {durationOptions.map((opt) => (
                    <div
                      key={opt.value}
                      className={`duration-option ${
                        duration === opt.value ? "selected" : ""
                      }`}
                      onClick={() => setDuration(opt.value)}
                    >
                      <span className="duration-value">{opt.label}</span>
                      <span className="duration-desc">{opt.description}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Aspect ratio selection */}
              <div className="form-group">
                <label>Aspect Ratio</label>
                <div className="aspect-ratio-options">
                  {aspectRatioOptions.map((opt) => (
                    <div
                      key={opt.value}
                      className={`aspect-ratio-option ${
                        aspectRatio === opt.value ? "selected" : ""
                      }`}
                      onClick={() => setAspectRatio(opt.value)}
                    >
                      <div
                        className="aspect-ratio-preview"
                        style={{
                          aspectRatio: `${opt.width} / ${opt.height}`,
                        }}
                      >
                        <span className="aspect-ratio-value">{opt.value}</span>
                      </div>
                      <span className="aspect-ratio-label">{opt.label}</span>
                      <span className="aspect-ratio-desc">{opt.description}</span>
                      <span className="aspect-ratio-resolution">
                        {opt.resolution}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Starting image (optional) */}
              <div className="form-group">
                <label>Starting Image (Optional)</label>
                <p className="form-hint starting-image-hint">
                  Provide an image to use as the first frame. This can help
                  establish the visual style and scene.
                </p>
                <div className="starting-image-input">
                  <input
                    type="url"
                    value={startingImageUrl}
                    onChange={(e) => setStartingImageUrl(e.target.value)}
                    placeholder="Enter image URL..."
                    className="form-input"
                  />
                  {startingImageUrl && (
                    <button
                      type="button"
                      className="clear-image-btn"
                      onClick={clearStartingImage}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>
                {startingImageUrl && (
                  <div className="starting-image-preview">
                    <img
                      src={startingImageUrl}
                      alt="Starting frame preview"
                      onError={() => setError("Could not load image from URL")}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {/* Form buttons */}
          {!generating && !generatedCreative && (
            <>
              <button
                className="btn-cancel"
                onClick={handleClose}
                disabled={generating}
              >
                Cancel
              </button>
              <button
                className="btn-generate"
                onClick={handleGenerate}
                disabled={
                  generating || loading || personas.length === 0 || !selectedPersonaId
                }
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Generate Video
              </button>
            </>
          )}

          {/* Success buttons */}
          {!generating && generatedCreative && (
            <>
              <button
                className="btn-generate-more"
                onClick={() => {
                  setGeneratedCreative(null);
                }}
              >
                Generate Another
              </button>
              <button className="btn-done" onClick={handleClose}>
                Done
              </button>
            </>
          )}

          {/* Generating - just cancel button */}
          {generating && (
            <button className="btn-cancel" disabled>
              Generating...
            </button>
          )}
        </div>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }
        .modal-content {
          background: var(--color-surface);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          max-width: 700px;
          width: 100%;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          flex-shrink: 0;
        }
        .modal-header h3 {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--color-text-primary);
          margin: 0;
        }
        .modal-close {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: none;
          border: none;
          color: var(--color-text-muted);
          cursor: pointer;
          border-radius: 6px;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .modal-close:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.06);
          color: var(--color-text-primary);
        }
        .modal-close:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .modal-body {
          padding: 1.5rem;
          overflow-y: auto;
          flex: 1;
        }
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          padding: 1rem 1.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          flex-shrink: 0;
        }

        /* Loading state */
        .modal-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 1rem;
        }
        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid rgba(255, 255, 255, 0.08);
          border-top-color: var(--color-plasma-violet);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        .modal-loading p {
          margin: 1rem 0 0;
          color: var(--color-text-muted);
          font-size: 0.9375rem;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Generating state */
        .modal-generating {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem 1rem;
          text-align: center;
        }
        .generating-animation {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, var(--color-plasma-violet), var(--color-plasma-purple));
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.5rem;
          animation: pulse 2s ease-in-out infinite;
          box-shadow: 0 0 15px rgba(139, 92, 246, 0.25);
        }
        .generating-icon {
          color: white;
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        .modal-generating h4 {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--color-text-primary);
          margin: 0 0 0.5rem;
        }
        .generating-message {
          font-size: 0.875rem;
          color: var(--color-text-muted);
          margin: 0 0 1.5rem;
          max-width: 400px;
          line-height: 1.5;
        }
        .generating-steps {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          text-align: left;
        }
        .step {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          color: var(--color-text-muted);
        }
        .step.active {
          color: var(--color-plasma-violet);
        }
        .step-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: currentColor;
        }
        .step.active .step-dot {
          animation: dotPulse 1s ease-in-out infinite;
        }
        @keyframes dotPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .generating-time-note {
          margin: 1rem 0 0;
          font-size: 0.75rem;
          color: var(--color-text-muted);
        }

        /* Success state */
        .modal-success {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .success-header {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .success-header h4 {
          font-size: 1rem;
          font-weight: 600;
          color: var(--color-text-primary);
          margin: 0;
        }
        .quota-remaining {
          font-size: 0.8125rem;
          color: var(--color-text-muted);
          margin: 0.25rem 0 0;
        }
        .generated-video-container {
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          overflow: hidden;
        }
        .generated-video-player {
          width: 100%;
          max-height: 400px;
          display: block;
        }
        .generated-video-details {
          margin-top: 0.5rem;
        }
        .generated-video-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          overflow: hidden;
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem;
        }
        .video-preview {
          position: relative;
          width: 80px;
          height: 80px;
          border-radius: 6px;
          overflow: hidden;
          background: rgba(0, 0, 0, 0.3);
          flex-shrink: 0;
        }
        .video-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .video-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-text-muted);
        }
        .video-play-overlay {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 32px;
          height: 32px;
          background: rgba(0, 0, 0, 0.6);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .video-duration {
          position: absolute;
          bottom: 4px;
          right: 4px;
          padding: 0.125rem 0.375rem;
          background: rgba(0, 0, 0, 0.75);
          color: white;
          border-radius: 4px;
          font-size: 0.6875rem;
          font-weight: 500;
        }
        .video-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .video-dimensions {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--color-text-secondary);
        }
        .video-subtype {
          font-size: 0.75rem;
          color: var(--color-text-muted);
        }

        /* Form state */
        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .form-error {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: rgba(244, 63, 94, 0.15);
          border: 1px solid rgba(244, 63, 94, 0.3);
          border-radius: 8px;
          color: #f87171;
          font-size: 0.875rem;
        }
        .upgrade-link {
          margin-left: auto;
          color: var(--color-plasma-violet);
          font-weight: 500;
          text-decoration: none;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .upgrade-link:hover {
          text-decoration: underline;
        }
        .form-warning {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.875rem 1rem;
          background: rgba(245, 158, 11, 0.15);
          border: 1px solid rgba(245, 158, 11, 0.3);
          border-radius: 8px;
          color: #fbbf24;
        }
        .form-warning strong {
          font-size: 0.875rem;
          display: block;
          margin-bottom: 0.25rem;
        }
        .form-warning p {
          font-size: 0.8125rem;
          margin: 0;
          opacity: 0.9;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .form-group label {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--color-text-secondary);
        }
        .required {
          color: #f87171;
        }
        .form-select,
        .form-input {
          padding: 0.625rem 0.75rem;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          font-size: 0.9375rem;
          color: var(--color-text-primary);
          background: var(--color-surface);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .form-select {
          padding-right: 2rem;
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
          background-position: right 0.5rem center;
          background-repeat: no-repeat;
          background-size: 1.5rem;
          appearance: none;
          cursor: pointer;
        }
        .form-select:focus,
        .form-input:focus {
          outline: none;
          border-color: var(--color-plasma-violet);
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15);
        }
        .form-input:disabled {
          background: rgba(255, 255, 255, 0.03);
          cursor: not-allowed;
        }
        .form-hint {
          font-size: 0.8125rem;
          color: var(--color-text-muted);
          margin: 0;
        }
        .starting-image-hint {
          margin-bottom: 0.5rem;
        }

        /* Persona selector */
        .persona-selector-grid {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          max-height: 200px;
          overflow-y: auto;
        }
        .persona-selector-card {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.03);
          border: 2px solid transparent;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .persona-selector-card:hover {
          background: rgba(255, 255, 255, 0.06);
        }
        .persona-selector-card.selected {
          background: rgba(139, 92, 246, 0.12);
          border-color: var(--color-plasma-violet);
        }
        .persona-selector-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--color-plasma-violet), var(--color-plasma-purple));
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          overflow: hidden;
          flex-shrink: 0;
        }
        .persona-selector-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .persona-selector-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
          min-width: 0;
        }
        .persona-name {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--color-text-primary);
        }
        .persona-demographics {
          font-size: 0.75rem;
          color: var(--color-text-muted);
        }
        .selected-check {
          width: 24px;
          height: 24px;
          background: linear-gradient(135deg, var(--color-plasma-violet), var(--color-plasma-purple));
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        /* Options grid */
        .options-grid {
          display: grid;
          gap: 0.5rem;
        }
        .video-type-grid {
          grid-template-columns: repeat(2, 1fr);
        }
        .option-card {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.03);
          border: 2px solid transparent;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .option-card:hover {
          background: rgba(255, 255, 255, 0.06);
        }
        .option-card.selected {
          background: rgba(139, 92, 246, 0.12);
          border-color: var(--color-plasma-violet);
        }
        .option-label {
          font-size: 0.8125rem;
          font-weight: 500;
          color: var(--color-text-primary);
        }
        .option-description {
          font-size: 0.6875rem;
          color: var(--color-text-muted);
          line-height: 1.3;
        }

        /* Duration options */
        .duration-options {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .duration-option {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
          padding: 0.625rem 0.875rem;
          background: rgba(255, 255, 255, 0.03);
          border: 2px solid transparent;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          min-width: 70px;
        }
        .duration-option:hover {
          background: rgba(255, 255, 255, 0.06);
        }
        .duration-option.selected {
          background: rgba(139, 92, 246, 0.12);
          border-color: var(--color-plasma-violet);
        }
        .duration-value {
          font-size: 1rem;
          font-weight: 600;
          color: var(--color-text-primary);
        }
        .duration-desc {
          font-size: 0.625rem;
          color: var(--color-text-muted);
          text-align: center;
        }

        /* Aspect ratio options */
        .aspect-ratio-options {
          display: flex;
          gap: 0.75rem;
        }
        .aspect-ratio-option {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.03);
          border: 2px solid transparent;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          flex: 1;
        }
        .aspect-ratio-option:hover {
          background: rgba(255, 255, 255, 0.06);
        }
        .aspect-ratio-option.selected {
          background: rgba(139, 92, 246, 0.12);
          border-color: var(--color-plasma-violet);
        }
        .aspect-ratio-preview {
          width: 50px;
          max-height: 70px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .aspect-ratio-value {
          font-size: 0.625rem;
          font-weight: 500;
          color: var(--color-text-muted);
        }
        .aspect-ratio-label {
          font-size: 0.8125rem;
          font-weight: 500;
          color: var(--color-text-primary);
        }
        .aspect-ratio-desc {
          font-size: 0.6875rem;
          color: var(--color-text-muted);
          text-align: center;
        }
        .aspect-ratio-resolution {
          font-size: 0.625rem;
          color: var(--color-text-muted);
        }

        /* Starting image input */
        .starting-image-input {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }
        .starting-image-input .form-input {
          flex: 1;
        }
        .clear-image-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          color: var(--color-text-muted);
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .clear-image-btn:hover {
          background: rgba(255, 255, 255, 0.06);
          color: var(--color-text-secondary);
        }
        .starting-image-preview {
          margin-top: 0.5rem;
          max-width: 200px;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .starting-image-preview img {
          width: 100%;
          display: block;
        }

        /* Buttons */
        .btn-cancel {
          padding: 0.625rem 1rem;
          background: rgba(255, 255, 255, 0.03);
          color: var(--color-text-secondary);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          font-size: 0.9375rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .btn-cancel:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.06);
        }
        .btn-cancel:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .btn-generate {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1.25rem;
          background: linear-gradient(135deg, var(--color-plasma-violet), var(--color-plasma-purple));
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.9375rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 0 15px rgba(139, 92, 246, 0.25);
        }
        .btn-generate:hover:not(:disabled) {
          box-shadow: 0 0 20px rgba(139, 92, 246, 0.4);
          transform: translateY(-1px);
        }
        .btn-generate:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          box-shadow: none;
        }
        .btn-generate-more {
          padding: 0.625rem 1rem;
          background: var(--color-surface);
          color: var(--color-plasma-violet);
          border: 1px solid var(--color-plasma-violet);
          border-radius: 8px;
          font-size: 0.9375rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .btn-generate-more:hover {
          background: rgba(139, 92, 246, 0.12);
        }
        .btn-done {
          padding: 0.625rem 1.25rem;
          background: linear-gradient(135deg, var(--color-plasma-violet), var(--color-plasma-purple));
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.9375rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 0 15px rgba(139, 92, 246, 0.25);
        }
        .btn-done:hover {
          box-shadow: 0 0 20px rgba(139, 92, 246, 0.4);
          transform: translateY(-1px);
        }

        @media (max-width: 640px) {
          .modal-content {
            max-height: 100vh;
            border-radius: 0;
          }
          .video-type-grid {
            grid-template-columns: 1fr;
          }
          .duration-options {
            justify-content: center;
          }
          .aspect-ratio-options {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
