/**
 * CreativesGallery Component
 *
 * Displays a grid view of generated creatives (images and videos) for a brand.
 *
 * Features:
 * - Grid view of creative thumbnails
 * - Filter by type (image/video), persona, product
 * - Sort by date, rating
 * - Click thumbnail opens detail modal
 * - Generate Images and Generate Videos buttons
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { getCreatives, type GetCreativesFilters } from "@/app/actions/creatives";
import { getPersonas } from "@/app/actions/personas";
import { getProducts } from "@/app/actions/products";
import type { Creative, Persona, Product } from "@/lib/supabase/database.types";
import GenerateImageModal from "./GenerateImageModal";
import GenerateVideoModal from "./GenerateVideoModal";
import CreativeDetailModal from "./CreativeDetailModal";
import { EmptyState, LoadingState } from "@/components/shared";

// Props for the CreativesGallery component
interface CreativesGalleryProps {
  brandId: string;
}

// Dimensions type from JSONB
interface DimensionsData {
  width?: number;
  height?: number;
  aspectRatio?: string;
}

// Sort options
type SortOption = "date_desc" | "date_asc" | "rating_desc" | "rating_asc";

// Filter bar component
function FilterBar({
  personas,
  products,
  typeFilter,
  personaFilter,
  productFilter,
  sortOption,
  onTypeChange,
  onPersonaChange,
  onProductChange,
  onSortChange,
}: {
  personas: Persona[];
  products: Product[];
  typeFilter: string | null;
  personaFilter: string | null;
  productFilter: string | null;
  sortOption: SortOption;
  onTypeChange: (value: string | null) => void;
  onPersonaChange: (value: string | null) => void;
  onProductChange: (value: string | null) => void;
  onSortChange: (value: SortOption) => void;
}) {
  return (
    <div className="filter-bar">
      <div className="filter-group">
        <label htmlFor="type-filter">Type</label>
        <select
          id="type-filter"
          value={typeFilter || ""}
          onChange={(e) => onTypeChange(e.target.value || null)}
        >
          <option value="">All Types</option>
          <option value="image">Images</option>
          <option value="video">Videos</option>
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="persona-filter">Persona</label>
        <select
          id="persona-filter"
          value={personaFilter || ""}
          onChange={(e) => onPersonaChange(e.target.value || null)}
        >
          <option value="">All Personas</option>
          {personas.map((persona) => (
            <option key={persona.id} value={persona.id}>
              {persona.name}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="product-filter">Product</label>
        <select
          id="product-filter"
          value={productFilter || ""}
          onChange={(e) => onProductChange(e.target.value || null)}
        >
          <option value="">All Products</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="sort-option">Sort</label>
        <select
          id="sort-option"
          value={sortOption}
          onChange={(e) => onSortChange(e.target.value as SortOption)}
        >
          <option value="date_desc">Newest First</option>
          <option value="date_asc">Oldest First</option>
          <option value="rating_desc">Highest Rated</option>
          <option value="rating_asc">Lowest Rated</option>
        </select>
      </div>

      <style>{`
        .filter-bar {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          margin-bottom: 1.5rem;
          padding: 1.125rem;
          background: var(--color-surface);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 14px;
        }
        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
          min-width: 140px;
        }
        .filter-group label {
          font-size: 0.6875rem;
          font-weight: 600;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .filter-group select {
          padding: 0.5rem 0.75rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          font-size: 0.875rem;
          color: var(--color-text-primary);
          background: var(--color-elevated);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .filter-group select:focus {
          outline: none;
          border-color: rgba(139, 92, 246, 0.5);
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15);
        }
        .filter-group select:hover {
          border-color: rgba(255, 255, 255, 0.2);
        }
        @media (max-width: 640px) {
          .filter-bar {
            flex-direction: column;
          }
          .filter-group {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

// Creative card component
function CreativeCard({
  creative,
  onClick,
}: {
  creative: Creative;
  onClick: () => void;
}) {
  const dimensions = (creative.dimensions as DimensionsData | null) ?? {};
  const isVideo = creative.creative_type === "video";

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

  // Render star rating
  const renderRating = (rating: number | null) => {
    if (rating == null) return null;
    return (
      <div className="creative-rating">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill={star <= rating ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
            className={star <= rating ? "star-filled" : "star-empty"}
          >
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        ))}
      </div>
    );
  };

  return (
    <div className="creative-card" onClick={onClick}>
      <div className="creative-thumbnail-container">
        {isVideo ? (
          <>
            {creative.thumbnail_url ? (
              <img
                src={creative.thumbnail_url}
                alt="Video thumbnail"
                className="creative-thumbnail"
              />
            ) : (
              <div className="creative-thumbnail-placeholder video-placeholder">
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </div>
            )}
            <div className="video-play-overlay">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="white"
                stroke="none"
              >
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </div>
            {creative.duration_seconds != null && (
              <span className="video-duration">
                {formatDuration(creative.duration_seconds)}
              </span>
            )}
          </>
        ) : (
          <>
            {creative.file_url ? (
              <img
                src={creative.file_url}
                alt="Generated creative"
                className="creative-thumbnail"
              />
            ) : (
              <div className="creative-thumbnail-placeholder">
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
            )}
          </>
        )}

        {/* Type badge */}
        <span className={`type-badge ${isVideo ? "video" : "image"}`}>
          {isVideo ? (
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          ) : (
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          )}
        </span>

        {/* Flagged content indicator */}
        {creative.moderation_status === "flagged" && (
          <span className="flagged-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </svg>
          </span>
        )}
      </div>

      <div className="creative-info">
        <div className="creative-header">
          {creative.subtype && (
            <span className="creative-subtype">
              {getSubtypeDisplay(creative.subtype)}
            </span>
          )}
          {renderRating(creative.rating)}
        </div>

        {creative.headline && (
          <p className="creative-headline">{creative.headline}</p>
        )}

        <div className="creative-meta">
          {dimensions.width && dimensions.height && (
            <span className="meta-item">
              {dimensions.width}×{dimensions.height}
            </span>
          )}
          <span className="meta-item">
            {new Date(creative.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      <style>{`
        .creative-card {
          display: flex;
          flex-direction: column;
          background: var(--color-surface);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 14px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .creative-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 40px -15px rgba(139, 92, 246, 0.25);
          border-color: rgba(139, 92, 246, 0.3);
        }

        .creative-thumbnail-container {
          position: relative;
          aspect-ratio: 1;
          background: rgba(255, 255, 255, 0.03);
          overflow: hidden;
        }

        .creative-thumbnail {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .creative-thumbnail-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%);
          color: var(--color-text-muted);
        }

        .video-placeholder {
          background: linear-gradient(135deg, var(--color-void) 0%, var(--color-elevated) 100%);
          color: var(--color-text-muted);
        }

        .video-play-overlay {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 56px;
          height: 56px;
          background: rgba(0, 0, 0, 0.7);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: all 0.2s ease;
          backdrop-filter: blur(4px);
        }
        .creative-card:hover .video-play-overlay {
          opacity: 1;
        }

        .video-duration {
          position: absolute;
          bottom: 10px;
          right: 10px;
          padding: 0.3125rem 0.625rem;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          border-radius: 6px;
          font-size: 0.6875rem;
          font-weight: 600;
        }

        .type-badge {
          position: absolute;
          top: 10px;
          left: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          border-radius: 8px;
        }
        .type-badge.image {
          background: linear-gradient(135deg, var(--color-plasma-violet), var(--color-plasma-purple));
          color: white;
          box-shadow: 0 0 10px rgba(139, 92, 246, 0.3);
        }
        .type-badge.video {
          background: linear-gradient(135deg, var(--color-plasma-rose), #ef4444);
          color: white;
          box-shadow: 0 0 10px rgba(244, 63, 94, 0.3);
        }
        .flagged-badge {
          position: absolute;
          top: 10px;
          right: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          border-radius: 8px;
          background: rgba(245, 158, 11, 0.2);
          border: 1px solid rgba(245, 158, 11, 0.3);
          color: rgb(245, 158, 11);
          backdrop-filter: blur(8px);
        }

        .creative-info {
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .creative-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
        }

        .creative-subtype {
          font-size: 0.6875rem;
          font-weight: 600;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .creative-rating {
          display: flex;
          gap: 0.125rem;
        }
        .star-filled {
          color: var(--color-plasma-amber);
          filter: drop-shadow(0 0 4px rgba(245, 158, 11, 0.4));
        }
        .star-empty {
          color: var(--color-text-muted);
          opacity: 0.4;
        }

        .creative-headline {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--color-text-primary);
          margin: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .creative-meta {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .meta-item {
          font-size: 0.75rem;
          color: var(--color-text-muted);
        }
      `}</style>
    </div>
  );
}

// Image icon for generate images button
function ImageIcon() {
  return (
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
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

// Video icon for generate videos button
function VideoIcon() {
  return (
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
  );
}

// Empty state using shared component
function CreativesEmptyState({ onGenerateImages, onGenerateVideos }: { onGenerateImages: () => void; onGenerateVideos: () => void }) {
  return (
    <EmptyState
      icon="creatives"
      title="No Creatives Yet"
      description="Generate images or videos based on your personas to start building your creative library."
      action={{
        label: "Generate Images",
        onClick: onGenerateImages,
        icon: <ImageIcon />,
      }}
      secondaryAction={{
        label: "Generate Videos",
        onClick: onGenerateVideos,
        icon: <VideoIcon />,
        variant: "secondary",
      }}
    />
  );
}

// Loading state using shared component
function CreativesLoadingState() {
  return <LoadingState variant="skeleton" preset="creatives" count={6} minHeight="400px" />;
}

// Main CreativesGallery component
export default function CreativesGallery({ brandId }: CreativesGalleryProps) {
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [personaFilter, setPersonaFilter] = useState<string | null>(null);
  const [productFilter, setProductFilter] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>("date_desc");

  // Modal state
  const [selectedCreative, setSelectedCreative] = useState<Creative | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);

  // Fetch creatives
  const fetchCreatives = useCallback(async () => {
    setLoading(true);
    setError(null);

    const filters: GetCreativesFilters = {};
    if (typeFilter) {
      filters.creativeType = typeFilter as "image" | "video";
    }
    if (personaFilter) {
      filters.personaId = personaFilter;
    }
    if (productFilter) {
      filters.productId = productFilter;
    }

    const result = await getCreatives(brandId, filters);

    if (result.success) {
      setCreatives(result.data);
    } else {
      setError(result.error);
    }

    setLoading(false);
  }, [brandId, typeFilter, personaFilter, productFilter]);

  // Fetch personas and products for filters
  const fetchFilterOptions = useCallback(async () => {
    const [personasResult, productsResult] = await Promise.all([
      getPersonas(brandId),
      getProducts(brandId),
    ]);

    if (personasResult.success) {
      setPersonas(personasResult.data);
    }
    if (productsResult.success) {
      setProducts(productsResult.data);
    }
  }, [brandId]);

  useEffect(() => {
    fetchCreatives();
    fetchFilterOptions();
  }, [fetchCreatives, fetchFilterOptions]);

  // Sort creatives
  const sortedCreatives = [...creatives].sort((a, b) => {
    switch (sortOption) {
      case "date_desc":
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case "date_asc":
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case "rating_desc":
        return (b.rating ?? 0) - (a.rating ?? 0);
      case "rating_asc":
        return (a.rating ?? 0) - (b.rating ?? 0);
      default:
        return 0;
    }
  });

  // Handle rating
  const handleRate = async (creativeId: string, rating: number) => {
    // Optimistic update
    setCreatives((prev) =>
      prev.map((c) => (c.id === creativeId ? { ...c, rating } : c))
    );
    if (selectedCreative?.id === creativeId) {
      setSelectedCreative({ ...selectedCreative, rating });
    }

    // Import and call rateCreative
    const { rateCreative } = await import("@/app/actions/creatives");
    const result = await rateCreative(creativeId, rating);

    if (!result.success) {
      // Revert on error
      fetchCreatives();
    }
  };

  // Handle delete
  const handleDelete = async (creativeId: string) => {
    const { deleteCreative } = await import("@/app/actions/creatives");
    const result = await deleteCreative(creativeId);

    if (result.success) {
      setCreatives((prev) => prev.filter((c) => c.id !== creativeId));
      setSelectedCreative(null);
    } else {
      setError(result.error);
    }
  };

  // Handle generate modals
  const handleGenerateImages = () => {
    setShowImageModal(true);
  };

  const handleGenerateVideos = () => {
    setShowVideoModal(true);
  };

  // Loading state
  if (loading && creatives.length === 0) {
    return <CreativesLoadingState />;
  }

  // Error state
  if (error && creatives.length === 0) {
    return (
      <div className="error-state">
        <div className="error-icon">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h3 className="error-title">Failed to load creatives</h3>
        <p className="error-message">{error}</p>
        <button className="btn-retry" onClick={fetchCreatives}>
          Try Again
        </button>
        <style>{`
          .error-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 4rem 2rem;
            background: var(--color-surface);
            border: 1px solid rgba(244, 63, 94, 0.3);
            border-radius: 16px;
            text-align: center;
            position: relative;
          }
          .error-state::before {
            content: '';
            position: absolute;
            inset: 0;
            background: radial-gradient(ellipse at center, rgba(244, 63, 94, 0.05) 0%, transparent 70%);
            pointer-events: none;
            border-radius: 16px;
          }
          .error-icon {
            color: var(--color-plasma-rose);
            margin-bottom: 1.25rem;
            filter: drop-shadow(0 0 15px rgba(244, 63, 94, 0.4));
          }
          .error-title {
            font-size: 1.25rem;
            font-weight: 700;
            color: var(--color-text-primary);
            margin: 0 0 0.625rem;
            letter-spacing: -0.02em;
          }
          .error-message {
            font-size: 0.9375rem;
            color: var(--color-text-secondary);
            margin: 0 0 1.75rem;
            line-height: 1.5;
          }
          .btn-retry {
            padding: 0.75rem 1.25rem;
            background: linear-gradient(135deg, var(--color-plasma-violet), var(--color-plasma-purple));
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 0.9375rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            box-shadow: 0 0 15px rgba(139, 92, 246, 0.25);
          }
          .btn-retry:hover {
            transform: translateY(-2px);
            box-shadow: 0 0 25px rgba(139, 92, 246, 0.35);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="creatives-gallery">
      {/* Header with action buttons */}
      <div className="gallery-header">
        <h2 className="gallery-title">Creatives</h2>
        <div className="gallery-actions">
          <button className="btn-generate-images" onClick={handleGenerateImages}>
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
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            Generate Images
          </button>
          <button className="btn-generate-videos" onClick={handleGenerateVideos}>
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
            Generate Videos
          </button>
        </div>
      </div>

      {/* Filters */}
      <FilterBar
        personas={personas}
        products={products}
        typeFilter={typeFilter}
        personaFilter={personaFilter}
        productFilter={productFilter}
        sortOption={sortOption}
        onTypeChange={setTypeFilter}
        onPersonaChange={setPersonaFilter}
        onProductChange={setProductFilter}
        onSortChange={setSortOption}
      />

      {/* Gallery grid or empty state */}
      {sortedCreatives.length === 0 ? (
        creatives.length === 0 ? (
          <CreativesEmptyState
            onGenerateImages={handleGenerateImages}
            onGenerateVideos={handleGenerateVideos}
          />
        ) : (
          <div className="no-results">
            <p>No creatives match your filters. Try adjusting your filter criteria.</p>
          </div>
        )
      ) : (
        <div className="gallery-grid">
          {sortedCreatives.map((creative) => (
            <CreativeCard
              key={creative.id}
              creative={creative}
              onClick={() => setSelectedCreative(creative)}
            />
          ))}
        </div>
      )}

      {/* Creative detail modal */}
      {selectedCreative && (
        <CreativeDetailModal
          creative={selectedCreative}
          onClose={() => setSelectedCreative(null)}
          onRate={(rating) => handleRate(selectedCreative.id, rating)}
          onDelete={() => handleDelete(selectedCreative.id)}
        />
      )}

      {/* Generate Image Modal */}
      <GenerateImageModal
        brandId={brandId}
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        onGenerated={fetchCreatives}
      />

      {/* Generate Video Modal */}
      <GenerateVideoModal
        brandId={brandId}
        isOpen={showVideoModal}
        onClose={() => setShowVideoModal(false)}
        onGenerated={fetchCreatives}
      />

      <style>{`
        .creatives-gallery {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .gallery-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .gallery-title {
          font-size: 1.375rem;
          font-weight: 700;
          color: var(--color-text-primary);
          margin: 0;
          letter-spacing: -0.02em;
        }

        .gallery-actions {
          display: flex;
          gap: 0.75rem;
        }

        .btn-generate-images,
        .btn-generate-videos {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.125rem;
          border-radius: 10px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          border: none;
        }

        .btn-generate-images {
          background: linear-gradient(135deg, var(--color-plasma-violet), var(--color-plasma-purple));
          color: white;
          box-shadow: 0 0 15px rgba(139, 92, 246, 0.25);
        }
        .btn-generate-images:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 25px rgba(139, 92, 246, 0.35), 0 8px 20px -8px rgba(139, 92, 246, 0.4);
        }

        .btn-generate-videos {
          background: linear-gradient(135deg, var(--color-plasma-rose), #ef4444);
          color: white;
          box-shadow: 0 0 15px rgba(244, 63, 94, 0.25);
        }
        .btn-generate-videos:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 25px rgba(244, 63, 94, 0.35), 0 8px 20px -8px rgba(244, 63, 94, 0.4);
        }

        .gallery-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 1rem;
        }

        .no-results {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 3rem 2rem;
          background: var(--color-surface);
          border: 1px dashed rgba(139, 92, 246, 0.3);
          border-radius: 16px;
        }
        .no-results p {
          font-size: 0.9375rem;
          color: var(--color-text-secondary);
          margin: 0;
        }

        /* Placeholder modal styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(2, 2, 4, 0.8);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }

        @media (max-width: 640px) {
          .gallery-header {
            flex-direction: column;
            align-items: stretch;
          }
          .gallery-actions {
            flex-direction: column;
          }
          .btn-generate-images,
          .btn-generate-videos {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
