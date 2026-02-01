/**
 * Report Export Service
 *
 * Client-side export functions for intelligence reports.
 * Supports JSON, CSV, PDF, and PPTX formats.
 */

import type { SentimentAnalysis, TopicCluster, PurchaseIntentAnalysis, CompetitivePositioning } from "./intelligence-synthesizer";
import type { MediaAffinityReport } from "./media-affinity-engine";
import type { CompetitorData, SearchTrendData, AudienceInsightData, AttributedSource } from "@/lib/api/brightdata";

interface ExportableReport {
  id: string;
  generated_at: string;
  competitors: CompetitorData[];
  search_trends: SearchTrendData[];
  audience_insights: { segments?: AudienceInsightData[]; totalSegments?: number };
  sources: AttributedSource[];
  executive_summary: {
    overview: string;
    keyFindings: string[];
    opportunities: string[];
    threats: string[];
    recommendations: string[];
  } | null;
  persona_suggestions: {
    name: string;
    archetype: string;
    headline: string;
    relevanceScore: number;
  }[];
  platform_insights: {
    platform: string;
    sentiment: string;
    keyTopics: string[];
    recommendations: string[];
  }[];
  content_recommendations: {
    type: string;
    platform: string;
    headline: string;
    description: string;
    priority: string;
  }[];
  sentiment_analysis: SentimentAnalysis | null;
  topic_clusters: TopicCluster | null;
  purchase_intent: PurchaseIntentAnalysis | null;
  competitive_positioning: CompetitivePositioning | null;
  media_affinity: MediaAffinityReport | null;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export report as JSON
 */
export function exportReportAsJSON(report: ExportableReport, brandName: string) {
  const json = JSON.stringify(report, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  triggerDownload(blob, `${brandName.replace(/\s+/g, "-").toLowerCase()}-intelligence-report.json`);
}

/**
 * Export report as CSV — flattens key sections into tabular format
 */
export function exportReportAsCSV(report: ExportableReport, brandName: string) {
  const lines: string[] = [];

  const escape = (val: unknown): string => {
    const s = String(val ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  // Competitors
  if (report.competitors.length > 0) {
    lines.push("--- Competitors ---");
    lines.push("Name,Description,Pricing Tier,Website");
    for (const c of report.competitors) {
      lines.push([escape(c.name), escape(c.description), escape(c.pricingTier), escape(c.website)].join(","));
    }
    lines.push("");
  }

  // Audience Segments
  const segments = report.audience_insights.segments ?? [];
  if (segments.length > 0) {
    lines.push("--- Audience Segments ---");
    lines.push("Segment,Description,Age Range,Gender,Income");
    for (const s of segments) {
      lines.push([
        escape((s as { name?: string }).name || s.segment),
        escape(s.description),
        escape(s.demographics?.ageRange),
        escape(s.demographics?.gender),
        escape(s.demographics?.income),
      ].join(","));
    }
    lines.push("");
  }

  // Sentiment by Platform
  if (report.sentiment_analysis?.byPlatform && report.sentiment_analysis.byPlatform.length > 0) {
    lines.push("--- Sentiment by Platform ---");
    lines.push("Platform,Score,Label,Trend Direction,Sample Size");
    for (const p of report.sentiment_analysis.byPlatform) {
      lines.push([escape(p.platform), escape(p.score), escape(p.label), escape(p.trendDirection), escape(p.sampleSize)].join(","));
    }
    lines.push("");
  }

  // Topic Clusters
  if (report.topic_clusters?.clusters && report.topic_clusters.clusters.length > 0) {
    lines.push("--- Topic Clusters ---");
    lines.push("Cluster,Description,Sentiment Average,Relevance Score");
    for (const c of report.topic_clusters.clusters) {
      lines.push([escape(c.name), escape(c.description), escape(c.sentimentAverage), escape(c.relevanceScore)].join(","));
    }
    lines.push("");
  }

  // Purchase Intent Signals
  if (report.purchase_intent?.signals && report.purchase_intent.signals.length > 0) {
    lines.push("--- Purchase Intent Signals ---");
    lines.push("Signal,Stage,Strength,Description");
    for (const s of report.purchase_intent.signals) {
      lines.push([escape(s.signal), escape(s.stage), escape(s.strength), escape(s.description)].join(","));
    }
    lines.push("");
  }

  const csv = lines.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, `${brandName.replace(/\s+/g, "-").toLowerCase()}-intelligence-report.csv`);
}

/**
 * Export report as PDF using jspdf
 */
export async function exportReportAsPDF(report: ExportableReport, brandName: string) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  const checkPage = (needed: number) => {
    if (y + needed > 270) {
      doc.addPage();
      y = 20;
    }
  };

  const addTitle = (text: string) => {
    checkPage(15);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(text, margin, y);
    y += 8;
    doc.setDrawColor(139, 92, 246);
    doc.line(margin, y, margin + 40, y);
    y += 6;
  };

  const addSubtitle = (text: string) => {
    checkPage(10);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(text, margin, y);
    y += 6;
  };

  const addText = (text: string, indent = 0) => {
    checkPage(8);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(text, contentWidth - indent);
    for (const line of lines) {
      checkPage(5);
      doc.text(line, margin + indent, y);
      y += 4.5;
    }
  };

  const addBullet = (text: string) => {
    addText(`  \u2022 ${text}`, 2);
  };

  // Header
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(`${brandName}`, margin, y);
  y += 8;
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text("Market Intelligence Report", margin, y);
  y += 5;
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date(report.generated_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, margin, y);
  y += 10;
  doc.setTextColor(0, 0, 0);

  // Executive Summary
  if (report.executive_summary) {
    addTitle("Executive Summary");
    addText(report.executive_summary.overview);
    y += 3;
    if (report.executive_summary.keyFindings.length > 0) {
      addSubtitle("Key Findings");
      for (const f of report.executive_summary.keyFindings) addBullet(f);
      y += 2;
    }
    if (report.executive_summary.opportunities.length > 0) {
      addSubtitle("Opportunities");
      for (const o of report.executive_summary.opportunities) addBullet(o);
      y += 2;
    }
    if (report.executive_summary.recommendations.length > 0) {
      addSubtitle("Recommendations");
      for (const r of report.executive_summary.recommendations) addBullet(r);
    }
    y += 5;
  }

  // Competitors
  if (report.competitors.length > 0) {
    addTitle("Competitors");
    for (const c of report.competitors) {
      checkPage(20);
      addSubtitle(c.name);
      if (c.description) addText(c.description, 2);
      if (c.pricingTier) addText(`Pricing: ${c.pricingTier}`, 2);
      y += 2;
    }
    y += 3;
  }

  // Sentiment Analysis
  if (report.sentiment_analysis) {
    addTitle("Sentiment Analysis");
    const sa = report.sentiment_analysis;
    addText(`Overall Score: ${sa.overall.score > 0 ? "+" : ""}${sa.overall.score.toFixed(2)} (${sa.overall.label}, ${sa.overall.intensity} intensity)`);
    y += 2;
    if (sa.byPlatform && sa.byPlatform.length > 0) {
      addSubtitle("Platform Breakdown");
      for (const p of sa.byPlatform) {
        addBullet(`${p.platform}: ${p.score > 0 ? "+" : ""}${p.score.toFixed(2)} (${p.label}) - ${p.trendDirection}`);
      }
    }
    y += 3;
  }

  // Purchase Intent
  if (report.purchase_intent && report.purchase_intent.signals.length > 0) {
    addTitle("Purchase Intent Signals");
    for (const s of report.purchase_intent.signals) {
      addBullet(`[${s.stage}] ${s.signal} (${s.strength})`);
    }
    y += 3;
  }

  doc.save(`${brandName.replace(/\s+/g, "-").toLowerCase()}-intelligence-report.pdf`);
}

/**
 * Export report as PPTX using pptxgenjs
 */
export async function exportReportAsPPTX(report: ExportableReport, brandName: string) {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";

  const slideOpts = { color: "FFFFFF", fontSize: 12, fontFace: "Helvetica" };
  const titleColor = "8B5CF6";

  // Title Slide
  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: "0F0A1E" };
  titleSlide.addText(brandName, { x: 0.5, y: 1.5, w: 9, fontSize: 36, bold: true, color: "FFFFFF", fontFace: "Helvetica" });
  titleSlide.addText("Market Intelligence Report", { x: 0.5, y: 2.5, w: 9, fontSize: 18, color: "A78BFA", fontFace: "Helvetica" });
  titleSlide.addText(new Date(report.generated_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), { x: 0.5, y: 3.2, w: 9, fontSize: 12, color: "9CA3AF", fontFace: "Helvetica" });

  // Executive Summary
  if (report.executive_summary) {
    const slide = pptx.addSlide();
    slide.background = { color: "0F0A1E" };
    slide.addText("Executive Summary", { x: 0.5, y: 0.3, w: 9, fontSize: 22, bold: true, color: titleColor, fontFace: "Helvetica" });
    slide.addText(report.executive_summary.overview, { x: 0.5, y: 1.0, w: 9, fontSize: 11, color: "D1D5DB", fontFace: "Helvetica", lineSpacingMultiple: 1.3 });

    const bullets: string[] = [];
    for (const f of report.executive_summary.keyFindings.slice(0, 4)) bullets.push(f);
    if (bullets.length > 0) {
      slide.addText("Key Findings", { x: 0.5, y: 2.5, w: 9, fontSize: 14, bold: true, color: "FFFFFF", fontFace: "Helvetica" });
      slide.addText(bullets.map((b) => ({ text: b, options: { bullet: true, ...slideOpts, fontSize: 10 } })), { x: 0.7, y: 3.0, w: 8.5, lineSpacingMultiple: 1.4 });
    }
  }

  // Competitors
  if (report.competitors.length > 0) {
    const slide = pptx.addSlide();
    slide.background = { color: "0F0A1E" };
    slide.addText("Competitive Landscape", { x: 0.5, y: 0.3, w: 9, fontSize: 22, bold: true, color: titleColor, fontFace: "Helvetica" });
    const rows: { text: string; options: Record<string, unknown> }[][] = [];
    rows.push([
      { text: "Competitor", options: { bold: true, fontSize: 10, color: "FFFFFF", fill: { color: "1E1B3A" } } },
      { text: "Positioning", options: { bold: true, fontSize: 10, color: "FFFFFF", fill: { color: "1E1B3A" } } },
      { text: "Pricing", options: { bold: true, fontSize: 10, color: "FFFFFF", fill: { color: "1E1B3A" } } },
    ]);
    for (const c of report.competitors.slice(0, 6)) {
      rows.push([
        { text: c.name, options: { fontSize: 9, color: "D1D5DB" } },
        { text: (c as { positioning?: string }).positioning || c.marketPosition || "", options: { fontSize: 9, color: "D1D5DB" } },
        { text: c.pricingTier || "N/A", options: { fontSize: 9, color: "D1D5DB" } },
      ]);
    }
    slide.addTable(rows, { x: 0.5, y: 1.0, w: 9, border: { color: "2D2B4E", pt: 0.5 }, colW: [3, 4, 2] });
  }

  // Sentiment Analysis
  if (report.sentiment_analysis) {
    const slide = pptx.addSlide();
    slide.background = { color: "0F0A1E" };
    slide.addText("Sentiment Analysis", { x: 0.5, y: 0.3, w: 9, fontSize: 22, bold: true, color: titleColor, fontFace: "Helvetica" });
    const sa = report.sentiment_analysis;
    slide.addText(`Overall: ${sa.overall.score > 0 ? "+" : ""}${sa.overall.score.toFixed(2)} (${sa.overall.label})`, { x: 0.5, y: 1.0, w: 9, fontSize: 16, bold: true, color: sa.overall.score > 0.2 ? "10B981" : sa.overall.score < -0.2 ? "F43F5E" : "F59E0B", fontFace: "Helvetica" });

    if (sa.byPlatform && sa.byPlatform.length > 0) {
      const items = sa.byPlatform.slice(0, 6).map((p) => ({
        text: `${p.platform}: ${p.score > 0 ? "+" : ""}${p.score.toFixed(2)} (${p.label}) - ${p.trendDirection}`,
        options: { bullet: true, fontSize: 10, color: "D1D5DB", fontFace: "Helvetica" },
      }));
      slide.addText(items, { x: 0.7, y: 1.8, w: 8.5, lineSpacingMultiple: 1.4 });
    }
  }

  // Purchase Intent
  if (report.purchase_intent && report.purchase_intent.signals.length > 0) {
    const slide = pptx.addSlide();
    slide.background = { color: "0F0A1E" };
    slide.addText("Purchase Intent Signals", { x: 0.5, y: 0.3, w: 9, fontSize: 22, bold: true, color: titleColor, fontFace: "Helvetica" });
    const items = report.purchase_intent.signals.slice(0, 8).map((s) => ({
      text: `[${s.stage}] ${s.signal} (${s.strength})`,
      options: { bullet: true, fontSize: 10, color: "D1D5DB", fontFace: "Helvetica" },
    }));
    slide.addText(items, { x: 0.7, y: 1.0, w: 8.5, lineSpacingMultiple: 1.4 });
  }

  pptx.writeFile({ fileName: `${brandName.replace(/\s+/g, "-").toLowerCase()}-intelligence-report.pptx` });
}
