"use client";

/**
 * RealtimeMonitor — Client Component
 *
 * Displays live activity feed, active users count, and generation stats.
 * Polls /api/admin/realtime every 30 seconds with auto-refresh toggle.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeData } from "@/lib/services/admin-analytics";
import {
  Activity,
  AlertTriangle,
  Image,
  Palette,
  RefreshCw,
  Users,
  UserPlus,
  CreditCard,
  Video,
  Wifi,
  WifiOff,
  Clock,
} from "lucide-react";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface RealtimeMonitorProps {
  initialData: RealtimeData;
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function formatRelativeTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

function getEventIcon(type: string) {
  switch (type) {
    case "new_user":
      return <UserPlus className="h-4 w-4" style={{ color: "rgba(16,185,129,1)" }} />;
    case "subscription_change":
      return <CreditCard className="h-4 w-4" style={{ color: "rgba(6,182,212,1)" }} />;
    case "persona_created":
      return <Palette className="h-4 w-4" style={{ color: "rgba(139,92,246,1)" }} />;
    case "creative_created":
      return <Image className="h-4 w-4" style={{ color: "rgba(245,158,11,1)" }} />;
    default:
      return <Activity className="h-4 w-4" style={{ color: "rgba(255,255,255,0.5)" }} />;
  }
}

function getEventColor(type: string): string {
  switch (type) {
    case "new_user":
      return "rgba(16,185,129,0.15)";
    case "subscription_change":
      return "rgba(6,182,212,0.15)";
    case "persona_created":
      return "rgba(139,92,246,0.15)";
    case "creative_created":
      return "rgba(245,158,11,0.15)";
    default:
      return "rgba(255,255,255,0.05)";
  }
}

// ──────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────

export function RealtimeMonitor({ initialData }: RealtimeMonitorProps) {
  const [data, setData] = useState<RealtimeData>(initialData);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/admin/realtime");
      if (res.ok) {
        const newData: RealtimeData = await res.json();
        setData(newData);
        setLastRefresh(new Date());
      }
    } catch (err) {
      console.error("Failed to fetch realtime data:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Auto-refresh polling
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchData, 30_000);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoRefresh, fetchData]);

  const { events, activeUsersCount, generationStats } = data;

  // Check for failure rate alerts
  const overallSuccessRate =
    generationStats.imagesToday + generationStats.videosToday > 0
      ? (
          (generationStats.imagesSuccessRate *
            generationStats.imagesToday +
            generationStats.videosSuccessRate *
              generationStats.videosToday) /
          (generationStats.imagesToday + generationStats.videosToday)
        )
      : 100;
  const overallFailureRate = 100 - overallSuccessRate;
  const hasFailureAlert = overallFailureRate > 5;

  return (
    <div className="space-y-6">
      {/* Controls bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Auto-refresh toggle */}
          <button
            onClick={() => setAutoRefresh((prev) => !prev)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              autoRefresh
                ? "bg-[var(--color-plasma-emerald)]/20 text-[var(--color-plasma-emerald)] shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                : "bg-white/[0.04] text-[var(--color-text-muted)] hover:bg-white/[0.08]"
            }`}
          >
            {autoRefresh ? (
              <Wifi className="h-3.5 w-3.5" />
            ) : (
              <WifiOff className="h-3.5 w-3.5" />
            )}
            Auto-refresh {autoRefresh ? "ON" : "OFF"}
          </button>

          {/* Manual refresh */}
          <button
            onClick={fetchData}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-white/[0.04] text-[var(--color-text-muted)] hover:bg-white/[0.08] hover:text-[var(--color-text-secondary)] transition-all disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
          <Clock className="h-3 w-3" />
          Last updated: {lastRefresh.toLocaleTimeString()}
        </div>
      </div>

      {/* Failure rate alert banner */}
      {hasFailureAlert && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl border"
          style={{
            background: "rgba(244,63,94,0.1)",
            borderColor: "rgba(244,63,94,0.3)",
            boxShadow: "0 0 20px rgba(244,63,94,0.15)",
          }}
        >
          <AlertTriangle
            className="h-5 w-5 shrink-0"
            style={{ color: "rgba(244,63,94,1)" }}
          />
          <div>
            <p className="text-sm font-semibold" style={{ color: "rgba(244,63,94,1)" }}>
              High Failure Rate Detected
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              Generation failure rate is {overallFailureRate.toFixed(1)}% today
              (threshold: 5%). Check generation services for issues.
            </p>
          </div>
        </div>
      )}

      {/* Top cards row: Active Users + Generation Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Users */}
        <div className="holo-card p-5">
          <div className="flex items-center gap-3">
            <div
              className="p-2.5 rounded-xl"
              style={{
                background: "rgba(16,185,129,0.15)",
                boxShadow: "0 0 16px rgba(16,185,129,0.2)",
              }}
            >
              <Users
                className="h-5 w-5"
                style={{ color: "var(--color-plasma-emerald)" }}
              />
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                Active Users
              </p>
              <p className="text-2xl font-bold text-[var(--color-plasma-emerald,rgba(16,185,129,1))]">
                {activeUsersCount}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                last 15 minutes
              </p>
            </div>
          </div>
        </div>

        {/* Personas Generated Today */}
        <div className="holo-card p-5">
          <div className="flex items-center gap-3">
            <div
              className="p-2.5 rounded-xl"
              style={{
                background: "rgba(245,158,11,0.15)",
                boxShadow: "0 0 16px rgba(245,158,11,0.2)",
              }}
            >
              <Palette
                className="h-5 w-5"
                style={{ color: "var(--color-plasma-amber)" }}
              />
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                Personas Today
              </p>
              <p className="text-2xl font-bold text-[var(--color-plasma-amber)]">
                {generationStats.personasToday}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                {generationStats.personasSuccessRate}% success
              </p>
            </div>
          </div>
        </div>

        {/* Images Generated Today */}
        <div className="holo-card p-5">
          <div className="flex items-center gap-3">
            <div
              className="p-2.5 rounded-xl"
              style={{
                background: "rgba(6,182,212,0.15)",
                boxShadow: "0 0 16px rgba(6,182,212,0.2)",
              }}
            >
              <Image
                className="h-5 w-5"
                style={{ color: "var(--color-plasma-cyan,rgba(6,182,212,1))" }}
              />
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                Images Today
              </p>
              <p className="text-2xl font-bold text-[var(--color-plasma-cyan,rgba(6,182,212,1))]">
                {generationStats.imagesToday}
              </p>
              <SuccessRateLabel rate={generationStats.imagesSuccessRate} />
            </div>
          </div>
        </div>

        {/* Videos Generated Today */}
        <div className="holo-card p-5">
          <div className="flex items-center gap-3">
            <div
              className="p-2.5 rounded-xl"
              style={{
                background: "rgba(139,92,246,0.15)",
                boxShadow: "0 0 16px rgba(139,92,246,0.2)",
              }}
            >
              <Video
                className="h-5 w-5"
                style={{ color: "rgba(139,92,246,1)" }}
              />
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
                Videos Today
              </p>
              <p className="text-2xl font-bold" style={{ color: "rgba(139,92,246,1)" }}>
                {generationStats.videosToday}
              </p>
              <SuccessRateLabel rate={generationStats.videosSuccessRate} />
            </div>
          </div>
        </div>
      </div>

      {/* Live Activity Feed */}
      <div className="holo-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Activity
                className="h-5 w-5"
                style={{ color: "var(--color-plasma-emerald)" }}
              />
              {autoRefresh && (
                <span
                  className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full animate-pulse"
                  style={{ background: "rgba(16,185,129,1)" }}
                />
              )}
            </div>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
              Live Activity Feed
            </h2>
            <span className="text-xs text-[var(--color-text-muted)]">
              Events from last 5 minutes
            </span>
          </div>
          <span className="text-xs text-[var(--color-text-muted)]">
            {events.length} event{events.length !== 1 ? "s" : ""}
          </span>
        </div>

        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-[var(--color-text-muted)]">
            <Activity className="h-8 w-8 mb-3 opacity-30" />
            <p className="text-sm">No recent activity in the last 5 minutes</p>
            <p className="text-xs mt-1">Events will appear here as they happen</p>
          </div>
        ) : (
          <div className="space-y-0 divide-y divide-white/[0.04]">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div
                  className="p-2 rounded-lg shrink-0 mt-0.5"
                  style={{ background: getEventColor(event.type) }}
                >
                  {getEventIcon(event.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--color-text-primary)] leading-relaxed">
                    {event.description}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    {formatRelativeTime(event.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────
// Sub-component: Success Rate Label
// ──────────────────────────────────────────────

function SuccessRateLabel({ rate }: { rate: number }) {
  const failureRate = 100 - rate;
  const isWarning = failureRate > 5;

  return (
    <p className="text-xs flex items-center gap-1">
      {isWarning && (
        <AlertTriangle
          className="h-3 w-3"
          style={{ color: "rgba(244,63,94,1)" }}
        />
      )}
      <span
        style={{
          color: isWarning ? "rgba(244,63,94,1)" : "var(--color-text-muted)",
        }}
      >
        {rate}% success
      </span>
    </p>
  );
}
