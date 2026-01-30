/**
 * IntelligenceProgress Component
 *
 * Displays real-time progress during intelligence report generation.
 * Shows current phase, progress bar, and detailed status messages.
 */

"use client";

import { useEffect, useState, useRef } from "react";

interface ProgressState {
  phase: "collecting" | "scraping" | "synthesizing" | "storing" | "complete" | "error";
  message: string;
  progress: number;
}

interface IntelligenceProgressProps {
  brandId: string;
  productId?: string | null;
  onComplete: (data: unknown) => void;
  onError: (error: string) => void;
}

const PHASE_LABELS = {
  collecting: "Collecting Data",
  scraping: "Scraping Content",
  synthesizing: "AI Analysis",
  storing: "Saving Report",
  complete: "Complete",
  error: "Error",
};

const PHASE_ICONS = {
  collecting: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  ),
  scraping: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  synthesizing: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2L2 7l10 5 10-5-10-5Z" />
      <path d="m2 17 10 5 10-5" />
      <path d="m2 12 10 5 10-5" />
    </svg>
  ),
  storing: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="m5 12-3 3 3 3" />
      <path d="m9 18 3-3-3-3" />
    </svg>
  ),
  complete: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  error: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
};

export default function IntelligenceProgress({
  brandId,
  productId,
  onComplete,
  onError,
}: IntelligenceProgressProps) {
  const [progressState, setProgressState] = useState<ProgressState>({
    phase: "collecting",
    message: "Initializing...",
    progress: 0,
  });
  const [logs, setLogs] = useState<string[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Start the streaming generation
    const startGeneration = async () => {
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch("/api/generate/intelligence/stream", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            brand_id: brandId,
            product_id: productId,
            report_type: "comprehensive",
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to start generation");
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body");
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Parse SSE events from buffer
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const eventData = JSON.parse(line.slice(6));

                setProgressState({
                  phase: eventData.phase || progressState.phase,
                  message: eventData.message,
                  progress: eventData.progress,
                });

                setLogs((prev) => [...prev.slice(-9), eventData.message]);

                if (eventData.type === "complete" && eventData.data) {
                  onComplete(eventData.data);
                } else if (eventData.type === "error") {
                  onError(eventData.message);
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          onError(error instanceof Error ? error.message : "Generation failed");
        }
      }
    };

    startGeneration();

    return () => {
      abortControllerRef.current?.abort();
      eventSourceRef.current?.close();
    };
  }, [brandId, productId, onComplete, onError]);

  const phaseSteps = ["collecting", "scraping", "synthesizing", "storing", "complete"] as const;
  const currentPhaseIndex = phaseSteps.indexOf(progressState.phase as typeof phaseSteps[number]);

  return (
    <div className="intelligence-progress">
      {/* Phase indicators */}
      <div className="phase-steps">
        {phaseSteps.slice(0, -1).map((phase, index) => {
          const isActive = index === currentPhaseIndex;
          const isComplete = index < currentPhaseIndex;
          const isFuture = index > currentPhaseIndex;

          return (
            <div
              key={phase}
              className={`phase-step ${isActive ? "active" : ""} ${isComplete ? "complete" : ""} ${isFuture ? "future" : ""}`}
            >
              <div className="phase-icon">
                {isComplete ? PHASE_ICONS.complete : PHASE_ICONS[phase]}
              </div>
              <div className="phase-label">{PHASE_LABELS[phase]}</div>
              {index < phaseSteps.length - 2 && <div className="phase-connector" />}
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="progress-container">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${progressState.progress}%` }}
          />
        </div>
        <div className="progress-text">{Math.round(progressState.progress)}%</div>
      </div>

      {/* Current status */}
      <div className="status-container">
        <div className="status-icon spinning">
          {progressState.phase === "error" ? PHASE_ICONS.error : PHASE_ICONS[progressState.phase]}
        </div>
        <div className="status-message">{progressState.message}</div>
      </div>

      {/* Activity log */}
      <div className="activity-log">
        <div className="log-header">Activity Log</div>
        <div className="log-entries">
          {logs.map((log, index) => (
            <div key={index} className="log-entry">
              <span className="log-bullet" />
              <span className="log-text">{log}</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .intelligence-progress {
          background: linear-gradient(135deg, var(--color-surface) 0%, var(--color-elevated) 100%);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 16px;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 2rem;
          position: relative;
          overflow: hidden;
        }
        .intelligence-progress::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--color-plasma-violet), var(--color-plasma-cyan), transparent);
          opacity: 0.5;
        }

        /* Phase Steps */
        .phase-steps {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          position: relative;
        }
        .phase-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.625rem;
          flex: 1;
          position: relative;
        }
        .phase-icon {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-text-muted);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .phase-step.active .phase-icon {
          background: rgba(139, 92, 246, 0.15);
          border-color: rgba(139, 92, 246, 0.3);
          color: var(--color-plasma-violet);
          box-shadow: 0 0 20px rgba(139, 92, 246, 0.3), 0 0 40px rgba(139, 92, 246, 0.1);
        }
        .phase-step.complete .phase-icon {
          background: rgba(16, 185, 129, 0.15);
          border-color: rgba(16, 185, 129, 0.3);
          color: var(--color-plasma-emerald);
        }
        .phase-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--color-text-muted);
          text-align: center;
          letter-spacing: 0.02em;
        }
        .phase-step.active .phase-label {
          color: var(--color-plasma-violet);
          text-shadow: 0 0 10px rgba(139, 92, 246, 0.3);
        }
        .phase-step.complete .phase-label {
          color: var(--color-plasma-emerald);
        }
        .phase-connector {
          position: absolute;
          top: 22px;
          left: calc(50% + 26px);
          right: calc(-50% + 26px);
          height: 2px;
          background: rgba(255, 255, 255, 0.06);
        }
        .phase-step.complete .phase-connector {
          background: linear-gradient(90deg, var(--color-plasma-emerald), rgba(16, 185, 129, 0.3));
        }

        /* Progress Bar */
        .progress-container {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .progress-bar {
          flex: 1;
          height: 8px;
          background: rgba(255, 255, 255, 0.06);
          border-radius: 4px;
          overflow: hidden;
          position: relative;
        }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--color-plasma-violet), var(--color-plasma-purple), var(--color-plasma-cyan));
          border-radius: 4px;
          transition: width 0.3s ease;
          box-shadow: 0 0 15px rgba(139, 92, 246, 0.4);
          position: relative;
        }
        .progress-fill::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          animation: shimmer 2s infinite;
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .progress-text {
          font-size: 0.9375rem;
          font-weight: 700;
          color: var(--color-plasma-violet);
          min-width: 3.5rem;
          text-align: right;
          text-shadow: 0 0 10px rgba(139, 92, 246, 0.3);
        }

        /* Status */
        .status-container {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.125rem;
          background: rgba(139, 92, 246, 0.08);
          border: 1px solid rgba(139, 92, 246, 0.15);
          border-radius: 12px;
        }
        .status-icon {
          color: var(--color-plasma-violet);
          filter: drop-shadow(0 0 8px rgba(139, 92, 246, 0.4));
        }
        .status-icon.spinning {
          animation: spin 2s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .status-message {
          font-size: 0.9375rem;
          color: var(--color-text-primary);
          font-weight: 500;
        }

        /* Activity Log */
        .activity-log {
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          padding-top: 1.5rem;
        }
        .log-header {
          font-size: 0.6875rem;
          font-weight: 600;
          color: var(--color-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.875rem;
        }
        .log-entries {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          max-height: 200px;
          overflow-y: auto;
          padding-right: 0.5rem;
        }
        .log-entries::-webkit-scrollbar {
          width: 4px;
        }
        .log-entries::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 2px;
        }
        .log-entries::-webkit-scrollbar-thumb {
          background: rgba(139, 92, 246, 0.3);
          border-radius: 2px;
        }
        .log-entry {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          font-size: 0.8125rem;
          color: var(--color-text-secondary);
        }
        .log-bullet {
          width: 6px;
          height: 6px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 50%;
          flex-shrink: 0;
        }
        .log-entry:last-child .log-bullet {
          background: var(--color-plasma-violet);
          box-shadow: 0 0 8px rgba(139, 92, 246, 0.5);
        }
        .log-entry:last-child {
          color: var(--color-text-primary);
        }

        @media (max-width: 640px) {
          .intelligence-progress {
            padding: 1.5rem;
          }
          .phase-steps {
            flex-wrap: wrap;
            gap: 1rem;
          }
          .phase-step {
            flex: 0 0 calc(50% - 0.5rem);
          }
          .phase-connector {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
