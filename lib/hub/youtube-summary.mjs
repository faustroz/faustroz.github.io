export function normalizeYoutubeSummary({
  settings = null,
  daily = null,
  error = null,
} = {}) {
  if (error) {
    return {
      state: "unavailable",
      channelName: "UNAVAILABLE",
      subscribers: null,
      views: null,
    };
  }

  if (!settings && !daily) {
    return {
      state: "empty",
      channelName: "CHANNEL NOT SET",
      subscribers: 0,
      views: 0,
    };
  }

  return {
    state: "available",
    channelName: settings?.channel_name || "CHANNEL NOT SET",
    subscribers: daily?.total_subscribers || 0,
    views: daily?.views || 0,
  };
}
