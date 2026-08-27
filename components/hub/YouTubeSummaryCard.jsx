"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import ModuleCard from "@/components/hub/ModuleCard";
import { normalizeYoutubeSummary } from "@/lib/hub/youtube-summary.mjs";

const initialSummary = {
  state: "loading",
  channelName: "CONNECTING",
  subscribers: null,
  views: null,
};

function formatMetric(value) {
  if (value === null) return "—";
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export default function YouTubeSummaryCard() {
  const [summary, setSummary] = useState(initialSummary);

  useEffect(() => {
    let active = true;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      setSummary(normalizeYoutubeSummary({ error: new Error("not configured") }));
      return () => {
        active = false;
      };
    }

    const loadSummary = async () => {
      try {
        const supabase = createClient(url, key);
        const [settingsResult, dailyResult] = await Promise.all([
          supabase
            .from("youtube_tracker_settings")
            .select("channel_name")
            .eq("id", 1)
            .maybeSingle(),
          supabase
            .from("youtube_daily_stats")
            .select("total_subscribers, views")
            .order("date", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        const error = settingsResult.error || dailyResult.error;
        if (error) throw error;
        if (active) {
          setSummary(
            normalizeYoutubeSummary({
              settings: settingsResult.data,
              daily: dailyResult.data,
            })
          );
        }
      } catch (error) {
        if (active) setSummary(normalizeYoutubeSummary({ error }));
      }
    };

    loadSummary();
    return () => {
      active = false;
    };
  }, []);

  const description =
    summary.state === "unavailable"
      ? "Summary link is available. Live telemetry could not be reached."
      : summary.state === "empty"
        ? "The tracker is ready for its first channel snapshot."
        : "Latest public channel snapshot from the creator tracker.";

  return (
    <ModuleCard
      number="02"
      label="YouTube"
      status={summary.state === "loading" ? "SYNCING" : summary.state.toUpperCase()}
      href="/youtube"
      title={summary.channelName}
      description={description}
      variant="youtube"
    >
      <div className="hub-telemetry" aria-label="YouTube public summary">
        <div><span>Subscribers</span><strong>{formatMetric(summary.subscribers)}</strong></div>
        <div><span>Latest views</span><strong>{formatMetric(summary.views)}</strong></div>
      </div>
    </ModuleCard>
  );
}
