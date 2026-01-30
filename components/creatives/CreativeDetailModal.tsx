/**
 * CreativeDetailModal Component
 *
 * A modal component for viewing detailed information about a creative (image or video).
 *
 * Features:
 * - Display full-size image or video player
 * - Show generation parameters (prompt, style, format)
 * - 5-star rating component (saves to DB)
 * - Download button (original resolution)
 * - Delete button with confirmation
 * - Associated headline/CTA if present
 */

"use client";

import { useState } from "react";
import type { Creative } from "@/lib/supabase/database.types";

// Props interface
interface CreativeDetailModalProps {
  creative: Creative;
  onClose: () => void;
  onRate: (rating: number) => void;
  onDelete: () => void;
}

// Dimensions type from JSONB
interface DimensionsData {
  width?: number;
  height?: number;
  aspectRatio?: string;
}

export default function CreativeDetailModal({
  creative,
  onClose,
  onRate,
  onDelete,
}: CreativeDetailModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const dimensions = (creative.dimensions as DimensionsData | null) ?? {};
  const isVideo = creative.creative_type === "video";
  const generationParams = creative.generation_params as Record<string, unknown> | null;

  // Format duration for videos
  const formatDuration = (seconds: number | null) => {
    if (seconds == null) return null;
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Get subtype display name
  const getSubtypeDisplay = (subtype: string | null) => {
    if (!subtype) return null;
    return subtype
      .replace(/_/g, " ")
      .replace(/-/g, " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Get style preset display name
  const getStyleDisplay = (style: unknown) => {
    if (style == null || typeof style !== "string") return null;
    return style
      .replace(/_/g, " ")
      .replace(/-/g, " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  // Handle download
  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(creative.file_url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = isVideo ? "mp4" : "png";
      a.download = `creative-${creative.id}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    setIsDeleting(true);
    onDelete();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close modal">
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

        <div className="modal-body">
          {/* Media display */}
          <div className="media-container">
            {isVideo ? (
              <video
                src={creative.file_url}
                controls
                autoPlay={false}
                className="media-player"
                poster={creative.thumbnail_url || undefined}
              />
            ) : (
              <img
                src={creative.file_url}
                alt={creative.headline || "Generated creative"}
                className="media-image"
              />
            )}
          </div>

          {/* Details sidebar */}
          <div className="details-sidebar">
            {/* Type and subtype */}
            <div className="detail-section">
              <div className="detail-type-row">
                <span className={`type-label ${isVideo ? "video" : "image"}`}>
                  {isVideo ? "Video" : "Image"}
                </span>
                {creative.subtype && (
                  <span className="subtype-label">
                    {getSubtypeDisplay(creative.subtype)}
                  </span>
                )}
              </div>
            </div>

            {/* Headline, subheadline, CTA, body copy */}
            {(creative.headline || creative.subheadline || creative.cta || creative.body_copy) && (
              <div className="detail-section">
                <h4 className="section-title">Copy</h4>
                {creative.headline && (
                  <p className="copy-headline">{creative.headline}</p>
                )}
                {creative.subheadline && (
                  <p className="copy-subheadline">{creative.subheadline}</p>
                )}
                {creative.cta && (
                  <span className="copy-cta">{creative.cta}</span>
                )}
                {creative.body_copy && (
                  <p className="copy-body">{creative.body_copy}</p>
                )}
              </div>
            )}

            {/* Rating */}
            <div className="detail-section">
              <h4 className="section-title">Rating</h4>
              <div className="rating-stars">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    className={`star-button ${
                      creative.rating != null && star <= creative.rating
                        ? "active"
                        : ""
                    }`}
                    onClick={() => onRate(star)}
                    aria-label={`Rate ${star} star${star === 1 ? "" : "s"}`}
                  >
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill={
                        creative.rating != null && star <= creative.rating
                          ? "currentColor"
                          : "none"
                      }
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </button>
                ))}
              </div>
              {creative.rating == null && (
                <p className="rating-hint">Click to rate this creative</p>
              )}
            </div>

            {/* Generation details */}
            <div className="detail-section">
              <h4 className="section-title">Generation Details</h4>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Model</span>
                  <span className="detail-value">{creative.generation_model}</span>
                </div>
                {dimensions.width && dimensions.height && (
                  <div className="detail-item">
                    <span className="detail-label">Dimensions</span>
                    <span className="detail-value">
                      {dimensions.width}×{dimensions.height}
                    </span>
                  </div>
                )}
                {isVideo && creative.duration_seconds != null && (
                  <div className="detail-item">
                    <span className="detail-label">Duration</span>
                    <span className="detail-value">
                      {formatDuration(creative.duration_seconds)}
                    </span>
                  </div>
                )}
                {generationParams?.style_preset != null && (
                  <div className="detail-item">
                    <span className="detail-label">Style</span>
                    <span className="detail-value">
                      {getStyleDisplay(generationParams.style_preset)}
                    </span>
                  </div>
                )}
                {generationParams?.output_format != null && (
                  <div className="detail-item">
                    <span className="detail-label">Format</span>
                    <span className="detail-value">
                      {String(generationParams.output_format)}
                    </span>
                  </div>
                )}
                {generationParams?.aspect_ratio != null && (
                  <div className="detail-item">
                    <span className="detail-label">Aspect Ratio</span>
                    <span className="detail-value">
                      {String(generationParams.aspect_ratio)}
                    </span>
                  </div>
                )}
                <div className="detail-item">
                  <span className="detail-label">Created</span>
                  <span className="detail-value">
                    {new Date(creative.created_at).toLocaleString()}
                  </span>
                </div>
                {creative.generation_cost != null && (
                  <div className="detail-item">
                    <span className="detail-label">Cost</span>
                    <span className="detail-value">
                      ${Number(creative.generation_cost).toFixed(4)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Prompt */}
            <div className="detail-section">
              <h4 className="section-title">Generation Prompt</h4>
              <div className="prompt-container">
                <p className="prompt-text">{creative.generation_prompt}</p>
              </div>
            </div>

            {/* Tags */}
            {creative.tags && Array.isArray(creative.tags) && creative.tags.length > 0 && (
              <div className="detail-section">
                <h4 className="section-title">Tags</h4>
                <div className="tags-container">
                  {(creative.tags as string[]).map((tag, index) => (
                    <span key={index} className="tag">{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="detail-actions">
              <button
                className="btn-download"
                onClick={handleDownload}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <>
                    <svg
                      className="spinner"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                      <path d="M12 2a10 10 0 0 1 10 10" />
                    </svg>
                    Downloading...
                  </>
                ) : (
                  <>
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
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download
                  </>
                )}
              </button>
              {!showDeleteConfirm ? (
                <button
                  className="btn-delete"
                  onClick={() => setShowDeleteConfirm(true)}
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
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  Delete
                </button>
              ) : (
                <div className="delete-confirm">
                  <div className="delete-confirm-header">
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
                    <span>Delete this creative?</span>
                  </div>
                  <p className="delete-confirm-text">
                    This action cannot be undone. The file will be permanently removed.
                  </p>
                  <div className="delete-confirm-actions">
                    <button
                      className="btn-cancel-delete"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={isDeleting}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn-confirm-delete"
                      onClick={handleDelete}
                      disabled={isDeleting}
                    >
                      {isDeleting ? "Deleting..." : "Yes, Delete"}
                    </button>
                  </div>
                </div>
              )}
            </div>
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
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            padding: 1rem;
            backdrop-filter: blur(4px);
          }

          .modal-content {
            position: relative;
            background: var(--color-surface);
            border-radius: 16px;
            max-width: 1100px;
            width: 100%;
            max-height: 90vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            border: 1px solid rgba(255, 255, 255, 0.08);
          }

          .modal-close {
            position: absolute;
            top: 1rem;
            right: 1rem;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0, 0, 0, 0.5);
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            z-index: 10;
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          }
          .modal-close:hover {
            background: rgba(0, 0, 0, 0.7);
          }

          .modal-body {
            display: flex;
            overflow: hidden;
            flex: 1;
          }

          .media-container {
            flex: 1;
            min-width: 0;
            background: #111827;
            display: flex;
            align-items: center;
            justify-content: center;
            max-height: 90vh;
          }

          .media-image {
            max-width: 100%;
            max-height: 90vh;
            object-fit: contain;
          }

          .media-player {
            max-width: 100%;
            max-height: 90vh;
            outline: none;
          }

          .details-sidebar {
            width: 380px;
            flex-shrink: 0;
            padding: 1.5rem;
            overflow-y: auto;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            gap: 1.25rem;
            background: var(--color-surface);
            border-left: 1px solid rgba(255, 255, 255, 0.08);
          }

          .detail-section {
            padding-bottom: 1.25rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          }
          .detail-section:last-of-type {
            border-bottom: none;
            padding-bottom: 0;
          }

          .detail-type-row {
            display: flex;
            align-items: center;
            gap: 0.75rem;
          }

          .type-label {
            display: inline-flex;
            padding: 0.375rem 0.75rem;
            border-radius: 6px;
            font-size: 0.875rem;
            font-weight: 500;
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          }
          .type-label.image {
            background: rgba(139, 92, 246, 0.12);
            color: var(--color-plasma-violet);
          }
          .type-label.video {
            background: rgba(220, 38, 38, 0.15);
            color: #f87171;
          }

          .subtype-label {
            font-size: 0.875rem;
            color: var(--color-text-muted);
          }

          .section-title {
            font-size: 0.75rem;
            font-weight: 600;
            color: var(--color-text-muted);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin: 0 0 0.75rem;
          }

          .copy-headline {
            font-size: 1.125rem;
            font-weight: 600;
            color: var(--color-text-primary);
            margin: 0 0 0.5rem;
            line-height: 1.4;
          }
          .copy-subheadline {
            font-size: 0.9375rem;
            color: var(--color-text-secondary);
            margin: 0 0 0.75rem;
            line-height: 1.5;
          }
          .copy-cta {
            display: inline-block;
            padding: 0.5rem 1rem;
            background: linear-gradient(135deg, var(--color-plasma-violet), var(--color-plasma-purple));
            color: white;
            border-radius: 6px;
            font-size: 0.875rem;
            font-weight: 500;
            margin-bottom: 0.5rem;
          }
          .copy-body {
            font-size: 0.875rem;
            color: var(--color-text-muted);
            margin: 0.75rem 0 0;
            line-height: 1.6;
          }

          .rating-stars {
            display: flex;
            gap: 0.375rem;
          }
          .star-button {
            padding: 0.25rem;
            background: none;
            border: none;
            cursor: pointer;
            color: rgba(255, 255, 255, 0.2);
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          }
          .star-button:hover {
            transform: scale(1.1);
            color: #fbbf24;
          }
          .star-button.active {
            color: #fbbf24;
          }
          .rating-hint {
            font-size: 0.75rem;
            color: var(--color-text-muted);
            margin: 0.5rem 0 0;
          }

          .detail-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 0.75rem;
          }

          .detail-item {
            display: flex;
            flex-direction: column;
            gap: 0.125rem;
          }
          .detail-label {
            font-size: 0.6875rem;
            font-weight: 500;
            color: var(--color-text-muted);
            text-transform: uppercase;
            letter-spacing: 0.03em;
          }
          .detail-value {
            font-size: 0.875rem;
            color: var(--color-text-secondary);
            word-break: break-word;
          }

          .prompt-container {
            background: rgba(255, 255, 255, 0.03);
            border-radius: 8px;
            max-height: 180px;
            overflow-y: auto;
            border: 1px solid rgba(255, 255, 255, 0.08);
          }
          .prompt-text {
            font-size: 0.8125rem;
            color: var(--color-text-muted);
            margin: 0;
            line-height: 1.6;
            padding: 0.875rem;
            white-space: pre-wrap;
          }

          .tags-container {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
          }
          .tag {
            display: inline-block;
            padding: 0.25rem 0.625rem;
            background: rgba(139, 92, 246, 0.15);
            color: var(--color-plasma-violet);
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 500;
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          }

          .detail-actions {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            padding-top: 0.5rem;
          }

          .btn-download,
          .btn-delete {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            padding: 0.75rem 1rem;
            border-radius: 8px;
            font-size: 0.9375rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          }

          .btn-download {
            background: linear-gradient(135deg, var(--color-plasma-violet), var(--color-plasma-purple));
            color: white;
            border: none;
            box-shadow: 0 0 20px rgba(139, 92, 246, 0.3);
          }
          .btn-download:hover:not(:disabled) {
            box-shadow: 0 0 30px rgba(139, 92, 246, 0.5);
            transform: translateY(-1px);
          }
          .btn-download:disabled {
            opacity: 0.7;
            cursor: not-allowed;
          }

          .spinner {
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          .btn-delete {
            background: rgba(255, 255, 255, 0.03);
            color: #f87171;
            border: 1px solid rgba(248, 113, 113, 0.3);
          }
          .btn-delete:hover {
            background: rgba(248, 113, 113, 0.1);
            border-color: rgba(248, 113, 113, 0.5);
          }

          .delete-confirm {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            padding: 1rem;
            background: rgba(248, 113, 113, 0.1);
            border: 1px solid rgba(248, 113, 113, 0.3);
            border-radius: 8px;
          }
          .delete-confirm-header {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            color: #f87171;
            font-weight: 500;
          }
          .delete-confirm-text {
            font-size: 0.8125rem;
            color: var(--color-text-muted);
            margin: 0;
            line-height: 1.5;
          }
          .delete-confirm-actions {
            display: flex;
            gap: 0.5rem;
          }
          .btn-confirm-delete,
          .btn-cancel-delete {
            flex: 1;
            padding: 0.625rem 1rem;
            border-radius: 6px;
            font-size: 0.875rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          }
          .btn-confirm-delete {
            background: #dc2626;
            color: white;
            border: none;
          }
          .btn-confirm-delete:hover:not(:disabled) {
            background: #b91c1c;
          }
          .btn-cancel-delete {
            background: rgba(255, 255, 255, 0.03);
            color: var(--color-text-muted);
            border: 1px solid rgba(255, 255, 255, 0.08);
          }
          .btn-cancel-delete:hover:not(:disabled) {
            background: rgba(255, 255, 255, 0.06);
          }
          .btn-confirm-delete:disabled,
          .btn-cancel-delete:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          @media (max-width: 768px) {
            .modal-body {
              flex-direction: column;
            }
            .media-container {
              max-height: 50vh;
            }
            .details-sidebar {
              width: 100%;
              max-height: none;
              border-left: none;
              border-top: 1px solid rgba(255, 255, 255, 0.08);
            }
            .detail-grid {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
