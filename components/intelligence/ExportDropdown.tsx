"use client";

import { useState, useRef, useEffect } from "react";
import { exportReportAsJSON, exportReportAsCSV, exportReportAsPDF, exportReportAsPPTX } from "@/lib/services/report-export";

interface ExportDropdownProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  report: any;
  brandName: string;
}

export default function ExportDropdown({ report, brandName }: ExportDropdownProps) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleExport = async (format: string) => {
    setExporting(format);
    try {
      switch (format) {
        case "json":
          exportReportAsJSON(report, brandName);
          break;
        case "csv":
          exportReportAsCSV(report, brandName);
          break;
        case "pdf":
          await exportReportAsPDF(report, brandName);
          break;
        case "pptx":
          await exportReportAsPPTX(report, brandName);
          break;
      }
    } catch (err) {
      console.error(`Export failed (${format}):`, err);
    }
    setExporting(null);
    setOpen(false);
  };

  return (
    <div className="export-dropdown-wrapper" ref={ref}>
      <button className="btn-export" onClick={() => setOpen(!open)} disabled={!!exporting}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        {exporting ? "Exporting..." : "Export"}
      </button>
      {open && (
        <div className="export-menu">
          <button className="export-option" onClick={() => handleExport("json")}>
            <span className="export-format">JSON</span>
            <span className="export-desc">Full structured data</span>
          </button>
          <button className="export-option" onClick={() => handleExport("csv")}>
            <span className="export-format">CSV</span>
            <span className="export-desc">Tabular spreadsheet</span>
          </button>
          <button className="export-option" onClick={() => handleExport("pdf")}>
            <span className="export-format">PDF</span>
            <span className="export-desc">Printable document</span>
          </button>
          <button className="export-option" onClick={() => handleExport("pptx")}>
            <span className="export-format">PPTX</span>
            <span className="export-desc">Presentation slides</span>
          </button>
        </div>
      )}
      <style>{`
        .export-dropdown-wrapper {
          position: relative;
        }
        .btn-export {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          background: transparent;
          color: var(--color-text-secondary);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn-export:hover:not(:disabled) {
          background: rgba(139, 92, 246, 0.08);
          border-color: rgba(139, 92, 246, 0.3);
          color: var(--color-text-primary);
        }
        .btn-export:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .export-menu {
          position: absolute;
          top: calc(100% + 4px);
          right: 0;
          min-width: 200px;
          background: var(--color-surface, #1a1a2e);
          border: 1px solid rgba(139, 92, 246, 0.2);
          border-radius: 12px;
          padding: 0.375rem;
          z-index: 50;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
          animation: exportFadeIn 0.15s ease;
        }
        @keyframes exportFadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .export-option {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          padding: 0.625rem 0.875rem;
          background: none;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          text-align: left;
          color: var(--color-text-primary, #fff);
          transition: all 0.15s ease;
        }
        .export-option:hover {
          background: rgba(139, 92, 246, 0.1);
        }
        .export-format {
          font-size: 0.875rem;
          font-weight: 600;
        }
        .export-desc {
          font-size: 0.6875rem;
          color: var(--color-text-muted, #999);
        }
      `}</style>
    </div>
  );
}
