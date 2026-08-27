import { describe, expect, it } from "vitest";
import { normalizeYoutubeSummary } from "@/lib/hub/youtube-summary.mjs";

describe("normalizeYoutubeSummary", () => {
  it("normalizes available channel data", () => {
    expect(
      normalizeYoutubeSummary({
        settings: { channel_name: "Ferdy" },
        daily: { total_subscribers: 1200, views: 34000 },
      })
    ).toEqual({
      state: "available",
      channelName: "Ferdy",
      subscribers: 1200,
      views: 34000,
    });
  });

  it("returns a truthful empty state", () => {
    expect(normalizeYoutubeSummary({ settings: null, daily: null })).toEqual({
      state: "empty",
      channelName: "CHANNEL NOT SET",
      subscribers: 0,
      views: 0,
    });
  });

  it("contains errors inside an unavailable state", () => {
    expect(normalizeYoutubeSummary({ error: new Error("offline") })).toEqual({
      state: "unavailable",
      channelName: "UNAVAILABLE",
      subscribers: null,
      views: null,
    });
  });
});
