/**
 * Audience Detail Page
 *
 * Displays audience targeting by platform with:
 * - Tabbed view for each platform (Meta, Google, LinkedIn, TikTok, Pinterest, Snapchat)
 * - Platform-specific targeting parameters
 * - Export button with format selector (JSON, CSV)
 * - Download functionality with export_count tracking
 */

"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getPersona } from "@/app/actions/personas";
import type { Persona, Audience } from "@/lib/supabase/database.types";
import type {
  MetaTargeting,
  GoogleTargeting,
  LinkedInTargeting,
  TikTokTargeting,
  PinterestTargeting,
  SnapchatTargeting,
  SizeEstimates,
} from "@/lib/services/audience-translator";

// Supported platforms
const PLATFORMS = [
  { id: "meta", name: "Meta", color: "#1877F2", icon: MetaIcon },
  { id: "google", name: "Google", color: "#4285F4", icon: GoogleIcon },
  { id: "linkedin", name: "LinkedIn", color: "#0A66C2", icon: LinkedInIcon },
  { id: "tiktok", name: "TikTok", color: "#000000", icon: TikTokIcon },
  { id: "pinterest", name: "Pinterest", color: "#E60023", icon: PinterestIcon },
  { id: "snapchat", name: "Snapchat", color: "#FFFC00", icon: SnapchatIcon },
] as const;

type PlatformId = (typeof PLATFORMS)[number]["id"];

// Platform Icons
function MetaIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  );
}

function PinterestIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
    </svg>
  );
}

function SnapchatIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <path d="M12.166 0c3.267.008 5.655 2.148 6.484 4.713.314.963.374 2.008.359 3.021-.01.727-.045 1.453-.081 2.18.168.074.352.127.535.179.323.092.665.189.987.39.396.248.616.607.616 1.01-.002.338-.139.648-.414.843-.244.173-.542.253-.832.318-.228.05-.464.084-.693.116-.234.033-.476.068-.656.174a.58.58 0 00-.193.205c-.18.33-.268.708-.505 1.01-.226.286-.551.447-.864.606a9.893 9.893 0 01-.952.448c-.293.121-.59.238-.867.39-.18.1-.353.215-.505.353-.269.245-.444.574-.575.916-.103.271-.172.554-.255.831-.051.17-.103.34-.162.508a1.04 1.04 0 01-.151.293c-.087.113-.17.149-.312.186-.262.071-.553.095-.832.095-.196 0-.391-.009-.584-.032a5.028 5.028 0 01-.635-.12c-.181-.043-.363-.09-.548-.119a3.652 3.652 0 00-.552-.043c-.178.004-.354.023-.526.054-.243.044-.481.108-.721.165-.3.073-.604.15-.912.164a2.06 2.06 0 01-.21-.007c-.242-.024-.437-.154-.557-.346a1.193 1.193 0 01-.147-.347c-.08-.274-.138-.553-.221-.826-.085-.279-.194-.548-.346-.795a1.5 1.5 0 00-.513-.502 4.007 4.007 0 00-.86-.395 10.07 10.07 0 01-.964-.453c-.315-.16-.641-.323-.867-.608-.236-.3-.324-.678-.504-1.009a.58.58 0 00-.193-.206c-.18-.106-.422-.14-.656-.173a7.85 7.85 0 01-.693-.116c-.29-.065-.588-.145-.832-.318-.275-.195-.412-.505-.414-.843 0-.403.22-.762.617-1.01.321-.201.663-.298.986-.39.183-.052.367-.105.536-.179-.037-.727-.072-1.453-.082-2.18-.014-1.013.046-2.058.36-3.02C6.347 2.148 8.735.008 12.002 0h.164z" />
    </svg>
  );
}

// Parse audience data types
interface ParsedAudience {
  id: string;
  name: string;
  persona_id: string;
  brand_id: string;
  meta_targeting: MetaTargeting | null;
  google_targeting: GoogleTargeting | null;
  linkedin_targeting: LinkedInTargeting | null;
  tiktok_targeting: TikTokTargeting | null;
  pinterest_targeting: PinterestTargeting | null;
  snapchat_targeting: SnapchatTargeting | null;
  size_estimates: SizeEstimates | null;
  last_exported_at: string | null;
  export_count: number;
  created_at: string;
  updated_at: string;
}

// Helper to format numbers
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toLocaleString();
}

// Targeting display components
function TargetingSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="targeting-section">
      <h4 className="section-title">{title}</h4>
      <div className="section-content">{children}</div>
      <style>{`
        .targeting-section {
          margin-bottom: 1.5rem;
        }
        .targeting-section:last-child {
          margin-bottom: 0;
        }
        .section-title {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #6b7280;
          margin: 0 0 0.75rem;
        }
        .section-content {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
      `}</style>
    </div>
  );
}

function TargetingRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="targeting-row">
      <span className="row-label">{label}</span>
      <span className="row-value">{value}</span>
      <style>{`
        .targeting-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 0.5rem 0;
          border-bottom: 1px solid #f3f4f6;
        }
        .targeting-row:last-child {
          border-bottom: none;
        }
        .row-label {
          font-size: 0.875rem;
          color: #6b7280;
          flex-shrink: 0;
          margin-right: 1rem;
        }
        .row-value {
          font-size: 0.875rem;
          color: #111827;
          text-align: right;
          word-break: break-word;
        }
      `}</style>
    </div>
  );
}

function TagList({ items }: { items: Array<{ id?: string; name: string }> | string[] }) {
  if (!items || items.length === 0) return <span className="empty">None</span>;
  return (
    <div className="tag-list">
      {items.map((item, index) => (
        <span key={index} className="tag">
          {typeof item === "string" ? item : item.name}
        </span>
      ))}
      <style>{`
        .tag-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.375rem;
          justify-content: flex-end;
        }
        .tag {
          display: inline-flex;
          padding: 0.25rem 0.5rem;
          background: #f3f4f6;
          color: #374151;
          border-radius: 4px;
          font-size: 0.8125rem;
        }
        .empty {
          color: #9ca3af;
          font-style: italic;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
}

// Platform-specific targeting displays
function MetaTargetingDisplay({ targeting }: { targeting: MetaTargeting }) {
  return (
    <div className="platform-targeting">
      <TargetingSection title="Demographics">
        <TargetingRow label="Age Range" value={`${targeting.age_min} - ${targeting.age_max}`} />
        <TargetingRow
          label="Genders"
          value={targeting.genders.map((g) => (g === 1 ? "Male" : "Female")).join(", ")}
        />
        {targeting.education_statuses && targeting.education_statuses.length > 0 && (
          <TargetingRow label="Education" value={targeting.education_statuses.join(", ")} />
        )}
        {targeting.relationship_statuses && targeting.relationship_statuses.length > 0 && (
          <TargetingRow label="Relationship" value={targeting.relationship_statuses.join(", ")} />
        )}
      </TargetingSection>

      <TargetingSection title="Location">
        <TargetingRow
          label="Countries"
          value={targeting.geo_locations.countries?.join(", ")}
        />
        {targeting.geo_locations.cities && targeting.geo_locations.cities.length > 0 && (
          <TargetingRow
            label="Cities"
            value={targeting.geo_locations.cities.map((c) => c.name).join(", ")}
          />
        )}
      </TargetingSection>

      {targeting.interests && targeting.interests.length > 0 && (
        <TargetingSection title="Interests">
          <TagList items={targeting.interests} />
        </TargetingSection>
      )}

      {targeting.industries && targeting.industries.length > 0 && (
        <TargetingSection title="Industries">
          <TagList items={targeting.industries} />
        </TargetingSection>
      )}

      {targeting.work_positions && targeting.work_positions.length > 0 && (
        <TargetingSection title="Job Positions">
          <TagList items={targeting.work_positions} />
        </TargetingSection>
      )}

      {targeting.behaviors && targeting.behaviors.length > 0 && (
        <TargetingSection title="Behaviors">
          <TagList items={targeting.behaviors} />
        </TargetingSection>
      )}

      {targeting.income && targeting.income.length > 0 && (
        <TargetingSection title="Income Targeting">
          <TagList items={targeting.income} />
        </TargetingSection>
      )}
    </div>
  );
}

function GoogleTargetingDisplay({ targeting }: { targeting: GoogleTargeting }) {
  return (
    <div className="platform-targeting">
      <TargetingSection title="Demographics">
        <TargetingRow label="Age Ranges" value={targeting.demographics.age_ranges.join(", ")} />
        <TargetingRow label="Genders" value={targeting.demographics.genders.join(", ")} />
        <TargetingRow
          label="Household Income"
          value={targeting.demographics.household_incomes.join(", ")}
        />
        <TargetingRow
          label="Parental Status"
          value={targeting.demographics.parental_status.join(", ")}
        />
      </TargetingSection>

      <TargetingSection title="Location">
        <TargetingRow
          label="Countries"
          value={targeting.geo_targeting.countries?.join(", ")}
        />
        {targeting.geo_targeting.regions && (
          <TargetingRow
            label="Regions"
            value={targeting.geo_targeting.regions.join(", ")}
          />
        )}
        {targeting.geo_targeting.cities && (
          <TargetingRow
            label="Cities"
            value={targeting.geo_targeting.cities.join(", ")}
          />
        )}
      </TargetingSection>

      {targeting.affinity_audiences.length > 0 && (
        <TargetingSection title="Affinity Audiences">
          <TagList items={targeting.affinity_audiences} />
        </TargetingSection>
      )}

      {targeting.in_market_audiences.length > 0 && (
        <TargetingSection title="In-Market Audiences">
          <TagList items={targeting.in_market_audiences} />
        </TargetingSection>
      )}

      {targeting.custom_intent_audiences && targeting.custom_intent_audiences.length > 0 && (
        <TargetingSection title="Custom Intent Keywords">
          <TagList items={targeting.custom_intent_audiences[0]?.keywords || []} />
        </TargetingSection>
      )}

      {targeting.detailed_demographics && (
        <TargetingSection title="Detailed Demographics">
          {targeting.detailed_demographics.education && (
            <TargetingRow
              label="Education"
              value={targeting.detailed_demographics.education.join(", ")}
            />
          )}
          {targeting.detailed_demographics.marital_status && (
            <TargetingRow
              label="Marital Status"
              value={targeting.detailed_demographics.marital_status.join(", ")}
            />
          )}
          {targeting.detailed_demographics.employment && (
            <TargetingRow
              label="Employment"
              value={targeting.detailed_demographics.employment.join(", ")}
            />
          )}
        </TargetingSection>
      )}

      {targeting.life_events && targeting.life_events.length > 0 && (
        <TargetingSection title="Life Events">
          <TagList items={targeting.life_events} />
        </TargetingSection>
      )}
    </div>
  );
}

function LinkedInTargetingDisplay({ targeting }: { targeting: LinkedInTargeting }) {
  return (
    <div className="platform-targeting">
      <TargetingSection title="Location">
        <TargetingRow
          label="Countries"
          value={targeting.locations.countries?.join(", ")}
        />
        {targeting.locations.regions && (
          <TargetingRow
            label="Regions"
            value={targeting.locations.regions.join(", ")}
          />
        )}
      </TargetingSection>

      <TargetingSection title="Demographics">
        {targeting.age_ranges && (
          <TargetingRow label="Age Ranges" value={targeting.age_ranges.join(", ")} />
        )}
        {targeting.genders && (
          <TargetingRow label="Genders" value={targeting.genders.join(", ")} />
        )}
      </TargetingSection>

      {targeting.company_size && targeting.company_size.length > 0 && (
        <TargetingSection title="Company Size">
          <TagList items={targeting.company_size} />
        </TargetingSection>
      )}

      {targeting.industries && targeting.industries.length > 0 && (
        <TargetingSection title="Industries">
          <TagList items={targeting.industries} />
        </TargetingSection>
      )}

      {targeting.job_titles && targeting.job_titles.length > 0 && (
        <TargetingSection title="Job Titles">
          <TagList items={targeting.job_titles} />
        </TargetingSection>
      )}

      {targeting.seniorities && targeting.seniorities.length > 0 && (
        <TargetingSection title="Seniority Levels">
          <TagList items={targeting.seniorities} />
        </TargetingSection>
      )}

      {targeting.years_of_experience && targeting.years_of_experience.length > 0 && (
        <TargetingSection title="Years of Experience">
          <TagList items={targeting.years_of_experience} />
        </TargetingSection>
      )}

      {targeting.degrees && targeting.degrees.length > 0 && (
        <TargetingSection title="Degrees">
          <TagList items={targeting.degrees} />
        </TargetingSection>
      )}

      {targeting.skills && targeting.skills.length > 0 && (
        <TargetingSection title="Skills">
          <TagList items={targeting.skills} />
        </TargetingSection>
      )}

      {targeting.interests && targeting.interests.length > 0 && (
        <TargetingSection title="Interests">
          <TagList items={targeting.interests} />
        </TargetingSection>
      )}
    </div>
  );
}

function TikTokTargetingDisplay({ targeting }: { targeting: TikTokTargeting }) {
  return (
    <div className="platform-targeting">
      <TargetingSection title="Demographics">
        <TargetingRow label="Gender" value={targeting.gender} />
        <TargetingRow label="Age Groups" value={targeting.age_groups.join(", ")} />
        <TargetingRow label="Languages" value={targeting.languages.join(", ")} />
        {targeting.household_income && (
          <TargetingRow label="Household Income" value={targeting.household_income.join(", ")} />
        )}
        {targeting.spending_power && (
          <TargetingRow label="Spending Power" value={targeting.spending_power} />
        )}
      </TargetingSection>

      <TargetingSection title="Location">
        <TargetingRow label="Locations" value={targeting.location_ids.join(", ")} />
      </TargetingSection>

      {targeting.interests && targeting.interests.length > 0 && (
        <TargetingSection title="Interests">
          <TagList items={targeting.interests} />
        </TargetingSection>
      )}

      {targeting.behaviors && targeting.behaviors.length > 0 && (
        <TargetingSection title="Behaviors">
          <TagList items={targeting.behaviors} />
        </TargetingSection>
      )}

      {targeting.hashtag_interactions && targeting.hashtag_interactions.length > 0 && (
        <TargetingSection title="Hashtag Interactions">
          <TagList items={targeting.hashtag_interactions} />
        </TargetingSection>
      )}

      {targeting.operating_systems && targeting.operating_systems.length > 0 && (
        <TargetingSection title="Operating Systems">
          <TagList items={targeting.operating_systems} />
        </TargetingSection>
      )}
    </div>
  );
}

function PinterestTargetingDisplay({ targeting }: { targeting: PinterestTargeting }) {
  return (
    <div className="platform-targeting">
      <TargetingSection title="Demographics">
        {targeting.age_bucket && (
          <TargetingRow label="Age Buckets" value={targeting.age_bucket.join(", ")} />
        )}
        {targeting.genders && (
          <TargetingRow label="Genders" value={targeting.genders.join(", ")} />
        )}
        {targeting.locales && (
          <TargetingRow label="Locales" value={targeting.locales.join(", ")} />
        )}
      </TargetingSection>

      <TargetingSection title="Location">
        <TargetingRow
          label="Countries"
          value={targeting.geo_targeting.countries?.join(", ")}
        />
        {targeting.geo_targeting.regions && (
          <TargetingRow
            label="Regions"
            value={targeting.geo_targeting.regions.join(", ")}
          />
        )}
      </TargetingSection>

      {targeting.interests && targeting.interests.length > 0 && (
        <TargetingSection title="Interests">
          <TagList items={targeting.interests} />
        </TargetingSection>
      )}

      {targeting.keywords && targeting.keywords.length > 0 && (
        <TargetingSection title="Keywords">
          <TagList items={targeting.keywords} />
        </TargetingSection>
      )}

      {targeting.expanded_targeting !== undefined && (
        <TargetingSection title="Settings">
          <TargetingRow
            label="Expanded Targeting"
            value={targeting.expanded_targeting ? "Enabled" : "Disabled"}
          />
        </TargetingSection>
      )}
    </div>
  );
}

function SnapchatTargetingDisplay({ targeting }: { targeting: SnapchatTargeting }) {
  return (
    <div className="platform-targeting">
      <TargetingSection title="Demographics">
        {targeting.demographics.gender && (
          <TargetingRow label="Gender" value={targeting.demographics.gender} />
        )}
        {targeting.demographics.age_groups && (
          <TargetingRow label="Age Groups" value={targeting.demographics.age_groups.join(", ")} />
        )}
        {targeting.demographics.languages && (
          <TargetingRow label="Languages" value={targeting.demographics.languages.join(", ")} />
        )}
      </TargetingSection>

      {targeting.demographics.advanced_demographics && (
        <TargetingSection title="Advanced Demographics">
          {targeting.demographics.advanced_demographics.income &&
            targeting.demographics.advanced_demographics.income.length > 0 && (
              <TargetingRow
                label="Income"
                value={targeting.demographics.advanced_demographics.income.join(", ")}
              />
            )}
          {targeting.demographics.advanced_demographics.education &&
            targeting.demographics.advanced_demographics.education.length > 0 && (
              <TargetingRow
                label="Education"
                value={targeting.demographics.advanced_demographics.education.join(", ")}
              />
            )}
          {targeting.demographics.advanced_demographics.parental_status &&
            targeting.demographics.advanced_demographics.parental_status.length > 0 && (
              <TargetingRow
                label="Parental Status"
                value={targeting.demographics.advanced_demographics.parental_status.join(", ")}
              />
            )}
        </TargetingSection>
      )}

      <TargetingSection title="Location">
        {targeting.geos.map((geo, index) => (
          <TargetingRow
            key={index}
            label={`Location ${index + 1}`}
            value={[geo.country_code, geo.region_id].filter(Boolean).join(", ")}
          />
        ))}
      </TargetingSection>

      {targeting.interests && targeting.interests.length > 0 && (
        <TargetingSection title="Interests">
          <TagList items={targeting.interests} />
        </TargetingSection>
      )}

      {targeting.behaviors && targeting.behaviors.length > 0 && (
        <TargetingSection title="Behaviors">
          <TagList items={targeting.behaviors} />
        </TargetingSection>
      )}

      {targeting.devices?.os_types && targeting.devices.os_types.length > 0 && (
        <TargetingSection title="Devices">
          <TargetingRow label="OS Types" value={targeting.devices.os_types.join(", ")} />
        </TargetingSection>
      )}
    </div>
  );
}

// Export modal component
function ExportModal({
  platform,
  onExport,
  onClose,
  isExporting,
}: {
  platform: PlatformId;
  onExport: (format: "json" | "csv") => void;
  onClose: () => void;
  isExporting: boolean;
}) {
  const platformName = PLATFORMS.find((p) => p.id === platform)?.name || platform;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Export {platformName} Targeting</h3>
        <p className="modal-description">
          Choose the export format for your audience targeting data.
        </p>

        <div className="export-options">
          <button
            className="export-option"
            onClick={() => onExport("json")}
            disabled={isExporting}
          >
            <div className="option-icon">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14,2 14,8 20,8" />
                <path d="M8 13h2" />
                <path d="M8 17h2" />
                <path d="M14 13h2" />
                <path d="M14 17h2" />
              </svg>
            </div>
            <div className="option-details">
              <span className="option-name">JSON Format</span>
              <span className="option-desc">
                Structured data for API integration
              </span>
            </div>
          </button>

          <button
            className="export-option"
            onClick={() => onExport("csv")}
            disabled={isExporting}
          >
            <div className="option-icon">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14,2 14,8 20,8" />
                <line x1="8" y1="13" x2="16" y2="13" />
                <line x1="8" y1="17" x2="16" y2="17" />
              </svg>
            </div>
            <div className="option-details">
              <span className="option-name">CSV Format</span>
              <span className="option-desc">
                Spreadsheet-compatible data export
              </span>
            </div>
          </button>
        </div>

        <button className="cancel-btn" onClick={onClose} disabled={isExporting}>
          Cancel
        </button>

        <style>{`
          .modal-overlay {
            position: fixed;
            inset: 0;
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
            padding: 1.5rem;
            max-width: 400px;
            width: 100%;
          }
          .modal-title {
            font-size: 1.125rem;
            font-weight: 600;
            color: #111827;
            margin: 0 0 0.5rem;
          }
          .modal-description {
            font-size: 0.875rem;
            color: #6b7280;
            margin: 0 0 1.5rem;
          }
          .export-options {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            margin-bottom: 1rem;
          }
          .export-option {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 1rem;
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.15s;
            text-align: left;
          }
          .export-option:hover:not(:disabled) {
            background: #f3f4f6;
            border-color: #d1d5db;
          }
          .export-option:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
          .option-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 40px;
            height: 40px;
            background: white;
            border-radius: 8px;
            color: #6366f1;
          }
          .option-details {
            display: flex;
            flex-direction: column;
          }
          .option-name {
            font-size: 0.9375rem;
            font-weight: 500;
            color: #111827;
          }
          .option-desc {
            font-size: 0.8125rem;
            color: #6b7280;
          }
          .cancel-btn {
            width: 100%;
            padding: 0.625rem 1rem;
            background: white;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            font-size: 0.9375rem;
            font-weight: 500;
            color: #374151;
            cursor: pointer;
            transition: background 0.15s;
          }
          .cancel-btn:hover:not(:disabled) {
            background: #f3f4f6;
          }
          .cancel-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
        `}</style>
      </div>
    </div>
  );
}

// Main page component
export default function AudienceDetailPage({
  params,
}: {
  params: Promise<{ id: string; personaId: string }>;
}) {
  const { id: brandId, personaId } = use(params);
  const router = useRouter();

  const [persona, setPersona] = useState<Persona | null>(null);
  const [audience, setAudience] = useState<ParsedAudience | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePlatform, setActivePlatform] = useState<PlatformId>("meta");
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);

  // Fetch audience data
  const fetchAudience = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Get persona first
      const personaResult = await getPersona(personaId);
      if (!personaResult.success) {
        setError(personaResult.error);
        setLoading(false);
        return;
      }
      setPersona(personaResult.data);

      // Try to get existing audience
      const response = await fetch(`/api/generate/audience?persona_id=${personaId}`);
      const data = await response.json();

      if (response.ok && data.audiences && data.audiences.length > 0) {
        const audienceData = data.audiences[0] as Audience;
        setAudience({
          id: audienceData.id,
          name: audienceData.name,
          persona_id: audienceData.persona_id,
          brand_id: audienceData.brand_id,
          meta_targeting: audienceData.meta_targeting as unknown as MetaTargeting,
          google_targeting: audienceData.google_targeting as unknown as GoogleTargeting,
          linkedin_targeting: audienceData.linkedin_targeting as unknown as LinkedInTargeting,
          tiktok_targeting: audienceData.tiktok_targeting as unknown as TikTokTargeting,
          pinterest_targeting: audienceData.pinterest_targeting as unknown as PinterestTargeting,
          snapchat_targeting: audienceData.snapchat_targeting as unknown as SnapchatTargeting,
          size_estimates: audienceData.size_estimates as unknown as SizeEstimates,
          last_exported_at: audienceData.last_exported_at,
          export_count: audienceData.export_count,
          created_at: audienceData.created_at,
          updated_at: audienceData.updated_at,
        });
      }
    } catch (err) {
      console.error("Error fetching audience:", err);
      setError("Failed to load audience data");
    }

    setLoading(false);
  }, [personaId]);

  useEffect(() => {
    fetchAudience();
  }, [fetchAudience]);

  // Build audience from persona
  const handleBuildAudience = async () => {
    setIsBuilding(true);
    setError(null);

    try {
      const response = await fetch("/api/generate/audience", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ persona_id: personaId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to build audience");
        setIsBuilding(false);
        return;
      }

      // Refresh to show the new audience
      await fetchAudience();
    } catch (err) {
      console.error("Error building audience:", err);
      setError("Failed to build audience");
    }

    setIsBuilding(false);
  };

  // Export targeting data
  const handleExport = async (format: "json" | "csv") => {
    if (!audience) return;

    setIsExporting(true);

    try {
      // Get the targeting data for the selected platform
      const targetingData = audience[`${activePlatform}_targeting` as keyof ParsedAudience];

      let content: string;
      let mimeType: string;
      let extension: string;

      if (format === "json") {
        content = JSON.stringify(targetingData, null, 2);
        mimeType = "application/json";
        extension = "json";
      } else {
        // Convert to CSV
        const rows: string[][] = [["Parameter", "Value"]];

        const flattenObject = (obj: Record<string, unknown>, prefix = "") => {
          for (const [key, value] of Object.entries(obj)) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            if (Array.isArray(value)) {
              if (value.length > 0 && typeof value[0] === "object") {
                rows.push([
                  fullKey,
                  value.map((v) => (v as { name?: string }).name || JSON.stringify(v)).join("; "),
                ]);
              } else {
                rows.push([fullKey, value.join("; ")]);
              }
            } else if (typeof value === "object" && value !== null) {
              flattenObject(value as Record<string, unknown>, fullKey);
            } else {
              rows.push([fullKey, String(value)]);
            }
          }
        };

        flattenObject(targetingData as Record<string, unknown>);
        content = rows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
        mimeType = "text/csv";
        extension = "csv";
      }

      // Create download
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${audience.name.toLowerCase().replace(/\s+/g, "-")}-${activePlatform}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Update export count
      try {
        // We can make a PATCH request to update the export count
        // For now, we'll update it locally
        setAudience((prev) =>
          prev
            ? {
                ...prev,
                export_count: prev.export_count + 1,
                last_exported_at: new Date().toISOString(),
              }
            : null
        );
      } catch (err) {
        console.error("Error updating export count:", err);
      }

      setShowExportModal(false);
    } catch (err) {
      console.error("Error exporting:", err);
      setError("Failed to export targeting data");
    }

    setIsExporting(false);
  };

  // Get size estimate for current platform
  const getSizeEstimate = () => {
    if (!audience?.size_estimates) return null;
    const estimate = audience.size_estimates[activePlatform];
    if (!estimate) return null;
    return estimate;
  };

  // Render platform targeting
  const renderPlatformTargeting = () => {
    if (!audience) return null;

    switch (activePlatform) {
      case "meta":
        return audience.meta_targeting ? (
          <MetaTargetingDisplay targeting={audience.meta_targeting} />
        ) : null;
      case "google":
        return audience.google_targeting ? (
          <GoogleTargetingDisplay targeting={audience.google_targeting} />
        ) : null;
      case "linkedin":
        return audience.linkedin_targeting ? (
          <LinkedInTargetingDisplay targeting={audience.linkedin_targeting} />
        ) : null;
      case "tiktok":
        return audience.tiktok_targeting ? (
          <TikTokTargetingDisplay targeting={audience.tiktok_targeting} />
        ) : null;
      case "pinterest":
        return audience.pinterest_targeting ? (
          <PinterestTargetingDisplay targeting={audience.pinterest_targeting} />
        ) : null;
      case "snapchat":
        return audience.snapchat_targeting ? (
          <SnapchatTargetingDisplay targeting={audience.snapchat_targeting} />
        ) : null;
      default:
        return null;
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <p>Loading audience data...</p>
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
  if (error && !persona) {
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
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2>Unable to load audience</h2>
        <p>{error}</p>
        <Link href={`/brands/${brandId}/personas/${personaId}`} className="back-btn">
          Back to Persona
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
          .back-btn {
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
          .back-btn:hover {
            background: #4f46e5;
          }
        `}</style>
      </div>
    );
  }

  // No audience yet - show build option
  if (!audience && persona) {
    return (
      <div className="no-audience-page">
        <header className="page-header">
          <Link href={`/brands/${brandId}/personas/${personaId}`} className="back-link">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to Persona
          </Link>
          <h1 className="page-title">Build Audience</h1>
        </header>

        <div className="build-card">
          <div className="build-icon">
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <h2>No Audience Yet</h2>
          <p>
            Create platform-specific targeting from <strong>{persona.name}</strong>&apos;s
            persona data. This will translate demographics, interests, and behaviors into
            targeting parameters for Meta, Google, LinkedIn, TikTok, Pinterest, and Snapchat.
          </p>
          {error && <p className="error-message">{error}</p>}
          <button
            className="build-btn"
            onClick={handleBuildAudience}
            disabled={isBuilding}
          >
            {isBuilding ? (
              <>
                <span className="spinner" />
                Building Audience...
              </>
            ) : (
              <>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 5v14" />
                  <path d="M5 12h14" />
                </svg>
                Build Audience
              </>
            )}
          </button>
        </div>

        <style>{`
          .no-audience-page {
            max-width: 600px;
            margin: 0 auto;
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
            margin: 0;
          }
          .build-card {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 3rem 2rem;
            text-align: center;
          }
          .build-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100px;
            height: 100px;
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            border-radius: 24px;
            color: white;
            margin: 0 auto 1.5rem;
          }
          .build-card h2 {
            font-size: 1.5rem;
            font-weight: 600;
            color: #111827;
            margin: 0 0 1rem;
          }
          .build-card p {
            font-size: 1rem;
            color: #6b7280;
            line-height: 1.6;
            margin: 0 0 2rem;
          }
          .build-card p strong {
            color: #111827;
          }
          .error-message {
            color: #dc2626;
            background: #fef2f2;
            padding: 0.75rem 1rem;
            border-radius: 8px;
            margin-bottom: 1rem;
          }
          .build-btn {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.875rem 1.5rem;
            background: #10b981;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            font-weight: 500;
            cursor: pointer;
            transition: background 0.15s;
          }
          .build-btn:hover:not(:disabled) {
            background: #059669;
          }
          .build-btn:disabled {
            opacity: 0.7;
            cursor: not-allowed;
          }
          .spinner {
            width: 18px;
            height: 18px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const sizeEstimate = getSizeEstimate();
  const activePlatformData = PLATFORMS.find((p) => p.id === activePlatform);

  return (
    <div className="audience-page">
      {/* Header */}
      <header className="page-header">
        <Link href={`/brands/${brandId}/personas/${personaId}`} className="back-link">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Persona
        </Link>
        <div className="header-row">
          <div className="header-info">
            <h1 className="page-title">{audience?.name}</h1>
            <div className="export-stats">
              <span className="stat">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                {audience?.export_count || 0} exports
              </span>
              {audience?.last_exported_at && (
                <span className="stat">
                  Last exported:{" "}
                  {new Date(audience.last_exported_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
          <button
            className="export-btn"
            onClick={() => setShowExportModal(true)}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export
          </button>
        </div>
      </header>

      {/* Platform Tabs */}
      <div className="platform-tabs">
        {PLATFORMS.map((platform) => {
          const Icon = platform.icon;
          const isActive = activePlatform === platform.id;
          return (
            <button
              key={platform.id}
              className={`platform-tab ${isActive ? "active" : ""}`}
              onClick={() => setActivePlatform(platform.id)}
              style={
                isActive
                  ? { borderColor: platform.color, color: platform.color }
                  : undefined
              }
            >
              <Icon />
              <span>{platform.name}</span>
            </button>
          );
        })}
      </div>

      {/* Size Estimate */}
      {sizeEstimate && (
        <div
          className="size-estimate"
          style={{ borderLeftColor: activePlatformData?.color }}
        >
          <div className="estimate-label">Estimated Audience Size</div>
          <div className="estimate-value">
            {formatNumber(sizeEstimate.lower)} - {formatNumber(sizeEstimate.upper)}
          </div>
        </div>
      )}

      {/* Targeting Content */}
      <div className="targeting-content">{renderPlatformTargeting()}</div>

      {/* Export Modal */}
      {showExportModal && (
        <ExportModal
          platform={activePlatform}
          onExport={handleExport}
          onClose={() => setShowExportModal(false)}
          isExporting={isExporting}
        />
      )}

      {error && (
        <div className="toast-error">
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      <style>{`
        .audience-page {
          max-width: 900px;
          margin: 0 auto;
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
          gap: 1rem;
          flex-wrap: wrap;
        }
        .header-info {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .page-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: #111827;
          margin: 0;
        }
        .export-stats {
          display: flex;
          gap: 1rem;
        }
        .stat {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 0.8125rem;
          color: #6b7280;
        }
        .export-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1rem;
          background: #6366f1;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 0.9375rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s;
        }
        .export-btn:hover {
          background: #4f46e5;
        }

        /* Platform Tabs */
        .platform-tabs {
          display: flex;
          gap: 0.5rem;
          overflow-x: auto;
          padding-bottom: 0.5rem;
          margin-bottom: 1.5rem;
        }
        .platform-tab {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1rem;
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 0.9375rem;
          font-weight: 500;
          color: #6b7280;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.15s;
        }
        .platform-tab:hover:not(.active) {
          background: #f9fafb;
          border-color: #d1d5db;
        }
        .platform-tab.active {
          background: #f3f4f6;
          font-weight: 600;
        }

        /* Size Estimate */
        .size-estimate {
          background: white;
          border: 1px solid #e5e7eb;
          border-left-width: 4px;
          border-radius: 8px;
          padding: 1rem 1.25rem;
          margin-bottom: 1.5rem;
        }
        .estimate-label {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #6b7280;
          margin-bottom: 0.25rem;
        }
        .estimate-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #111827;
        }

        /* Targeting Content */
        .targeting-content {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 1.5rem;
        }

        /* Toast */
        .toast-error {
          position: fixed;
          bottom: 2rem;
          right: 2rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem 1.25rem;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          color: #dc2626;
          font-size: 0.875rem;
          z-index: 100;
        }
        .toast-error button {
          background: none;
          border: none;
          font-size: 1.25rem;
          color: #dc2626;
          cursor: pointer;
        }

        /* Responsive */
        @media (max-width: 640px) {
          .header-row {
            flex-direction: column;
            align-items: stretch;
          }
          .export-btn {
            width: 100%;
            justify-content: center;
          }
          .platform-tabs {
            margin: 0 -1rem 1.5rem;
            padding: 0 1rem 0.5rem;
          }
        }
      `}</style>
    </div>
  );
}
