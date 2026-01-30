/**
 * CreateAudienceModal Component
 *
 * Modal for creating a new audience from one or more personas.
 * Features persona selection grid with checkboxes and auto-suggested name.
 */

"use client";

import { useEffect, useState } from "react";
import { getPersonas } from "@/app/actions/personas";
import type { Persona } from "@/lib/supabase/database.types";

interface CreateAudienceModalProps {
  brandId: string;
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateAudienceModal({
  brandId,
  isOpen,
  onClose,
  onCreated,
}: CreateAudienceModalProps) {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch personas when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    setSelectedIds(new Set());
    setName("");

    getPersonas(brandId)
      .then((result) => {
        if (result.success) {
          setPersonas(result.data);
        } else {
          setError(result.error);
        }
      })
      .catch(() => setError("Failed to load personas"))
      .finally(() => setLoading(false));
  }, [isOpen, brandId]);

  // Auto-suggest name based on selection
  useEffect(() => {
    if (selectedIds.size === 0) {
      setName("");
      return;
    }
    const selected = personas.filter((p) => selectedIds.has(p.id));
    if (selected.length === 1) {
      setName(`${selected[0].name} Audience`);
    } else {
      setName(`Combined Audience (${selected.length} personas)`);
    }
  }, [selectedIds, personas]);

  const togglePersona = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === personas.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(personas.map((p) => p.id)));
    }
  };

  const handleCreate = async () => {
    if (selectedIds.size === 0 || !name.trim()) return;

    setGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/generate/audience", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          persona_ids: Array.from(selectedIds),
          name: name.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create audience");
        setGenerating(false);
        return;
      }

      onCreated();
    } catch (err) {
      console.error("Error creating audience:", err);
      setError("Failed to create audience. Please try again.");
    }

    setGenerating(false);
  };

  if (!isOpen) return null;

  return (
    <div className="cam-overlay" onClick={onClose}>
      <div className="cam-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="cam-header">
          <h2 className="cam-title">Create Audience</h2>
          <button className="cam-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="cam-body">
          {/* Name Input */}
          <div className="cam-field">
            <label className="cam-label">Audience Name</label>
            <input
              type="text"
              className="cam-input"
              placeholder="Enter audience name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Persona Selection */}
          <div className="cam-field">
            <div className="cam-label-row">
              <label className="cam-label">Select Personas</label>
              {personas.length > 0 && (
                <button className="cam-select-all" onClick={toggleAll}>
                  {selectedIds.size === personas.length ? "Deselect All" : "Select All"}
                </button>
              )}
            </div>

            {loading ? (
              <div className="cam-loading">
                <div className="cam-spinner" />
                <span>Loading personas...</span>
              </div>
            ) : personas.length === 0 ? (
              <div className="cam-empty-personas">
                No personas found. Create personas first before building audiences.
              </div>
            ) : (
              <div className="cam-personas-grid">
                {personas.map((persona) => {
                  const isSelected = selectedIds.has(persona.id);
                  const demographics = persona.demographics as Record<string, unknown> | null;
                  const age = demographics?.age as number | undefined;
                  const gender = demographics?.gender as string | undefined;
                  const location = demographics?.location as string | undefined;

                  return (
                    <button
                      key={persona.id}
                      className={`cam-persona-card ${isSelected ? "selected" : ""}`}
                      onClick={() => togglePersona(persona.id)}
                    >
                      <div className="cam-persona-check">
                        {isSelected && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>
                      <div className="cam-persona-photo">
                        {persona.photo_url ? (
                          <img src={persona.photo_url} alt={persona.name} />
                        ) : (
                          <span>{persona.name.charAt(0)}</span>
                        )}
                      </div>
                      <div className="cam-persona-info">
                        <span className="cam-persona-name">{persona.name}</span>
                        <span className="cam-persona-demo">
                          {[age && `${age}yo`, gender, location].filter(Boolean).join(" · ")}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {error && <div className="cam-error">{error}</div>}
        </div>

        {/* Footer */}
        <div className="cam-footer">
          <button className="cam-cancel" onClick={onClose} disabled={generating}>
            Cancel
          </button>
          <button
            className="cam-create"
            onClick={handleCreate}
            disabled={generating || selectedIds.size === 0 || !name.trim()}
          >
            {generating ? (
              <>
                <div className="cam-btn-spinner" />
                Generating targeting for 6 platforms...
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Create Audience
              </>
            )}
          </button>
        </div>
      </div>

      <style>{`
        .cam-overlay {
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
        .cam-modal {
          background: var(--color-surface);
          border: 1px solid rgba(139, 92, 246, 0.15);
          border-radius: 16px;
          max-width: 600px;
          width: 100%;
          max-height: 85vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 0 40px rgba(139, 92, 246, 0.15);
        }
        .cam-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }
        .cam-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--color-text-primary);
          margin: 0;
          letter-spacing: -0.02em;
        }
        .cam-close {
          background: none;
          border: none;
          color: var(--color-text-muted);
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 6px;
          transition: all 0.2s ease;
        }
        .cam-close:hover {
          color: var(--color-text-primary);
          background: rgba(255, 255, 255, 0.05);
        }
        .cam-body {
          flex: 1;
          overflow-y: auto;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .cam-field {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .cam-label-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .cam-label {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--color-text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .cam-select-all {
          background: none;
          border: none;
          color: var(--color-plasma-violet);
          font-size: 0.8125rem;
          font-weight: 500;
          cursor: pointer;
          padding: 0;
        }
        .cam-select-all:hover {
          text-decoration: underline;
        }
        .cam-input {
          padding: 0.75rem 1rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          color: var(--color-text-primary);
          font-size: 0.9375rem;
          outline: none;
          transition: border-color 0.2s ease;
        }
        .cam-input:focus {
          border-color: var(--color-plasma-violet);
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
        }
        .cam-input::placeholder {
          color: var(--color-text-muted);
        }
        .cam-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 2rem;
          color: var(--color-text-secondary);
          font-size: 0.875rem;
        }
        .cam-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(139, 92, 246, 0.15);
          border-top-color: var(--color-plasma-violet);
          border-radius: 50%;
          animation: cam-spin 1s linear infinite;
        }
        .cam-empty-personas {
          padding: 2rem;
          text-align: center;
          color: var(--color-text-muted);
          font-size: 0.875rem;
        }
        .cam-personas-grid {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          max-height: 300px;
          overflow-y: auto;
        }
        .cam-persona-card {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 10px;
          cursor: pointer;
          text-align: left;
          transition: all 0.2s ease;
          color: inherit;
        }
        .cam-persona-card:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(255, 255, 255, 0.12);
        }
        .cam-persona-card.selected {
          background: rgba(139, 92, 246, 0.08);
          border-color: rgba(139, 92, 246, 0.3);
        }
        .cam-persona-check {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 255, 255, 0.15);
          border-radius: 5px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 0.2s ease;
        }
        .cam-persona-card.selected .cam-persona-check {
          background: var(--color-plasma-violet);
          border-color: var(--color-plasma-violet);
          color: white;
        }
        .cam-persona-photo {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--color-plasma-violet), var(--color-plasma-purple));
          flex-shrink: 0;
        }
        .cam-persona-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .cam-persona-photo span {
          font-size: 0.875rem;
          font-weight: 600;
          color: white;
        }
        .cam-persona-info {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
          min-width: 0;
        }
        .cam-persona-name {
          font-size: 0.9375rem;
          font-weight: 600;
          color: var(--color-text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .cam-persona-demo {
          font-size: 0.8125rem;
          color: var(--color-text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .cam-error {
          padding: 0.75rem 1rem;
          background: rgba(244, 63, 94, 0.1);
          border: 1px solid rgba(244, 63, 94, 0.2);
          border-radius: 8px;
          color: var(--color-plasma-rose);
          font-size: 0.875rem;
        }
        .cam-footer {
          display: flex;
          gap: 0.75rem;
          padding: 1.25rem 1.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }
        .cam-cancel,
        .cam-create {
          padding: 0.75rem 1.25rem;
          border-radius: 10px;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .cam-cancel {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--color-text-secondary);
          flex-shrink: 0;
        }
        .cam-cancel:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.05);
        }
        .cam-create {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          background: linear-gradient(135deg, var(--color-plasma-violet), var(--color-plasma-purple));
          color: white;
          border: none;
          box-shadow: 0 0 20px rgba(139, 92, 246, 0.25);
        }
        .cam-create:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 0 30px rgba(139, 92, 246, 0.35);
        }
        .cam-create:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }
        .cam-btn-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: cam-spin 0.8s linear infinite;
        }
        @keyframes cam-spin {
          to { transform: rotate(360deg); }
        }
        @media (max-width: 480px) {
          .cam-modal {
            max-height: 95vh;
          }
        }
      `}</style>
    </div>
  );
}
