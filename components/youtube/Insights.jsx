'use client';
import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Calendar, BarChart3 } from 'lucide-react';

export default function Insights({ dailyData }) {
  const insights = useMemo(() => {
    if (!dailyData || dailyData.length === 0) {
      return null;
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const twentyEightDaysAgo = new Date(now);
    twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28);

    const last7Days = dailyData.filter(d => new Date(d.date) >= sevenDaysAgo);
    const last28Days = dailyData.filter(d => new Date(d.date) >= twentyEightDaysAgo);

    const avgViews7 = last7Days.length > 0 
      ? last7Days.reduce((sum, d) => sum + (d.views || 0), 0) / last7Days.length 
      : 0;
    
    const avgViews28 = last28Days.length > 0 
      ? last28Days.reduce((sum, d) => sum + (d.views || 0), 0) / last28Days.length 
      : 0;

    const viewsTrend = avgViews28 > 0 ? ((avgViews7 - avgViews28) / avgViews28) * 100 : 0;

    const subsGrowth7 = last7Days.reduce((sum, d) => sum + (d.new_subscribers || 0), 0);
    const subsGrowthRate = subsGrowth7 / 7;

    const latestShortsViews = dailyData.length > 0 
      ? dailyData[dailyData.length - 1].shorts_views || 0 
      : 0;
    const oldestShortsViews = last28Days.length > 0 
      ? last28Days[0].shorts_views || 0 
      : 0;
    const shortsGrowth7 = latestShortsViews > 0 && oldestShortsViews > 0
      ? (latestShortsViews - oldestShortsViews) / 28 * 7
      : subsGrowthRate * 1000;

    const daysToSubsTarget = subsGrowthRate > 0 
      ? Math.ceil((500 - (dailyData[dailyData.length - 1]?.total_subscribers || 0)) / subsGrowthRate)
      : null;

    const daysToShortsTarget = shortsGrowth7 > 0
      ? Math.ceil((3000000 - latestShortsViews) / shortsGrowth7)
      : null;

    return {
      avgViews7: Math.round(avgViews7),
      avgViews28: Math.round(avgViews28),
      viewsTrend,
      subsGrowth7,
      subsGrowthRate: subsGrowthRate.toFixed(1),
      daysToSubsTarget,
      daysToShortsTarget,
    };
  }, [dailyData]);

  if (!insights) {
    return null;
  }

  const trendUp = insights.viewsTrend > 0;

  return (
    <section className="yt-section">
      <h2 className="yt-section-title">
        <BarChart3 size={18} />
        Insight & Estimasi
      </h2>

      <div className="yt-insights-grid">
        <div className="yt-insight-card">
          <div className="yt-insight-header">
            <Calendar size={14} />
            Rata-rata Views
          </div>
          <div className="yt-insight-values">
            <div className="yt-insight-value">
              <span className="yt-insight-number">{insights.avgViews7.toLocaleString()}</span>
              <span className="yt-insight-period">7 hari terakhir</span>
            </div>
            <div className="yt-insight-divider"></div>
            <div className="yt-insight-value">
              <span className="yt-insight-number">{insights.avgViews28.toLocaleString()}</span>
              <span className="yt-insight-period">28 hari terakhir</span>
            </div>
          </div>
          <div className={`yt-insight-trend ${trendUp ? 'up' : 'down'}`}>
            {trendUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {Math.abs(insights.viewsTrend).toFixed(1)}% {trendUp ? 'naik' : 'turun'}
          </div>
        </div>

        {insights.daysToSubsTarget !== null && insights.daysToSubsTarget > 0 && (
          <div className="yt-insight-card estimate">
            <div className="yt-insight-header">
              <TrendingUp size={14} />
              Estimasi Target Subscriber
            </div>
            <div className="yt-insight-estimate">
              <span className="yt-estimate-number">{insights.daysToSubsTarget}</span>
              <span className="yt-estimate-unit">hari lagi</span>
            </div>
            <p className="yt-estimate-note">
              Berdasarkan rata-rata {insights.subsGrowthRate} subs/hari
            </p>
          </div>
        )}

        {insights.daysToShortsTarget !== null && insights.daysToShortsTarget > 0 && (
          <div className="yt-insight-card estimate">
            <div className="yt-insight-header">
              <TrendingUp size={14} />
              Estimasi Target Shorts Views
            </div>
            <div className="yt-insight-estimate">
              <span className="yt-estimate-number">{Math.min(insights.daysToShortsTarget, 999)}</span>
              <span className="yt-estimate-unit">hari lagi</span>
            </div>
            <p className="yt-estimate-note">
              Perkiraan berdasarkan tren 28 hari
            </p>
          </div>
        )}

        {insights.daysToSubsTarget !== null && insights.daysToSubsTarget <= 0 && (
          <div className="yt-insight-card met">
            <div className="yt-insight-header">
              <TrendingUp size={14} />
              Target Subscriber
            </div>
            <div className="yt-insight-estimate">
              <span className="yt-estimate-number">🎉</span>
              <span className="yt-estimate-unit">Tercapai!</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
