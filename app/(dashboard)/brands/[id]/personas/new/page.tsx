/**
 * New Persona Page
 *
 * Creates a new persona from Intelligence suggestions or manual entry.
 * When accessed with prefill=true, it auto-generates a complete persona
 * from the suggested data using AI.
 *
 * Features:
 * - Prefill from Intelligence persona suggestions
 * - Auto-generates complete persona from partial data
 * - Shows progress during generation
 * - Redirects to persona detail on success
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";

// Prefill data from URL parameters
interface PrefillData {
  name: string;
  archetype: string;
  age: number;
  gender: string;
  location: string;
  income: string;
  occupation: string;
  values: string[];
  motivations: string[];
  painPoints: string[];
  aspirations: string[];
  purchaseDrivers: string[];
  preferredChannels: string[];
  decisionStyle: string;
  intelligenceReportId?: string;
}

// Generation status
type GenerationStatus = "idle" | "generating" | "success" | "error";

export default function NewPersonaPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const brandId = params.id as string;

  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [prefillData, setPrefillData] = useState<PrefillData | null>(null);

  // Parse prefill data from URL
  useEffect(() => {
    const isPrefill = searchParams.get("prefill") === "true";
    if (!isPrefill) {
      // If not prefill mode, redirect to brand page with personas tab
      router.replace(`/brands/${brandId}?tab=personas`);
      return;
    }

    // Extract prefill data from URL params
    const data: PrefillData = {
      name: searchParams.get("name") || "",
      archetype: searchParams.get("archetype") || "",
      age: parseInt(searchParams.get("age") || "30", 10),
      gender: searchParams.get("gender") || "Female",
      location: searchParams.get("location") || "",
      income: searchParams.get("income") || "",
      occupation: searchParams.get("occupation") || "",
      values: (searchParams.get("values") || "").split(",").filter(Boolean),
      motivations: (searchParams.get("motivations") || "").split(",").filter(Boolean),
      painPoints: (searchParams.get("painPoints") || "").split(",").filter(Boolean),
      aspirations: (searchParams.get("aspirations") || "").split(",").filter(Boolean),
      purchaseDrivers: (searchParams.get("purchaseDrivers") || "").split(",").filter(Boolean),
      preferredChannels: (searchParams.get("preferredChannels") || "").split(",").filter(Boolean),
      decisionStyle: searchParams.get("decisionStyle") || "",
      intelligenceReportId: searchParams.get("intelligenceReportId") || undefined,
    };

    setPrefillData(data);
  }, [searchParams, brandId, router]);

  // Generate persona from prefill data
  const generatePersona = useCallback(async () => {
    if (!prefillData) return;

    setStatus("generating");
    setError(null);

    try {
      // Call the API to generate a complete persona from the suggestion data
      const response = await fetch("/api/generate/persona-from-suggestion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          brandId,
          suggestion: prefillData,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to generate persona");
      }

      if (result.success && result.persona?.id) {
        setStatus("success");
        // Redirect to the new persona
        router.push(`/brands/${brandId}/personas/${result.persona.id}`);
      } else {
        throw new Error(result.error || "Failed to create persona");
      }
    } catch (err) {
      console.error("Error generating persona:", err);
      setError(err instanceof Error ? err.message : "Failed to generate persona");
      setStatus("error");
    }
  }, [prefillData, brandId, router]);

  // Auto-generate when prefill data is ready
  useEffect(() => {
    if (prefillData && status === "idle") {
      generatePersona();
    }
  }, [prefillData, status, generatePersona]);

  // Loading/generating state
  if (status === "generating" || (status === "idle" && prefillData)) {
    return (
      <div className="generating-container">
        <div className="generating-content">
          <div className="spinner-wrapper">
            <div className="spinner" />
            <div className="spinner-glow" />
          </div>
          <h2>Creating Your Persona</h2>
          <p className="generating-name">{prefillData?.name}</p>
          <p className="generating-message">
            Generating a complete persona profile from the intelligence suggestion...
          </p>
          <div className="generating-details">
            <span className="detail-item">{prefillData?.archetype}</span>
            <span className="detail-separator">•</span>
            <span className="detail-item">{prefillData?.occupation}</span>
          </div>
        </div>
        <style>{`
          .generating-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 60vh;
            padding: 2rem;
          }
          .generating-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            max-width: 400px;
          }
          .spinner-wrapper {
            position: relative;
            width: 80px;
            height: 80px;
            margin-bottom: 2rem;
          }
          .spinner {
            width: 80px;
            height: 80px;
            border: 3px solid rgba(139, 92, 246, 0.15);
            border-top-color: var(--color-plasma-violet);
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          .spinner-glow {
            position: absolute;
            inset: -10px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(139, 92, 246, 0.2) 0%, transparent 70%);
            animation: pulse 2s ease-in-out infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          @keyframes pulse {
            0%, 100% { opacity: 0.5; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.1); }
          }
          .generating-content h2 {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--color-text-primary);
            margin: 0 0 0.5rem;
            letter-spacing: -0.02em;
          }
          .generating-name {
            font-size: 1.125rem;
            font-weight: 600;
            color: var(--color-plasma-violet);
            margin: 0 0 1rem;
          }
          .generating-message {
            font-size: 0.9375rem;
            color: var(--color-text-secondary);
            margin: 0 0 1.5rem;
            line-height: 1.5;
          }
          .generating-details {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            color: var(--color-text-muted);
            font-size: 0.875rem;
          }
          .detail-separator {
            color: var(--color-text-muted);
          }
        `}</style>
      </div>
    );
  }

  // Error state
  if (status === "error") {
    return (
      <div className="error-container">
        <div className="error-content">
          <div className="error-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2>Unable to Create Persona</h2>
          <p className="error-message">{error}</p>
          <div className="error-actions">
            <button className="btn-retry" onClick={generatePersona}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              Try Again
            </button>
            <Link href={`/brands/${brandId}?tab=intelligence`} className="btn-back">
              Back to Intelligence
            </Link>
          </div>
        </div>
        <style>{`
          .error-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 60vh;
            padding: 2rem;
          }
          .error-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            max-width: 400px;
            background: var(--color-surface);
            border: 1px solid rgba(244, 63, 94, 0.2);
            border-radius: 16px;
            padding: 2.5rem;
          }
          .error-icon {
            color: var(--color-plasma-rose);
            margin-bottom: 1.5rem;
            filter: drop-shadow(0 0 15px rgba(244, 63, 94, 0.4));
          }
          .error-content h2 {
            font-size: 1.25rem;
            font-weight: 700;
            color: var(--color-text-primary);
            margin: 0 0 0.75rem;
            letter-spacing: -0.02em;
          }
          .error-message {
            font-size: 0.9375rem;
            color: var(--color-text-secondary);
            margin: 0 0 1.5rem;
            line-height: 1.5;
          }
          .error-actions {
            display: flex;
            gap: 0.75rem;
            width: 100%;
          }
          .btn-retry,
          .btn-back {
            flex: 1;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            padding: 0.75rem 1rem;
            border-radius: 10px;
            font-size: 0.9375rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            text-decoration: none;
          }
          .btn-retry {
            background: linear-gradient(135deg, var(--color-plasma-violet), var(--color-plasma-purple));
            color: white;
            border: none;
            box-shadow: 0 0 15px rgba(139, 92, 246, 0.25);
          }
          .btn-retry:hover {
            transform: translateY(-2px);
            box-shadow: 0 0 25px rgba(139, 92, 246, 0.35);
          }
          .btn-back {
            background: transparent;
            color: var(--color-text-secondary);
            border: 1px solid rgba(255, 255, 255, 0.1);
          }
          .btn-back:hover {
            background: rgba(255, 255, 255, 0.05);
            border-color: rgba(255, 255, 255, 0.2);
          }
        `}</style>
      </div>
    );
  }

  // Success state (briefly shown before redirect)
  if (status === "success") {
    return (
      <div className="success-container">
        <div className="success-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <h2>Persona Created!</h2>
        <p>Redirecting to your new persona...</p>
        <style>{`
          .success-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 60vh;
            padding: 2rem;
            text-align: center;
          }
          .success-icon {
            color: var(--color-plasma-emerald);
            margin-bottom: 1.5rem;
            filter: drop-shadow(0 0 15px rgba(16, 185, 129, 0.4));
          }
          .success-container h2 {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--color-text-primary);
            margin: 0 0 0.5rem;
          }
          .success-container p {
            color: var(--color-text-secondary);
            margin: 0;
          }
        `}</style>
      </div>
    );
  }

  // Default/idle without prefill (shouldn't happen due to redirect)
  return null;
}
