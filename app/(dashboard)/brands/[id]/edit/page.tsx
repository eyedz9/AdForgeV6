/**
 * Brand Edit Page
 *
 * Pre-populated form for editing existing brand data.
 * All fields from creation wizard are editable.
 * Features:
 * - Pre-populated form with existing brand data
 * - Collapsible sections for Identity, Logo, Visual Guidelines, Voice & Tone
 * - Save button updates database
 * - Success notification on save
 * - Cancel button returns to brand detail
 */

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getBrand, updateBrand } from "@/app/actions/brands";
import {
  businessTypes,
  industries,
  visualStyles,
  photographyStyles,
  brandVoices,
  toneCharacteristics,
} from "@/lib/validations/brand";
import type {
  UpdateBrandInput,
  VisualGuidelines as VisualGuidelinesType,
  VoiceTone as VoiceToneType,
  SocialProfiles as SocialProfilesType,
  LogoVariants as LogoVariantsType,
} from "@/lib/validations/brand";
import type { Brand } from "@/lib/supabase/database.types";

// Font options (same as creation wizard)
const fontOptions = [
  "System Default",
  "Inter",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Poppins",
  "Source Sans Pro",
  "Playfair Display",
  "Merriweather",
  "Oswald",
  "Raleway",
  "Nunito",
  "Work Sans",
  "DM Sans",
  "IBM Plex Sans",
  "Archivo",
  "Rubik",
  "Manrope",
  "Space Grotesk",
];

// Form data type
type FormData = {
  name: string;
  businessType: string;
  industry: string;
  subIndustry: string;
  website: string;
  socialProfiles: {
    instagram: string;
    facebook: string;
    twitter: string;
    linkedin: string;
    tiktok: string;
    youtube: string;
    pinterest: string;
  };
  logoUrl: string;
  logoVariants: {
    primary: string;
    secondary: string;
    icon: string;
    dark: string;
    light: string;
  };
  visualGuidelines: {
    primaryColor: string;
    secondaryColors: string[];
    accentColor: string;
    headingFont: string;
    bodyFont: string;
    visualStyle: string[];
    photographyStyle: string[];
  };
  voiceTone: {
    brandVoice: string;
    toneCharacteristics: string[];
    keyMessages: string[];
    tagline: string;
    wordsToAvoid: string[];
  };
};

// Initialize form data from brand
function initFormData(brand: Brand): FormData {
  const socialProfiles = (brand.social_profiles as SocialProfilesType) || {};
  const logoVariants = (brand.logo_variants as LogoVariantsType) || {};
  const visualGuidelines = (brand.visual_guidelines as VisualGuidelinesType) || {};
  const voiceTone = (brand.voice_tone as VoiceToneType) || {};

  return {
    name: brand.name || "",
    businessType: brand.business_type || "",
    industry: brand.industry || "",
    subIndustry: brand.sub_industry || "",
    website: brand.website || "",
    socialProfiles: {
      instagram: socialProfiles.instagram || "",
      facebook: socialProfiles.facebook || "",
      twitter: socialProfiles.twitter || "",
      linkedin: socialProfiles.linkedin || "",
      tiktok: socialProfiles.tiktok || "",
      youtube: socialProfiles.youtube || "",
      pinterest: socialProfiles.pinterest || "",
    },
    logoUrl: brand.logo_url || "",
    logoVariants: {
      primary: logoVariants.primary || "",
      secondary: logoVariants.secondary || "",
      icon: logoVariants.icon || "",
      dark: logoVariants.dark || "",
      light: logoVariants.light || "",
    },
    visualGuidelines: {
      primaryColor: visualGuidelines.primaryColor || "",
      secondaryColors: visualGuidelines.secondaryColors || [],
      accentColor: visualGuidelines.accentColor || "",
      headingFont: visualGuidelines.headingFont || "",
      bodyFont: visualGuidelines.bodyFont || "",
      visualStyle: visualGuidelines.visualStyle || [],
      photographyStyle: visualGuidelines.photographyStyle || [],
    },
    voiceTone: {
      brandVoice: voiceTone.brandVoice || "",
      toneCharacteristics: voiceTone.toneCharacteristics || [],
      keyMessages: voiceTone.keyMessages || [],
      tagline: voiceTone.tagline || "",
      wordsToAvoid: voiceTone.wordsToAvoid || [],
    },
  };
}

// Collapsible section component
function CollapsibleSection({
  title,
  description,
  defaultOpen = false,
  children,
}: {
  title: string;
  description: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="collapsible-section">
      <button
        type="button"
        className="section-header"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <div className="section-info">
          <h3 className="section-title">{title}</h3>
          <p className="section-description">{description}</p>
        </div>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`chevron ${isOpen ? "open" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {isOpen && <div className="section-content">{children}</div>}
      <style>{`
        .collapsible-section {
          background: var(--color-surface);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          overflow: hidden;
        }
        .section-header {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 1.25rem 1.5rem;
          background: none;
          border: none;
          cursor: pointer;
          text-align: left;
          transition: background 0.15s;
        }
        .section-header:hover {
          background: var(--color-elevated);
        }
        .section-info {
          flex: 1;
        }
        .section-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--color-text-primary);
          margin: 0 0 0.25rem;
        }
        .section-description {
          font-size: 0.875rem;
          color: var(--color-text-muted);
          margin: 0;
        }
        .chevron {
          flex-shrink: 0;
          color: var(--color-text-muted);
          transition: transform 0.2s;
        }
        .chevron.open {
          transform: rotate(180deg);
        }
        .section-content {
          padding: 0 1.5rem 1.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>
  );
}

// Success notification component
function SuccessNotification({
  message,
  onClose,
}: {
  message: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="success-notification">
      <div className="notification-content">
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
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        <span>{message}</span>
      </div>
      <button onClick={onClose} className="close-btn" aria-label="Close">
        <svg
          width="16"
          height="16"
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
      <style>{`
        .success-notification {
          position: fixed;
          top: 1.5rem;
          right: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem 1.25rem;
          background: var(--color-plasma-emerald);
          color: white;
          border-radius: 10px;
          box-shadow: 0 4px 20px rgba(16, 185, 129, 0.3);
          z-index: 1000;
          animation: slideIn 0.3s ease;
        }
        .notification-content {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-weight: 500;
        }
        .close-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          opacity: 0.8;
          transition: opacity 0.15s;
        }
        .close-btn:hover {
          opacity: 1;
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
      `}</style>
    </div>
  );
}

export default function BrandEditPage() {
  useRouter(); // For Next.js router availability
  const params = useParams();
  const brandId = params.id as string;

  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState<FormData | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // File input refs for logo upload
  const mainLogoRef = useRef<HTMLInputElement>(null);
  const primaryRef = useRef<HTMLInputElement>(null);
  const secondaryRef = useRef<HTMLInputElement>(null);
  const iconRef = useRef<HTMLInputElement>(null);
  const darkRef = useRef<HTMLInputElement>(null);
  const lightRef = useRef<HTMLInputElement>(null);

  // Fetch brand data
  const fetchBrand = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await getBrand(brandId);

    if (result.success) {
      setBrand(result.data);
      setFormData(initFormData(result.data));
    } else {
      setError(result.error);
    }

    setLoading(false);
  }, [brandId]);

  useEffect(() => {
    fetchBrand();
  }, [fetchBrand]);

  // Update form data
  const updateFormData = (updates: Partial<FormData>) => {
    if (formData) {
      setFormData({ ...formData, ...updates });
    }
  };

  // Handle logo file upload
  const handleLogoUpload = async (
    file: File,
    fieldPath: "logoUrl" | keyof FormData["logoVariants"]
  ) => {
    if (!file) return;

    // Validate file type
    if (!["image/svg+xml", "image/png"].includes(file.type)) {
      setSaveError("Logo must be SVG or PNG format");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setSaveError("Logo must be less than 5MB");
      return;
    }

    setIsUploading(true);
    setSaveError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setSaveError("You must be logged in to upload files");
        setIsUploading(false);
        return;
      }

      const ext = file.name.split(".").pop();
      const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      const path = `${user.id}/logos/${filename}`;

      const { error: uploadError } = await supabase.storage
        .from("brand-assets")
        .upload(path, file);

      if (uploadError) {
        setSaveError("Failed to upload logo: " + uploadError.message);
        setIsUploading(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("brand-assets")
        .getPublicUrl(path);

      if (fieldPath === "logoUrl") {
        updateFormData({ logoUrl: urlData.publicUrl });
      } else {
        updateFormData({
          logoVariants: {
            ...formData!.logoVariants,
            [fieldPath]: urlData.publicUrl,
          },
        });
      }
    } catch {
      setSaveError("Failed to upload logo");
    }

    setIsUploading(false);
  };

  // Remove logo
  const handleRemoveLogo = async (
    fieldPath: "logoUrl" | keyof FormData["logoVariants"]
  ) => {
    const url =
      fieldPath === "logoUrl"
        ? formData?.logoUrl
        : formData?.logoVariants[fieldPath];

    if (!url) return;

    try {
      const supabase = createClient();
      const pathPart = url.split("/brand-assets/")[1];
      if (pathPart) {
        await supabase.storage.from("brand-assets").remove([pathPart]);
      }
    } catch {
      // Ignore errors - file may not exist
    }

    if (fieldPath === "logoUrl") {
      updateFormData({ logoUrl: "" });
    } else {
      updateFormData({
        logoVariants: {
          ...formData!.logoVariants,
          [fieldPath]: "",
        },
      });
    }
  };

  // Handle save
  const handleSave = async () => {
    if (!formData || !brand) return;

    setSaving(true);
    setSaveError(null);

    // Build update input
    const updateInput: UpdateBrandInput = {
      name: formData.name,
      businessType: (formData.businessType || null) as UpdateBrandInput["businessType"],
      industry: (formData.industry || null) as UpdateBrandInput["industry"],
      subIndustry: formData.subIndustry || null,
      website: formData.website || null,
      socialProfiles: formData.socialProfiles,
      logoUrl: formData.logoUrl || null,
      logoVariants: formData.logoVariants,
      visualGuidelines: {
        primaryColor: formData.visualGuidelines.primaryColor || undefined,
        secondaryColors: formData.visualGuidelines.secondaryColors.filter(
          (c) => c
        ),
        accentColor: formData.visualGuidelines.accentColor || undefined,
        headingFont: formData.visualGuidelines.headingFont || undefined,
        bodyFont: formData.visualGuidelines.bodyFont || undefined,
        visualStyle: formData.visualGuidelines.visualStyle as typeof visualStyles[number][],
        photographyStyle: formData.visualGuidelines.photographyStyle as typeof photographyStyles[number][],
      },
      voiceTone: {
        brandVoice: formData.voiceTone.brandVoice
          ? (formData.voiceTone.brandVoice as typeof brandVoices[number])
          : undefined,
        toneCharacteristics: formData.voiceTone.toneCharacteristics as typeof toneCharacteristics[number][],
        keyMessages: formData.voiceTone.keyMessages.filter((m) => m.trim()),
        tagline: formData.voiceTone.tagline || undefined,
        wordsToAvoid: formData.voiceTone.wordsToAvoid.filter((w) => w.trim()),
      },
    };

    const result = await updateBrand(brandId, updateInput);

    if (result.success) {
      setShowSuccess(true);
      setBrand(result.data);
    } else {
      setSaveError(result.error);
    }

    setSaving(false);
  };

  // Hex color validation
  const isValidHex = (color: string) => {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
  };

  // Loading state
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p>Loading brand...</p>
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
            border: 3px solid rgba(255, 255, 255, 0.1);
            border-top-color: var(--color-plasma-violet);
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .loading-container p {
            color: var(--color-text-muted);
            margin: 0;
          }
        `}</style>
      </div>
    );
  }

  // Error state
  if (error || !brand || !formData) {
    return (
      <div className="error-container">
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
        <h2>Unable to load brand</h2>
        <p>{error || "Brand not found"}</p>
        <Link href="/brands" className="back-link">
          Back to Brands
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
            color: var(--color-plasma-rose);
            margin-bottom: 1rem;
          }
          .error-container h2 {
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--color-text-primary);
            margin: 0 0 0.5rem;
          }
          .error-container p {
            color: var(--color-text-muted);
            margin: 0 0 1.5rem;
          }
          .back-link {
            display: inline-flex;
            align-items: center;
            padding: 0.625rem 1rem;
            background: linear-gradient(135deg, var(--color-plasma-violet), var(--color-plasma-purple));
            color: white;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 500;
            transition: all 0.2s;
          }
          .back-link:hover {
            box-shadow: 0 0 20px rgba(139, 92, 246, 0.4);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="edit-page">
      {/* Success notification */}
      {showSuccess && (
        <SuccessNotification
          message="Brand saved successfully!"
          onClose={() => setShowSuccess(false)}
        />
      )}

      {/* Header */}
      <header className="edit-header">
        <div className="header-info">
          <Link href={`/brands/${brandId}`} className="back-link-small">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back to Brand
          </Link>
          <h1 className="page-title">Edit Brand</h1>
          <p className="page-subtitle">Make changes to {brand.name}</p>
        </div>
        <div className="header-actions">
          <Link href={`/brands/${brandId}`} className="btn-cancel">
            Cancel
          </Link>
          <button
            onClick={handleSave}
            disabled={saving || isUploading}
            className="btn-save"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </header>

      {/* Save error */}
      {saveError && (
        <div className="save-error">
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
          <span>{saveError}</span>
        </div>
      )}

      {/* Form sections */}
      <div className="form-sections">
        {/* Section 1: Brand Identity */}
        <CollapsibleSection
          title="Brand Identity"
          description="Basic brand information"
          defaultOpen={true}
        >
          <div className="form-grid">
            {/* Brand Name */}
            <div className="form-field full-width">
              <label htmlFor="name" className="field-label">
                Brand Name <span className="required">*</span>
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => updateFormData({ name: e.target.value })}
                placeholder="Enter your brand name"
                className="field-input"
              />
            </div>

            {/* Business Type */}
            <div className="form-field">
              <label htmlFor="businessType" className="field-label">
                Business Type
              </label>
              <select
                id="businessType"
                value={formData.businessType}
                onChange={(e) => updateFormData({ businessType: e.target.value })}
                className="field-select"
              >
                <option value="">Select business type</option>
                {businessTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Industry */}
            <div className="form-field">
              <label htmlFor="industry" className="field-label">
                Industry
              </label>
              <select
                id="industry"
                value={formData.industry}
                onChange={(e) => updateFormData({ industry: e.target.value })}
                className="field-select"
              >
                <option value="">Select industry</option>
                {industries.map((industry) => (
                  <option key={industry} value={industry}>
                    {industry}
                  </option>
                ))}
              </select>
            </div>

            {/* Sub-Industry */}
            <div className="form-field">
              <label htmlFor="subIndustry" className="field-label">
                Sub-Industry
              </label>
              <input
                type="text"
                id="subIndustry"
                value={formData.subIndustry}
                onChange={(e) => updateFormData({ subIndustry: e.target.value })}
                placeholder="e.g., Sustainable Fashion"
                className="field-input"
              />
            </div>

            {/* Website */}
            <div className="form-field">
              <label htmlFor="website" className="field-label">
                Website
              </label>
              <input
                type="url"
                id="website"
                value={formData.website}
                onChange={(e) => updateFormData({ website: e.target.value })}
                placeholder="https://yourbrand.com"
                className="field-input"
              />
            </div>
          </div>

          {/* Social Profiles */}
          <div className="social-section">
            <h4 className="subsection-title">Social Profiles</h4>
            <div className="form-grid social-grid">
              <div className="form-field">
                <label htmlFor="instagram" className="field-label">
                  Instagram
                </label>
                <input
                  type="url"
                  id="instagram"
                  value={formData.socialProfiles.instagram}
                  onChange={(e) =>
                    updateFormData({
                      socialProfiles: {
                        ...formData.socialProfiles,
                        instagram: e.target.value,
                      },
                    })
                  }
                  placeholder="https://instagram.com/yourbrand"
                  className="field-input"
                />
              </div>
              <div className="form-field">
                <label htmlFor="facebook" className="field-label">
                  Facebook
                </label>
                <input
                  type="url"
                  id="facebook"
                  value={formData.socialProfiles.facebook}
                  onChange={(e) =>
                    updateFormData({
                      socialProfiles: {
                        ...formData.socialProfiles,
                        facebook: e.target.value,
                      },
                    })
                  }
                  placeholder="https://facebook.com/yourbrand"
                  className="field-input"
                />
              </div>
              <div className="form-field">
                <label htmlFor="twitter" className="field-label">
                  X (Twitter)
                </label>
                <input
                  type="url"
                  id="twitter"
                  value={formData.socialProfiles.twitter}
                  onChange={(e) =>
                    updateFormData({
                      socialProfiles: {
                        ...formData.socialProfiles,
                        twitter: e.target.value,
                      },
                    })
                  }
                  placeholder="https://x.com/yourbrand"
                  className="field-input"
                />
              </div>
              <div className="form-field">
                <label htmlFor="linkedin" className="field-label">
                  LinkedIn
                </label>
                <input
                  type="url"
                  id="linkedin"
                  value={formData.socialProfiles.linkedin}
                  onChange={(e) =>
                    updateFormData({
                      socialProfiles: {
                        ...formData.socialProfiles,
                        linkedin: e.target.value,
                      },
                    })
                  }
                  placeholder="https://linkedin.com/company/yourbrand"
                  className="field-input"
                />
              </div>
              <div className="form-field">
                <label htmlFor="tiktok" className="field-label">
                  TikTok
                </label>
                <input
                  type="url"
                  id="tiktok"
                  value={formData.socialProfiles.tiktok}
                  onChange={(e) =>
                    updateFormData({
                      socialProfiles: {
                        ...formData.socialProfiles,
                        tiktok: e.target.value,
                      },
                    })
                  }
                  placeholder="https://tiktok.com/@yourbrand"
                  className="field-input"
                />
              </div>
              <div className="form-field">
                <label htmlFor="youtube" className="field-label">
                  YouTube
                </label>
                <input
                  type="url"
                  id="youtube"
                  value={formData.socialProfiles.youtube}
                  onChange={(e) =>
                    updateFormData({
                      socialProfiles: {
                        ...formData.socialProfiles,
                        youtube: e.target.value,
                      },
                    })
                  }
                  placeholder="https://youtube.com/@yourbrand"
                  className="field-input"
                />
              </div>
              <div className="form-field">
                <label htmlFor="pinterest" className="field-label">
                  Pinterest
                </label>
                <input
                  type="url"
                  id="pinterest"
                  value={formData.socialProfiles.pinterest}
                  onChange={(e) =>
                    updateFormData({
                      socialProfiles: {
                        ...formData.socialProfiles,
                        pinterest: e.target.value,
                      },
                    })
                  }
                  placeholder="https://pinterest.com/yourbrand"
                  className="field-input"
                />
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Section 2: Logo */}
        <CollapsibleSection
          title="Logo"
          description="Upload or update your brand logo"
        >
          {/* Main Logo */}
          <div className="logo-upload-section">
            <h4 className="subsection-title">Main Logo</h4>
            <div className="logo-upload-container">
              {formData.logoUrl ? (
                <div className="logo-preview">
                  <img src={formData.logoUrl} alt="Brand logo" />
                  <button
                    type="button"
                    className="remove-logo-btn"
                    onClick={() => handleRemoveLogo("logoUrl")}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div
                  className="logo-placeholder"
                  onClick={() => mainLogoRef.current?.click()}
                >
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  <span>Click to upload (SVG or PNG, max 5MB)</span>
                </div>
              )}
              <input
                ref={mainLogoRef}
                type="file"
                accept=".svg,.png,image/svg+xml,image/png"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleLogoUpload(file, "logoUrl");
                  e.target.value = "";
                }}
                style={{ display: "none" }}
              />
            </div>
          </div>

          {/* Logo Variants */}
          <div className="logo-variants-section">
            <h4 className="subsection-title">Logo Variants (Optional)</h4>
            <div className="logo-variants-grid">
              {(
                [
                  { key: "primary", label: "Primary" },
                  { key: "secondary", label: "Secondary" },
                  { key: "icon", label: "Icon" },
                  { key: "dark", label: "Dark Mode" },
                  { key: "light", label: "Light Mode" },
                ] as const
              ).map(({ key, label }) => (
                <div key={key} className="logo-variant-item">
                  <span className="variant-label">{label}</span>
                  {formData.logoVariants[key] ? (
                    <div
                      className={`variant-preview ${
                        key === "dark" ? "dark-bg" : ""
                      }`}
                    >
                      <img
                        src={formData.logoVariants[key]}
                        alt={`${label} logo`}
                      />
                      <button
                        type="button"
                        className="remove-variant-btn"
                        onClick={() => handleRemoveLogo(key)}
                      >
                        &times;
                      </button>
                    </div>
                  ) : (
                    <div
                      className="variant-placeholder"
                      onClick={() => {
                        const refs = {
                          primary: primaryRef,
                          secondary: secondaryRef,
                          icon: iconRef,
                          dark: darkRef,
                          light: lightRef,
                        };
                        refs[key].current?.click();
                      }}
                    >
                      <span>+</span>
                    </div>
                  )}
                  <input
                    ref={
                      key === "primary"
                        ? primaryRef
                        : key === "secondary"
                        ? secondaryRef
                        : key === "icon"
                        ? iconRef
                        : key === "dark"
                        ? darkRef
                        : lightRef
                    }
                    type="file"
                    accept=".svg,.png,image/svg+xml,image/png"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleLogoUpload(file, key);
                      e.target.value = "";
                    }}
                    style={{ display: "none" }}
                  />
                </div>
              ))}
            </div>
          </div>
        </CollapsibleSection>

        {/* Section 3: Visual Guidelines */}
        <CollapsibleSection
          title="Visual Guidelines"
          description="Colors, typography, and visual style"
        >
          {/* Colors */}
          <div className="colors-section">
            <h4 className="subsection-title">Color Palette</h4>
            <div className="form-grid">
              {/* Primary Color */}
              <div className="form-field">
                <label className="field-label">Primary Color</label>
                <div className="color-input-group">
                  <input
                    type="color"
                    value={
                      formData.visualGuidelines.primaryColor || "#6366f1"
                    }
                    onChange={(e) =>
                      updateFormData({
                        visualGuidelines: {
                          ...formData.visualGuidelines,
                          primaryColor: e.target.value,
                        },
                      })
                    }
                    className="color-picker"
                  />
                  <input
                    type="text"
                    value={formData.visualGuidelines.primaryColor}
                    onChange={(e) =>
                      updateFormData({
                        visualGuidelines: {
                          ...formData.visualGuidelines,
                          primaryColor: e.target.value,
                        },
                      })
                    }
                    placeholder="#6366f1"
                    className={`field-input color-text ${
                      formData.visualGuidelines.primaryColor &&
                      !isValidHex(formData.visualGuidelines.primaryColor)
                        ? "error"
                        : ""
                    }`}
                  />
                </div>
              </div>

              {/* Accent Color */}
              <div className="form-field">
                <label className="field-label">Accent Color</label>
                <div className="color-input-group">
                  <input
                    type="color"
                    value={formData.visualGuidelines.accentColor || "#10b981"}
                    onChange={(e) =>
                      updateFormData({
                        visualGuidelines: {
                          ...formData.visualGuidelines,
                          accentColor: e.target.value,
                        },
                      })
                    }
                    className="color-picker"
                  />
                  <input
                    type="text"
                    value={formData.visualGuidelines.accentColor}
                    onChange={(e) =>
                      updateFormData({
                        visualGuidelines: {
                          ...formData.visualGuidelines,
                          accentColor: e.target.value,
                        },
                      })
                    }
                    placeholder="#10b981"
                    className="field-input color-text"
                  />
                </div>
              </div>
            </div>

            {/* Secondary Colors */}
            <div className="secondary-colors">
              <label className="field-label">Secondary Colors (up to 5)</label>
              <div className="secondary-colors-list">
                {formData.visualGuidelines.secondaryColors.map((color, i) => (
                  <div key={i} className="secondary-color-item">
                    <input
                      type="color"
                      value={color || "#6b7280"}
                      onChange={(e) => {
                        const newColors = [
                          ...formData.visualGuidelines.secondaryColors,
                        ];
                        newColors[i] = e.target.value;
                        updateFormData({
                          visualGuidelines: {
                            ...formData.visualGuidelines,
                            secondaryColors: newColors,
                          },
                        });
                      }}
                      className="color-picker-small"
                    />
                    <input
                      type="text"
                      value={color}
                      onChange={(e) => {
                        const newColors = [
                          ...formData.visualGuidelines.secondaryColors,
                        ];
                        newColors[i] = e.target.value;
                        updateFormData({
                          visualGuidelines: {
                            ...formData.visualGuidelines,
                            secondaryColors: newColors,
                          },
                        });
                      }}
                      placeholder="#6b7280"
                      className="field-input color-text-small"
                    />
                    <button
                      type="button"
                      className="remove-color-btn"
                      onClick={() => {
                        const newColors =
                          formData.visualGuidelines.secondaryColors.filter(
                            (_, idx) => idx !== i
                          );
                        updateFormData({
                          visualGuidelines: {
                            ...formData.visualGuidelines,
                            secondaryColors: newColors,
                          },
                        });
                      }}
                    >
                      &times;
                    </button>
                  </div>
                ))}
                {formData.visualGuidelines.secondaryColors.length < 5 && (
                  <button
                    type="button"
                    className="add-color-btn"
                    onClick={() => {
                      updateFormData({
                        visualGuidelines: {
                          ...formData.visualGuidelines,
                          secondaryColors: [
                            ...formData.visualGuidelines.secondaryColors,
                            "#6b7280",
                          ],
                        },
                      });
                    }}
                  >
                    + Add Color
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Typography */}
          <div className="typography-section">
            <h4 className="subsection-title">Typography</h4>
            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="headingFont" className="field-label">
                  Heading Font
                </label>
                <select
                  id="headingFont"
                  value={formData.visualGuidelines.headingFont}
                  onChange={(e) =>
                    updateFormData({
                      visualGuidelines: {
                        ...formData.visualGuidelines,
                        headingFont: e.target.value,
                      },
                    })
                  }
                  className="field-select"
                >
                  <option value="">Select heading font</option>
                  {fontOptions.map((font) => (
                    <option key={font} value={font}>
                      {font}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="bodyFont" className="field-label">
                  Body Font
                </label>
                <select
                  id="bodyFont"
                  value={formData.visualGuidelines.bodyFont}
                  onChange={(e) =>
                    updateFormData({
                      visualGuidelines: {
                        ...formData.visualGuidelines,
                        bodyFont: e.target.value,
                      },
                    })
                  }
                  className="field-select"
                >
                  <option value="">Select body font</option>
                  {fontOptions.map((font) => (
                    <option key={font} value={font}>
                      {font}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Visual Style */}
          <div className="visual-style-section">
            <h4 className="subsection-title">Visual Style</h4>
            <div className="multi-select-options">
              {visualStyles.map((style) => (
                <button
                  key={style}
                  type="button"
                  className={`option-pill ${
                    formData.visualGuidelines.visualStyle.includes(style)
                      ? "selected"
                      : ""
                  }`}
                  onClick={() => {
                    const current = formData.visualGuidelines.visualStyle;
                    const newStyles = current.includes(style)
                      ? current.filter((s) => s !== style)
                      : [...current, style];
                    updateFormData({
                      visualGuidelines: {
                        ...formData.visualGuidelines,
                        visualStyle: newStyles,
                      },
                    });
                  }}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          {/* Photography Style */}
          <div className="photo-style-section">
            <h4 className="subsection-title">Photography Style</h4>
            <div className="multi-select-options">
              {photographyStyles.map((style) => (
                <button
                  key={style}
                  type="button"
                  className={`option-pill ${
                    formData.visualGuidelines.photographyStyle.includes(style)
                      ? "selected"
                      : ""
                  }`}
                  onClick={() => {
                    const current = formData.visualGuidelines.photographyStyle;
                    const newStyles = current.includes(style)
                      ? current.filter((s) => s !== style)
                      : [...current, style];
                    updateFormData({
                      visualGuidelines: {
                        ...formData.visualGuidelines,
                        photographyStyle: newStyles,
                      },
                    });
                  }}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>
        </CollapsibleSection>

        {/* Section 4: Voice & Tone */}
        <CollapsibleSection
          title="Voice & Tone"
          description="How your brand communicates"
        >
          {/* Brand Voice */}
          <div className="form-field">
            <label htmlFor="brandVoice" className="field-label">
              Brand Voice
            </label>
            <select
              id="brandVoice"
              value={formData.voiceTone.brandVoice}
              onChange={(e) =>
                updateFormData({
                  voiceTone: {
                    ...formData.voiceTone,
                    brandVoice: e.target.value,
                  },
                })
              }
              className="field-select"
            >
              <option value="">Select brand voice</option>
              {brandVoices.map((voice) => (
                <option key={voice} value={voice}>
                  {voice}
                </option>
              ))}
            </select>
          </div>

          {/* Tone Characteristics */}
          <div className="tone-section">
            <h4 className="subsection-title">Tone Characteristics (3-5)</h4>
            <div className="multi-select-options">
              {toneCharacteristics.map((tone) => {
                const selected = formData.voiceTone.toneCharacteristics.includes(tone);
                const atMax = formData.voiceTone.toneCharacteristics.length >= 5;
                return (
                  <button
                    key={tone}
                    type="button"
                    className={`option-pill ${selected ? "selected" : ""}`}
                    disabled={!selected && atMax}
                    onClick={() => {
                      const current = formData.voiceTone.toneCharacteristics;
                      const newTones = selected
                        ? current.filter((t) => t !== tone)
                        : [...current, tone];
                      updateFormData({
                        voiceTone: {
                          ...formData.voiceTone,
                          toneCharacteristics: newTones,
                        },
                      });
                    }}
                  >
                    {tone}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Key Messages */}
          <div className="messages-section">
            <h4 className="subsection-title">Key Messages (3-5)</h4>
            <div className="messages-list">
              {formData.voiceTone.keyMessages.map((message, i) => (
                <div key={i} className="message-item">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => {
                      const newMessages = [...formData.voiceTone.keyMessages];
                      newMessages[i] = e.target.value;
                      updateFormData({
                        voiceTone: {
                          ...formData.voiceTone,
                          keyMessages: newMessages,
                        },
                      });
                    }}
                    placeholder={`Key message ${i + 1}`}
                    className="field-input"
                  />
                  <button
                    type="button"
                    className="remove-message-btn"
                    onClick={() => {
                      const newMessages = formData.voiceTone.keyMessages.filter(
                        (_, idx) => idx !== i
                      );
                      updateFormData({
                        voiceTone: {
                          ...formData.voiceTone,
                          keyMessages: newMessages,
                        },
                      });
                    }}
                  >
                    &times;
                  </button>
                </div>
              ))}
              {formData.voiceTone.keyMessages.length < 5 && (
                <button
                  type="button"
                  className="add-message-btn"
                  onClick={() => {
                    updateFormData({
                      voiceTone: {
                        ...formData.voiceTone,
                        keyMessages: [...formData.voiceTone.keyMessages, ""],
                      },
                    });
                  }}
                >
                  + Add Key Message
                </button>
              )}
            </div>
          </div>

          {/* Tagline */}
          <div className="form-field">
            <label htmlFor="tagline" className="field-label">
              Tagline
            </label>
            <input
              type="text"
              id="tagline"
              value={formData.voiceTone.tagline}
              onChange={(e) =>
                updateFormData({
                  voiceTone: {
                    ...formData.voiceTone,
                    tagline: e.target.value,
                  },
                })
              }
              placeholder="Your brand's tagline"
              maxLength={200}
              className="field-input"
            />
            <span className="char-count">
              {formData.voiceTone.tagline.length}/200
            </span>
          </div>

          {/* Words to Avoid */}
          <div className="avoid-section">
            <h4 className="subsection-title">Words to Avoid</h4>
            <div className="avoid-list">
              {formData.voiceTone.wordsToAvoid.map((word, i) => (
                <div key={i} className="avoid-item">
                  <input
                    type="text"
                    value={word}
                    onChange={(e) => {
                      const newWords = [...formData.voiceTone.wordsToAvoid];
                      newWords[i] = e.target.value;
                      updateFormData({
                        voiceTone: {
                          ...formData.voiceTone,
                          wordsToAvoid: newWords,
                        },
                      });
                    }}
                    placeholder="Word to avoid"
                    className="field-input"
                  />
                  <button
                    type="button"
                    className="remove-word-btn"
                    onClick={() => {
                      const newWords = formData.voiceTone.wordsToAvoid.filter(
                        (_, idx) => idx !== i
                      );
                      updateFormData({
                        voiceTone: {
                          ...formData.voiceTone,
                          wordsToAvoid: newWords,
                        },
                      });
                    }}
                  >
                    &times;
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="add-word-btn"
                onClick={() => {
                  updateFormData({
                    voiceTone: {
                      ...formData.voiceTone,
                      wordsToAvoid: [...formData.voiceTone.wordsToAvoid, ""],
                    },
                  });
                }}
              >
                + Add Word
              </button>
            </div>
          </div>
        </CollapsibleSection>
      </div>

      {/* Bottom actions bar */}
      <div className="bottom-actions">
        <Link href={`/brands/${brandId}`} className="btn-cancel">
          Cancel
        </Link>
        <button
          onClick={handleSave}
          disabled={saving || isUploading}
          className="btn-save"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      <style>{`
        .edit-page {
          max-width: 800px;
          margin: 0 auto;
          padding-bottom: 6rem;
        }

        /* Header */
        .edit-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }
        .header-info {
          flex: 1;
        }
        .back-link-small {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          color: var(--color-text-muted);
          text-decoration: none;
          font-size: 0.875rem;
          margin-bottom: 0.5rem;
          transition: color 0.15s;
        }
        .back-link-small:hover {
          color: var(--color-plasma-violet);
        }
        .page-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--color-text-primary);
          margin: 0 0 0.25rem;
        }
        .page-subtitle {
          font-size: 0.9375rem;
          color: var(--color-text-muted);
          margin: 0;
        }
        .header-actions {
          display: flex;
          gap: 0.75rem;
        }
        .btn-cancel,
        .btn-save {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.625rem 1.25rem;
          border-radius: 8px;
          font-size: 0.9375rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          text-decoration: none;
        }
        .btn-cancel {
          background: var(--color-elevated);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--color-text-secondary);
        }
        .btn-cancel:hover {
          background: var(--color-surface);
          border-color: rgba(255, 255, 255, 0.2);
        }
        .btn-save {
          background: linear-gradient(135deg, var(--color-plasma-violet), var(--color-plasma-purple));
          border: none;
          color: white;
        }
        .btn-save:hover:not(:disabled) {
          box-shadow: 0 0 20px rgba(139, 92, 246, 0.4);
        }
        .btn-save:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        /* Save error */
        .save-error {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 1.25rem;
          background: rgba(244, 63, 94, 0.1);
          border: 1px solid rgba(244, 63, 94, 0.3);
          border-radius: 10px;
          color: var(--color-plasma-rose);
          margin-bottom: 1.5rem;
          font-size: 0.9375rem;
        }

        /* Form sections */
        .form-sections {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        /* Form fields */
        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
          padding-top: 1rem;
        }
        .social-grid {
          grid-template-columns: repeat(2, 1fr);
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
          color: var(--color-text-secondary);
        }
        .field-label .required {
          color: var(--color-plasma-rose);
        }
        .field-input,
        .field-select {
          padding: 0.625rem 0.875rem;
          background: var(--color-elevated);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          font-size: 0.9375rem;
          color: var(--color-text-primary);
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .field-input::placeholder {
          color: var(--color-text-muted);
        }
        .field-input:focus,
        .field-select:focus {
          outline: none;
          border-color: var(--color-plasma-violet);
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15), 0 0 20px rgba(139, 92, 246, 0.1);
        }
        .field-input.error {
          border-color: var(--color-plasma-rose);
        }
        .field-select option {
          background: var(--color-surface);
          color: var(--color-text-primary);
        }

        /* Social section */
        .social-section {
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        .subsection-title {
          font-size: 0.9375rem;
          font-weight: 600;
          color: var(--color-text-primary);
          margin: 0 0 0.75rem;
        }

        /* Logo upload */
        .logo-upload-section {
          padding-top: 1rem;
        }
        .logo-upload-container {
          margin-top: 0.5rem;
        }
        .logo-preview {
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          background: var(--color-elevated);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
        }
        .logo-preview img {
          max-width: 150px;
          max-height: 150px;
          object-fit: contain;
        }
        .remove-logo-btn {
          padding: 0.375rem 0.75rem;
          background: rgba(244, 63, 94, 0.2);
          border: none;
          border-radius: 6px;
          color: var(--color-plasma-rose);
          font-size: 0.8125rem;
          cursor: pointer;
          transition: background 0.15s;
        }
        .remove-logo-btn:hover {
          background: rgba(244, 63, 94, 0.3);
        }
        .logo-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          padding: 2rem;
          background: var(--color-elevated);
          border: 2px dashed rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          cursor: pointer;
          transition: border-color 0.15s, background 0.15s;
          color: var(--color-text-muted);
        }
        .logo-placeholder:hover {
          border-color: var(--color-plasma-violet);
          background: rgba(139, 92, 246, 0.1);
        }
        .logo-placeholder span {
          font-size: 0.875rem;
        }

        /* Logo variants */
        .logo-variants-section {
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        .logo-variants-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          margin-top: 0.5rem;
        }
        .logo-variant-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }
        .variant-label {
          font-size: 0.75rem;
          color: var(--color-text-muted);
        }
        .variant-preview {
          position: relative;
          width: 80px;
          height: 80px;
          background: var(--color-elevated);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .variant-preview.dark-bg {
          background: var(--color-void);
        }
        .variant-preview img {
          max-width: 60px;
          max-height: 60px;
          object-fit: contain;
        }
        .remove-variant-btn {
          position: absolute;
          top: -0.5rem;
          right: -0.5rem;
          width: 1.25rem;
          height: 1.25rem;
          background: var(--color-plasma-rose);
          color: white;
          border: none;
          border-radius: 50%;
          font-size: 0.875rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .variant-placeholder {
          width: 80px;
          height: 80px;
          background: var(--color-elevated);
          border: 2px dashed rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--color-text-muted);
          font-size: 1.5rem;
          transition: border-color 0.15s;
        }
        .variant-placeholder:hover {
          border-color: var(--color-plasma-violet);
          color: var(--color-plasma-violet);
        }

        /* Colors section */
        .colors-section,
        .typography-section,
        .visual-style-section,
        .photo-style-section {
          padding-top: 1rem;
        }
        .typography-section,
        .visual-style-section,
        .photo-style-section {
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        .color-input-group {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }
        .color-picker {
          width: 48px;
          height: 36px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 6px;
          cursor: pointer;
          padding: 2px;
          background: var(--color-elevated);
        }
        .color-text {
          flex: 1;
          font-family: monospace;
        }
        .secondary-colors {
          margin-top: 1rem;
        }
        .secondary-colors-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }
        .secondary-color-item {
          display: flex;
          align-items: center;
          gap: 0.375rem;
        }
        .color-picker-small {
          width: 32px;
          height: 32px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 4px;
          cursor: pointer;
          padding: 1px;
          background: var(--color-elevated);
        }
        .color-text-small {
          width: 90px;
          padding: 0.375rem 0.5rem;
          font-size: 0.8125rem;
          font-family: monospace;
        }
        .remove-color-btn {
          width: 24px;
          height: 24px;
          background: var(--color-elevated);
          border: none;
          border-radius: 4px;
          color: var(--color-text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .remove-color-btn:hover {
          background: rgba(244, 63, 94, 0.2);
          color: var(--color-plasma-rose);
        }
        .add-color-btn,
        .add-message-btn,
        .add-word-btn {
          padding: 0.5rem 0.75rem;
          background: var(--color-elevated);
          border: 1px dashed rgba(255, 255, 255, 0.2);
          border-radius: 6px;
          color: var(--color-text-muted);
          font-size: 0.8125rem;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
        }
        .add-color-btn:hover,
        .add-message-btn:hover,
        .add-word-btn:hover {
          background: rgba(139, 92, 246, 0.1);
          border-color: var(--color-plasma-violet);
          color: var(--color-plasma-violet);
        }

        /* Multi-select options */
        .multi-select-options {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }
        .option-pill {
          padding: 0.5rem 1rem;
          background: var(--color-elevated);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 9999px;
          color: var(--color-text-secondary);
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.15s;
        }
        .option-pill:hover:not(:disabled) {
          background: rgba(139, 92, 246, 0.1);
          border-color: rgba(139, 92, 246, 0.3);
        }
        .option-pill.selected {
          background: linear-gradient(135deg, var(--color-plasma-violet), var(--color-plasma-purple));
          border-color: transparent;
          color: white;
        }
        .option-pill:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Voice & Tone sections */
        .tone-section,
        .messages-section,
        .avoid-section {
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        .messages-list,
        .avoid-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }
        .message-item,
        .avoid-item {
          display: flex;
          gap: 0.5rem;
        }
        .message-item .field-input,
        .avoid-item .field-input {
          flex: 1;
        }
        .remove-message-btn,
        .remove-word-btn {
          width: 36px;
          background: var(--color-elevated);
          border: none;
          border-radius: 6px;
          color: var(--color-text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .remove-message-btn:hover,
        .remove-word-btn:hover {
          background: rgba(244, 63, 94, 0.2);
          color: var(--color-plasma-rose);
        }
        .char-count {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          text-align: right;
        }

        /* Bottom actions */
        .bottom-actions {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          padding: 1rem 1.5rem;
          background: var(--color-surface);
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(12px);
        }

        @media (max-width: 640px) {
          .edit-header {
            flex-direction: column;
          }
          .header-actions {
            width: 100%;
          }
          .btn-cancel,
          .btn-save {
            flex: 1;
          }
          .form-grid {
            grid-template-columns: 1fr;
          }
          .social-grid {
            grid-template-columns: 1fr;
          }
          .bottom-actions {
            padding: 1rem;
          }
        }
      `}</style>
    </div>
  );
}
