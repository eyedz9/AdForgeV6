/**
 * LoadingState Component
 *
 * A reusable loading state component with spinner and skeleton variants.
 * Used to show loading feedback while data is being fetched.
 *
 * Features:
 * - Spinner variant for inline/simple loading
 * - Skeleton variant for card grids (customizable)
 * - Multiple skeleton presets for common layouts
 * - Consistent styling across the application
 */

// Loading variant types
export type LoadingVariant = "spinner" | "skeleton";

// Skeleton preset types for common layouts
export type SkeletonPreset =
  | "cards"
  | "products"
  | "personas"
  | "audiences"
  | "creatives"
  | "list"
  | "table";

// Props for the LoadingState component
interface LoadingStateProps {
  /**
   * Loading variant: spinner or skeleton
   */
  variant?: LoadingVariant;

  /**
   * Skeleton preset for predefined layouts
   */
  preset?: SkeletonPreset;

  /**
   * Number of skeleton items to display
   */
  count?: number;

  /**
   * Optional message to display below spinner
   */
  message?: string;

  /**
   * Custom class name for additional styling
   */
  className?: string;

  /**
   * Full page loading (centers spinner in viewport)
   */
  fullPage?: boolean;

  /**
   * Minimum height for the container
   */
  minHeight?: string;
}

// Spinner component
function Spinner({ size = 40 }: { size?: number }) {
  return (
    <div className="spinner-container">
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className="spinner"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="spinner-track"
        />
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="31.4 31.4"
          className="spinner-fill"
        />
      </svg>
      <style>{`
        .spinner-container {
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-plasma-violet);
          filter: drop-shadow(0 0 10px rgba(139, 92, 246, 0.4));
        }
        .spinner {
          animation: spin 1s linear infinite;
        }
        .spinner-track {
          opacity: 0.15;
        }
        .spinner-fill {
          opacity: 1;
          transform-origin: center;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// Generic card skeleton
function CardSkeleton() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-image" />
      <div className="skeleton-content">
        <div className="skeleton-line title" />
        <div className="skeleton-line meta" />
      </div>
      <style>{`
        .skeleton-card {
          background: var(--color-surface);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 14px;
          overflow: hidden;
        }
        .skeleton-image {
          aspect-ratio: 4 / 3;
          background: linear-gradient(90deg, rgba(139, 92, 246, 0.05) 25%, rgba(139, 92, 246, 0.1) 50%, rgba(139, 92, 246, 0.05) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        .skeleton-content {
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .skeleton-line {
          border-radius: 6px;
          background: linear-gradient(90deg, rgba(255, 255, 255, 0.04) 25%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.04) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        .skeleton-line.title {
          height: 20px;
          width: 80%;
        }
        .skeleton-line.meta {
          height: 16px;
          width: 50%;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

// Product card skeleton
function ProductSkeleton() {
  return (
    <div className="skeleton-product">
      <div className="skeleton-image product" />
      <div className="skeleton-content">
        <div className="skeleton-line product-title" />
        <div className="skeleton-line product-meta" />
      </div>
      <style>{`
        .skeleton-product {
          background: var(--color-surface);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 14px;
          overflow: hidden;
        }
        .skeleton-image.product {
          aspect-ratio: 4 / 3;
          background: linear-gradient(90deg, rgba(139, 92, 246, 0.05) 25%, rgba(139, 92, 246, 0.1) 50%, rgba(139, 92, 246, 0.05) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        .skeleton-content {
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .skeleton-line.product-title {
          height: 20px;
          width: 80%;
          border-radius: 6px;
          background: linear-gradient(90deg, rgba(255, 255, 255, 0.04) 25%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.04) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        .skeleton-line.product-meta {
          height: 16px;
          width: 50%;
          border-radius: 6px;
          background: linear-gradient(90deg, rgba(255, 255, 255, 0.04) 25%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.04) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
      `}</style>
    </div>
  );
}

// Persona card skeleton
function PersonaSkeleton() {
  return (
    <div className="skeleton-persona">
      <div className="skeleton-photo" />
      <div className="skeleton-content">
        <div className="skeleton-line persona-name" />
        <div className="skeleton-line persona-demo" />
        <div className="skeleton-line persona-details" />
      </div>
      <style>{`
        .skeleton-persona {
          background: var(--color-surface);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 14px;
          overflow: hidden;
        }
        .skeleton-photo {
          aspect-ratio: 1;
          background: linear-gradient(90deg, rgba(6, 182, 212, 0.05) 25%, rgba(6, 182, 212, 0.1) 50%, rgba(6, 182, 212, 0.05) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        .skeleton-content {
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .skeleton-line.persona-name {
          height: 20px;
          width: 70%;
          border-radius: 6px;
          background: linear-gradient(90deg, rgba(255, 255, 255, 0.04) 25%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.04) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        .skeleton-line.persona-demo {
          height: 14px;
          width: 90%;
          border-radius: 6px;
          background: linear-gradient(90deg, rgba(255, 255, 255, 0.04) 25%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.04) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        .skeleton-line.persona-details {
          height: 14px;
          width: 50%;
          border-radius: 6px;
          background: linear-gradient(90deg, rgba(255, 255, 255, 0.04) 25%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.04) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
      `}</style>
    </div>
  );
}

// Creative card skeleton
function CreativeSkeleton() {
  return (
    <div className="skeleton-creative">
      <div className="skeleton-thumbnail" />
      <div className="skeleton-info">
        <div className="skeleton-line creative-type" />
        <div className="skeleton-line creative-meta" />
      </div>
      <style>{`
        .skeleton-creative {
          background: var(--color-surface);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          overflow: hidden;
        }
        .skeleton-thumbnail {
          aspect-ratio: 1;
          background: linear-gradient(90deg, rgba(245, 158, 11, 0.05) 25%, rgba(245, 158, 11, 0.1) 50%, rgba(245, 158, 11, 0.05) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        .skeleton-info {
          padding: 0.875rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .skeleton-line.creative-type {
          height: 0.875rem;
          width: 60%;
          border-radius: 6px;
          background: linear-gradient(90deg, rgba(255, 255, 255, 0.04) 25%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.04) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        .skeleton-line.creative-meta {
          height: 0.875rem;
          width: 80%;
          border-radius: 6px;
          background: linear-gradient(90deg, rgba(255, 255, 255, 0.04) 25%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.04) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
      `}</style>
    </div>
  );
}

// Audience card skeleton
function AudienceSkeleton() {
  return (
    <div className="skeleton-audience">
      <div className="skeleton-content">
        <div className="skeleton-line audience-name" />
        <div className="skeleton-audience-row">
          <div className="skeleton-avatar-mini" />
          <div className="skeleton-avatar-mini" />
          <div className="skeleton-line audience-personas" />
        </div>
        <div className="skeleton-audience-badges">
          <div className="skeleton-badge" />
          <div className="skeleton-badge" />
          <div className="skeleton-badge" />
          <div className="skeleton-badge" />
          <div className="skeleton-badge" />
          <div className="skeleton-badge" />
        </div>
        <div className="skeleton-line audience-size" />
        <div className="skeleton-audience-footer">
          <div className="skeleton-line audience-exports" />
          <div className="skeleton-line audience-date" />
        </div>
      </div>
      <style>{`
        .skeleton-audience {
          background: var(--color-surface);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 14px;
          overflow: hidden;
        }
        .skeleton-audience .skeleton-content {
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .skeleton-line.audience-name {
          height: 20px;
          width: 65%;
          border-radius: 6px;
          background: linear-gradient(90deg, rgba(255, 255, 255, 0.04) 25%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.04) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        .skeleton-audience-row {
          display: flex;
          align-items: center;
          gap: 0.375rem;
        }
        .skeleton-avatar-mini {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: linear-gradient(90deg, rgba(139, 92, 246, 0.05) 25%, rgba(139, 92, 246, 0.1) 50%, rgba(139, 92, 246, 0.05) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          flex-shrink: 0;
        }
        .skeleton-avatar-mini:nth-child(2) {
          margin-left: -6px;
        }
        .skeleton-line.audience-personas {
          height: 14px;
          width: 80px;
          margin-left: 0.375rem;
          border-radius: 6px;
          background: linear-gradient(90deg, rgba(255, 255, 255, 0.04) 25%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.04) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        .skeleton-audience-badges {
          display: flex;
          align-items: center;
          gap: 0.375rem;
        }
        .skeleton-badge {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: linear-gradient(90deg, rgba(255, 255, 255, 0.04) 25%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.04) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        .skeleton-line.audience-size {
          height: 14px;
          width: 120px;
          border-radius: 6px;
          background: linear-gradient(90deg, rgba(6, 182, 212, 0.05) 25%, rgba(6, 182, 212, 0.1) 50%, rgba(6, 182, 212, 0.05) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        .skeleton-audience-footer {
          display: flex;
          justify-content: space-between;
          padding-top: 0.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }
        .skeleton-line.audience-exports {
          height: 12px;
          width: 60px;
          border-radius: 6px;
          background: linear-gradient(90deg, rgba(255, 255, 255, 0.04) 25%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.04) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        .skeleton-line.audience-date {
          height: 12px;
          width: 70px;
          border-radius: 6px;
          background: linear-gradient(90deg, rgba(255, 255, 255, 0.04) 25%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.04) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
      `}</style>
    </div>
  );
}

// List item skeleton
function ListItemSkeleton() {
  return (
    <div className="skeleton-list-item">
      <div className="skeleton-avatar" />
      <div className="skeleton-text-content">
        <div className="skeleton-line list-title" />
        <div className="skeleton-line list-desc" />
      </div>
      <style>{`
        .skeleton-list-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: var(--color-surface);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 10px;
        }
        .skeleton-avatar {
          width: 48px;
          height: 48px;
          border-radius: 10px;
          background: linear-gradient(90deg, rgba(139, 92, 246, 0.05) 25%, rgba(139, 92, 246, 0.1) 50%, rgba(139, 92, 246, 0.05) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          flex-shrink: 0;
        }
        .skeleton-text-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .skeleton-line.list-title {
          height: 18px;
          width: 60%;
          border-radius: 6px;
          background: linear-gradient(90deg, rgba(255, 255, 255, 0.04) 25%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.04) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        .skeleton-line.list-desc {
          height: 14px;
          width: 80%;
          border-radius: 6px;
          background: linear-gradient(90deg, rgba(255, 255, 255, 0.04) 25%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.04) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
      `}</style>
    </div>
  );
}

// Table row skeleton
function TableRowSkeleton() {
  return (
    <div className="skeleton-table-row">
      <div className="skeleton-cell cell-1" />
      <div className="skeleton-cell cell-2" />
      <div className="skeleton-cell cell-3" />
      <div className="skeleton-cell cell-4" />
      <style>{`
        .skeleton-table-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          gap: 1rem;
          padding: 1rem;
          background: var(--color-surface);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }
        .skeleton-cell {
          height: 16px;
          border-radius: 6px;
          background: linear-gradient(90deg, rgba(255, 255, 255, 0.04) 25%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.04) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
        }
        .skeleton-cell.cell-1 { width: 80%; }
        .skeleton-cell.cell-2 { width: 60%; }
        .skeleton-cell.cell-3 { width: 70%; }
        .skeleton-cell.cell-4 { width: 50%; }
      `}</style>
    </div>
  );
}

// Get skeleton component based on preset
function getSkeletonComponent(preset: SkeletonPreset) {
  switch (preset) {
    case "products":
      return ProductSkeleton;
    case "personas":
      return PersonaSkeleton;
    case "audiences":
      return AudienceSkeleton;
    case "creatives":
      return CreativeSkeleton;
    case "list":
      return ListItemSkeleton;
    case "table":
      return TableRowSkeleton;
    case "cards":
    default:
      return CardSkeleton;
  }
}

// Get grid class based on preset
function getGridClass(preset: SkeletonPreset): string {
  switch (preset) {
    case "products":
      return "skeleton-grid-products";
    case "personas":
      return "skeleton-grid-personas";
    case "audiences":
      return "skeleton-grid-audiences";
    case "creatives":
      return "skeleton-grid-creatives";
    case "list":
      return "skeleton-list";
    case "table":
      return "skeleton-table";
    case "cards":
    default:
      return "skeleton-grid";
  }
}

export default function LoadingState({
  variant = "skeleton",
  preset = "cards",
  count = 4,
  message,
  className = "",
  fullPage = false,
  minHeight = "300px",
}: LoadingStateProps) {
  // Spinner variant
  if (variant === "spinner") {
    return (
      <div
        className={`loading-state spinner-variant ${fullPage ? "full-page" : ""} ${className}`.trim()}
        style={{ minHeight: fullPage ? "100vh" : minHeight }}
      >
        <Spinner size={fullPage ? 48 : 40} />
        {message && <p className="loading-message">{message}</p>}
        <style>{`
          .loading-state.spinner-variant {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 1rem;
            color: var(--color-plasma-violet);
          }
          .loading-state.full-page {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(5, 0, 20, 0.95);
            backdrop-filter: blur(8px);
            z-index: 9999;
          }
          .loading-message {
            font-size: 0.9375rem;
            color: var(--color-text-secondary);
            margin: 0;
          }
        `}</style>
      </div>
    );
  }

  // Skeleton variant
  const SkeletonComponent = getSkeletonComponent(preset);
  const gridClass = getGridClass(preset);

  return (
    <div
      className={`loading-state skeleton-variant ${className}`.trim()}
      style={{ minHeight }}
    >
      <div className={gridClass}>
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonComponent key={i} />
        ))}
      </div>
      <style>{`
        .loading-state.skeleton-variant {
          width: 100%;
        }
        .skeleton-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.5rem;
        }
        .skeleton-grid-products {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 1.5rem;
        }
        .skeleton-grid-personas {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 1.5rem;
        }
        .skeleton-grid-audiences {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.25rem;
        }
        .skeleton-grid-creatives {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 1rem;
        }
        .skeleton-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .skeleton-table {
          display: flex;
          flex-direction: column;
          background: var(--color-surface);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 10px;
          overflow: hidden;
        }
        @media (max-width: 640px) {
          .skeleton-grid,
          .skeleton-grid-products,
          .skeleton-grid-personas,
          .skeleton-grid-audiences {
            grid-template-columns: 1fr;
          }
          .skeleton-grid-creatives {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  );
}

// Export the Spinner component for standalone use
export { Spinner };
