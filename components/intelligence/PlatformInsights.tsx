/**
 * PlatformInsights Component
 *
 * Displays platform-specific insights from intelligence analysis.
 * Shows sentiment, key topics, engagement, and recommendations for each platform.
 */

"use client";

interface PlatformInsight {
  platform: string;
  sentiment: "positive" | "neutral" | "negative" | "mixed";
  keyTopics: string[];
  engagement: string;
  recommendations: string[];
}

interface ContentRecommendation {
  type: "image" | "video" | "carousel" | "story" | "text";
  platform: string;
  headline: string;
  description: string;
  reasoning: string;
  priority: "high" | "medium" | "low";
}

interface PlatformInsightsProps {
  insights: PlatformInsight[];
  recommendations?: ContentRecommendation[];
}

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  reddit: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#ff4500">
      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249z" />
    </svg>
  ),
  twitter: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#1da1f2">
      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
    </svg>
  ),
  facebook: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877f2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  ),
  linkedin: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#0a66c2">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  ),
  instagram: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="url(#instagram-gradient)">
      <defs>
        <linearGradient id="instagram-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFDC80" />
          <stop offset="25%" stopColor="#F56040" />
          <stop offset="50%" stopColor="#C13584" />
          <stop offset="75%" stopColor="#833AB4" />
          <stop offset="100%" stopColor="#5851DB" />
        </linearGradient>
      </defs>
      <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z" />
    </svg>
  ),
  tiktok: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#000000">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  ),
};

const SENTIMENT_STYLES = {
  positive: { bg: "rgba(16, 185, 129, 0.15)", color: "var(--color-plasma-emerald)", border: "rgba(16, 185, 129, 0.25)", label: "Positive" },
  neutral: { bg: "rgba(255, 255, 255, 0.05)", color: "var(--color-text-secondary)", border: "rgba(255, 255, 255, 0.1)", label: "Neutral" },
  negative: { bg: "rgba(244, 63, 94, 0.15)", color: "var(--color-plasma-rose)", border: "rgba(244, 63, 94, 0.25)", label: "Negative" },
  mixed: { bg: "rgba(245, 158, 11, 0.15)", color: "var(--color-plasma-amber)", border: "rgba(245, 158, 11, 0.25)", label: "Mixed" },
};

const PRIORITY_STYLES = {
  high: { bg: "rgba(244, 63, 94, 0.15)", color: "var(--color-plasma-rose)", border: "rgba(244, 63, 94, 0.25)" },
  medium: { bg: "rgba(245, 158, 11, 0.15)", color: "var(--color-plasma-amber)", border: "rgba(245, 158, 11, 0.25)" },
  low: { bg: "rgba(16, 185, 129, 0.15)", color: "var(--color-plasma-emerald)", border: "rgba(16, 185, 129, 0.25)" },
};

const CONTENT_TYPE_ICONS = {
  image: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  ),
  video: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  ),
  carousel: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="4" width="16" height="16" rx="2" />
      <rect x="6" y="2" width="16" height="16" rx="2" />
    </svg>
  ),
  story: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="6" y="2" width="12" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  ),
  text: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="4 7 4 4 20 4 20 7" />
      <line x1="9" y1="20" x2="15" y2="20" />
      <line x1="12" y1="4" x2="12" y2="20" />
    </svg>
  ),
};

function PlatformCard({ insight }: { insight: PlatformInsight }) {
  const sentimentStyle = SENTIMENT_STYLES[insight.sentiment];
  const platformIcon = PLATFORM_ICONS[insight.platform.toLowerCase()] || (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );

  return (
    <div className="platform-card">
      <div className="platform-header">
        <div className="platform-icon">{platformIcon}</div>
        <h4 className="platform-name">{insight.platform}</h4>
        <span
          className="sentiment-badge"
          style={{ backgroundColor: sentimentStyle.bg, color: sentimentStyle.color, borderColor: sentimentStyle.border }}
        >
          {sentimentStyle.label}
        </span>
      </div>

      <p className="engagement-text">{insight.engagement}</p>

      {insight.keyTopics.length > 0 && (
        <div className="topics-section">
          <span className="section-label">Key Topics</span>
          <div className="topics-list">
            {insight.keyTopics.map((topic, i) => (
              <span key={i} className="topic-tag">{topic}</span>
            ))}
          </div>
        </div>
      )}

      {insight.recommendations.length > 0 && (
        <div className="recommendations-section">
          <span className="section-label">Recommendations</span>
          <ul className="recommendations-list">
            {insight.recommendations.map((rec, i) => (
              <li key={i}>{rec}</li>
            ))}
          </ul>
        </div>
      )}

      <style>{`
        .platform-card {
          background: var(--color-surface);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 14px;
          padding: 1.375rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .platform-card:hover {
          border-color: rgba(139, 92, 246, 0.2);
          transform: translateY(-2px);
          box-shadow: 0 8px 30px -12px rgba(139, 92, 246, 0.2);
        }
        .platform-header {
          display: flex;
          align-items: center;
          gap: 0.875rem;
        }
        .platform-icon {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 8px;
          padding: 6px;
        }
        .platform-name {
          font-size: 1rem;
          font-weight: 600;
          color: var(--color-text-primary);
          margin: 0;
          flex: 1;
          text-transform: capitalize;
          letter-spacing: -0.01em;
        }
        .sentiment-badge {
          padding: 0.3125rem 0.625rem;
          border-radius: 6px;
          font-size: 0.6875rem;
          font-weight: 600;
          border: 1px solid;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }
        .engagement-text {
          font-size: 0.875rem;
          color: var(--color-text-secondary);
          margin: 0;
          line-height: 1.6;
        }
        .topics-section, .recommendations-section {
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
        }
        .topics-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.375rem;
        }
        .topic-tag {
          display: inline-flex;
          padding: 0.25rem 0.5rem;
          background: rgba(139, 92, 246, 0.15);
          color: var(--color-plasma-violet);
          border: 1px solid rgba(139, 92, 246, 0.2);
          border-radius: 6px;
          font-size: 0.6875rem;
          font-weight: 500;
        }
        .recommendations-list {
          margin: 0;
          padding-left: 1.25rem;
          font-size: 0.8125rem;
          color: var(--color-text-secondary);
        }
        .recommendations-list li {
          margin-bottom: 0.375rem;
          line-height: 1.5;
        }
        .recommendations-list li::marker {
          color: var(--color-plasma-violet);
        }
        .recommendations-list li:last-child {
          margin-bottom: 0;
        }
      `}</style>
    </div>
  );
}

function ContentRecommendationCard({ recommendation }: { recommendation: ContentRecommendation }) {
  const priorityStyle = PRIORITY_STYLES[recommendation.priority];
  const typeIcon = CONTENT_TYPE_ICONS[recommendation.type];

  return (
    <div className="content-card">
      <div className="content-header">
        <div className="content-type">
          {typeIcon}
          <span>{recommendation.type}</span>
        </div>
        <span
          className="priority-badge"
          style={{ backgroundColor: priorityStyle.bg, color: priorityStyle.color, borderColor: priorityStyle.border }}
        >
          {recommendation.priority} priority
        </span>
      </div>
      <h4 className="content-headline">{recommendation.headline}</h4>
      <p className="content-platform">For: {recommendation.platform}</p>
      <p className="content-description">{recommendation.description}</p>
      <div className="content-reasoning">
        <span className="reasoning-label">Why:</span>
        <span>{recommendation.reasoning}</span>
      </div>

      <style>{`
        .content-card {
          background: var(--color-surface);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 14px;
          padding: 1.375rem;
          display: flex;
          flex-direction: column;
          gap: 0.875rem;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .content-card:hover {
          border-color: rgba(6, 182, 212, 0.2);
          transform: translateY(-2px);
          box-shadow: 0 8px 30px -12px rgba(6, 182, 212, 0.2);
        }
        .content-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .content-type {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8125rem;
          font-weight: 500;
          color: var(--color-text-secondary);
          text-transform: capitalize;
        }
        .content-type svg {
          color: var(--color-plasma-cyan);
        }
        .priority-badge {
          padding: 0.3125rem 0.625rem;
          border-radius: 6px;
          font-size: 0.6875rem;
          font-weight: 600;
          text-transform: capitalize;
          border: 1px solid;
          letter-spacing: 0.02em;
        }
        .content-headline {
          font-size: 1.0625rem;
          font-weight: 600;
          color: var(--color-text-primary);
          margin: 0;
          letter-spacing: -0.01em;
        }
        .content-platform {
          font-size: 0.75rem;
          color: var(--color-plasma-cyan);
          margin: 0;
          font-weight: 500;
        }
        .content-description {
          font-size: 0.875rem;
          color: var(--color-text-secondary);
          margin: 0;
          line-height: 1.6;
        }
        .content-reasoning {
          font-size: 0.8125rem;
          color: var(--color-text-secondary);
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.04);
          padding: 0.875rem;
          border-radius: 10px;
          line-height: 1.5;
        }
        .reasoning-label {
          font-weight: 600;
          color: var(--color-text-primary);
          margin-right: 0.375rem;
        }
      `}</style>
    </div>
  );
}

export default function PlatformInsights({
  insights,
  recommendations = [],
}: PlatformInsightsProps) {
  if ((!insights || insights.length === 0) && recommendations.length === 0) {
    return null;
  }

  return (
    <div className="platform-insights">
      {insights && insights.length > 0 && (
        <section className="insights-section">
          <h3 className="section-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Platform Insights
          </h3>
          <div className="insights-grid">
            {insights.map((insight, index) => (
              <PlatformCard key={index} insight={insight} />
            ))}
          </div>
        </section>
      )}

      {recommendations.length > 0 && (
        <section className="recommendations-section">
          <h3 className="section-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            Content Recommendations
          </h3>
          <div className="recommendations-grid">
            {recommendations.map((rec, index) => (
              <ContentRecommendationCard key={index} recommendation={rec} />
            ))}
          </div>
        </section>
      )}

      <style>{`
        .platform-insights {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }
        .insights-section, .recommendations-section {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .section-title {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--color-text-primary);
          margin: 0;
          letter-spacing: -0.01em;
        }
        .section-title svg {
          color: var(--color-plasma-violet);
          filter: drop-shadow(0 0 8px rgba(139, 92, 246, 0.4));
        }
        .insights-grid, .recommendations-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1rem;
        }
      `}</style>
    </div>
  );
}
