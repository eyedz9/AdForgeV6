/**
 * Brands List Page
 *
 * Displays all brands for the authenticated user with stunning holographic design.
 */

import Link from "next/link";
import { getBrands } from "@/app/actions/brands";
import type { Brand } from "@/lib/supabase/database.types";
import { EmptyState } from "@/components/shared";
import { BrandLogo } from "@/components/brands";
import { Plus, ArrowRight, Sparkles, Globe, Palette, AlertTriangle } from "lucide-react";

// Brand card component with holographic effect
function BrandCard({ brand, index }: { brand: Brand; index: number }) {
  const visualGuidelines = brand.visual_guidelines as {
    primaryColor?: string;
  } | null;
  const primaryColor = visualGuidelines?.primaryColor || "#8b5cf6";

  return (
    <Link
      href={`/brands/${brand.id}`}
      className="group relative block animate-fade-up"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="holo-card p-6 h-full">
        {/* Gradient accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-1 rounded-t-xl opacity-60 group-hover:opacity-100 transition-opacity"
          style={{
            background: `linear-gradient(90deg, ${primaryColor}, transparent)`,
          }}
        />

        {/* Logo / Initial */}
        <div className="mb-5">
          <BrandLogo
            logoUrl={brand.logo_url}
            brandName={brand.name}
            primaryColor={primaryColor}
            size="md"
          />
        </div>

        {/* Brand info */}
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-plasma-purple)] transition-colors">
            {brand.name}
          </h3>
          <p className="text-sm text-[var(--color-text-muted)] flex items-center gap-2">
            <Globe className="w-3.5 h-3.5" />
            {brand.industry || "No industry set"}
            {brand.sub_industry && (
              <span className="text-[var(--color-text-ghost)]">
                / {brand.sub_industry}
              </span>
            )}
          </p>
        </div>

        {/* Flagged content warning */}
        {brand.moderation_status === "flagged" && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--color-plasma-amber)]/10 border border-[var(--color-plasma-amber)]/20">
            <AlertTriangle className="w-3.5 h-3.5 text-[var(--color-plasma-amber)] shrink-0" />
            <span className="text-xs text-[var(--color-plasma-amber)]">This brand has been flagged for review</span>
          </div>
        )}

        {/* Tags */}
        <div className="mt-4 flex flex-wrap gap-2">
          {brand.business_type && (
            <span className="badge badge-primary text-[10px]">
              {brand.business_type}
            </span>
          )}
          {brand.website && (
            <span className="badge badge-cyan text-[10px]">
              <Globe className="w-3 h-3" />
              Website
            </span>
          )}
        </div>

        {/* Hover arrow */}
        <div className="absolute bottom-6 right-6 opacity-0 transform translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
          <div className="p-2 rounded-lg bg-[var(--color-plasma-violet)]/20 text-[var(--color-plasma-violet)]">
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </Link>
  );
}

// Empty state with stunning design
function BrandsEmptyState() {
  return (
    <div className="relative">
      <div className="gradient-border">
        <div className="bg-[var(--color-surface)] rounded-[inherit] p-12 md:p-16 text-center relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-plasma-violet)]/5 to-transparent pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] orb orb-violet opacity-20" />

          {/* Icon */}
          <div className="relative inline-flex mb-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--color-plasma-violet)] to-[var(--color-plasma-fuchsia)] flex items-center justify-center shadow-[0_0_60px_rgba(139,92,246,0.4)]">
              <Palette className="w-10 h-10 text-white" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-[var(--color-plasma-amber)] flex items-center justify-center animate-pulse">
              <Sparkles className="w-4 h-4 text-[var(--color-void)]" />
            </div>
          </div>

          {/* Text */}
          <h2 className="relative text-2xl md:text-3xl font-bold mb-4 tracking-tight">
            Create your first brand
          </h2>
          <p className="relative text-[var(--color-text-secondary)] max-w-md mx-auto mb-8 leading-relaxed">
            Brands are the foundation of your advertising strategy. Create a brand
            to start generating personas and creative assets.
          </p>

          {/* CTA */}
          <Link
            href="/brands/new"
            className="relative inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[var(--color-plasma-violet)] to-[var(--color-plasma-purple)] rounded-full font-semibold text-lg transition-all duration-300 hover:shadow-[0_0_50px_rgba(139,92,246,0.5)] hover:scale-105 animate-pulse-glow"
          >
            <Plus className="w-5 h-5" />
            Create Your First Brand
          </Link>
        </div>
      </div>
    </div>
  );
}

// Error state component
function ErrorState({ error }: { error: string }) {
  return (
    <div className="holo-card p-8 text-center border-[var(--color-plasma-rose)]/30">
      <div className="w-16 h-16 rounded-full bg-[var(--color-plasma-rose)]/10 flex items-center justify-center mx-auto mb-4">
        <svg
          className="w-8 h-8 text-[var(--color-plasma-rose)]"
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
      <h2 className="text-lg font-bold text-[var(--color-plasma-rose)] mb-2">
        Unable to load brands
      </h2>
      <p className="text-sm text-[var(--color-text-muted)]">{error}</p>
    </div>
  );
}

export default async function BrandsPage() {
  const result = await getBrands();

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <header className="mb-10 animate-fade-up">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">
              <span className="text-gradient-static">Brands</span>
            </h1>
            <p className="text-[var(--color-text-secondary)] text-lg">
              Manage your brand identities and creative assets
            </p>
          </div>

          {result.success && result.data.length > 0 && (
            <Link
              href="/brands/new"
              className="group inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-[var(--color-plasma-violet)] to-[var(--color-plasma-purple)] rounded-xl font-semibold transition-all duration-300 hover:shadow-[0_0_30px_rgba(139,92,246,0.4)] hover:scale-105"
            >
              <Plus className="w-5 h-5 transition-transform group-hover:rotate-90 duration-300" />
              <span>New Brand</span>
            </Link>
          )}
        </div>
      </header>

      {/* Content */}
      {!result.success ? (
        <ErrorState error={result.error} />
      ) : result.data.length === 0 ? (
        <BrandsEmptyState />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {result.data.map((brand, index) => (
            <BrandCard key={brand.id} brand={brand} index={index} />
          ))}
        </div>
      )}
    </div>
  );
}
