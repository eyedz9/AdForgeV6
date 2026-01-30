"use client";

/**
 * Brand Logo Components
 *
 * BrandLogo: Displays a brand logo with fallback to initials when the image fails to load.
 * LogoVariantImage: Displays a logo variant image with error handling.
 */

import { useState } from "react";

interface BrandLogoProps {
  logoUrl: string | null;
  brandName: string;
  primaryColor?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-10 h-10 text-lg",
  md: "w-16 h-16 text-2xl",
  lg: "w-24 h-24 text-4xl",
};

export function BrandLogo({
  logoUrl,
  brandName,
  primaryColor = "#8b5cf6",
  size = "md",
  className = "",
}: BrandLogoProps) {
  const [imageError, setImageError] = useState(false);
  const sizeClass = sizeClasses[size];

  // Show placeholder if no URL or image failed to load
  if (!logoUrl || imageError) {
    return (
      <div
        className={`${sizeClass} rounded-xl flex items-center justify-center font-bold shadow-lg ${className}`}
        style={{
          background: `linear-gradient(135deg, ${primaryColor}40, ${primaryColor}20)`,
          color: primaryColor,
          boxShadow: `0 0 30px ${primaryColor}30`,
        }}
      >
        {brandName.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <div className={`${sizeClass} rounded-xl overflow-hidden bg-white/5 p-2 ${className}`}>
      <img
        src={logoUrl}
        alt={`${brandName} logo`}
        className="w-full h-full object-contain"
        onError={() => setImageError(true)}
      />
    </div>
  );
}

interface LogoVariantImageProps {
  src: string;
  alt: string;
  label: string;
  isDark?: boolean;
}

export function LogoVariantImage({ src, alt, label, isDark = false }: LogoVariantImageProps) {
  const [imageError, setImageError] = useState(false);

  if (imageError) {
    return null; // Don't render if image fails to load
  }

  return (
    <div className={`logo-variant ${isDark ? "logo-variant-dark" : ""}`}>
      <img
        src={src}
        alt={alt}
        onError={() => setImageError(true)}
      />
      <span>{label}</span>
    </div>
  );
}
