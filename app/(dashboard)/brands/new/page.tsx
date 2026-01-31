/**
 * Brand Creation Wizard
 *
 * Multi-step wizard for creating a new brand.
 * Step 1: Identity - Brand Name, Business Type, Industry, Sub-Industry, Website, Social Profiles
 * Step 2: Logo Upload - Coming in US-033
 * Step 3: Visual Guidelines - Coming in US-034
 * Step 4: Voice & Tone - Coming in US-035
 */

"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import {
  businessTypes,
  industries,
  socialProfilesSchema,
  visualStyles,
  photographyStyles,
  brandVoices,
  toneCharacteristics,
} from "@/lib/validations/brand";
import { createBrand } from "@/app/actions/brands";
import type { CreateBrandInput } from "@/lib/validations/brand";

// Wizard steps
const WIZARD_STEPS = [
  { id: 1, name: "Identity", description: "Basic brand information" },
  { id: 2, name: "Logo", description: "Upload your logo" },
  { id: 3, name: "Visual", description: "Visual guidelines" },
  { id: 4, name: "Voice", description: "Voice & Tone" },
];

// Step 1 validation schema
const step1Schema = z.object({
  name: z
    .string()
    .min(1, "Brand name is required")
    .max(255, "Brand name must be 255 characters or less"),
  businessType: z.enum(businessTypes).optional().or(z.literal("")),
  industry: z.enum(industries).optional().or(z.literal("")),
  subIndustry: z
    .string()
    .max(100, "Sub-industry must be 100 characters or less")
    .optional(),
  website: z
    .string()
    .url("Please enter a valid URL")
    .max(500, "Website URL must be 500 characters or less")
    .optional()
    .or(z.literal("")),
  socialProfiles: socialProfilesSchema.optional(),
});

// Form state stored across all steps
export type WizardData = {
  // Step 1
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
  // Step 2 - Logo (US-033)
  logoUrl: string;
  logoVariants: {
    primary: string;
    secondary: string;
    icon: string;
    dark: string;
    light: string;
  };
  // Step 3 - Visual Guidelines (US-034)
  visualGuidelines: {
    primaryColor: string;
    secondaryColors: string[];
    accentColor: string;
    headingFont: string;
    bodyFont: string;
    visualStyle: string[];
    photographyStyle: string[];
  };
  // Step 4 - Voice & Tone (US-035)
  voiceTone: {
    brandVoice: string;
    toneCharacteristics: string[];
    keyMessages: string[];
    tagline: string;
    wordsToAvoid: string[];
  };
};

// Initial wizard data
const initialWizardData: WizardData = {
  name: "",
  businessType: "",
  industry: "",
  subIndustry: "",
  website: "",
  socialProfiles: {
    instagram: "",
    facebook: "",
    twitter: "",
    linkedin: "",
    tiktok: "",
    youtube: "",
    pinterest: "",
  },
  logoUrl: "",
  logoVariants: {
    primary: "",
    secondary: "",
    icon: "",
    dark: "",
    light: "",
  },
  visualGuidelines: {
    primaryColor: "#6366F1",
    secondaryColors: [],
    accentColor: "",
    headingFont: "",
    bodyFont: "",
    visualStyle: [],
    photographyStyle: [],
  },
  voiceTone: {
    brandVoice: "",
    toneCharacteristics: [],
    keyMessages: [],
    tagline: "",
    wordsToAvoid: [],
  },
};

// Progress indicator component
function ProgressIndicator({
  currentStep,
  steps,
}: {
  currentStep: number;
  steps: typeof WIZARD_STEPS;
}) {
  return (
    <div className="progress-indicator">
      {steps.map((step, index) => (
        <div
          key={step.id}
          className={`progress-step ${
            step.id < currentStep
              ? "completed"
              : step.id === currentStep
              ? "current"
              : "upcoming"
          }`}
        >
          <div className="step-number">
            {step.id < currentStep ? (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              step.id
            )}
          </div>
          <div className="step-info">
            <span className="step-name">{step.name}</span>
            <span className="step-description">{step.description}</span>
          </div>
          {index < steps.length - 1 && <div className="step-connector" />}
        </div>
      ))}

      <style>{`
        .progress-indicator {
          display: flex;
          justify-content: center;
          gap: 0;
          margin-bottom: 2.5rem;
          padding: 0 1rem;
        }

        .progress-step {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          position: relative;
        }

        .step-number {
          width: 2rem;
          height: 2rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.875rem;
          font-weight: 600;
          flex-shrink: 0;
        }

        .progress-step.completed .step-number {
          background: linear-gradient(135deg, var(--color-plasma-violet), var(--color-plasma-purple));
          color: white;
        }

        .progress-step.current .step-number {
          background: linear-gradient(135deg, var(--color-plasma-violet), var(--color-plasma-purple));
          color: white;
          box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.25);
        }

        .progress-step.upcoming .step-number {
          background: rgba(255, 255, 255, 0.05);
          color: var(--color-text-muted);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .step-info {
          display: flex;
          flex-direction: column;
        }

        .step-name {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--color-text-primary);
        }

        .progress-step.upcoming .step-name {
          color: var(--color-text-muted);
        }

        .step-description {
          font-size: 0.75rem;
          color: var(--color-text-secondary);
        }

        .progress-step.upcoming .step-description {
          color: var(--color-text-muted);
        }

        .step-connector {
          width: 3rem;
          height: 2px;
          background: rgba(255, 255, 255, 0.1);
          margin: 0 0.5rem;
        }

        .progress-step.completed + .progress-step .step-connector,
        .progress-step.completed .step-connector {
          background: linear-gradient(90deg, var(--color-plasma-violet), var(--color-plasma-purple));
        }

        @media (max-width: 768px) {
          .progress-indicator {
            flex-wrap: wrap;
            gap: 1rem;
          }

          .step-info {
            display: none;
          }

          .step-connector {
            width: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}

// Step 1: Identity Form
function Step1Identity({
  data,
  onUpdate,
  errors,
}: {
  data: WizardData;
  onUpdate: (updates: Partial<WizardData>) => void;
  errors: Record<string, string>;
}) {
  const [showSocialProfiles, setShowSocialProfiles] = useState(
    Object.values(data.socialProfiles).some((v) => v !== "")
  );

  return (
    <div className="step-form">
      <div className="form-section">
        <h3 className="section-title">Brand Identity</h3>
        <p className="section-description">
          Tell us about your brand. This information helps us create accurate
          personas and targeted creatives.
        </p>

        <div className="form-grid">
          {/* Brand Name */}
          <div className="form-field full-width">
            <label htmlFor="name" className="field-label">
              Brand Name <span className="required">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={data.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              placeholder="Enter your brand name"
              className={`field-input ${errors.name ? "error" : ""}`}
            />
            {errors.name && <p className="field-error">{errors.name}</p>}
          </div>

          {/* Business Type */}
          <div className="form-field">
            <label htmlFor="businessType" className="field-label">
              Business Type
            </label>
            <select
              id="businessType"
              value={data.businessType}
              onChange={(e) => onUpdate({ businessType: e.target.value })}
              className={`field-select ${errors.businessType ? "error" : ""}`}
            >
              <option value="">Select business type</option>
              {businessTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            {errors.businessType && (
              <p className="field-error">{errors.businessType}</p>
            )}
          </div>

          {/* Industry */}
          <div className="form-field">
            <label htmlFor="industry" className="field-label">
              Industry
            </label>
            <select
              id="industry"
              value={data.industry}
              onChange={(e) => onUpdate({ industry: e.target.value })}
              className={`field-select ${errors.industry ? "error" : ""}`}
            >
              <option value="">Select industry</option>
              {industries.map((industry) => (
                <option key={industry} value={industry}>
                  {industry}
                </option>
              ))}
            </select>
            {errors.industry && (
              <p className="field-error">{errors.industry}</p>
            )}
          </div>

          {/* Sub-Industry */}
          <div className="form-field">
            <label htmlFor="subIndustry" className="field-label">
              Sub-Industry
            </label>
            <input
              type="text"
              id="subIndustry"
              value={data.subIndustry}
              onChange={(e) => onUpdate({ subIndustry: e.target.value })}
              placeholder="e.g., Sustainable Fashion"
              className={`field-input ${errors.subIndustry ? "error" : ""}`}
            />
            {errors.subIndustry && (
              <p className="field-error">{errors.subIndustry}</p>
            )}
          </div>

          {/* Website */}
          <div className="form-field">
            <label htmlFor="website" className="field-label">
              Website
            </label>
            <input
              type="url"
              id="website"
              value={data.website}
              onChange={(e) => onUpdate({ website: e.target.value })}
              placeholder="https://yourbrand.com"
              className={`field-input ${errors.website ? "error" : ""}`}
            />
            {errors.website && <p className="field-error">{errors.website}</p>}
          </div>
        </div>
      </div>

      {/* Social Profiles Section */}
      <div className="form-section">
        <div className="section-header">
          <div>
            <h3 className="section-title">Social Profiles</h3>
            <p className="section-description">
              Add links to your brand&apos;s social media profiles.
            </p>
          </div>
          <button
            type="button"
            className="toggle-button"
            onClick={() => setShowSocialProfiles(!showSocialProfiles)}
          >
            {showSocialProfiles ? "Hide" : "Show"} Social Profiles
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={showSocialProfiles ? "rotated" : ""}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>

        {showSocialProfiles && (
          <div className="form-grid social-profiles-grid">
            {/* Instagram */}
            <div className="form-field">
              <label htmlFor="instagram" className="field-label">
                Instagram
              </label>
              <input
                type="url"
                id="instagram"
                value={data.socialProfiles.instagram}
                onChange={(e) =>
                  onUpdate({
                    socialProfiles: {
                      ...data.socialProfiles,
                      instagram: e.target.value,
                    },
                  })
                }
                placeholder="https://instagram.com/yourbrand"
                className="field-input"
              />
            </div>

            {/* Facebook */}
            <div className="form-field">
              <label htmlFor="facebook" className="field-label">
                Facebook
              </label>
              <input
                type="url"
                id="facebook"
                value={data.socialProfiles.facebook}
                onChange={(e) =>
                  onUpdate({
                    socialProfiles: {
                      ...data.socialProfiles,
                      facebook: e.target.value,
                    },
                  })
                }
                placeholder="https://facebook.com/yourbrand"
                className="field-input"
              />
            </div>

            {/* Twitter/X */}
            <div className="form-field">
              <label htmlFor="twitter" className="field-label">
                X (Twitter)
              </label>
              <input
                type="url"
                id="twitter"
                value={data.socialProfiles.twitter}
                onChange={(e) =>
                  onUpdate({
                    socialProfiles: {
                      ...data.socialProfiles,
                      twitter: e.target.value,
                    },
                  })
                }
                placeholder="https://x.com/yourbrand"
                className="field-input"
              />
            </div>

            {/* LinkedIn */}
            <div className="form-field">
              <label htmlFor="linkedin" className="field-label">
                LinkedIn
              </label>
              <input
                type="url"
                id="linkedin"
                value={data.socialProfiles.linkedin}
                onChange={(e) =>
                  onUpdate({
                    socialProfiles: {
                      ...data.socialProfiles,
                      linkedin: e.target.value,
                    },
                  })
                }
                placeholder="https://linkedin.com/company/yourbrand"
                className="field-input"
              />
            </div>

            {/* TikTok */}
            <div className="form-field">
              <label htmlFor="tiktok" className="field-label">
                TikTok
              </label>
              <input
                type="url"
                id="tiktok"
                value={data.socialProfiles.tiktok}
                onChange={(e) =>
                  onUpdate({
                    socialProfiles: {
                      ...data.socialProfiles,
                      tiktok: e.target.value,
                    },
                  })
                }
                placeholder="https://tiktok.com/@yourbrand"
                className="field-input"
              />
            </div>

            {/* YouTube */}
            <div className="form-field">
              <label htmlFor="youtube" className="field-label">
                YouTube
              </label>
              <input
                type="url"
                id="youtube"
                value={data.socialProfiles.youtube}
                onChange={(e) =>
                  onUpdate({
                    socialProfiles: {
                      ...data.socialProfiles,
                      youtube: e.target.value,
                    },
                  })
                }
                placeholder="https://youtube.com/@yourbrand"
                className="field-input"
              />
            </div>

            {/* Pinterest */}
            <div className="form-field">
              <label htmlFor="pinterest" className="field-label">
                Pinterest
              </label>
              <input
                type="url"
                id="pinterest"
                value={data.socialProfiles.pinterest}
                onChange={(e) =>
                  onUpdate({
                    socialProfiles: {
                      ...data.socialProfiles,
                      pinterest: e.target.value,
                    },
                  })
                }
                placeholder="https://pinterest.com/yourbrand"
                className="field-input"
              />
            </div>
          </div>
        )}
      </div>

      <style>{`
        .step-form {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .form-section {
          background: var(--color-surface);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 16px;
          padding: 1.5rem;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .section-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--color-text-primary);
          margin: 0 0 0.25rem;
          letter-spacing: -0.02em;
        }

        .section-description {
          font-size: 0.875rem;
          color: var(--color-text-secondary);
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
          background: rgba(139, 92, 246, 0.1);
          border: 1px solid rgba(139, 92, 246, 0.2);
          border-radius: 8px;
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--color-plasma-violet);
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .toggle-button:hover {
          background: rgba(139, 92, 246, 0.2);
          border-color: rgba(139, 92, 246, 0.4);
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
          font-weight: 600;
          color: var(--color-text-secondary);
        }

        .required {
          color: #ef4444;
        }

        .field-input,
        .field-select {
          padding: 0.625rem 0.875rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          font-size: 0.9375rem;
          color: var(--color-text-primary);
          background: rgba(255, 255, 255, 0.02);
          transition: all 0.2s ease;
        }

        .field-input:focus,
        .field-select:focus {
          outline: none;
          border-color: var(--color-plasma-violet);
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15);
          background: rgba(255, 255, 255, 0.04);
        }

        .field-input.error,
        .field-select.error {
          border-color: #ef4444;
        }

        .field-input.error:focus,
        .field-select.error:focus {
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
        }

        .field-input::placeholder {
          color: #9ca3af;
        }

        .field-select {
          cursor: pointer;
        }

        .field-error {
          font-size: 0.8125rem;
          color: #ef4444;
          margin: 0;
        }

        .social-profiles-grid {
          margin-top: 1rem;
        }

        @media (max-width: 640px) {
          .form-grid {
            grid-template-columns: 1fr;
          }

          .section-header {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}

// Step 2: Logo Upload
function Step2LogoUpload({
  data,
  onUpdate,
  errors,
  isUploading,
  setIsUploading,
}: {
  data: WizardData;
  onUpdate: (updates: Partial<WizardData>) => void;
  errors: Record<string, string>;
  isUploading: boolean;
  setIsUploading: (value: boolean) => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string>(data.logoUrl || "");
  const [showVariants, setShowVariants] = useState(
    Object.values(data.logoVariants).some((v) => v !== "")
  );
  const [variantPreviews, setVariantPreviews] = useState<Record<string, string>>({
    primary: data.logoVariants.primary || "",
    secondary: data.logoVariants.secondary || "",
    icon: data.logoVariants.icon || "",
    dark: data.logoVariants.dark || "",
    light: data.logoVariants.light || "",
  });
  const [uploadError, setUploadError] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const variantInputRefs = {
    primary: useRef<HTMLInputElement>(null),
    secondary: useRef<HTMLInputElement>(null),
    icon: useRef<HTMLInputElement>(null),
    dark: useRef<HTMLInputElement>(null),
    light: useRef<HTMLInputElement>(null),
  };

  // Accepted file types
  const acceptedTypes = ["image/svg+xml", "image/png"];
  const acceptString = ".svg,.png,image/svg+xml,image/png";
  const maxFileSize = 5 * 1024 * 1024; // 5MB

  // Handle main logo upload
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!acceptedTypes.includes(file.type)) {
      setUploadError("Please upload an SVG or PNG file");
      return;
    }

    // Validate file size
    if (file.size > maxFileSize) {
      setUploadError("File size must be less than 5MB");
      return;
    }

    setUploadError("");
    setIsUploading(true);

    try {
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to Supabase Storage
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setUploadError("You must be logged in to upload files");
        setIsUploading(false);
        return;
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/logos/${Date.now()}.${fileExt}`;

      const { error: uploadErr } = await supabase.storage
        .from("brand-assets")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadErr) {
        console.error("Upload error:", uploadErr);
        setUploadError(uploadErr.message || "Failed to upload file");
        setIsUploading(false);
        return;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("brand-assets")
        .getPublicUrl(fileName);

      onUpdate({ logoUrl: urlData.publicUrl });
      setPreviewUrl(urlData.publicUrl);
    } catch (err) {
      console.error("Upload error:", err);
      setUploadError("An error occurred while uploading");
    } finally {
      setIsUploading(false);
    }
  };

  // Handle logo variant upload
  const handleVariantUpload = async (
    variantKey: keyof typeof variantInputRefs,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!acceptedTypes.includes(file.type)) {
      setUploadError(`${variantKey}: Please upload an SVG or PNG file`);
      return;
    }

    // Validate file size
    if (file.size > maxFileSize) {
      setUploadError(`${variantKey}: File size must be less than 5MB`);
      return;
    }

    setUploadError("");
    setIsUploading(true);

    try {
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setVariantPreviews((prev) => ({
          ...prev,
          [variantKey]: reader.result as string,
        }));
      };
      reader.readAsDataURL(file);

      // Upload to Supabase Storage
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setUploadError("You must be logged in to upload files");
        setIsUploading(false);
        return;
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/logos/${variantKey}_${Date.now()}.${fileExt}`;

      const { error: uploadErr } = await supabase.storage
        .from("brand-assets")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadErr) {
        console.error("Upload error:", uploadErr);
        setUploadError(uploadErr.message || "Failed to upload file");
        setIsUploading(false);
        return;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("brand-assets")
        .getPublicUrl(fileName);

      onUpdate({
        logoVariants: {
          ...data.logoVariants,
          [variantKey]: urlData.publicUrl,
        },
      });
      setVariantPreviews((prev) => ({
        ...prev,
        [variantKey]: urlData.publicUrl,
      }));
    } catch (err) {
      console.error("Upload error:", err);
      setUploadError("An error occurred while uploading");
    } finally {
      setIsUploading(false);
    }
  };

  // Remove main logo
  const handleRemoveLogo = async () => {
    if (data.logoUrl) {
      try {
        const supabase = createClient();
        // Extract path from URL
        const urlParts = data.logoUrl.split("/brand-assets/");
        if (urlParts.length > 1) {
          await supabase.storage.from("brand-assets").remove([urlParts[1]]);
        }
      } catch (err) {
        console.error("Error removing file:", err);
      }
    }
    setPreviewUrl("");
    onUpdate({ logoUrl: "" });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Remove logo variant
  const handleRemoveVariant = async (variantKey: keyof typeof variantInputRefs) => {
    const variantUrl = data.logoVariants[variantKey];
    if (variantUrl) {
      try {
        const supabase = createClient();
        // Extract path from URL
        const urlParts = variantUrl.split("/brand-assets/");
        if (urlParts.length > 1) {
          await supabase.storage.from("brand-assets").remove([urlParts[1]]);
        }
      } catch (err) {
        console.error("Error removing file:", err);
      }
    }
    setVariantPreviews((prev) => ({ ...prev, [variantKey]: "" }));
    onUpdate({
      logoVariants: {
        ...data.logoVariants,
        [variantKey]: "",
      },
    });
    const ref = variantInputRefs[variantKey];
    if (ref.current) {
      ref.current.value = "";
    }
  };

  const variantLabels: Record<string, { title: string; description: string }> = {
    primary: { title: "Primary Logo", description: "Main logo for light backgrounds" },
    secondary: { title: "Secondary Logo", description: "Alternative version of your logo" },
    icon: { title: "Icon / Favicon", description: "Small icon version (e.g., 512x512)" },
    dark: { title: "Dark Mode Logo", description: "Logo for dark backgrounds" },
    light: { title: "Light Mode Logo", description: "Logo for light backgrounds" },
  };

  return (
    <div className="step-form">
      <div className="form-section">
        <h3 className="section-title">Brand Logo</h3>
        <p className="section-description">
          Upload your main brand logo. This will be used across your personas and
          creative assets. Supported formats: SVG, PNG (max 5MB).
        </p>

        {uploadError && (
          <div className="upload-error">
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
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {uploadError}
          </div>
        )}
        {errors.logoUrl && (
          <div className="upload-error">{errors.logoUrl}</div>
        )}

        <div className="logo-upload-container">
          {previewUrl ? (
            <div className="logo-preview">
              <div className="preview-image-container">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Logo preview"
                  className="preview-image"
                />
              </div>
              <div className="preview-actions">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="preview-action-button change"
                  disabled={isUploading}
                >
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
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  Change Logo
                </button>
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="preview-action-button remove"
                  disabled={isUploading}
                >
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
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <div
              className={`upload-dropzone ${isUploading ? "uploading" : ""}`}
              onClick={() => !isUploading && fileInputRef.current?.click()}
            >
              {isUploading ? (
                <div className="upload-loading">
                  <div className="spinner" />
                  <span>Uploading...</span>
                </div>
              ) : (
                <>
                  <div className="upload-icon">
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
                  <div className="upload-text">
                    <span className="upload-primary">Click to upload</span>
                    <span className="upload-secondary">
                      or drag and drop your logo here
                    </span>
                    <span className="upload-hint">SVG, PNG (max 5MB)</span>
                  </div>
                </>
              )}
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptString}
            onChange={handleLogoUpload}
            className="file-input-hidden"
            disabled={isUploading}
          />
        </div>
      </div>

      {/* Logo Variants Section */}
      <div className="form-section">
        <div className="section-header">
          <div>
            <h3 className="section-title">Logo Variants (Optional)</h3>
            <p className="section-description">
              Add additional versions of your logo for different use cases.
            </p>
          </div>
          <button
            type="button"
            className="toggle-button"
            onClick={() => setShowVariants(!showVariants)}
          >
            {showVariants ? "Hide" : "Show"} Variants
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={showVariants ? "rotated" : ""}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>

        {showVariants && (
          <div className="variants-grid">
            {(Object.keys(variantLabels) as Array<keyof typeof variantLabels>).map(
              (variantKey) => (
                <div key={variantKey} className="variant-item">
                  <div className="variant-label">
                    <span className="variant-title">
                      {variantLabels[variantKey].title}
                    </span>
                    <span className="variant-description">
                      {variantLabels[variantKey].description}
                    </span>
                  </div>

                  {variantPreviews[variantKey] ? (
                    <div className="variant-preview">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={variantPreviews[variantKey]}
                        alt={`${variantKey} logo variant`}
                        className="variant-image"
                      />
                      <div className="variant-actions">
                        <button
                          type="button"
                          onClick={() =>
                            variantInputRefs[variantKey as keyof typeof variantInputRefs].current?.click()
                          }
                          className="variant-action change"
                          disabled={isUploading}
                          title="Change"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleRemoveVariant(variantKey as keyof typeof variantInputRefs)
                          }
                          className="variant-action remove"
                          disabled={isUploading}
                          title="Remove"
                        >
                          <svg
                            width="14"
                            height="14"
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
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="variant-upload-button"
                      onClick={() =>
                        variantInputRefs[variantKey as keyof typeof variantInputRefs].current?.click()
                      }
                      disabled={isUploading}
                    >
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
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      Upload
                    </button>
                  )}

                  <input
                    ref={variantInputRefs[variantKey as keyof typeof variantInputRefs]}
                    type="file"
                    accept={acceptString}
                    onChange={(e) =>
                      handleVariantUpload(variantKey as keyof typeof variantInputRefs, e)
                    }
                    className="file-input-hidden"
                    disabled={isUploading}
                  />
                </div>
              )
            )}
          </div>
        )}
      </div>

      <style>{`
        .step-form {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .form-section {
          background: var(--color-surface);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 16px;
          padding: 1.5rem;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .section-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--color-text-primary);
          margin: 0 0 0.25rem;
          letter-spacing: -0.02em;
        }

        .section-description {
          font-size: 0.875rem;
          color: var(--color-text-secondary);
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
          background: rgba(139, 92, 246, 0.1);
          border: 1px solid rgba(139, 92, 246, 0.2);
          border-radius: 8px;
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--color-plasma-violet);
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .toggle-button:hover {
          background: rgba(139, 92, 246, 0.2);
          border-color: rgba(139, 92, 246, 0.4);
        }
        .toggle-button svg {
          transition: transform 0.2s;
        }
        .toggle-button svg.rotated {
          transform: rotate(180deg);
        }

        .upload-error {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          color: #dc2626;
          font-size: 0.875rem;
          margin-bottom: 1rem;
        }

        .logo-upload-container {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .upload-dropzone {
          width: 100%;
          max-width: 400px;
          padding: 3rem 2rem;
          border: 2px dashed #d1d5db;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.15s;
          text-align: center;
          background: #fafafa;
        }

        .upload-dropzone:hover {
          border-color: #6366f1;
          background: #f5f5ff;
        }

        .upload-dropzone.uploading {
          border-color: #6366f1;
          background: #f5f5ff;
          cursor: wait;
        }

        .upload-icon {
          color: #9ca3af;
          margin-bottom: 1rem;
        }

        .upload-text {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .upload-primary {
          font-size: 0.9375rem;
          font-weight: 500;
          color: #6366f1;
        }

        .upload-secondary {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .upload-hint {
          font-size: 0.75rem;
          color: #9ca3af;
          margin-top: 0.5rem;
        }

        .upload-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          color: #6366f1;
        }

        .spinner {
          width: 32px;
          height: 32px;
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

        .file-input-hidden {
          display: none;
        }

        .logo-preview {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          width: 100%;
          max-width: 400px;
        }

        .preview-image-container {
          width: 100%;
          aspect-ratio: 16 / 9;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 1.5rem;
          overflow: hidden;
        }

        .preview-image {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        .preview-actions {
          display: flex;
          gap: 0.75rem;
        }

        .preview-action-button {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.5rem 0.875rem;
          border-radius: 6px;
          font-size: 0.8125rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }

        .preview-action-button.change {
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          color: #374151;
        }
        .preview-action-button.change:hover {
          background: #e5e7eb;
        }

        .preview-action-button.remove {
          background: white;
          border: 1px solid #fecaca;
          color: #dc2626;
        }
        .preview-action-button.remove:hover {
          background: #fef2f2;
        }

        .preview-action-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .variants-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1rem;
          margin-top: 1rem;
        }

        .variant-item {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .variant-label {
          display: flex;
          flex-direction: column;
        }

        .variant-title {
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
        }

        .variant-description {
          font-size: 0.75rem;
          color: #9ca3af;
        }

        .variant-preview {
          position: relative;
          width: 100%;
          aspect-ratio: 1;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
          background: #f9fafb;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .variant-image {
          max-width: 80%;
          max-height: 80%;
          object-fit: contain;
        }

        .variant-actions {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          display: flex;
          gap: 0.25rem;
          opacity: 0;
          transition: opacity 0.15s;
        }

        .variant-preview:hover .variant-actions {
          opacity: 1;
        }

        .variant-action {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .variant-action.change {
          background: white;
          border: 1px solid #d1d5db;
          color: #374151;
        }
        .variant-action.change:hover {
          background: #f3f4f6;
        }

        .variant-action.remove {
          background: white;
          border: 1px solid #fecaca;
          color: #dc2626;
        }
        .variant-action.remove:hover {
          background: #fef2f2;
        }

        .variant-action:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .variant-upload-button {
          width: 100%;
          aspect-ratio: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.375rem;
          border: 2px dashed #d1d5db;
          border-radius: 8px;
          background: #fafafa;
          color: #9ca3af;
          font-size: 0.8125rem;
          cursor: pointer;
          transition: all 0.15s;
        }

        .variant-upload-button:hover {
          border-color: #6366f1;
          color: #6366f1;
          background: #f5f5ff;
        }

        .variant-upload-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 640px) {
          .section-header {
            flex-direction: column;
          }

          .variants-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  );
}

// Common font options for brand guidelines
const fontOptions = [
  "Inter",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Poppins",
  "Playfair Display",
  "Merriweather",
  "Source Sans Pro",
  "Raleway",
  "Nunito",
  "Work Sans",
  "DM Sans",
  "Manrope",
  "Outfit",
  "Plus Jakarta Sans",
  "Space Grotesk",
  "Sora",
  "Lexend",
  "Figtree",
] as const;

// Step 3: Visual Guidelines
function Step3VisualGuidelines({
  data,
  onUpdate,
  errors,
}: {
  data: WizardData;
  onUpdate: (updates: Partial<WizardData>) => void;
  errors: Record<string, string>;
}) {
  // Handle primary color change
  const handlePrimaryColorChange = (color: string) => {
    onUpdate({
      visualGuidelines: {
        ...data.visualGuidelines,
        primaryColor: color,
      },
    });
  };

  // Handle secondary color addition
  const handleAddSecondaryColor = () => {
    if (data.visualGuidelines.secondaryColors.length >= 5) return;
    onUpdate({
      visualGuidelines: {
        ...data.visualGuidelines,
        secondaryColors: [...data.visualGuidelines.secondaryColors, "#6B7280"],
      },
    });
  };

  // Handle secondary color change
  const handleSecondaryColorChange = (index: number, color: string) => {
    const newColors = [...data.visualGuidelines.secondaryColors];
    newColors[index] = color;
    onUpdate({
      visualGuidelines: {
        ...data.visualGuidelines,
        secondaryColors: newColors,
      },
    });
  };

  // Handle secondary color removal
  const handleRemoveSecondaryColor = (index: number) => {
    const newColors = data.visualGuidelines.secondaryColors.filter(
      (_, i) => i !== index
    );
    onUpdate({
      visualGuidelines: {
        ...data.visualGuidelines,
        secondaryColors: newColors,
      },
    });
  };

  // Handle accent color change
  const handleAccentColorChange = (color: string) => {
    onUpdate({
      visualGuidelines: {
        ...data.visualGuidelines,
        accentColor: color,
      },
    });
  };

  // Handle font change
  const handleFontChange = (type: "headingFont" | "bodyFont", font: string) => {
    onUpdate({
      visualGuidelines: {
        ...data.visualGuidelines,
        [type]: font,
      },
    });
  };

  // Handle visual style toggle
  const handleVisualStyleToggle = (style: string) => {
    const currentStyles = data.visualGuidelines.visualStyle;
    const isSelected = currentStyles.includes(style);
    const newStyles = isSelected
      ? currentStyles.filter((s) => s !== style)
      : [...currentStyles, style];
    onUpdate({
      visualGuidelines: {
        ...data.visualGuidelines,
        visualStyle: newStyles,
      },
    });
  };

  // Handle photography style toggle
  const handlePhotographyStyleToggle = (style: string) => {
    const currentStyles = data.visualGuidelines.photographyStyle;
    const isSelected = currentStyles.includes(style);
    const newStyles = isSelected
      ? currentStyles.filter((s) => s !== style)
      : [...currentStyles, style];
    onUpdate({
      visualGuidelines: {
        ...data.visualGuidelines,
        photographyStyle: newStyles,
      },
    });
  };

  return (
    <div className="step-form">
      {/* Color Palette Section */}
      <div className="form-section">
        <h3 className="section-title">Color Palette</h3>
        <p className="section-description">
          Define your brand&apos;s color palette. These colors will guide the
          visual consistency of your creative assets.
        </p>

        <div className="color-grid">
          {/* Primary Color */}
          <div className="color-field primary-color">
            <label className="field-label">
              Primary Color <span className="required">*</span>
            </label>
            <div className="color-input-container">
              <input
                type="color"
                value={data.visualGuidelines.primaryColor || "#6366F1"}
                onChange={(e) => handlePrimaryColorChange(e.target.value)}
                className="color-picker"
              />
              <input
                type="text"
                value={data.visualGuidelines.primaryColor || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^#[A-Fa-f0-9]{0,6}$/.test(val) || val === "") {
                    handlePrimaryColorChange(val.toUpperCase());
                  }
                }}
                placeholder="#6366F1"
                className={`color-text-input ${errors.primaryColor ? "error" : ""}`}
                maxLength={7}
              />
            </div>
            {errors.primaryColor && (
              <p className="field-error">{errors.primaryColor}</p>
            )}
          </div>

          {/* Accent Color */}
          <div className="color-field">
            <label className="field-label">Accent Color</label>
            <div className="color-input-container">
              <input
                type="color"
                value={data.visualGuidelines.accentColor || "#F59E0B"}
                onChange={(e) => handleAccentColorChange(e.target.value)}
                className="color-picker"
              />
              <input
                type="text"
                value={data.visualGuidelines.accentColor || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^#[A-Fa-f0-9]{0,6}$/.test(val) || val === "") {
                    handleAccentColorChange(val.toUpperCase());
                  }
                }}
                placeholder="#F59E0B"
                className="color-text-input"
                maxLength={7}
              />
            </div>
          </div>
        </div>

        {/* Secondary Colors */}
        <div className="secondary-colors-section">
          <div className="secondary-colors-header">
            <label className="field-label">
              Secondary Colors{" "}
              <span className="field-hint">(up to 5)</span>
            </label>
            {data.visualGuidelines.secondaryColors.length < 5 && (
              <button
                type="button"
                onClick={handleAddSecondaryColor}
                className="add-color-button"
              >
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
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Color
              </button>
            )}
          </div>

          {data.visualGuidelines.secondaryColors.length === 0 ? (
            <p className="empty-hint">
              No secondary colors added yet. Click &quot;Add Color&quot; to add one.
            </p>
          ) : (
            <div className="secondary-colors-grid">
              {data.visualGuidelines.secondaryColors.map((color, index) => (
                <div key={index} className="secondary-color-item">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) =>
                      handleSecondaryColorChange(index, e.target.value)
                    }
                    className="color-picker small"
                  />
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^#[A-Fa-f0-9]{0,6}$/.test(val) || val === "") {
                        handleSecondaryColorChange(index, val.toUpperCase());
                      }
                    }}
                    placeholder="#000000"
                    className="color-text-input small"
                    maxLength={7}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveSecondaryColor(index)}
                    className="remove-color-button"
                    title="Remove color"
                  >
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
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Color Preview */}
        {(data.visualGuidelines.primaryColor ||
          data.visualGuidelines.accentColor ||
          data.visualGuidelines.secondaryColors.length > 0) && (
          <div className="color-preview">
            <span className="preview-label">Preview:</span>
            <div className="color-swatches">
              {data.visualGuidelines.primaryColor && (
                <div
                  className="color-swatch primary"
                  style={{ backgroundColor: data.visualGuidelines.primaryColor }}
                  title="Primary"
                />
              )}
              {data.visualGuidelines.secondaryColors.map((color, index) => (
                <div
                  key={index}
                  className="color-swatch"
                  style={{ backgroundColor: color }}
                  title={`Secondary ${index + 1}`}
                />
              ))}
              {data.visualGuidelines.accentColor && (
                <div
                  className="color-swatch accent"
                  style={{ backgroundColor: data.visualGuidelines.accentColor }}
                  title="Accent"
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Typography Section */}
      <div className="form-section">
        <h3 className="section-title">Typography</h3>
        <p className="section-description">
          Select fonts for headings and body text that reflect your brand personality.
        </p>

        <div className="form-grid">
          {/* Heading Font */}
          <div className="form-field">
            <label htmlFor="headingFont" className="field-label">
              Heading Font
            </label>
            <select
              id="headingFont"
              value={data.visualGuidelines.headingFont}
              onChange={(e) => handleFontChange("headingFont", e.target.value)}
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

          {/* Body Font */}
          <div className="form-field">
            <label htmlFor="bodyFont" className="field-label">
              Body Font
            </label>
            <select
              id="bodyFont"
              value={data.visualGuidelines.bodyFont}
              onChange={(e) => handleFontChange("bodyFont", e.target.value)}
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

        {/* Font Preview */}
        {(data.visualGuidelines.headingFont ||
          data.visualGuidelines.bodyFont) && (
          <div className="font-preview">
            <span className="preview-label">Preview:</span>
            <div className="font-preview-box">
              {data.visualGuidelines.headingFont && (
                <p
                  className="preview-heading"
                  style={{
                    fontFamily: `"${data.visualGuidelines.headingFont}", sans-serif`,
                  }}
                >
                  {data.visualGuidelines.headingFont} Heading
                </p>
              )}
              {data.visualGuidelines.bodyFont && (
                <p
                  className="preview-body"
                  style={{
                    fontFamily: `"${data.visualGuidelines.bodyFont}", sans-serif`,
                  }}
                >
                  This is how body text will look in{" "}
                  {data.visualGuidelines.bodyFont}.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Visual Style Section */}
      <div className="form-section">
        <h3 className="section-title">Visual Style</h3>
        <p className="section-description">
          Select the visual styles that best represent your brand. Choose multiple
          if applicable.
        </p>

        <div className="multi-select-grid">
          {visualStyles.map((style) => (
            <button
              key={style}
              type="button"
              onClick={() => handleVisualStyleToggle(style)}
              className={`multi-select-option ${
                data.visualGuidelines.visualStyle.includes(style)
                  ? "selected"
                  : ""
              }`}
            >
              {data.visualGuidelines.visualStyle.includes(style) && (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="check-icon"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              {style}
            </button>
          ))}
        </div>
        {errors.visualStyle && (
          <p className="field-error">{errors.visualStyle}</p>
        )}
      </div>

      {/* Photography Style Section */}
      <div className="form-section">
        <h3 className="section-title">Photography Style</h3>
        <p className="section-description">
          Select the photography styles that align with your brand imagery. Choose
          multiple if applicable.
        </p>

        <div className="multi-select-grid">
          {photographyStyles.map((style) => (
            <button
              key={style}
              type="button"
              onClick={() => handlePhotographyStyleToggle(style)}
              className={`multi-select-option ${
                data.visualGuidelines.photographyStyle.includes(style)
                  ? "selected"
                  : ""
              }`}
            >
              {data.visualGuidelines.photographyStyle.includes(style) && (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="check-icon"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              {style}
            </button>
          ))}
        </div>
        {errors.photographyStyle && (
          <p className="field-error">{errors.photographyStyle}</p>
        )}
      </div>

      <style>{`
        .step-form {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .form-section {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 1.5rem;
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

        .field-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--color-text-secondary);
        }

        .required {
          color: #ef4444;
        }

        .field-hint {
          font-weight: 400;
          color: #9ca3af;
        }

        .field-select {
          padding: 0.625rem 0.875rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          font-size: 0.9375rem;
          color: var(--color-text-primary);
          background: var(--color-elevated);
          cursor: pointer;
          transition: border-color 0.15s, box-shadow 0.15s;
        }

        .field-select:focus {
          outline: none;
          border-color: var(--color-plasma-violet);
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15);
        }

        .field-select option {
          background: var(--color-surface);
          color: var(--color-text-primary);
        }

        .field-error {
          font-size: 0.8125rem;
          color: #ef4444;
          margin: 0.5rem 0 0;
        }

        /* Color Palette Styles */
        .color-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.25rem;
          margin-bottom: 1.5rem;
        }

        .color-field {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }

        .color-input-container {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .color-picker {
          width: 48px;
          height: 40px;
          padding: 2px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          cursor: pointer;
          background: white;
        }

        .color-picker.small {
          width: 40px;
          height: 36px;
        }

        .color-picker::-webkit-color-swatch-wrapper {
          padding: 2px;
        }

        .color-picker::-webkit-color-swatch {
          border-radius: 4px;
          border: none;
        }

        .color-text-input {
          flex: 1;
          padding: 0.625rem 0.875rem;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 0.9375rem;
          font-family: monospace;
          color: #111827;
          text-transform: uppercase;
        }

        .color-text-input.small {
          padding: 0.5rem 0.625rem;
          font-size: 0.875rem;
        }

        .color-text-input:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .color-text-input.error {
          border-color: #ef4444;
        }

        /* Secondary Colors */
        .secondary-colors-section {
          margin-bottom: 1.5rem;
        }

        .secondary-colors-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }

        .add-color-button {
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
        }

        .add-color-button:hover {
          background: #e5e7eb;
        }

        .empty-hint {
          font-size: 0.875rem;
          color: #9ca3af;
          font-style: italic;
          margin: 0;
        }

        .secondary-colors-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        .secondary-color-item {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.375rem;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
        }

        .remove-color-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          background: transparent;
          border: none;
          border-radius: 4px;
          color: #9ca3af;
          cursor: pointer;
          transition: all 0.15s;
        }

        .remove-color-button:hover {
          background: #fef2f2;
          color: #dc2626;
        }

        /* Color Preview */
        .color-preview {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
        }

        .preview-label {
          font-size: 0.8125rem;
          font-weight: 500;
          color: #6b7280;
        }

        .color-swatches {
          display: flex;
          gap: 0.5rem;
        }

        .color-swatch {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          border: 2px solid white;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
        }

        .color-swatch.primary {
          width: 40px;
          height: 40px;
        }

        .color-swatch.accent {
          border-style: dashed;
        }

        /* Font Preview */
        .font-preview {
          margin-top: 1.25rem;
          padding: 1rem;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
        }

        .font-preview-box {
          margin-top: 0.5rem;
        }

        .preview-heading {
          font-size: 1.5rem;
          font-weight: 700;
          color: #111827;
          margin: 0 0 0.5rem;
        }

        .preview-body {
          font-size: 1rem;
          color: #4b5563;
          margin: 0;
        }

        /* Multi-Select Grid */
        .multi-select-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 0.625rem;
        }

        .multi-select-option {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.5rem 1rem;
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 9999px;
          font-size: 0.875rem;
          color: #374151;
          cursor: pointer;
          transition: all 0.15s;
        }

        .multi-select-option:hover {
          border-color: #6366f1;
          background: #f5f5ff;
        }

        .multi-select-option.selected {
          border-color: #6366f1;
          background: #eef2ff;
          color: #4f46e5;
        }

        .multi-select-option .check-icon {
          color: #6366f1;
        }

        @media (max-width: 640px) {
          .form-grid,
          .color-grid {
            grid-template-columns: 1fr;
          }

          .secondary-colors-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }

          .secondary-colors-grid {
            flex-direction: column;
          }

          .secondary-color-item {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

// Step 4: Voice & Tone
function Step4VoiceTone({
  data,
  onUpdate,
  errors,
}: {
  data: WizardData;
  onUpdate: (updates: Partial<WizardData>) => void;
  errors: Record<string, string>;
}) {
  // Handle brand voice change
  const handleBrandVoiceChange = (voice: string) => {
    onUpdate({
      voiceTone: {
        ...data.voiceTone,
        brandVoice: voice,
      },
    });
  };

  // Handle tone characteristic toggle
  const handleToneToggle = (tone: string) => {
    const currentTones = data.voiceTone.toneCharacteristics;
    const isSelected = currentTones.includes(tone);

    // If trying to select more than 5, don't allow
    if (!isSelected && currentTones.length >= 5) {
      return;
    }

    const newTones = isSelected
      ? currentTones.filter((t) => t !== tone)
      : [...currentTones, tone];
    onUpdate({
      voiceTone: {
        ...data.voiceTone,
        toneCharacteristics: newTones,
      },
    });
  };

  // Handle key message change
  const handleKeyMessageChange = (index: number, value: string) => {
    const newMessages = [...data.voiceTone.keyMessages];
    newMessages[index] = value;
    onUpdate({
      voiceTone: {
        ...data.voiceTone,
        keyMessages: newMessages,
      },
    });
  };

  // Handle add key message
  const handleAddKeyMessage = () => {
    if (data.voiceTone.keyMessages.length >= 5) return;
    onUpdate({
      voiceTone: {
        ...data.voiceTone,
        keyMessages: [...data.voiceTone.keyMessages, ""],
      },
    });
  };

  // Handle remove key message
  const handleRemoveKeyMessage = (index: number) => {
    const newMessages = data.voiceTone.keyMessages.filter((_, i) => i !== index);
    onUpdate({
      voiceTone: {
        ...data.voiceTone,
        keyMessages: newMessages,
      },
    });
  };

  // Handle tagline change
  const handleTaglineChange = (tagline: string) => {
    onUpdate({
      voiceTone: {
        ...data.voiceTone,
        tagline,
      },
    });
  };

  // Handle words to avoid change
  const handleWordsToAvoidChange = (index: number, value: string) => {
    const newWords = [...data.voiceTone.wordsToAvoid];
    newWords[index] = value;
    onUpdate({
      voiceTone: {
        ...data.voiceTone,
        wordsToAvoid: newWords,
      },
    });
  };

  // Handle add word to avoid
  const handleAddWordToAvoid = () => {
    onUpdate({
      voiceTone: {
        ...data.voiceTone,
        wordsToAvoid: [...data.voiceTone.wordsToAvoid, ""],
      },
    });
  };

  // Handle remove word to avoid
  const handleRemoveWordToAvoid = (index: number) => {
    const newWords = data.voiceTone.wordsToAvoid.filter((_, i) => i !== index);
    onUpdate({
      voiceTone: {
        ...data.voiceTone,
        wordsToAvoid: newWords,
      },
    });
  };

  return (
    <div className="step-form">
      {/* Brand Voice Section */}
      <div className="form-section">
        <h3 className="section-title">Brand Voice</h3>
        <p className="section-description">
          Select the primary voice that represents how your brand communicates.
          This defines the overall personality of your brand&apos;s messaging.
        </p>

        <div className="form-field">
          <label htmlFor="brandVoice" className="field-label">
            Brand Voice
          </label>
          <select
            id="brandVoice"
            value={data.voiceTone.brandVoice}
            onChange={(e) => handleBrandVoiceChange(e.target.value)}
            className={`field-select ${errors.brandVoice ? "error" : ""}`}
          >
            <option value="">Select brand voice</option>
            {brandVoices.map((voice) => (
              <option key={voice} value={voice}>
                {voice}
              </option>
            ))}
          </select>
          {errors.brandVoice && (
            <p className="field-error">{errors.brandVoice}</p>
          )}
        </div>
      </div>

      {/* Tone Characteristics Section */}
      <div className="form-section">
        <h3 className="section-title">Tone Characteristics</h3>
        <p className="section-description">
          Select 3-5 tone characteristics that define how your brand sounds.
          These work together with your brand voice to create a consistent tone.
        </p>

        <div className="multi-select-grid">
          {toneCharacteristics.map((tone) => (
            <button
              key={tone}
              type="button"
              onClick={() => handleToneToggle(tone)}
              className={`multi-select-option ${
                data.voiceTone.toneCharacteristics.includes(tone)
                  ? "selected"
                  : ""
              } ${
                data.voiceTone.toneCharacteristics.length >= 5 &&
                !data.voiceTone.toneCharacteristics.includes(tone)
                  ? "disabled"
                  : ""
              }`}
              disabled={
                data.voiceTone.toneCharacteristics.length >= 5 &&
                !data.voiceTone.toneCharacteristics.includes(tone)
              }
            >
              {data.voiceTone.toneCharacteristics.includes(tone) && (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="check-icon"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              {tone}
            </button>
          ))}
        </div>
        <p className="selection-count">
          {data.voiceTone.toneCharacteristics.length} of 5 selected
          {data.voiceTone.toneCharacteristics.length < 3 && (
            <span className="selection-hint"> (minimum 3)</span>
          )}
        </p>
        {errors.toneCharacteristics && (
          <p className="field-error">{errors.toneCharacteristics}</p>
        )}
      </div>

      {/* Key Messages Section */}
      <div className="form-section">
        <h3 className="section-title">Key Messages</h3>
        <p className="section-description">
          Define 3-5 key messages that capture your brand&apos;s core value
          propositions. These are the main points you want your audience to
          remember.
        </p>

        <div className="key-messages-list">
          {data.voiceTone.keyMessages.map((message, index) => (
            <div key={index} className="key-message-item">
              <span className="message-number">{index + 1}</span>
              <input
                type="text"
                value={message}
                onChange={(e) => handleKeyMessageChange(index, e.target.value)}
                placeholder={`Key message ${index + 1}`}
                className={`field-input ${errors.keyMessages ? "error" : ""}`}
                maxLength={500}
              />
              <button
                type="button"
                onClick={() => handleRemoveKeyMessage(index)}
                className="remove-message-button"
                title="Remove message"
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
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {data.voiceTone.keyMessages.length < 5 && (
          <button
            type="button"
            onClick={handleAddKeyMessage}
            className="add-message-button"
          >
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
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Key Message
          </button>
        )}
        <p className="selection-count">
          {data.voiceTone.keyMessages.length} of 5 messages
          {data.voiceTone.keyMessages.length < 3 && (
            <span className="selection-hint"> (minimum 3)</span>
          )}
        </p>
        {errors.keyMessages && (
          <p className="field-error">{errors.keyMessages}</p>
        )}
      </div>

      {/* Tagline Section */}
      <div className="form-section">
        <h3 className="section-title">Tagline (Optional)</h3>
        <p className="section-description">
          A memorable phrase that captures your brand&apos;s essence. Great
          taglines are short, memorable, and convey your unique value.
        </p>

        <div className="form-field">
          <label htmlFor="tagline" className="field-label">
            Tagline
          </label>
          <input
            type="text"
            id="tagline"
            value={data.voiceTone.tagline}
            onChange={(e) => handleTaglineChange(e.target.value)}
            placeholder="e.g., Just Do It, Think Different, Because You're Worth It"
            className="field-input"
            maxLength={200}
          />
          <p className="field-hint">
            {data.voiceTone.tagline.length}/200 characters
          </p>
        </div>
      </div>

      {/* Words to Avoid Section */}
      <div className="form-section">
        <h3 className="section-title">Words to Avoid (Optional)</h3>
        <p className="section-description">
          List words or phrases that should never be used in your brand&apos;s
          communications. This helps maintain brand consistency.
        </p>

        <div className="words-to-avoid-list">
          {data.voiceTone.wordsToAvoid.map((word, index) => (
            <div key={index} className="word-item">
              <input
                type="text"
                value={word}
                onChange={(e) => handleWordsToAvoidChange(index, e.target.value)}
                placeholder="Enter word or phrase"
                className="field-input small"
                maxLength={50}
              />
              <button
                type="button"
                onClick={() => handleRemoveWordToAvoid(index)}
                className="remove-word-button"
                title="Remove"
              >
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
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={handleAddWordToAvoid}
          className="add-word-button"
        >
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
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Word to Avoid
        </button>
      </div>

      <style>{`
        .step-form {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .form-section {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 1.5rem;
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

        .form-field {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }

        .field-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--color-text-secondary);
        }

        .field-select {
          padding: 0.625rem 0.875rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          font-size: 0.9375rem;
          color: var(--color-text-primary);
          background: var(--color-elevated);
          cursor: pointer;
          transition: border-color 0.15s, box-shadow 0.15s;
        }

        .field-select:focus {
          outline: none;
          border-color: var(--color-plasma-violet);
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15);
        }

        .field-select.error {
          border-color: #ef4444;
        }

        .field-select option {
          background: var(--color-surface);
          color: var(--color-text-primary);
        }

        .field-input {
          padding: 0.625rem 0.875rem;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          font-size: 0.9375rem;
          color: var(--color-text-primary);
          background: var(--color-elevated);
          transition: border-color 0.15s, box-shadow 0.15s;
          flex: 1;
        }

        .field-input:focus {
          outline: none;
          border-color: var(--color-plasma-violet);
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15);
        }

        .field-input.error {
          border-color: #ef4444;
        }

        .field-input.small {
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
        }

        .field-error {
          font-size: 0.8125rem;
          color: #ef4444;
          margin: 0.25rem 0 0;
        }

        .field-hint {
          font-size: 0.75rem;
          color: #9ca3af;
          margin: 0.25rem 0 0;
        }

        /* Multi-Select Grid */
        .multi-select-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 0.625rem;
        }

        .multi-select-option {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.5rem 1rem;
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 9999px;
          font-size: 0.875rem;
          color: #374151;
          cursor: pointer;
          transition: all 0.15s;
        }

        .multi-select-option:hover:not(.disabled) {
          border-color: #6366f1;
          background: #f5f5ff;
        }

        .multi-select-option.selected {
          border-color: #6366f1;
          background: #eef2ff;
          color: #4f46e5;
        }

        .multi-select-option.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .multi-select-option .check-icon {
          color: #6366f1;
        }

        .selection-count {
          font-size: 0.8125rem;
          color: #6b7280;
          margin-top: 0.75rem;
        }

        .selection-hint {
          color: #f59e0b;
        }

        /* Key Messages */
        .key-messages-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .key-message-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .message-number {
          width: 1.75rem;
          height: 1.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f3f4f6;
          border-radius: 50%;
          font-size: 0.8125rem;
          font-weight: 600;
          color: #6b7280;
          flex-shrink: 0;
        }

        .remove-message-button {
          width: 2rem;
          height: 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          color: #9ca3af;
          cursor: pointer;
          transition: all 0.15s;
          flex-shrink: 0;
        }

        .remove-message-button:hover {
          background: #fef2f2;
          border-color: #fecaca;
          color: #dc2626;
        }

        .add-message-button {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.5rem 1rem;
          background: #f3f4f6;
          border: 1px dashed #d1d5db;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 500;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.15s;
        }

        .add-message-button:hover {
          background: #e5e7eb;
          border-color: #9ca3af;
          color: #374151;
        }

        /* Words to Avoid */
        .words-to-avoid-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.625rem;
          margin-bottom: 1rem;
        }

        .word-item {
          display: flex;
          align-items: center;
          gap: 0.375rem;
        }

        .word-item .field-input.small {
          width: 150px;
        }

        .remove-word-button {
          width: 1.75rem;
          height: 1.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          color: #9ca3af;
          cursor: pointer;
          transition: all 0.15s;
        }

        .remove-word-button:hover {
          background: #fef2f2;
          border-color: #fecaca;
          color: #dc2626;
        }

        .add-word-button {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.5rem 0.875rem;
          background: #f3f4f6;
          border: 1px dashed #d1d5db;
          border-radius: 8px;
          font-size: 0.8125rem;
          font-weight: 500;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.15s;
        }

        .add-word-button:hover {
          background: #e5e7eb;
          border-color: #9ca3af;
          color: #374151;
        }

        @media (max-width: 640px) {
          .word-item .field-input.small {
            width: 120px;
          }
        }
      `}</style>
    </div>
  );
}

export default function NewBrandPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardData, setWizardData] = useState<WizardData>(initialWizardData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Update wizard data
  const updateWizardData = (updates: Partial<WizardData>) => {
    setWizardData((prev) => ({ ...prev, ...updates }));
    // Clear errors for updated fields
    const updatedKeys = Object.keys(updates);
    setErrors((prev) => {
      const newErrors = { ...prev };
      updatedKeys.forEach((key) => delete newErrors[key]);
      return newErrors;
    });
  };

  // Hex color validation regex
  const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

  // Validate current step
  const validateStep = (): boolean => {
    if (currentStep === 1) {
      const result = step1Schema.safeParse({
        name: wizardData.name,
        businessType: wizardData.businessType || undefined,
        industry: wizardData.industry || undefined,
        subIndustry: wizardData.subIndustry || undefined,
        website: wizardData.website || undefined,
        socialProfiles: wizardData.socialProfiles,
      });

      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        result.error.issues.forEach((issue) => {
          const field = issue.path[0] as string;
          if (!fieldErrors[field]) {
            fieldErrors[field] = issue.message;
          }
        });
        setErrors(fieldErrors);
        return false;
      }
    }

    // Step 3: Visual Guidelines validation
    if (currentStep === 3) {
      const fieldErrors: Record<string, string> = {};

      // Primary color is required
      if (!wizardData.visualGuidelines.primaryColor) {
        fieldErrors.primaryColor = "Primary color is required";
      } else if (!hexColorRegex.test(wizardData.visualGuidelines.primaryColor)) {
        fieldErrors.primaryColor = "Please enter a valid hex color (e.g., #6366F1)";
      }

      // Validate accent color if provided
      if (
        wizardData.visualGuidelines.accentColor &&
        !hexColorRegex.test(wizardData.visualGuidelines.accentColor)
      ) {
        fieldErrors.accentColor = "Please enter a valid hex color (e.g., #F59E0B)";
      }

      // Validate secondary colors
      const invalidSecondary = wizardData.visualGuidelines.secondaryColors.some(
        (color) => !hexColorRegex.test(color)
      );
      if (invalidSecondary) {
        fieldErrors.secondaryColors = "All secondary colors must be valid hex colors";
      }

      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
        return false;
      }
    }

    // Step 4: Voice & Tone validation
    if (currentStep === 4) {
      const fieldErrors: Record<string, string> = {};

      // Validate tone characteristics (3-5 required)
      const toneCount = wizardData.voiceTone.toneCharacteristics.length;
      if (toneCount < 3) {
        fieldErrors.toneCharacteristics = "Please select at least 3 tone characteristics";
      } else if (toneCount > 5) {
        fieldErrors.toneCharacteristics = "Please select at most 5 tone characteristics";
      }

      // Validate key messages (3-5 required, non-empty)
      const nonEmptyMessages = wizardData.voiceTone.keyMessages.filter(
        (m) => m.trim().length > 0
      );
      if (nonEmptyMessages.length < 3) {
        fieldErrors.keyMessages = "Please provide at least 3 key messages";
      } else if (nonEmptyMessages.length > 5) {
        fieldErrors.keyMessages = "Please provide at most 5 key messages";
      }

      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
        return false;
      }
    }

    setErrors({});
    return true;
  };

  // Handle completing the wizard and saving the brand
  const handleComplete = async () => {
    if (!validateStep()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Build the brand data from wizard data
      // Cast enum fields explicitly to match CreateBrandInput types
      const brandData: CreateBrandInput = {
        name: wizardData.name,
        businessType: (wizardData.businessType || undefined) as CreateBrandInput["businessType"],
        industry: (wizardData.industry || undefined) as CreateBrandInput["industry"],
        subIndustry: wizardData.subIndustry || undefined,
        website: wizardData.website || undefined,
        socialProfiles: wizardData.socialProfiles,
        logoUrl: wizardData.logoUrl || undefined,
        logoVariants: wizardData.logoVariants,
        visualGuidelines: {
          primaryColor: wizardData.visualGuidelines.primaryColor || undefined,
          secondaryColors: wizardData.visualGuidelines.secondaryColors,
          accentColor: wizardData.visualGuidelines.accentColor || undefined,
          headingFont: wizardData.visualGuidelines.headingFont || undefined,
          bodyFont: wizardData.visualGuidelines.bodyFont || undefined,
          visualStyle: wizardData.visualGuidelines.visualStyle as CreateBrandInput["visualGuidelines"] extends { visualStyle?: infer T } ? T : never,
          photographyStyle: wizardData.visualGuidelines.photographyStyle as CreateBrandInput["visualGuidelines"] extends { photographyStyle?: infer T } ? T : never,
        },
        voiceTone: {
          brandVoice: (wizardData.voiceTone.brandVoice || undefined) as CreateBrandInput["voiceTone"] extends { brandVoice?: infer T } ? T : never,
          toneCharacteristics: wizardData.voiceTone.toneCharacteristics as CreateBrandInput["voiceTone"] extends { toneCharacteristics?: infer T } ? T : never,
          keyMessages: wizardData.voiceTone.keyMessages.filter((m) => m.trim().length > 0),
          tagline: wizardData.voiceTone.tagline || undefined,
          wordsToAvoid: wizardData.voiceTone.wordsToAvoid.filter((w) => w.trim().length > 0),
        },
      };

      const result = await createBrand(brandData);

      if (!result.success) {
        setSubmitError(result.error);
        setIsSubmitting(false);
        return;
      }

      // Redirect to the brand detail page
      router.push(`/brands/${result.data.id}`);
    } catch (error) {
      console.error("Error creating brand:", error);
      setSubmitError("An unexpected error occurred. Please try again.");
      setIsSubmitting(false);
    }
  };

  // Handle next step
  const handleNext = () => {
    // If on last step, call handleComplete instead
    if (currentStep === WIZARD_STEPS.length) {
      handleComplete();
      return;
    }

    if (!validateStep()) {
      return;
    }

    if (currentStep < WIZARD_STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  // Handle previous step
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    router.push("/brands");
  };

  // Render current step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1Identity
            data={wizardData}
            onUpdate={updateWizardData}
            errors={errors}
          />
        );
      case 2:
        return (
          <Step2LogoUpload
            data={wizardData}
            onUpdate={updateWizardData}
            errors={errors}
            isUploading={isUploading}
            setIsUploading={setIsUploading}
          />
        );
      case 3:
        return (
          <Step3VisualGuidelines
            data={wizardData}
            onUpdate={updateWizardData}
            errors={errors}
          />
        );
      case 4:
        return (
          <Step4VoiceTone
            data={wizardData}
            onUpdate={updateWizardData}
            errors={errors}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="new-brand-page">
      <header className="page-header">
        <h1 className="page-title">Create New Brand</h1>
        <p className="page-description">
          Set up your brand profile to start generating personas and creative
          assets.
        </p>
      </header>

      <ProgressIndicator currentStep={currentStep} steps={WIZARD_STEPS} />

      <div className="wizard-content">
        {submitError && (
          <div className="submit-error">
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
            {submitError}
          </div>
        )}
        {renderStepContent()}
      </div>

      <div className="wizard-actions">
        <button
          type="button"
          onClick={handleCancel}
          className="action-button cancel"
        >
          Cancel
        </button>

        <div className="action-buttons-right">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={handleBack}
              disabled={isUploading}
              className="action-button back"
            >
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
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Back
            </button>
          )}

          <button
            type="button"
            onClick={handleNext}
            disabled={isSubmitting || isUploading}
            className="action-button next"
          >
            {isSubmitting ? (
              "Processing..."
            ) : currentStep === WIZARD_STEPS.length ? (
              <>
                Complete
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
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </>
            ) : (
              <>
                Next
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
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>

      <style>{`
        .new-brand-page {
          max-width: 800px;
          margin: 0 auto;
        }

        .page-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .page-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--color-text-primary);
          margin: 0 0 0.5rem;
          letter-spacing: -0.02em;
        }

        .page-description {
          font-size: 0.9375rem;
          color: var(--color-text-secondary);
          margin: 0;
        }

        .wizard-content {
          margin-bottom: 2rem;
        }

        .submit-error {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 1.25rem;
          background: rgba(244, 63, 94, 0.1);
          border: 1px solid rgba(244, 63, 94, 0.3);
          border-radius: 10px;
          color: var(--color-plasma-rose);
          font-size: 0.9375rem;
          margin-bottom: 1.5rem;
        }

        .submit-error svg {
          flex-shrink: 0;
        }

        .wizard-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 1.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        .action-buttons-right {
          display: flex;
          gap: 0.75rem;
        }

        .action-button {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1.25rem;
          border-radius: 10px;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .action-button.cancel {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--color-text-muted);
        }
        .action-button.cancel:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .action-button.back {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--color-text-secondary);
        }
        .action-button.back:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .action-button.next {
          background: linear-gradient(135deg, var(--color-plasma-violet), var(--color-plasma-purple));
          border: none;
          color: white;
          box-shadow: 0 0 15px rgba(139, 92, 246, 0.25);
        }
        .action-button.next:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 25px rgba(139, 92, 246, 0.35);
        }
        .action-button.next:disabled {
          background: rgba(255, 255, 255, 0.1);
          box-shadow: none;
          cursor: not-allowed;
          transform: none;
        }

        @media (max-width: 640px) {
          .wizard-actions {
            flex-direction: column;
            gap: 1rem;
          }

          .action-buttons-right {
            width: 100%;
            justify-content: space-between;
          }

          .action-button {
            flex: 1;
            justify-content: center;
          }

          .action-button.cancel {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
