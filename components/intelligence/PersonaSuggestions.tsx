/**
 * PersonaSuggestions Component
 *
 * Displays AI-generated persona suggestions from intelligence data.
 * Includes "Create Persona" buttons to pre-fill persona creation form.
 */

"use client";

import { useRouter } from "next/navigation";

interface Demographics {
  age: number;
  gender: string;
  location: string;
  income: string;
  occupation: string;
}

interface Psychographics {
  values: string[];
  motivations: string[];
  painPoints: string[];
  aspirations: string[];
}

interface Behaviors {
  purchaseDrivers: string[];
  preferredChannels: string[];
  decisionStyle: string;
}

interface PersonaSuggestion {
  name: string;
  archetype: string;
  headline: string;
  demographics: Demographics;
  psychographics: Psychographics;
  behaviors: Behaviors;
  relevanceScore: number;
  reasoning: string;
}

interface PersonaSuggestionsProps {
  suggestions: PersonaSuggestion[];
  brandId: string;
  reportId: string;
}

function RelevanceIndicator({ score }: { score: number }) {
  const percentage = Math.round(score * 100);
  const getColor = () => {
    if (percentage >= 80) return "#10b981";
    if (percentage >= 60) return "#f59e0b";
    return "#ef4444";
  };

  return (
    <div className="relevance-indicator">
      <div className="relevance-bar">
        <div
          className="relevance-fill"
          style={{ width: `${percentage}%`, backgroundColor: getColor() }}
        />
      </div>
      <span className="relevance-text" style={{ color: getColor() }}>
        {percentage}% match
      </span>
    </div>
  );
}

function PersonaCard({
  suggestion,
  brandId,
  reportId,
  onCreatePersona,
}: {
  suggestion: PersonaSuggestion;
  brandId: string;
  reportId: string;
  onCreatePersona: (suggestion: PersonaSuggestion) => void;
}) {
  return (
    <div className="persona-card">
      {/* Header */}
      <div className="persona-header">
        <div className="persona-avatar">
          {suggestion.name.split(" ").map((n) => n[0]).join("")}
        </div>
        <div className="persona-info">
          <h4 className="persona-name">{suggestion.name}</h4>
          <span className="persona-archetype">{suggestion.archetype}</span>
        </div>
        <RelevanceIndicator score={suggestion.relevanceScore} />
      </div>

      {/* Headline */}
      <p className="persona-headline">{suggestion.headline}</p>

      {/* Demographics */}
      <div className="persona-section">
        <h5 className="section-label">Demographics</h5>
        <div className="demographics-grid">
          <div className="demo-item">
            <span className="demo-label">Age</span>
            <span className="demo-value">{suggestion.demographics.age}</span>
          </div>
          <div className="demo-item">
            <span className="demo-label">Gender</span>
            <span className="demo-value">{suggestion.demographics.gender}</span>
          </div>
          <div className="demo-item">
            <span className="demo-label">Location</span>
            <span className="demo-value">{suggestion.demographics.location}</span>
          </div>
          <div className="demo-item">
            <span className="demo-label">Income</span>
            <span className="demo-value">{suggestion.demographics.income}</span>
          </div>
          <div className="demo-item full-width">
            <span className="demo-label">Occupation</span>
            <span className="demo-value">{suggestion.demographics.occupation}</span>
          </div>
        </div>
      </div>

      {/* Psychographics */}
      <div className="persona-section">
        <h5 className="section-label">Psychographics</h5>
        <div className="psycho-grid">
          {suggestion.psychographics.values.length > 0 && (
            <div className="psycho-item">
              <span className="psycho-label">Values</span>
              <div className="tag-list">
                {suggestion.psychographics.values.slice(0, 3).map((v, i) => (
                  <span key={i} className="tag value-tag">{v}</span>
                ))}
              </div>
            </div>
          )}
          {suggestion.psychographics.painPoints.length > 0 && (
            <div className="psycho-item">
              <span className="psycho-label">Pain Points</span>
              <div className="tag-list">
                {suggestion.psychographics.painPoints.slice(0, 3).map((p, i) => (
                  <span key={i} className="tag pain-tag">{p}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reasoning */}
      <div className="persona-section">
        <h5 className="section-label">Why This Persona?</h5>
        <p className="reasoning-text">{suggestion.reasoning}</p>
      </div>

      {/* Action */}
      <button
        className="create-persona-btn"
        onClick={() => onCreatePersona(suggestion)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <line x1="19" y1="8" x2="19" y2="14" />
          <line x1="22" y1="11" x2="16" y2="11" />
        </svg>
        Create This Persona
      </button>

      <style>{`
        .persona-card {
          background: var(--color-surface);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 16px;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .persona-card:hover {
          border-color: rgba(139, 92, 246, 0.3);
          transform: translateY(-2px);
          box-shadow: 0 10px 40px -15px rgba(139, 92, 246, 0.25);
        }

        .persona-header {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
        }
        .persona-avatar {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--color-plasma-violet), var(--color-plasma-purple));
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 1rem;
          flex-shrink: 0;
          box-shadow: 0 0 20px rgba(139, 92, 246, 0.3);
        }
        .persona-info {
          flex: 1;
          min-width: 0;
        }
        .persona-name {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--color-text-primary);
          margin: 0;
          letter-spacing: -0.01em;
        }
        .persona-archetype {
          font-size: 0.8125rem;
          color: var(--color-plasma-violet);
          font-weight: 500;
        }

        .relevance-indicator {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.375rem;
        }
        .relevance-bar {
          width: 64px;
          height: 4px;
          background: rgba(255, 255, 255, 0.06);
          border-radius: 2px;
          overflow: hidden;
        }
        .relevance-fill {
          height: 100%;
          border-radius: 2px;
        }
        .relevance-text {
          font-size: 0.6875rem;
          font-weight: 600;
        }

        .persona-headline {
          font-size: 0.9375rem;
          color: var(--color-text-secondary);
          margin: 0;
          line-height: 1.6;
        }

        .persona-section {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .section-label {
          font-size: 0.625rem;
          font-weight: 600;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0;
        }

        .demographics-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.5rem;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 10px;
        }
        .demo-item {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
        }
        .demo-item.full-width {
          grid-column: 1 / -1;
        }
        .demo-label {
          font-size: 0.625rem;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .demo-value {
          font-size: 0.8125rem;
          color: var(--color-text-primary);
          font-weight: 500;
        }

        .psycho-grid {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .psycho-item {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }
        .psycho-label {
          font-size: 0.625rem;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .tag-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.375rem;
        }
        .tag {
          display: inline-flex;
          padding: 0.25rem 0.5rem;
          border-radius: 6px;
          font-size: 0.6875rem;
          font-weight: 500;
        }
        .value-tag {
          background: rgba(139, 92, 246, 0.15);
          color: var(--color-plasma-violet);
          border: 1px solid rgba(139, 92, 246, 0.2);
        }
        .pain-tag {
          background: rgba(245, 158, 11, 0.15);
          color: var(--color-plasma-amber);
          border: 1px solid rgba(245, 158, 11, 0.2);
        }

        .reasoning-text {
          font-size: 0.8125rem;
          color: var(--color-text-secondary);
          margin: 0;
          line-height: 1.6;
        }

        .create-persona-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.875rem 1.25rem;
          background: linear-gradient(135deg, var(--color-plasma-violet), var(--color-plasma-purple));
          color: white;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          margin-top: 0.5rem;
          box-shadow: 0 0 15px rgba(139, 92, 246, 0.25);
          position: relative;
          overflow: hidden;
        }
        .create-persona-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
          transform: translateX(-100%);
          transition: transform 0.5s ease;
        }
        .create-persona-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 30px rgba(139, 92, 246, 0.35), 0 8px 20px -8px rgba(139, 92, 246, 0.4);
        }
        .create-persona-btn:hover::before {
          transform: translateX(100%);
        }
      `}</style>
    </div>
  );
}

export default function PersonaSuggestions({
  suggestions,
  brandId,
  reportId,
}: PersonaSuggestionsProps) {
  const router = useRouter();

  const handleCreatePersona = (suggestion: PersonaSuggestion) => {
    // Encode persona data as URL params for pre-filling
    const params = new URLSearchParams({
      prefill: "true",
      name: suggestion.name,
      archetype: suggestion.archetype,
      age: suggestion.demographics.age.toString(),
      gender: suggestion.demographics.gender,
      location: suggestion.demographics.location,
      income: suggestion.demographics.income,
      occupation: suggestion.demographics.occupation,
      values: suggestion.psychographics.values.join(","),
      motivations: suggestion.psychographics.motivations.join(","),
      painPoints: suggestion.psychographics.painPoints.join(","),
      aspirations: suggestion.psychographics.aspirations.join(","),
      purchaseDrivers: suggestion.behaviors.purchaseDrivers.join(","),
      preferredChannels: suggestion.behaviors.preferredChannels.join(","),
      decisionStyle: suggestion.behaviors.decisionStyle,
      intelligenceReportId: reportId,
    });

    router.push(`/brands/${brandId}/personas/new?${params.toString()}`);
  };

  if (!suggestions || suggestions.length === 0) {
    return (
      <div className="empty-suggestions">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        <p>No persona suggestions available</p>
        <style>{`
          .empty-suggestions {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 3rem;
            color: var(--color-text-muted);
            text-align: center;
            gap: 1rem;
          }
          .empty-suggestions svg {
            filter: drop-shadow(0 0 15px rgba(139, 92, 246, 0.2));
          }
          .empty-suggestions p {
            margin: 0;
            font-size: 0.9375rem;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="persona-suggestions">
      <div className="suggestions-header">
        <div className="header-content">
          <h3 className="header-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Suggested Personas
          </h3>
          <p className="header-description">
            AI-generated personas based on market intelligence data
          </p>
        </div>
        <span className="suggestions-count">{suggestions.length} suggestions</span>
      </div>

      <div className="suggestions-grid">
        {suggestions.map((suggestion, index) => (
          <PersonaCard
            key={index}
            suggestion={suggestion}
            brandId={brandId}
            reportId={reportId}
            onCreatePersona={handleCreatePersona}
          />
        ))}
      </div>

      <style>{`
        .persona-suggestions {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .suggestions-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
        }
        .header-content {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }
        .header-title {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--color-text-primary);
          margin: 0;
          letter-spacing: -0.01em;
        }
        .header-title svg {
          color: var(--color-plasma-violet);
          filter: drop-shadow(0 0 8px rgba(139, 92, 246, 0.4));
        }
        .header-description {
          font-size: 0.875rem;
          color: var(--color-text-secondary);
          margin: 0;
        }
        .suggestions-count {
          display: inline-flex;
          padding: 0.375rem 0.875rem;
          background: rgba(139, 92, 246, 0.15);
          color: var(--color-plasma-violet);
          border: 1px solid rgba(139, 92, 246, 0.25);
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .suggestions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 1.5rem;
        }

        @media (max-width: 640px) {
          .suggestions-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
