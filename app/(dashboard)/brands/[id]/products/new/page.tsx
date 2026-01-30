/**
 * Product Creation Form
 *
 * Form for creating a new product within a brand.
 * Includes all required and optional fields per US-039.
 */

"use client";

import { useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { createProduct } from "@/app/actions/products";
import {
  productTypes,
  priceRanges,
  type CreateProductInput,
  type ProductImage,
  type ProductVideo,
  type MarketingAttributes,
} from "@/lib/validations/product";

// Form data type matching CreateProductInput
type ProductFormData = {
  // Required
  name: string;
  // Core info
  productType: string;
  shortDescription: string;
  fullDescription: string;
  sku: string;
  price: string;
  priceRange: string;
  // Media
  images: ProductImage[];
  videos: ProductVideo[];
  // Marketing
  marketingAttributes: {
    uvp: string;
    benefits: string[];
    targetProblems: string[];
    competitiveAdvantages: string[];
    socialProof: string[];
  };
};

const initialFormData: ProductFormData = {
  name: "",
  productType: "",
  shortDescription: "",
  fullDescription: "",
  sku: "",
  price: "",
  priceRange: "",
  images: [],
  videos: [],
  marketingAttributes: {
    uvp: "",
    benefits: [""],
    targetProblems: [""],
    competitiveAdvantages: [],
    socialProof: [],
  },
};

// Image preview type for local state
type ImagePreview = {
  id: string;
  file: File;
  previewUrl: string;
  isUploading: boolean;
  uploadedUrl?: string;
  alt: string;
  isPrimary: boolean;
};

// Video entry type for local state
type VideoEntry = {
  id: string;
  url: string;
  title: string;
  thumbnailUrl: string;
};

export default function NewProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: brandId } = use(params);
  const router = useRouter();

  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Image management
  const [imagePreviews, setImagePreviews] = useState<ImagePreview[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Video management
  const [videoEntries, setVideoEntries] = useState<VideoEntry[]>([]);

  // Section collapse states
  const [showMarketingSection, setShowMarketingSection] = useState(false);
  const [showVideoSection, setShowVideoSection] = useState(false);

  // Accepted file types for images
  const acceptedImageTypes = ["image/png", "image/jpeg", "image/webp", "image/gif"];
  const acceptImageString = ".png,.jpg,.jpeg,.webp,.gif";
  const maxImageSize = 10 * 1024 * 1024; // 10MB

  // Handle form field updates
  const updateField = (field: keyof ProductFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when field is updated
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Handle image file selection
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newPreviews: ImagePreview[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validate file type
      if (!acceptedImageTypes.includes(file.type)) {
        setErrors((prev) => ({
          ...prev,
          images: `${file.name}: Invalid file type. Please upload PNG, JPEG, WebP, or GIF.`,
        }));
        continue;
      }

      // Validate file size
      if (file.size > maxImageSize) {
        setErrors((prev) => ({
          ...prev,
          images: `${file.name}: File size must be less than 10MB.`,
        }));
        continue;
      }

      // Create preview
      const previewUrl = URL.createObjectURL(file);
      const preview: ImagePreview = {
        id: `${Date.now()}-${i}`,
        file,
        previewUrl,
        isUploading: false,
        alt: "",
        isPrimary: imagePreviews.length === 0 && i === 0, // First image is primary
      };
      newPreviews.push(preview);
    }

    if (newPreviews.length > 0) {
      setImagePreviews((prev) => [...prev, ...newPreviews]);
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.images;
        return newErrors;
      });
    }

    // Reset input
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  };

  // Upload all images to storage
  const uploadImages = async (): Promise<ProductImage[]> => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("You must be logged in to upload files");
    }

    const uploadedImages: ProductImage[] = [];

    for (let i = 0; i < imagePreviews.length; i++) {
      const preview = imagePreviews[i];

      // Mark as uploading
      setImagePreviews((prev) =>
        prev.map((p) =>
          p.id === preview.id ? { ...p, isUploading: true } : p
        )
      );

      const fileExt = preview.file.name.split(".").pop();
      const fileName = `${user.id}/products/${brandId}/${Date.now()}-${i}.${fileExt}`;

      const { error: uploadErr } = await supabase.storage
        .from("product-images")
        .upload(fileName, preview.file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadErr) {
        throw new Error(`Failed to upload ${preview.file.name}: ${uploadErr.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(fileName);

      uploadedImages.push({
        url: urlData.publicUrl,
        alt: preview.alt || preview.file.name,
        isPrimary: preview.isPrimary,
        sortOrder: i,
      });

      // Mark as uploaded
      setImagePreviews((prev) =>
        prev.map((p) =>
          p.id === preview.id
            ? { ...p, isUploading: false, uploadedUrl: urlData.publicUrl }
            : p
        )
      );
    }

    return uploadedImages;
  };

  // Remove an image preview
  const removeImage = (id: string) => {
    setImagePreviews((prev) => {
      const filtered = prev.filter((p) => p.id !== id);
      // If removed image was primary and there are other images, make first one primary
      if (filtered.length > 0 && !filtered.some((p) => p.isPrimary)) {
        filtered[0].isPrimary = true;
      }
      return filtered;
    });
  };

  // Set an image as primary
  const setImagePrimary = (id: string) => {
    setImagePreviews((prev) =>
      prev.map((p) => ({
        ...p,
        isPrimary: p.id === id,
      }))
    );
  };

  // Update image alt text
  const updateImageAlt = (id: string, alt: string) => {
    setImagePreviews((prev) =>
      prev.map((p) => (p.id === id ? { ...p, alt } : p))
    );
  };

  // Add a video entry
  const addVideoEntry = () => {
    setVideoEntries((prev) => [
      ...prev,
      {
        id: `video-${Date.now()}`,
        url: "",
        title: "",
        thumbnailUrl: "",
      },
    ]);
  };

  // Update a video entry
  const updateVideoEntry = (id: string, field: keyof VideoEntry, value: string) => {
    setVideoEntries((prev) =>
      prev.map((v) => (v.id === id ? { ...v, [field]: value } : v))
    );
  };

  // Remove a video entry
  const removeVideoEntry = (id: string) => {
    setVideoEntries((prev) => prev.filter((v) => v.id !== id));
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required: Name
    if (!formData.name.trim()) {
      newErrors.name = "Product name is required";
    } else if (formData.name.length > 255) {
      newErrors.name = "Product name must be 255 characters or less";
    }

    // Required: Short Description (per acceptance criteria)
    if (!formData.shortDescription.trim()) {
      newErrors.shortDescription = "Short description is required";
    } else if (formData.shortDescription.length > 160) {
      newErrors.shortDescription = "Short description must be 160 characters or less";
    }

    // Required: Full Description (per acceptance criteria)
    if (!formData.fullDescription.trim()) {
      newErrors.fullDescription = "Full description is required";
    }

    // Required: At least 3 images (per acceptance criteria)
    if (imagePreviews.length < 3) {
      newErrors.images = "Please upload at least 3 images";
    }

    // Optional: Price validation
    if (formData.price) {
      const priceNum = parseFloat(formData.price);
      if (isNaN(priceNum) || priceNum < 0) {
        newErrors.price = "Price must be a positive number";
      } else if (priceNum > 9999999.99) {
        newErrors.price = "Price must be less than $10,000,000";
      }
    }

    // Optional: SKU length
    if (formData.sku && formData.sku.length > 100) {
      newErrors.sku = "SKU must be 100 characters or less";
    }

    // Optional: UVP length
    if (formData.marketingAttributes.uvp && formData.marketingAttributes.uvp.length > 500) {
      newErrors.uvp = "Unique value proposition must be 500 characters or less";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setIsUploading(true);

    try {
      // Upload images first
      const uploadedImages = await uploadImages();

      // Build product videos from entries
      const videos: ProductVideo[] = videoEntries
        .filter((v) => v.url.trim())
        .map((v, index) => ({
          url: v.url,
          title: v.title || undefined,
          thumbnailUrl: v.thumbnailUrl || undefined,
          sortOrder: index,
        }));

      // Build marketing attributes
      const marketingAttributes: MarketingAttributes = {
        uvp: formData.marketingAttributes.uvp || undefined,
        benefits: formData.marketingAttributes.benefits.filter((b) => b.trim()),
        targetProblems: formData.marketingAttributes.targetProblems.filter((t) => t.trim()),
        competitiveAdvantages: formData.marketingAttributes.competitiveAdvantages.filter((c) => c.trim()),
        socialProof: formData.marketingAttributes.socialProof.filter((s) => s.trim()),
      };

      // Build input
      const input: CreateProductInput = {
        brandId,
        name: formData.name.trim(),
        productType: (formData.productType || undefined) as CreateProductInput["productType"],
        shortDescription: formData.shortDescription.trim() || undefined,
        fullDescription: formData.fullDescription.trim() || undefined,
        sku: formData.sku.trim() || undefined,
        price: formData.price ? parseFloat(formData.price) : undefined,
        priceRange: (formData.priceRange || undefined) as CreateProductInput["priceRange"],
        images: uploadedImages.length > 0 ? uploadedImages : undefined,
        videos: videos.length > 0 ? videos : undefined,
        marketingAttributes:
          marketingAttributes.uvp ||
          (marketingAttributes.benefits && marketingAttributes.benefits.length > 0) ||
          (marketingAttributes.targetProblems && marketingAttributes.targetProblems.length > 0)
            ? marketingAttributes
            : undefined,
      };

      // Create product
      const result = await createProduct(input);

      if (!result.success) {
        setSubmitError(result.error);
        setIsSubmitting(false);
        setIsUploading(false);
        return;
      }

      // Redirect to product detail page
      router.push(`/brands/${brandId}/products/${result.data.id}`);
    } catch (err) {
      console.error("Error creating product:", err);
      setSubmitError(
        err instanceof Error ? err.message : "An error occurred while creating the product"
      );
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  // List management helpers
  const addListItem = (field: "benefits" | "targetProblems" | "competitiveAdvantages" | "socialProof") => {
    setFormData((prev) => ({
      ...prev,
      marketingAttributes: {
        ...prev.marketingAttributes,
        [field]: [...prev.marketingAttributes[field], ""],
      },
    }));
  };

  const updateListItem = (
    field: "benefits" | "targetProblems" | "competitiveAdvantages" | "socialProof",
    index: number,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      marketingAttributes: {
        ...prev.marketingAttributes,
        [field]: prev.marketingAttributes[field].map((item, i) =>
          i === index ? value : item
        ),
      },
    }));
  };

  const removeListItem = (
    field: "benefits" | "targetProblems" | "competitiveAdvantages" | "socialProof",
    index: number
  ) => {
    setFormData((prev) => ({
      ...prev,
      marketingAttributes: {
        ...prev.marketingAttributes,
        [field]: prev.marketingAttributes[field].filter((_, i) => i !== index),
      },
    }));
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <Link href={`/brands/${brandId}`} className="back-link">
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
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to Brand
          </Link>
          <h1 className="page-title">Add New Product</h1>
          <p className="page-description">
            Add a new product to your brand catalog with images and marketing details.
          </p>
        </div>
      </div>

      {/* Error Banner */}
      {submitError && (
        <div className="error-banner">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{submitError}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="product-form">
        {/* Basic Information Section */}
        <div className="form-section">
          <h2 className="section-title">Basic Information</h2>
          <p className="section-description">
            Enter the core details about your product.
          </p>

          <div className="form-grid">
            {/* Product Name */}
            <div className="form-field full-width">
              <label htmlFor="name" className="field-label">
                Product Name <span className="required">*</span>
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="Enter product name"
                className={`field-input ${errors.name ? "error" : ""}`}
                maxLength={255}
              />
              {errors.name && <p className="field-error">{errors.name}</p>}
            </div>

            {/* Product Type */}
            <div className="form-field">
              <label htmlFor="productType" className="field-label">
                Product Type
              </label>
              <select
                id="productType"
                value={formData.productType}
                onChange={(e) => updateField("productType", e.target.value)}
                className="field-select"
              >
                <option value="">Select type</option>
                {productTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* SKU */}
            <div className="form-field">
              <label htmlFor="sku" className="field-label">
                SKU
              </label>
              <input
                type="text"
                id="sku"
                value={formData.sku}
                onChange={(e) => updateField("sku", e.target.value)}
                placeholder="e.g., PROD-001"
                className={`field-input ${errors.sku ? "error" : ""}`}
                maxLength={100}
              />
              {errors.sku && <p className="field-error">{errors.sku}</p>}
            </div>

            {/* Short Description */}
            <div className="form-field full-width">
              <label htmlFor="shortDescription" className="field-label">
                Short Description <span className="required">*</span>
                <span className="char-count">
                  {formData.shortDescription.length}/160
                </span>
              </label>
              <input
                type="text"
                id="shortDescription"
                value={formData.shortDescription}
                onChange={(e) => updateField("shortDescription", e.target.value)}
                placeholder="Brief product description (optimal for SEO)"
                className={`field-input ${errors.shortDescription ? "error" : ""}`}
                maxLength={160}
              />
              {errors.shortDescription && (
                <p className="field-error">{errors.shortDescription}</p>
              )}
            </div>

            {/* Full Description */}
            <div className="form-field full-width">
              <label htmlFor="fullDescription" className="field-label">
                Full Description <span className="required">*</span>
              </label>
              <textarea
                id="fullDescription"
                value={formData.fullDescription}
                onChange={(e) => updateField("fullDescription", e.target.value)}
                placeholder="Detailed product description..."
                className={`field-textarea ${errors.fullDescription ? "error" : ""}`}
                rows={5}
              />
              {errors.fullDescription && (
                <p className="field-error">{errors.fullDescription}</p>
              )}
            </div>
          </div>
        </div>

        {/* Pricing Section */}
        <div className="form-section">
          <h2 className="section-title">Pricing</h2>
          <p className="section-description">
            Set the price or price range for your product.
          </p>

          <div className="form-grid">
            {/* Price */}
            <div className="form-field">
              <label htmlFor="price" className="field-label">
                Price
              </label>
              <div className="input-with-prefix">
                <span className="input-prefix">$</span>
                <input
                  type="number"
                  id="price"
                  value={formData.price}
                  onChange={(e) => updateField("price", e.target.value)}
                  placeholder="0.00"
                  className={`field-input with-prefix ${errors.price ? "error" : ""}`}
                  min="0"
                  step="0.01"
                />
              </div>
              {errors.price && <p className="field-error">{errors.price}</p>}
            </div>

            {/* Price Range */}
            <div className="form-field">
              <label htmlFor="priceRange" className="field-label">
                Price Range
              </label>
              <select
                id="priceRange"
                value={formData.priceRange}
                onChange={(e) => updateField("priceRange", e.target.value)}
                className="field-select"
              >
                <option value="">Select range</option>
                {priceRanges.map((range) => (
                  <option key={range} value={range}>
                    {range}
                  </option>
                ))}
              </select>
              <p className="field-hint">
                Use this for products with variable pricing.
              </p>
            </div>
          </div>
        </div>

        {/* Images Section */}
        <div className="form-section">
          <h2 className="section-title">
            Product Images <span className="required">*</span>
          </h2>
          <p className="section-description">
            Upload at least 3 images of your product. PNG, JPEG, WebP, or GIF up to 10MB each.
          </p>

          {/* Image Upload Area */}
          <div className="upload-area">
            <input
              type="file"
              ref={imageInputRef}
              onChange={handleImageSelect}
              accept={acceptImageString}
              multiple
              className="hidden-input"
              id="imageInput"
            />
            <label htmlFor="imageInput" className="upload-label">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span className="upload-text">
                Click to upload or drag and drop
              </span>
              <span className="upload-hint">
                {imagePreviews.length}/3 minimum images uploaded
              </span>
            </label>
          </div>

          {errors.images && <p className="field-error">{errors.images}</p>}

          {/* Image Previews */}
          {imagePreviews.length > 0 && (
            <div className="image-previews">
              {imagePreviews.map((preview) => (
                <div
                  key={preview.id}
                  className={`image-preview-card ${preview.isPrimary ? "primary" : ""} ${
                    preview.isUploading ? "uploading" : ""
                  }`}
                >
                  <img
                    src={preview.previewUrl}
                    alt={preview.alt || "Product image"}
                    className="preview-image"
                  />

                  {preview.isUploading && (
                    <div className="upload-overlay">
                      <div className="spinner" />
                    </div>
                  )}

                  <div className="preview-actions">
                    {!preview.isPrimary && (
                      <button
                        type="button"
                        onClick={() => setImagePrimary(preview.id)}
                        className="action-btn set-primary"
                        title="Set as primary image"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(preview.id)}
                      className="action-btn remove"
                      title="Remove image"
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
                  </div>

                  {preview.isPrimary && (
                    <span className="primary-badge">Primary</span>
                  )}

                  <input
                    type="text"
                    value={preview.alt}
                    onChange={(e) => updateImageAlt(preview.id, e.target.value)}
                    placeholder="Alt text"
                    className="alt-input"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Videos Section (Optional) */}
        <div className="form-section">
          <div className="section-header">
            <div>
              <h2 className="section-title">Product Videos</h2>
              <p className="section-description">
                Add video URLs to showcase your product.
              </p>
            </div>
            <button
              type="button"
              className="toggle-button"
              onClick={() => setShowVideoSection(!showVideoSection)}
            >
              {showVideoSection ? "Hide" : "Show"} Videos
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={showVideoSection ? "rotated" : ""}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>

          {showVideoSection && (
            <div className="video-entries">
              {videoEntries.map((video, index) => (
                <div key={video.id} className="video-entry">
                  <div className="video-entry-header">
                    <span className="video-number">Video {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeVideoEntry(video.id)}
                      className="remove-video-btn"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="video-fields">
                    <input
                      type="url"
                      value={video.url}
                      onChange={(e) =>
                        updateVideoEntry(video.id, "url", e.target.value)
                      }
                      placeholder="Video URL (YouTube, Vimeo, etc.)"
                      className="field-input"
                    />
                    <input
                      type="text"
                      value={video.title}
                      onChange={(e) =>
                        updateVideoEntry(video.id, "title", e.target.value)
                      }
                      placeholder="Video title (optional)"
                      className="field-input"
                    />
                    <input
                      type="url"
                      value={video.thumbnailUrl}
                      onChange={(e) =>
                        updateVideoEntry(video.id, "thumbnailUrl", e.target.value)
                      }
                      placeholder="Thumbnail URL (optional)"
                      className="field-input"
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addVideoEntry}
                className="add-video-btn"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Video
              </button>
            </div>
          )}
        </div>

        {/* Marketing Attributes Section */}
        <div className="form-section">
          <div className="section-header">
            <div>
              <h2 className="section-title">Marketing Attributes</h2>
              <p className="section-description">
                Define your product&apos;s unique selling points and benefits.
              </p>
            </div>
            <button
              type="button"
              className="toggle-button"
              onClick={() => setShowMarketingSection(!showMarketingSection)}
            >
              {showMarketingSection ? "Hide" : "Show"} Marketing
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={showMarketingSection ? "rotated" : ""}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>

          {showMarketingSection && (
            <div className="marketing-fields">
              {/* UVP */}
              <div className="form-field">
                <label htmlFor="uvp" className="field-label">
                  Unique Value Proposition (UVP)
                  <span className="char-count">
                    {formData.marketingAttributes.uvp.length}/500
                  </span>
                </label>
                <textarea
                  id="uvp"
                  value={formData.marketingAttributes.uvp}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      marketingAttributes: {
                        ...prev.marketingAttributes,
                        uvp: e.target.value,
                      },
                    }))
                  }
                  placeholder="What makes this product unique and valuable?"
                  className={`field-textarea ${errors.uvp ? "error" : ""}`}
                  rows={3}
                  maxLength={500}
                />
                {errors.uvp && <p className="field-error">{errors.uvp}</p>}
              </div>

              {/* Benefits */}
              <div className="form-field">
                <label className="field-label">Key Benefits</label>
                <p className="field-hint">What does the customer gain from using this product?</p>
                <div className="list-items">
                  {formData.marketingAttributes.benefits.map((benefit, index) => (
                    <div key={index} className="list-item">
                      <input
                        type="text"
                        value={benefit}
                        onChange={(e) =>
                          updateListItem("benefits", index, e.target.value)
                        }
                        placeholder={`Benefit ${index + 1}`}
                        className="field-input"
                        maxLength={255}
                      />
                      {formData.marketingAttributes.benefits.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeListItem("benefits", index)}
                          className="remove-item-btn"
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
                  ))}
                  {formData.marketingAttributes.benefits.length < 10 && (
                    <button
                      type="button"
                      onClick={() => addListItem("benefits")}
                      className="add-item-btn"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      Add Benefit
                    </button>
                  )}
                </div>
              </div>

              {/* Target Problems */}
              <div className="form-field">
                <label className="field-label">Target Problems</label>
                <p className="field-hint">What problems does this product solve?</p>
                <div className="list-items">
                  {formData.marketingAttributes.targetProblems.map((problem, index) => (
                    <div key={index} className="list-item">
                      <input
                        type="text"
                        value={problem}
                        onChange={(e) =>
                          updateListItem("targetProblems", index, e.target.value)
                        }
                        placeholder={`Problem ${index + 1}`}
                        className="field-input"
                        maxLength={255}
                      />
                      {formData.marketingAttributes.targetProblems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeListItem("targetProblems", index)}
                          className="remove-item-btn"
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
                  ))}
                  {formData.marketingAttributes.targetProblems.length < 10 && (
                    <button
                      type="button"
                      onClick={() => addListItem("targetProblems")}
                      className="add-item-btn"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      Add Problem
                    </button>
                  )}
                </div>
              </div>

              {/* Competitive Advantages */}
              <div className="form-field">
                <label className="field-label">Competitive Advantages</label>
                <p className="field-hint">How is this product better than alternatives?</p>
                <div className="list-items">
                  {formData.marketingAttributes.competitiveAdvantages.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => addListItem("competitiveAdvantages")}
                      className="add-item-btn"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      Add Advantage
                    </button>
                  ) : (
                    <>
                      {formData.marketingAttributes.competitiveAdvantages.map(
                        (advantage, index) => (
                          <div key={index} className="list-item">
                            <input
                              type="text"
                              value={advantage}
                              onChange={(e) =>
                                updateListItem(
                                  "competitiveAdvantages",
                                  index,
                                  e.target.value
                                )
                              }
                              placeholder={`Advantage ${index + 1}`}
                              className="field-input"
                              maxLength={255}
                            />
                            <button
                              type="button"
                              onClick={() =>
                                removeListItem("competitiveAdvantages", index)
                              }
                              className="remove-item-btn"
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
                          </div>
                        )
                      )}
                      {formData.marketingAttributes.competitiveAdvantages.length <
                        10 && (
                        <button
                          type="button"
                          onClick={() => addListItem("competitiveAdvantages")}
                          className="add-item-btn"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                          Add Advantage
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Social Proof */}
              <div className="form-field">
                <label className="field-label">Social Proof</label>
                <p className="field-hint">Customer testimonials, reviews, or endorsements.</p>
                <div className="list-items">
                  {formData.marketingAttributes.socialProof.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => addListItem("socialProof")}
                      className="add-item-btn"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      Add Social Proof
                    </button>
                  ) : (
                    <>
                      {formData.marketingAttributes.socialProof.map(
                        (proof, index) => (
                          <div key={index} className="list-item">
                            <input
                              type="text"
                              value={proof}
                              onChange={(e) =>
                                updateListItem("socialProof", index, e.target.value)
                              }
                              placeholder={`Testimonial ${index + 1}`}
                              className="field-input"
                              maxLength={500}
                            />
                            <button
                              type="button"
                              onClick={() => removeListItem("socialProof", index)}
                              className="remove-item-btn"
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
                          </div>
                        )
                      )}
                      {formData.marketingAttributes.socialProof.length < 10 && (
                        <button
                          type="button"
                          onClick={() => addListItem("socialProof")}
                          className="add-item-btn"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                          Add Social Proof
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="form-actions">
          <Link href={`/brands/${brandId}`} className="cancel-btn">
            Cancel
          </Link>
          <button
            type="submit"
            className="submit-btn"
            disabled={isSubmitting || isUploading}
          >
            {isSubmitting
              ? isUploading
                ? "Uploading images..."
                : "Creating product..."
              : "Create Product"}
          </button>
        </div>
      </form>

      <style>{`
        .page-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
        }

        .page-header {
          margin-bottom: 2rem;
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

        .page-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: #111827;
          margin: 0 0 0.5rem;
        }

        .page-description {
          font-size: 1rem;
          color: #6b7280;
          margin: 0;
        }

        .error-banner {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          color: #dc2626;
          margin-bottom: 1.5rem;
        }

        .product-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .form-section {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 1.5rem;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .section-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #111827;
          margin: 0 0 0.25rem;
        }

        .section-description {
          font-size: 0.875rem;
          color: #6b7280;
          margin: 0 0 1.5rem;
        }

        .section-header .section-description {
          margin-bottom: 0;
        }

        .toggle-button {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.5rem 0.75rem;
          background: #f3f4f6;
          border: none;
          border-radius: 6px;
          font-size: 0.8125rem;
          font-weight: 500;
          color: #4b5563;
          cursor: pointer;
          transition: background 0.15s;
          white-space: nowrap;
        }
        .toggle-button:hover {
          background: #e5e7eb;
        }
        .toggle-button svg {
          transition: transform 0.2s;
        }
        .toggle-button svg.rotated {
          transform: rotate(180deg);
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.25rem;
        }

        .form-field {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }

        .form-field.full-width {
          grid-column: 1 / -1;
        }

        .field-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .required {
          color: #ef4444;
        }

        .char-count {
          font-size: 0.75rem;
          color: #9ca3af;
          font-weight: 400;
        }

        .field-input,
        .field-select,
        .field-textarea {
          padding: 0.625rem 0.875rem;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 0.9375rem;
          color: #111827;
          background: white;
          transition: border-color 0.15s, box-shadow 0.15s;
        }

        .field-input:focus,
        .field-select:focus,
        .field-textarea:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .field-input.error,
        .field-select.error,
        .field-textarea.error {
          border-color: #ef4444;
        }

        .field-input::placeholder,
        .field-textarea::placeholder {
          color: #9ca3af;
        }

        .field-textarea {
          resize: vertical;
          min-height: 100px;
        }

        .field-error {
          font-size: 0.8125rem;
          color: #ef4444;
          margin: 0;
        }

        .field-hint {
          font-size: 0.75rem;
          color: #9ca3af;
          margin: 0.25rem 0 0;
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

        /* Image Upload */
        .upload-area {
          border: 2px dashed #d1d5db;
          border-radius: 12px;
          padding: 2rem;
          text-align: center;
          transition: border-color 0.15s, background 0.15s;
          cursor: pointer;
        }
        .upload-area:hover {
          border-color: #6366f1;
          background: #fafafa;
        }

        .hidden-input {
          display: none;
        }

        .upload-label {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          cursor: pointer;
          color: #6b7280;
        }

        .upload-text {
          font-size: 0.9375rem;
          font-weight: 500;
          color: #374151;
        }

        .upload-hint {
          font-size: 0.8125rem;
          color: #9ca3af;
        }

        .image-previews {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 1rem;
          margin-top: 1.5rem;
        }

        .image-preview-card {
          position: relative;
          border-radius: 8px;
          overflow: hidden;
          background: #f9fafb;
          border: 2px solid #e5e7eb;
        }
        .image-preview-card.primary {
          border-color: #6366f1;
        }
        .image-preview-card.uploading {
          opacity: 0.7;
        }

        .preview-image {
          width: 100%;
          aspect-ratio: 1;
          object-fit: cover;
        }

        .upload-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.8);
        }

        .spinner {
          width: 24px;
          height: 24px;
          border: 3px solid #e5e7eb;
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .preview-actions {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          display: flex;
          gap: 0.25rem;
        }

        .action-btn {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.9);
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.15s;
        }
        .action-btn:hover {
          background: white;
        }
        .action-btn.set-primary {
          color: #f59e0b;
        }
        .action-btn.remove {
          color: #ef4444;
        }

        .primary-badge {
          position: absolute;
          top: 0.5rem;
          left: 0.5rem;
          padding: 0.25rem 0.5rem;
          background: #6366f1;
          color: white;
          font-size: 0.6875rem;
          font-weight: 600;
          border-radius: 4px;
          text-transform: uppercase;
        }

        .alt-input {
          width: 100%;
          padding: 0.5rem;
          border: none;
          border-top: 1px solid #e5e7eb;
          font-size: 0.75rem;
          background: white;
        }
        .alt-input:focus {
          outline: none;
          background: #f9fafb;
        }

        /* Video Section */
        .video-entries {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-top: 1rem;
        }

        .video-entry {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 1rem;
        }

        .video-entry-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }

        .video-number {
          font-size: 0.8125rem;
          font-weight: 600;
          color: #374151;
        }

        .remove-video-btn {
          padding: 0.25rem 0.5rem;
          background: none;
          border: none;
          color: #ef4444;
          font-size: 0.8125rem;
          cursor: pointer;
        }
        .remove-video-btn:hover {
          text-decoration: underline;
        }

        .video-fields {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .add-video-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.75rem;
          background: #f3f4f6;
          border: 1px dashed #d1d5db;
          border-radius: 8px;
          color: #6b7280;
          font-size: 0.875rem;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
        }
        .add-video-btn:hover {
          background: #e5e7eb;
          border-color: #9ca3af;
        }

        /* Marketing Fields */
        .marketing-fields {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          margin-top: 1rem;
        }

        .list-items {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .list-item {
          display: flex;
          gap: 0.5rem;
        }

        .list-item .field-input {
          flex: 1;
        }

        .remove-item-btn {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: none;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          color: #ef4444;
          cursor: pointer;
          flex-shrink: 0;
        }
        .remove-item-btn:hover {
          background: #fef2f2;
          border-color: #fecaca;
        }

        .add-item-btn {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.5rem 0.75rem;
          background: none;
          border: 1px dashed #d1d5db;
          border-radius: 6px;
          color: #6b7280;
          font-size: 0.8125rem;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
          width: fit-content;
        }
        .add-item-btn:hover {
          background: #f9fafb;
          border-color: #9ca3af;
        }

        /* Form Actions */
        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #e5e7eb;
          margin-top: 1rem;
        }

        .cancel-btn {
          padding: 0.75rem 1.5rem;
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          color: #374151;
          font-size: 0.9375rem;
          font-weight: 500;
          text-decoration: none;
          cursor: pointer;
          transition: background 0.15s;
        }
        .cancel-btn:hover {
          background: #f9fafb;
        }

        .submit-btn {
          padding: 0.75rem 1.5rem;
          background: #6366f1;
          border: none;
          border-radius: 8px;
          color: white;
          font-size: 0.9375rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s;
        }
        .submit-btn:hover:not(:disabled) {
          background: #4f46e5;
        }
        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 640px) {
          .page-container {
            padding: 1rem;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }

          .section-header {
            flex-direction: column;
          }

          .form-actions {
            flex-direction: column-reverse;
          }

          .cancel-btn,
          .submit-btn {
            width: 100%;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}
