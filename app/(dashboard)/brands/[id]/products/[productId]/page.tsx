/**
 * Product Detail Page
 *
 * Displays full product details with:
 * - Image gallery with primary image and thumbnails
 * - Product information (name, description, pricing)
 * - Variants section with add/edit/delete
 * - Marketing attributes
 * - Edit and delete buttons
 */

"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getProduct, updateProduct, deleteProduct } from "@/app/actions/products";
import type { Product } from "@/lib/supabase/database.types";
import {
  type ProductImage,
  type ProductVideo,
  type ProductVariant,
  type MarketingAttributes,
} from "@/lib/validations/product";

// Type for parsed product data
interface ParsedProduct {
  id: string;
  brand_id: string;
  name: string;
  product_type: string | null;
  short_description: string | null;
  full_description: string | null;
  sku: string | null;
  price: number | null;
  price_range: string | null;
  images: ProductImage[];
  videos: ProductVideo[];
  variants: ProductVariant[];
  marketing_attributes: MarketingAttributes | null;
  created_at: string;
  updated_at: string;
}

// Delete confirmation modal component
function DeleteConfirmModal({
  productName,
  onConfirm,
  onCancel,
  isDeleting,
}: {
  productName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}) {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <h3 className="modal-title">Delete Product</h3>
        <p className="modal-message">
          Are you sure you want to delete <strong>{productName}</strong>? This action cannot be undone.
        </p>
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onCancel} disabled={isDeleting}>
            Cancel
          </button>
          <button className="btn-delete" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Delete Product"}
          </button>
        </div>
      </div>
      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }
        .modal-content {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          max-width: 400px;
          width: 100%;
          text-align: center;
        }
        .modal-icon {
          color: #dc2626;
          margin-bottom: 1rem;
        }
        .modal-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #111827;
          margin: 0 0 0.75rem;
        }
        .modal-message {
          font-size: 0.9375rem;
          color: #6b7280;
          margin: 0 0 1.5rem;
          line-height: 1.5;
        }
        .modal-message strong {
          color: #111827;
        }
        .modal-actions {
          display: flex;
          gap: 0.75rem;
        }
        .btn-cancel,
        .btn-delete {
          flex: 1;
          padding: 0.625rem 1rem;
          border-radius: 8px;
          font-size: 0.9375rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s, opacity 0.15s;
        }
        .btn-cancel {
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          color: #374151;
        }
        .btn-cancel:hover:not(:disabled) {
          background: #e5e7eb;
        }
        .btn-delete {
          background: #dc2626;
          border: none;
          color: white;
        }
        .btn-delete:hover:not(:disabled) {
          background: #b91c1c;
        }
        .btn-cancel:disabled,
        .btn-delete:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

// Variant edit modal
function VariantModal({
  variant,
  onSave,
  onCancel,
  isNew,
}: {
  variant: ProductVariant | null;
  onSave: (variant: ProductVariant) => void;
  onCancel: () => void;
  isNew: boolean;
}) {
  const [formData, setFormData] = useState<ProductVariant>(
    variant || { name: "", sku: null, price: null, attributes: {} }
  );
  const [attributeKey, setAttributeKey] = useState("");
  const [attributeValue, setAttributeValue] = useState("");

  const addAttribute = () => {
    if (attributeKey.trim() && attributeValue.trim()) {
      setFormData((prev) => ({
        ...prev,
        attributes: {
          ...prev.attributes,
          [attributeKey.trim()]: attributeValue.trim(),
        },
      }));
      setAttributeKey("");
      setAttributeValue("");
    }
  };

  const removeAttribute = (key: string) => {
    setFormData((prev) => {
      const newAttributes = { ...prev.attributes };
      delete newAttributes[key];
      return { ...prev, attributes: newAttributes };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name.trim()) {
      onSave(formData);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content variant-modal">
        <h3 className="modal-title">{isNew ? "Add Variant" : "Edit Variant"}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="variantName" className="field-label">
              Variant Name <span className="required">*</span>
            </label>
            <input
              type="text"
              id="variantName"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Large, Blue, Premium"
              className="field-input"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-field">
              <label htmlFor="variantSku" className="field-label">SKU</label>
              <input
                type="text"
                id="variantSku"
                value={formData.sku || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, sku: e.target.value || null }))}
                placeholder="e.g., PROD-LG-BLU"
                className="field-input"
              />
            </div>
            <div className="form-field">
              <label htmlFor="variantPrice" className="field-label">Price</label>
              <div className="input-with-prefix">
                <span className="input-prefix">$</span>
                <input
                  type="number"
                  id="variantPrice"
                  value={formData.price ?? ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value ? parseFloat(e.target.value) : null }))}
                  placeholder="0.00"
                  className="field-input with-prefix"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </div>

          <div className="form-field">
            <label className="field-label">Attributes</label>
            <div className="attributes-list">
              {formData.attributes && Object.entries(formData.attributes).map(([key, value]) => (
                <div key={key} className="attribute-tag">
                  <span className="attribute-key">{key}:</span>
                  <span className="attribute-value">{value}</span>
                  <button type="button" onClick={() => removeAttribute(key)} className="remove-attr-btn">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            <div className="add-attribute-row">
              <input
                type="text"
                value={attributeKey}
                onChange={(e) => setAttributeKey(e.target.value)}
                placeholder="Key (e.g., Color)"
                className="field-input attr-input"
              />
              <input
                type="text"
                value={attributeValue}
                onChange={(e) => setAttributeValue(e.target.value)}
                placeholder="Value (e.g., Blue)"
                className="field-input attr-input"
              />
              <button type="button" onClick={addAttribute} className="add-attr-btn">Add</button>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn-save">
              {isNew ? "Add Variant" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
      <style>{`
        .variant-modal {
          max-width: 500px;
          text-align: left;
        }
        .form-field {
          margin-bottom: 1rem;
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .field-label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
          margin-bottom: 0.375rem;
        }
        .required {
          color: #ef4444;
        }
        .field-input {
          width: 100%;
          padding: 0.625rem 0.875rem;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 0.9375rem;
          color: #111827;
          background: white;
        }
        .field-input:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }
        .input-with-prefix {
          position: relative;
          display: flex;
          align-items: center;
        }
        .input-prefix {
          position: absolute;
          left: 0.875rem;
          color: #6b7280;
          font-size: 0.9375rem;
        }
        .field-input.with-prefix {
          padding-left: 1.75rem;
        }
        .attributes-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }
        .attribute-tag {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.5rem;
          background: #f3f4f6;
          border-radius: 6px;
          font-size: 0.8125rem;
        }
        .attribute-key {
          font-weight: 500;
          color: #6b7280;
        }
        .attribute-value {
          color: #111827;
        }
        .remove-attr-btn {
          background: none;
          border: none;
          padding: 0.125rem;
          cursor: pointer;
          color: #6b7280;
          display: flex;
        }
        .remove-attr-btn:hover {
          color: #ef4444;
        }
        .add-attribute-row {
          display: flex;
          gap: 0.5rem;
        }
        .attr-input {
          flex: 1;
        }
        .add-attr-btn {
          padding: 0.625rem 1rem;
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
          cursor: pointer;
        }
        .add-attr-btn:hover {
          background: #e5e7eb;
        }
        .btn-save {
          background: #6366f1;
          border: none;
          color: white;
        }
        .btn-save:hover {
          background: #4f46e5;
        }
      `}</style>
    </div>
  );
}

// Image gallery component
function ImageGallery({ images }: { images: ProductImage[] }) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Sort images so primary comes first
  const sortedImages = [...images].sort((a, b) => {
    if (a.isPrimary) return -1;
    if (b.isPrimary) return 1;
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  });

  if (sortedImages.length === 0) {
    return (
      <div className="no-images">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
        <p>No images uploaded</p>
      </div>
    );
  }

  return (
    <div className="image-gallery">
      <div className="main-image-container">
        <img
          src={sortedImages[selectedIndex].url}
          alt={sortedImages[selectedIndex].alt || "Product image"}
          className="main-image"
        />
        {sortedImages[selectedIndex].isPrimary && (
          <span className="primary-badge">Primary</span>
        )}
      </div>
      {sortedImages.length > 1 && (
        <div className="thumbnail-strip">
          {sortedImages.map((image, index) => (
            <button
              key={index}
              className={`thumbnail ${selectedIndex === index ? "active" : ""}`}
              onClick={() => setSelectedIndex(index)}
            >
              <img src={image.url} alt={image.alt || `Thumbnail ${index + 1}`} />
            </button>
          ))}
        </div>
      )}
      <style>{`
        .image-gallery {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .main-image-container {
          position: relative;
          aspect-ratio: 1;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          overflow: hidden;
        }
        .main-image {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .primary-badge {
          position: absolute;
          top: 0.75rem;
          left: 0.75rem;
          padding: 0.25rem 0.625rem;
          background: #6366f1;
          color: white;
          font-size: 0.6875rem;
          font-weight: 600;
          border-radius: 4px;
          text-transform: uppercase;
        }
        .thumbnail-strip {
          display: flex;
          gap: 0.5rem;
          overflow-x: auto;
          padding-bottom: 0.25rem;
        }
        .thumbnail {
          width: 64px;
          height: 64px;
          flex-shrink: 0;
          padding: 0;
          background: #f9fafb;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
          cursor: pointer;
          transition: border-color 0.15s;
        }
        .thumbnail:hover {
          border-color: #9ca3af;
        }
        .thumbnail.active {
          border-color: #6366f1;
        }
        .thumbnail img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .no-images {
          aspect-ratio: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          background: #f9fafb;
          border: 2px dashed #d1d5db;
          border-radius: 12px;
          color: #9ca3af;
        }
        .no-images p {
          margin: 0;
          font-size: 0.9375rem;
        }
      `}</style>
    </div>
  );
}

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string; productId: string }>;
}) {
  const { id: brandId, productId } = use(params);
  const router = useRouter();

  const [product, setProduct] = useState<ParsedProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Variant editing state
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [editingVariantIndex, setEditingVariantIndex] = useState<number | null>(null);
  const [isSavingVariants, setIsSavingVariants] = useState(false);

  // Parse product data
  const parseProduct = useCallback((raw: Product): ParsedProduct => {
    return {
      id: raw.id,
      brand_id: raw.brand_id,
      name: raw.name,
      product_type: raw.product_type,
      short_description: raw.short_description,
      full_description: raw.full_description,
      sku: raw.sku,
      price: raw.price,
      price_range: raw.price_range,
      images: (raw.images as ProductImage[]) || [],
      videos: (raw.videos as ProductVideo[]) || [],
      variants: (raw.variants as ProductVariant[]) || [],
      marketing_attributes: raw.marketing_attributes as MarketingAttributes | null,
      created_at: raw.created_at,
      updated_at: raw.updated_at,
    };
  }, []);

  // Fetch product data
  const fetchProduct = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await getProduct(productId);

    if (result.success) {
      setProduct(parseProduct(result.data));
    } else {
      setError(result.error);
    }

    setLoading(false);
  }, [productId, parseProduct]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  // Handle delete
  const handleDelete = async () => {
    setIsDeleting(true);

    const result = await deleteProduct(productId);

    if (result.success) {
      router.push(`/brands/${brandId}?tab=products`);
    } else {
      setError(result.error);
      setShowDeleteModal(false);
    }

    setIsDeleting(false);
  };

  // Variant management
  const handleAddVariant = () => {
    setEditingVariant(null);
    setEditingVariantIndex(null);
    setShowVariantModal(true);
  };

  const handleEditVariant = (variant: ProductVariant, index: number) => {
    setEditingVariant(variant);
    setEditingVariantIndex(index);
    setShowVariantModal(true);
  };

  const handleSaveVariant = async (variant: ProductVariant) => {
    if (!product) return;

    setIsSavingVariants(true);
    setShowVariantModal(false);

    const updatedVariants = [...product.variants];
    if (editingVariantIndex !== null) {
      updatedVariants[editingVariantIndex] = variant;
    } else {
      updatedVariants.push(variant);
    }

    const result = await updateProduct(productId, { variants: updatedVariants });

    if (result.success) {
      setProduct(parseProduct(result.data));
      setSuccessMessage(editingVariantIndex !== null ? "Variant updated" : "Variant added");
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setError(result.error);
    }

    setIsSavingVariants(false);
    setEditingVariant(null);
    setEditingVariantIndex(null);
  };

  const handleDeleteVariant = async (index: number) => {
    if (!product) return;

    const variantName = product.variants[index].name;
    if (!confirm(`Are you sure you want to delete the variant "${variantName}"?`)) {
      return;
    }

    setIsSavingVariants(true);

    const updatedVariants = product.variants.filter((_, i) => i !== index);
    const result = await updateProduct(productId, { variants: updatedVariants });

    if (result.success) {
      setProduct(parseProduct(result.data));
      setSuccessMessage("Variant deleted");
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setError(result.error);
    }

    setIsSavingVariants(false);
  };

  // Format price display
  const formatPrice = (price: number | null, priceRange: string | null): string => {
    if (price !== null) {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(price);
    }
    if (priceRange) {
      return priceRange;
    }
    return "Price not set";
  };

  // Loading state
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p>Loading product...</p>
        <style>{`
          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 400px;
            gap: 1rem;
          }
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #e5e7eb;
            border-top-color: #6366f1;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .loading-container p {
            color: #6b7280;
            margin: 0;
          }
        `}</style>
      </div>
    );
  }

  // Error state
  if (error || !product) {
    return (
      <div className="error-container">
        <div className="error-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2>Unable to load product</h2>
        <p>{error || "Product not found"}</p>
        <Link href={`/brands/${brandId}?tab=products`} className="back-link">
          Back to Products
        </Link>
        <style>{`
          .error-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 400px;
            text-align: center;
            padding: 2rem;
          }
          .error-icon {
            color: #dc2626;
            margin-bottom: 1rem;
          }
          .error-container h2 {
            font-size: 1.25rem;
            font-weight: 600;
            color: #111827;
            margin: 0 0 0.5rem;
          }
          .error-container p {
            color: #6b7280;
            margin: 0 0 1.5rem;
          }
          .back-link {
            display: inline-flex;
            align-items: center;
            padding: 0.625rem 1rem;
            background: #6366f1;
            color: white;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 500;
            transition: background 0.15s;
          }
          .back-link:hover {
            background: #4f46e5;
          }
        `}</style>
      </div>
    );
  }

  const marketingAttrs = product.marketing_attributes;

  return (
    <div className="product-detail-page">
      {/* Success Message */}
      {successMessage && (
        <div className="success-toast">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          {successMessage}
        </div>
      )}

      {/* Header */}
      <header className="page-header">
        <Link href={`/brands/${brandId}?tab=products`} className="back-link">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Products
        </Link>
        <div className="header-row">
          <div className="header-info">
            <h1 className="page-title">{product.name}</h1>
            {product.product_type && (
              <span className="product-type-badge">{product.product_type}</span>
            )}
          </div>
          <div className="header-actions">
            <Link href={`/brands/${brandId}/products/${productId}/edit`} className="btn-edit">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit Product
            </Link>
            <button className="btn-delete" onClick={() => setShowDeleteModal(true)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
              Delete
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="content-grid">
        {/* Left Column - Images */}
        <div className="left-column">
          <ImageGallery images={product.images} />

          {/* Videos Section */}
          {product.videos.length > 0 && (
            <section className="section videos-section">
              <h3 className="section-title">Videos</h3>
              <div className="videos-list">
                {product.videos.map((video, index) => (
                  <a
                    key={index}
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="video-link"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    {video.title || `Video ${index + 1}`}
                  </a>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right Column - Info */}
        <div className="right-column">
          {/* Product Info Section */}
          <section className="section">
            <div className="section-header">
              <h3 className="section-title">Product Information</h3>
            </div>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Price</span>
                <span className="info-value price">{formatPrice(product.price, product.price_range)}</span>
              </div>
              {product.sku && (
                <div className="info-item">
                  <span className="info-label">SKU</span>
                  <span className="info-value mono">{product.sku}</span>
                </div>
              )}
            </div>

            {product.short_description && (
              <div className="description-block">
                <span className="info-label">Short Description</span>
                <p className="short-description">{product.short_description}</p>
              </div>
            )}

            {product.full_description && (
              <div className="description-block">
                <span className="info-label">Full Description</span>
                <p className="full-description">{product.full_description}</p>
              </div>
            )}
          </section>

          {/* Variants Section */}
          <section className="section">
            <div className="section-header">
              <h3 className="section-title">Variants</h3>
              <button className="btn-add" onClick={handleAddVariant} disabled={isSavingVariants}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Variant
              </button>
            </div>

            {product.variants.length === 0 ? (
              <div className="empty-state">
                <p>No variants defined. Add variants for different sizes, colors, or configurations.</p>
              </div>
            ) : (
              <div className="variants-list">
                {product.variants.map((variant, index) => (
                  <div key={index} className="variant-card">
                    <div className="variant-info">
                      <span className="variant-name">{variant.name}</span>
                      <div className="variant-details">
                        {variant.sku && <span className="variant-sku">SKU: {variant.sku}</span>}
                        {variant.price != null && (
                          <span className="variant-price">
                            {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(variant.price)}
                          </span>
                        )}
                      </div>
                      {variant.attributes && Object.keys(variant.attributes).length > 0 && (
                        <div className="variant-attributes">
                          {Object.entries(variant.attributes).map(([key, value]) => (
                            <span key={key} className="attribute-badge">
                              {key}: {value}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="variant-actions">
                      <button
                        className="btn-icon"
                        onClick={() => handleEditVariant(variant, index)}
                        disabled={isSavingVariants}
                        title="Edit variant"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        className="btn-icon btn-icon-danger"
                        onClick={() => handleDeleteVariant(index)}
                        disabled={isSavingVariants}
                        title="Delete variant"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Marketing Attributes Section */}
          {marketingAttrs && (
            <section className="section">
              <div className="section-header">
                <h3 className="section-title">Marketing Attributes</h3>
              </div>

              {marketingAttrs.uvp && (
                <div className="marketing-block">
                  <span className="info-label">Unique Value Proposition</span>
                  <p className="uvp-text">{marketingAttrs.uvp}</p>
                </div>
              )}

              {marketingAttrs.benefits && marketingAttrs.benefits.length > 0 && (
                <div className="marketing-block">
                  <span className="info-label">Key Benefits</span>
                  <ul className="marketing-list">
                    {marketingAttrs.benefits.map((benefit, index) => (
                      <li key={index}>{benefit}</li>
                    ))}
                  </ul>
                </div>
              )}

              {marketingAttrs.targetProblems && marketingAttrs.targetProblems.length > 0 && (
                <div className="marketing-block">
                  <span className="info-label">Target Problems</span>
                  <ul className="marketing-list">
                    {marketingAttrs.targetProblems.map((problem, index) => (
                      <li key={index}>{problem}</li>
                    ))}
                  </ul>
                </div>
              )}

              {marketingAttrs.competitiveAdvantages && marketingAttrs.competitiveAdvantages.length > 0 && (
                <div className="marketing-block">
                  <span className="info-label">Competitive Advantages</span>
                  <ul className="marketing-list">
                    {marketingAttrs.competitiveAdvantages.map((advantage, index) => (
                      <li key={index}>{advantage}</li>
                    ))}
                  </ul>
                </div>
              )}

              {marketingAttrs.socialProof && marketingAttrs.socialProof.length > 0 && (
                <div className="marketing-block">
                  <span className="info-label">Social Proof</span>
                  <div className="social-proof-list">
                    {marketingAttrs.socialProof.map((proof, index) => (
                      <blockquote key={index} className="social-proof-item">
                        &ldquo;{proof}&rdquo;
                      </blockquote>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Metadata */}
          <section className="section metadata-section">
            <div className="metadata-grid">
              <div className="metadata-item">
                <span className="info-label">Created</span>
                <span className="info-value">
                  {new Date(product.created_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
              <div className="metadata-item">
                <span className="info-label">Last Updated</span>
                <span className="info-value">
                  {new Date(product.updated_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <DeleteConfirmModal
          productName={product.name}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
          isDeleting={isDeleting}
        />
      )}

      {/* Variant Edit Modal */}
      {showVariantModal && (
        <VariantModal
          variant={editingVariant}
          onSave={handleSaveVariant}
          onCancel={() => {
            setShowVariantModal(false);
            setEditingVariant(null);
            setEditingVariantIndex(null);
          }}
          isNew={editingVariantIndex === null}
        />
      )}

      <style>{`
        .product-detail-page {
          max-width: 1200px;
          margin: 0 auto;
        }

        /* Success Toast */
        .success-toast {
          position: fixed;
          top: 1rem;
          right: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: #10b981;
          color: white;
          border-radius: 8px;
          font-size: 0.9375rem;
          font-weight: 500;
          z-index: 1000;
          animation: slideIn 0.3s ease;
        }
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        /* Header */
        .page-header {
          margin-bottom: 1.5rem;
        }

        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          color: #6b7280;
          text-decoration: none;
          font-size: 0.875rem;
          margin-bottom: 1rem;
          transition: color 0.15s;
        }
        .back-link:hover {
          color: #111827;
        }

        .header-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1.5rem;
          flex-wrap: wrap;
        }

        .header-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .page-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: #111827;
          margin: 0;
        }

        .product-type-badge {
          padding: 0.25rem 0.75rem;
          background: #f3f4f6;
          color: #4b5563;
          border-radius: 9999px;
          font-size: 0.8125rem;
          font-weight: 500;
        }

        .header-actions {
          display: flex;
          gap: 0.75rem;
        }

        .btn-edit,
        .btn-delete {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1rem;
          border-radius: 8px;
          font-size: 0.9375rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s;
          text-decoration: none;
        }

        .btn-edit {
          background: #6366f1;
          color: white;
          border: none;
        }
        .btn-edit:hover {
          background: #4f46e5;
        }

        .btn-delete {
          background: white;
          color: #dc2626;
          border: 1px solid #fecaca;
        }
        .btn-delete:hover {
          background: #fef2f2;
          border-color: #f87171;
        }

        /* Content Grid */
        .content-grid {
          display: grid;
          grid-template-columns: 400px 1fr;
          gap: 2rem;
        }

        /* Sections */
        .section {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .section-title {
          font-size: 1rem;
          font-weight: 600;
          color: #111827;
          margin: 0;
        }

        /* Info Grid */
        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .info-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .info-label {
          font-size: 0.75rem;
          font-weight: 500;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .info-value {
          font-size: 0.9375rem;
          color: #111827;
        }

        .info-value.price {
          font-size: 1.25rem;
          font-weight: 600;
          color: #059669;
        }

        .info-value.mono {
          font-family: monospace;
        }

        .description-block {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #f3f4f6;
        }

        .short-description,
        .full-description {
          margin: 0.5rem 0 0;
          font-size: 0.9375rem;
          color: #374151;
          line-height: 1.6;
        }

        .full-description {
          white-space: pre-wrap;
        }

        /* Videos */
        .videos-section {
          margin-top: 1.5rem;
        }

        .videos-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .video-link {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          color: #374151;
          text-decoration: none;
          font-size: 0.9375rem;
          transition: background 0.15s;
        }
        .video-link:hover {
          background: #f3f4f6;
        }

        /* Variants */
        .btn-add {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.5rem 0.875rem;
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 0.8125rem;
          font-weight: 500;
          color: #374151;
          cursor: pointer;
          transition: background 0.15s;
        }
        .btn-add:hover:not(:disabled) {
          background: #e5e7eb;
        }
        .btn-add:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .empty-state {
          padding: 1.5rem;
          background: #f9fafb;
          border: 1px dashed #d1d5db;
          border-radius: 8px;
          text-align: center;
        }
        .empty-state p {
          margin: 0;
          color: #6b7280;
          font-size: 0.9375rem;
        }

        .variants-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .variant-card {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          padding: 1rem;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
        }

        .variant-info {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }

        .variant-name {
          font-weight: 600;
          color: #111827;
        }

        .variant-details {
          display: flex;
          align-items: center;
          gap: 1rem;
          font-size: 0.8125rem;
        }

        .variant-sku {
          color: #6b7280;
          font-family: monospace;
        }

        .variant-price {
          color: #059669;
          font-weight: 500;
        }

        .variant-attributes {
          display: flex;
          flex-wrap: wrap;
          gap: 0.375rem;
          margin-top: 0.25rem;
        }

        .attribute-badge {
          padding: 0.125rem 0.5rem;
          background: #e5e7eb;
          color: #374151;
          border-radius: 4px;
          font-size: 0.75rem;
        }

        .variant-actions {
          display: flex;
          gap: 0.25rem;
        }

        .btn-icon {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.15s;
        }
        .btn-icon:hover:not(:disabled) {
          background: #f3f4f6;
          color: #374151;
        }
        .btn-icon:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .btn-icon-danger:hover:not(:disabled) {
          background: #fef2f2;
          border-color: #fecaca;
          color: #dc2626;
        }

        /* Marketing Attributes */
        .marketing-block {
          margin-bottom: 1.25rem;
        }
        .marketing-block:last-child {
          margin-bottom: 0;
        }

        .uvp-text {
          margin: 0.5rem 0 0;
          padding: 1rem;
          background: #f9fafb;
          border-left: 3px solid #6366f1;
          font-size: 0.9375rem;
          color: #374151;
          line-height: 1.6;
        }

        .marketing-list {
          margin: 0.5rem 0 0;
          padding-left: 1.25rem;
        }
        .marketing-list li {
          font-size: 0.9375rem;
          color: #374151;
          padding: 0.25rem 0;
        }

        .social-proof-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-top: 0.5rem;
        }

        .social-proof-item {
          margin: 0;
          padding: 0.75rem 1rem;
          background: #fefce8;
          border-left: 3px solid #eab308;
          font-size: 0.9375rem;
          color: #374151;
          font-style: italic;
        }

        /* Metadata */
        .metadata-section {
          background: #f9fafb;
        }

        .metadata-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .metadata-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        @media (max-width: 900px) {
          .content-grid {
            grid-template-columns: 1fr;
          }

          .left-column {
            max-width: 400px;
            margin: 0 auto;
          }
        }

        @media (max-width: 640px) {
          .header-row {
            flex-direction: column;
            align-items: stretch;
          }

          .header-actions {
            justify-content: flex-end;
          }

          .info-grid {
            grid-template-columns: 1fr;
          }

          .metadata-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
