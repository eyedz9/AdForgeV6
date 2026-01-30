/**
 * ProductsList Component
 *
 * Displays a grid view of product cards for a brand.
 *
 * Features:
 * - Grid view of product cards
 * - Each card shows: image, name, type, price
 * - Add Product button
 * - Empty state when no products
 * - Click card navigates to product detail
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getProducts } from "@/app/actions/products";
import type { Product } from "@/lib/supabase/database.types";
import { EmptyState, LoadingState } from "@/components/shared";

// Product image type from JSONB
interface ProductImageData {
  url?: string;
  alt?: string;
  isPrimary?: boolean;
  sortOrder?: number;
}

// Props for the ProductsList component
interface ProductsListProps {
  brandId: string;
}

// Product card component
function ProductCard({ product, brandId }: { product: Product; brandId: string }) {
  // Get primary image or first image
  const images = (product.images as ProductImageData[] | null) ?? [];
  const primaryImage = images.find((img) => img.isPrimary) ?? images[0];
  const imageUrl = primaryImage?.url;

  // Format price for display
  const formatPrice = (price: number | null, priceRange: string | null) => {
    if (price !== null && price !== undefined) {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(price);
    }
    if (priceRange) {
      return priceRange;
    }
    return null;
  };

  const displayPrice = formatPrice(product.price, product.price_range);

  return (
    <Link href={`/brands/${brandId}/products/${product.id}`} className="product-card">
      <div className="product-image-container">
        {imageUrl ? (
          <img src={imageUrl} alt={product.name} className="product-image" />
        ) : (
          <div className="product-image-placeholder">
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
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </div>
        )}
      </div>
      <div className="product-info">
        <h3 className="product-name">{product.name}</h3>
        <div className="product-meta">
          {product.product_type && (
            <span className="product-type">{product.product_type}</span>
          )}
          {displayPrice && <span className="product-price">{displayPrice}</span>}
        </div>
        {product.short_description && (
          <p className="product-description">{product.short_description}</p>
        )}
      </div>
      <style>{`
        .product-card {
          display: flex;
          flex-direction: column;
          background: var(--color-surface);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 14px;
          overflow: hidden;
          text-decoration: none;
          color: inherit;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .product-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 40px -15px rgba(139, 92, 246, 0.25);
          border-color: rgba(139, 92, 246, 0.3);
        }
        .product-image-container {
          aspect-ratio: 4 / 3;
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(6, 182, 212, 0.1));
          overflow: hidden;
        }
        .product-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .product-image-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-text-muted);
        }
        .product-info {
          padding: 1.125rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .product-name {
          font-size: 1rem;
          font-weight: 600;
          color: var(--color-text-primary);
          margin: 0;
          line-height: 1.3;
          letter-spacing: -0.01em;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .product-meta {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }
        .product-type {
          display: inline-flex;
          padding: 0.25rem 0.5rem;
          background: rgba(139, 92, 246, 0.15);
          color: var(--color-plasma-violet);
          border: 1px solid rgba(139, 92, 246, 0.2);
          border-radius: 6px;
          font-size: 0.6875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .product-price {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--color-plasma-emerald);
        }
        .product-description {
          font-size: 0.8125rem;
          color: var(--color-text-secondary);
          margin: 0;
          line-height: 1.5;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </Link>
  );
}

// Empty state using shared component
function ProductsEmptyState({ brandId }: { brandId: string }) {
  return (
    <EmptyState
      icon="products"
      title="No products yet"
      description="Add your first product to start creating personas and generating creative assets."
      action={{
        label: "Add Your First Product",
        href: `/brands/${brandId}/products/new`,
      }}
    />
  );
}

// Loading state using shared component
function ProductsLoadingState() {
  return <LoadingState variant="skeleton" preset="products" count={4} />;
}

// Error state component
function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
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
      <h3 className="error-title">Failed to load products</h3>
      <p className="error-message">{error}</p>
      <button className="btn-retry" onClick={onRetry}>
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
          display: inline-flex;
          align-items: center;
          padding: 0.75rem 1.25rem;
          background: transparent;
          color: var(--color-plasma-violet);
          border: 1px solid rgba(139, 92, 246, 0.4);
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.9375rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn-retry:hover {
          background: rgba(139, 92, 246, 0.1);
          border-color: rgba(139, 92, 246, 0.6);
          transform: translateY(-1px);
        }
      `}</style>
    </div>
  );
}

// Main ProductsList component
export default function ProductsList({ brandId }: ProductsListProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch products
  const fetchProducts = async () => {
    setLoading(true);
    setError(null);

    const result = await getProducts(brandId);

    if (result.success) {
      setProducts(result.data);
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, [brandId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Loading state
  if (loading) {
    return <ProductsLoadingState />;
  }

  // Error state
  if (error) {
    return <ErrorState error={error} onRetry={fetchProducts} />;
  }

  // Empty state
  if (products.length === 0) {
    return <ProductsEmptyState brandId={brandId} />;
  }

  // Products grid
  return (
    <div className="products-list">
      <div className="products-header">
        <p className="products-count">
          {products.length} {products.length === 1 ? "product" : "products"}
        </p>
        <Link href={`/brands/${brandId}/products/new`} className="btn-add">
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
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Product
        </Link>
      </div>
      <div className="products-grid">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} brandId={brandId} />
        ))}
      </div>
      <style>{`
        .products-list {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .products-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .products-count {
          font-size: 0.875rem;
          color: var(--color-text-secondary);
          margin: 0;
        }
        .btn-add {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1.125rem;
          background: linear-gradient(135deg, var(--color-plasma-violet), var(--color-plasma-purple));
          color: white;
          border-radius: 10px;
          text-decoration: none;
          font-weight: 600;
          font-size: 0.875rem;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: 0 0 15px rgba(139, 92, 246, 0.25);
        }
        .btn-add:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 25px rgba(139, 92, 246, 0.35), 0 8px 20px -8px rgba(139, 92, 246, 0.4);
        }
        .products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 1.5rem;
        }
        @media (max-width: 640px) {
          .products-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
