/**
 * Brand Detail Page
 *
 * Displays brand details with tabbed navigation for:
 * - Overview (brand identity, visual guidelines, voice & tone)
 * - Products
 * - Intelligence
 * - Personas
 * - Creatives
 *
 * Features:
 * - Brand name, logo, industry display
 * - Edit button linking to edit page
 * - Delete button with confirmation dialog
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getBrand, deleteBrand } from "@/app/actions/brands";
import type { Brand, VisualGuidelines, VoiceTone, SocialProfiles, LogoVariants } from "@/lib/supabase/database.types";
import { BrandLogo, LogoVariantImage } from "@/components/brands";
import ProductsList from "@/components/products/ProductsList";
import IntelligenceTab from "@/components/intelligence/IntelligenceTab";
import PersonasList from "@/components/personas/PersonasList";
import CreativesGallery from "@/components/creatives/CreativesGallery";
import { AudiencesList } from "@/components/audiences";

// Tab types
type TabId = "overview" | "products" | "intelligence" | "personas" | "audiences" | "creatives";

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const tabs: Tab[] = [
  {
    id: "overview",
    label: "Overview",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" />
        <rect x="14" y="3" width="7" height="5" />
        <rect x="14" y="12" width="7" height="9" />
        <rect x="3" y="16" width="7" height="5" />
      </svg>
    ),
  },
  {
    id: "products",
    label: "Products",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
  },
  {
    id: "intelligence",
    label: "Intelligence",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    id: "personas",
    label: "Personas",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    id: "audiences",
    label: "Audiences",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
    ),
  },
  {
    id: "creatives",
    label: "Creatives",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    ),
  },
];

// Delete confirmation modal component
function DeleteConfirmModal({
  brandName,
  onConfirm,
  onCancel,
  isDeleting,
}: {
  brandName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}) {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </div>
        <h3 className="modal-title">Delete Brand</h3>
        <p className="modal-message">
          Are you sure you want to delete <strong>{brandName}</strong>? This action cannot be undone and will also delete all associated products, personas, audiences, and creatives.
        </p>
        <div className="modal-actions">
          <button className="btn-cancel" onClick={onCancel} disabled={isDeleting}>
            Cancel
          </button>
          <button className="btn-delete" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Delete Brand"}
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
          background: rgba(5, 0, 20, 0.85);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }
        .modal-content {
          background: var(--color-surface);
          border: 1px solid rgba(244, 63, 94, 0.2);
          border-radius: 16px;
          padding: 2rem;
          max-width: 400px;
          width: 100%;
          text-align: center;
          box-shadow: 0 0 40px rgba(244, 63, 94, 0.15);
        }
        .modal-icon {
          color: var(--color-plasma-rose);
          margin-bottom: 1rem;
          filter: drop-shadow(0 0 12px rgba(244, 63, 94, 0.4));
        }
        .modal-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--color-text-primary);
          margin: 0 0 0.75rem;
          letter-spacing: -0.02em;
        }
        .modal-message {
          font-size: 0.9375rem;
          color: var(--color-text-secondary);
          margin: 0 0 1.5rem;
          line-height: 1.6;
        }
        .modal-message strong {
          color: var(--color-text-primary);
        }
        .modal-actions {
          display: flex;
          gap: 0.75rem;
        }
        .btn-cancel,
        .btn-delete {
          flex: 1;
          padding: 0.75rem 1rem;
          border-radius: 10px;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn-cancel {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--color-text-secondary);
        }
        .btn-cancel:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.2);
        }
        .btn-delete {
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          border: none;
          color: white;
          box-shadow: 0 0 20px rgba(220, 38, 38, 0.3);
        }
        .btn-delete:hover:not(:disabled) {
          box-shadow: 0 0 30px rgba(220, 38, 38, 0.5);
          transform: translateY(-1px);
        }
        .btn-cancel:disabled,
        .btn-delete:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }
      `}</style>
    </div>
  );
}

// Overview tab content
function OverviewTab({ brand }: { brand: Brand }) {
  const visualGuidelines = brand.visual_guidelines as VisualGuidelines | null;
  const voiceTone = brand.voice_tone as VoiceTone | null;
  const socialProfiles = brand.social_profiles as SocialProfiles | null;
  const logoVariants = brand.logo_variants as LogoVariants | null;

  return (
    <div className="overview-tab">
      {/* Brand Identity Section */}
      <section className="info-section">
        <h3 className="section-title">Brand Identity</h3>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Business Type</span>
            <span className="info-value">{brand.business_type || "Not set"}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Industry</span>
            <span className="info-value">{brand.industry || "Not set"}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Sub-Industry</span>
            <span className="info-value">{brand.sub_industry || "Not set"}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Website</span>
            <span className="info-value">
              {brand.website ? (
                <a href={brand.website} target="_blank" rel="noopener noreferrer" className="info-link">
                  {brand.website}
                </a>
              ) : (
                "Not set"
              )}
            </span>
          </div>
        </div>
        {socialProfiles && Object.keys(socialProfiles).some((k) => socialProfiles[k]) && (
          <div className="social-profiles">
            <span className="info-label">Social Profiles</span>
            <div className="social-links">
              {socialProfiles.instagram && (
                <a href={socialProfiles.instagram} target="_blank" rel="noopener noreferrer" className="social-link">Instagram</a>
              )}
              {socialProfiles.facebook && (
                <a href={socialProfiles.facebook} target="_blank" rel="noopener noreferrer" className="social-link">Facebook</a>
              )}
              {socialProfiles.twitter && (
                <a href={socialProfiles.twitter} target="_blank" rel="noopener noreferrer" className="social-link">X/Twitter</a>
              )}
              {socialProfiles.linkedin && (
                <a href={socialProfiles.linkedin} target="_blank" rel="noopener noreferrer" className="social-link">LinkedIn</a>
              )}
              {socialProfiles.tiktok && (
                <a href={socialProfiles.tiktok} target="_blank" rel="noopener noreferrer" className="social-link">TikTok</a>
              )}
              {socialProfiles.youtube && (
                <a href={socialProfiles.youtube} target="_blank" rel="noopener noreferrer" className="social-link">YouTube</a>
              )}
              {socialProfiles.pinterest && (
                <a href={socialProfiles.pinterest} target="_blank" rel="noopener noreferrer" className="social-link">Pinterest</a>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Logo Variants Section */}
      {logoVariants && Object.keys(logoVariants).some((k) => logoVariants[k]) && (
        <section className="info-section">
          <h3 className="section-title">Logo Variants</h3>
          <div className="logo-variants-grid">
            {logoVariants.primary && (
              <LogoVariantImage src={logoVariants.primary} alt="Primary logo" label="Primary" />
            )}
            {logoVariants.secondary && (
              <LogoVariantImage src={logoVariants.secondary} alt="Secondary logo" label="Secondary" />
            )}
            {logoVariants.icon && (
              <LogoVariantImage src={logoVariants.icon} alt="Icon logo" label="Icon" />
            )}
            {logoVariants.dark && (
              <LogoVariantImage src={logoVariants.dark} alt="Dark mode logo" label="Dark Mode" isDark />
            )}
            {logoVariants.light && (
              <LogoVariantImage src={logoVariants.light} alt="Light mode logo" label="Light Mode" />
            )}
          </div>
        </section>
      )}

      {/* Visual Guidelines Section */}
      {visualGuidelines && (
        <section className="info-section">
          <h3 className="section-title">Visual Guidelines</h3>
          <div className="visual-guidelines">
            {/* Colors */}
            <div className="colors-section">
              <span className="info-label">Color Palette</span>
              <div className="color-swatches">
                {visualGuidelines.primaryColor && (
                  <div className="color-swatch" title="Primary">
                    <div className="swatch" style={{ backgroundColor: visualGuidelines.primaryColor }} />
                    <span className="swatch-label">Primary</span>
                    <span className="swatch-value">{visualGuidelines.primaryColor}</span>
                  </div>
                )}
                {visualGuidelines.secondaryColors?.map((color, i) => (
                  <div key={i} className="color-swatch" title={`Secondary ${i + 1}`}>
                    <div className="swatch" style={{ backgroundColor: color }} />
                    <span className="swatch-label">Secondary</span>
                    <span className="swatch-value">{color}</span>
                  </div>
                ))}
                {visualGuidelines.accentColor && (
                  <div className="color-swatch" title="Accent">
                    <div className="swatch" style={{ backgroundColor: visualGuidelines.accentColor }} />
                    <span className="swatch-label">Accent</span>
                    <span className="swatch-value">{visualGuidelines.accentColor}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Typography */}
            {(visualGuidelines.headingFont || visualGuidelines.bodyFont) && (
              <div className="typography-section">
                <span className="info-label">Typography</span>
                <div className="font-info">
                  {visualGuidelines.headingFont && (
                    <div className="font-item">
                      <span className="font-label">Headings:</span>
                      <span className="font-value" style={{ fontFamily: visualGuidelines.headingFont }}>
                        {visualGuidelines.headingFont}
                      </span>
                    </div>
                  )}
                  {visualGuidelines.bodyFont && (
                    <div className="font-item">
                      <span className="font-label">Body:</span>
                      <span className="font-value" style={{ fontFamily: visualGuidelines.bodyFont }}>
                        {visualGuidelines.bodyFont}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Visual Style */}
            {visualGuidelines.visualStyle && visualGuidelines.visualStyle.length > 0 && (
              <div className="style-section">
                <span className="info-label">Visual Style</span>
                <div className="tag-list">
                  {visualGuidelines.visualStyle.map((style, i) => (
                    <span key={i} className="tag">{style}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Photography Style */}
            {visualGuidelines.photographyStyle && visualGuidelines.photographyStyle.length > 0 && (
              <div className="style-section">
                <span className="info-label">Photography Style</span>
                <div className="tag-list">
                  {visualGuidelines.photographyStyle.map((style, i) => (
                    <span key={i} className="tag">{style}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Voice & Tone Section */}
      {voiceTone && (
        <section className="info-section">
          <h3 className="section-title">Voice & Tone</h3>
          <div className="voice-tone">
            {voiceTone.brandVoice && (
              <div className="voice-item">
                <span className="info-label">Brand Voice</span>
                <span className="voice-value">{voiceTone.brandVoice}</span>
              </div>
            )}

            {voiceTone.toneCharacteristics && voiceTone.toneCharacteristics.length > 0 && (
              <div className="tone-section">
                <span className="info-label">Tone Characteristics</span>
                <div className="tag-list">
                  {voiceTone.toneCharacteristics.map((tone, i) => (
                    <span key={i} className="tag tag-tone">{tone}</span>
                  ))}
                </div>
              </div>
            )}

            {voiceTone.tagline && (
              <div className="tagline-section">
                <span className="info-label">Tagline</span>
                <blockquote className="tagline">&ldquo;{voiceTone.tagline}&rdquo;</blockquote>
              </div>
            )}

            {voiceTone.keyMessages && voiceTone.keyMessages.length > 0 && (
              <div className="messages-section">
                <span className="info-label">Key Messages</span>
                <ul className="message-list">
                  {voiceTone.keyMessages.map((msg, i) => (
                    <li key={i}>{msg}</li>
                  ))}
                </ul>
              </div>
            )}

            {voiceTone.wordsToAvoid && voiceTone.wordsToAvoid.length > 0 && (
              <div className="avoid-section">
                <span className="info-label">Words to Avoid</span>
                <div className="tag-list">
                  {voiceTone.wordsToAvoid.map((word, i) => (
                    <span key={i} className="tag tag-avoid">{word}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      <style>{`
        .overview-tab {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .info-section {
          background: var(--color-surface);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 16px;
          padding: 1.5rem;
          position: relative;
        }
        .info-section::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at top left, rgba(139, 92, 246, 0.03) 0%, transparent 50%);
          pointer-events: none;
          border-radius: 16px;
        }

        .section-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--color-text-primary);
          margin: 0 0 1rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          letter-spacing: -0.02em;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1rem;
        }

        .info-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .info-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .info-value {
          font-size: 0.9375rem;
          color: var(--color-text-primary);
        }

        .info-link {
          color: var(--color-plasma-violet);
          text-decoration: none;
          transition: color 0.2s ease;
        }
        .info-link:hover {
          color: var(--color-plasma-cyan);
          text-decoration: underline;
        }

        .social-profiles {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        .social-links {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }

        .social-link {
          display: inline-flex;
          align-items: center;
          padding: 0.375rem 0.75rem;
          background: rgba(139, 92, 246, 0.1);
          color: var(--color-plasma-violet);
          border: 1px solid rgba(139, 92, 246, 0.2);
          border-radius: 8px;
          font-size: 0.875rem;
          text-decoration: none;
          transition: all 0.2s ease;
        }
        .social-link:hover {
          background: rgba(139, 92, 246, 0.2);
          border-color: rgba(139, 92, 246, 0.4);
          transform: translateY(-1px);
        }

        /* Logo Variants */
        .logo-variants-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .logo-variant {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 10px;
          transition: all 0.2s ease;
        }
        .logo-variant:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(255, 255, 255, 0.1);
        }

        .logo-variant-dark {
          background: rgba(0, 0, 0, 0.3);
        }
        .logo-variant-dark span {
          color: var(--color-text-primary);
        }

        .logo-variant img {
          width: 80px;
          height: 80px;
          object-fit: contain;
        }

        .logo-variant span {
          font-size: 0.75rem;
          color: var(--color-text-muted);
        }

        /* Visual Guidelines */
        .visual-guidelines {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .colors-section,
        .typography-section,
        .style-section {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .color-swatches {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        .color-swatch {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
        }

        .swatch {
          width: 48px;
          height: 48px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .swatch-label {
          font-size: 0.6875rem;
          color: var(--color-text-secondary);
        }

        .swatch-value {
          font-size: 0.6875rem;
          color: var(--color-text-muted);
          font-family: monospace;
        }

        .font-info {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .font-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .font-label {
          font-size: 0.875rem;
          color: var(--color-text-secondary);
        }

        .font-value {
          font-size: 1rem;
          color: var(--color-text-primary);
        }

        .tag-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .tag {
          display: inline-flex;
          padding: 0.375rem 0.75rem;
          background: rgba(139, 92, 246, 0.15);
          color: var(--color-plasma-violet);
          border: 1px solid rgba(139, 92, 246, 0.2);
          border-radius: 9999px;
          font-size: 0.8125rem;
          font-weight: 500;
        }

        .tag-tone {
          background: rgba(245, 158, 11, 0.15);
          color: var(--color-plasma-amber);
          border-color: rgba(245, 158, 11, 0.25);
        }

        .tag-avoid {
          background: rgba(244, 63, 94, 0.15);
          color: var(--color-plasma-rose);
          border-color: rgba(244, 63, 94, 0.25);
        }

        /* Voice & Tone */
        .voice-tone {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .voice-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .voice-value {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--color-text-primary);
        }

        .tone-section,
        .tagline-section,
        .messages-section,
        .avoid-section {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .tagline {
          font-size: 1.125rem;
          font-style: italic;
          color: var(--color-text-secondary);
          margin: 0;
          padding-left: 1rem;
          border-left: 3px solid var(--color-plasma-violet);
        }

        .message-list {
          margin: 0;
          padding-left: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .message-list li {
          font-size: 0.9375rem;
          color: var(--color-text-secondary);
        }

        @media (max-width: 640px) {
          .info-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

export default function BrandDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const brandId = params.id as string;

  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  // Parse tab from URL query param
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam && tabs.some((t) => t.id === tabParam)) {
      setActiveTab(tabParam as TabId);
    }
  }, [searchParams]);

  // Fetch brand data
  const fetchBrand = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getBrand(brandId);

      if (!result) {
        setError("Failed to load brand. Please refresh the page.");
        setLoading(false);
        return;
      }

      if (result.success) {
        setBrand(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error("Error fetching brand:", err);
      setError("Failed to load brand. Please refresh the page.");
    }

    setLoading(false);
  }, [brandId]);

  useEffect(() => {
    fetchBrand();
  }, [fetchBrand]);

  // Handle tab change
  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    // Update URL without full navigation using Next.js router
    router.replace(`/brands/${brandId}?tab=${tabId}`, { scroll: false });
  };

  // Handle delete
  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const result = await deleteBrand(brandId);

      if (!result) {
        setError("Failed to delete brand. Please refresh the page and try again.");
        setShowDeleteModal(false);
        setIsDeleting(false);
        return;
      }

      if (result.success) {
        router.push("/brands");
      } else {
        setError(result.error);
        setShowDeleteModal(false);
      }
    } catch (err) {
      console.error("Error deleting brand:", err);
      setError("Failed to delete brand. Please refresh the page and try again.");
      setShowDeleteModal(false);
    }

    setIsDeleting(false);
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
            border: 3px solid rgba(139, 92, 246, 0.15);
            border-top-color: var(--color-plasma-violet);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            filter: drop-shadow(0 0 10px rgba(139, 92, 246, 0.4));
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .loading-container p {
            color: var(--color-text-secondary);
            margin: 0;
          }
        `}</style>
      </div>
    );
  }

  // Error state
  if (error || !brand) {
    return (
      <div className="error-container">
        <div className="error-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
            background: var(--color-surface);
            border: 1px solid rgba(244, 63, 94, 0.2);
            border-radius: 16px;
          }
          .error-icon {
            color: var(--color-plasma-rose);
            margin-bottom: 1rem;
            filter: drop-shadow(0 0 12px rgba(244, 63, 94, 0.4));
          }
          .error-container h2 {
            font-size: 1.25rem;
            font-weight: 700;
            color: var(--color-text-primary);
            margin: 0 0 0.5rem;
            letter-spacing: -0.02em;
          }
          .error-container p {
            color: var(--color-text-secondary);
            margin: 0 0 1.5rem;
          }
          .back-link {
            display: inline-flex;
            align-items: center;
            padding: 0.75rem 1.25rem;
            background: linear-gradient(135deg, var(--color-plasma-violet), var(--color-plasma-purple));
            color: white;
            border-radius: 10px;
            text-decoration: none;
            font-weight: 600;
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            box-shadow: 0 0 20px rgba(139, 92, 246, 0.25);
          }
          .back-link:hover {
            transform: translateY(-2px);
            box-shadow: 0 0 30px rgba(139, 92, 246, 0.35);
          }
        `}</style>
      </div>
    );
  }

  const visualGuidelines = brand.visual_guidelines as VisualGuidelines | null;
  const primaryColor = visualGuidelines?.primaryColor || "#6366f1";

  return (
    <div className="brand-detail-page">
      {/* Header */}
      <header className="brand-header">
        <div className="brand-header-content">
          <div className="brand-logo-container">
            <BrandLogo
              logoUrl={brand.logo_url}
              brandName={brand.name}
              primaryColor={primaryColor}
              size="lg"
            />
          </div>
          <div className="brand-info">
            <h1 className="brand-name">{brand.name}</h1>
            <p className="brand-industry">
              {brand.industry || "No industry set"}
              {brand.sub_industry && ` · ${brand.sub_industry}`}
            </p>
            {brand.business_type && (
              <span className="brand-type-badge">{brand.business_type}</span>
            )}
          </div>
        </div>
        <div className="brand-actions">
          <Link href={`/brands/${brandId}/edit`} className="btn-edit">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit
          </Link>
          <button className="btn-delete" onClick={() => setShowDeleteModal(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
            Delete
          </button>
        </div>
      </header>

      {/* Tabs */}
      <nav className="tabs-nav">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => handleTabChange(tab.id)}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === "overview" && <OverviewTab brand={brand} />}
        {activeTab === "products" && <ProductsList brandId={brandId} />}
        {activeTab === "intelligence" && <IntelligenceTab brandId={brandId} brandName={brand.name} />}
        {activeTab === "personas" && <PersonasList brandId={brandId} />}
        {activeTab === "audiences" && <AudiencesList brandId={brandId} />}
        {activeTab === "creatives" && <CreativesGallery brandId={brandId} />}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <DeleteConfirmModal
          brandName={brand.name}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
          isDeleting={isDeleting}
        />
      )}

      <style>{`
        .brand-detail-page {
          max-width: 1200px;
          margin: 0 auto;
        }

        /* Header */
        .brand-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }

        .brand-header-content {
          display: flex;
          align-items: center;
          gap: 1.25rem;
        }

        .brand-logo-container {
          width: 80px;
          height: 80px;
          flex-shrink: 0;
        }

        .brand-logo {
          width: 100%;
          height: 100%;
          object-fit: contain;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .brand-logo-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
        }

        .brand-logo-placeholder span {
          font-size: 2rem;
          font-weight: 700;
          color: white;
        }

        .brand-info {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }

        .brand-name {
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--color-text-primary);
          margin: 0;
          letter-spacing: -0.02em;
        }

        .brand-industry {
          font-size: 0.9375rem;
          color: var(--color-text-secondary);
          margin: 0;
        }

        .brand-type-badge {
          display: inline-block;
          padding: 0.25rem 0.625rem;
          background: rgba(139, 92, 246, 0.15);
          color: var(--color-plasma-violet);
          border: 1px solid rgba(139, 92, 246, 0.2);
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
          width: fit-content;
        }

        .brand-actions {
          display: flex;
          gap: 0.75rem;
        }

        .btn-edit,
        .btn-delete {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1rem;
          border-radius: 10px;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          text-decoration: none;
        }

        .btn-edit {
          background: linear-gradient(135deg, var(--color-plasma-violet), var(--color-plasma-purple));
          color: white;
          border: none;
          box-shadow: 0 0 15px rgba(139, 92, 246, 0.25);
        }
        .btn-edit:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 25px rgba(139, 92, 246, 0.35);
        }

        .btn-delete {
          background: transparent;
          color: var(--color-plasma-rose);
          border: 1px solid rgba(244, 63, 94, 0.3);
        }
        .btn-delete:hover {
          background: rgba(244, 63, 94, 0.1);
          border-color: rgba(244, 63, 94, 0.5);
        }

        /* Tabs */
        .tabs-nav {
          display: flex;
          gap: 0.25rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          margin-bottom: 1.5rem;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .tab-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.875rem 1.25rem;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          color: var(--color-text-muted);
          font-size: 0.9375rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .tab-button:hover {
          color: var(--color-text-secondary);
        }

        .tab-button.active {
          color: var(--color-plasma-violet);
          border-bottom-color: var(--color-plasma-violet);
        }

        .tab-button svg {
          flex-shrink: 0;
        }

        /* Tab Content */
        .tab-content {
          min-height: 400px;
        }

        @media (max-width: 768px) {
          .brand-header {
            flex-direction: column;
            align-items: stretch;
          }

          .brand-actions {
            justify-content: flex-end;
          }

          .tabs-nav {
            margin-left: -1rem;
            margin-right: -1rem;
            padding-left: 1rem;
            padding-right: 1rem;
          }
        }

        @media (max-width: 480px) {
          .brand-header-content {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }

          .brand-actions {
            width: 100%;
          }

          .btn-edit,
          .btn-delete {
            flex: 1;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
