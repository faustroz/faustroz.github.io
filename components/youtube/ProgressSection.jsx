'use client';
import { useMemo } from 'react';
import { CheckCircle, Target, PlayCircle, Clock, Zap } from 'lucide-react';

export default function ProgressSection({ dailyData }) {
  const stats = useMemo(() => {
    if (!dailyData || dailyData.length === 0) {
      return {
        subscribers: 0,
        shortsViews: 0,
        watchHours: 0,
        videoUploads: 0,
      };
    }

    const latest = dailyData[dailyData.length - 1];
    
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const recentEntries = dailyData.filter(d => new Date(d.date) >= ninetyDaysAgo);
    const videoUploads = recentEntries.length;

    return {
      subscribers: latest.total_subscribers || 0,
      shortsViews: latest.shorts_views || 0,
      watchHours: latest.watch_hours || 0,
      videoUploads,
    };
  }, [dailyData]);

  const targets = {
    subscribers: 500,
    videoUploads: 3,
    watchHours: 3000,
    shortsViews: 3000000,
  };

  const getProgress = (current, target) => Math.min(100, (current / target) * 100);
  
  const subsProgress = getProgress(stats.subscribers, targets.subscribers);
  const videosProgress = getProgress(stats.videoUploads, targets.videoUploads);
  const watchProgress = getProgress(stats.watchHours, targets.watchHours);
  const shortsProgress = getProgress(stats.shortsViews, targets.shortsViews);

  const watchMet = stats.watchHours >= targets.watchHours;
  const shortsMet = stats.shortsViews >= targets.shortsViews;
  const eitherMet = watchMet || shortsMet;

  return (
    <section className="yt-section">
      <h2 className="yt-section-title">
        <Target size={18} />
        Progress Monetisasi
      </h2>

      <div className="yt-progress-grid">
        <ProgressBar
          label="Subscriber"
          current={stats.subscribers}
          target={targets.subscribers}
          progress={subsProgress}
          icon={<Users size={16} />}
          met={stats.subscribers >= targets.subscribers}
        />

        <ProgressBar
          label="Video Upload (90 hari)"
          current={stats.videoUploads}
          target={targets.videoUploads}
          progress={videosProgress}
          icon={<PlayCircle size={16} />}
          met={stats.videoUploads >= targets.videoUploads}
        />

        <div className="yt-progress-or-group">
          <div className="yt-progress-or-header">
            <Zap size={14} />
            <span>Penuhi salah satu:</span>
          </div>
          
          <ProgressBar
            label="Watch Hours"
            current={stats.watchHours}
            target={targets.watchHours}
            progress={watchProgress}
            icon={<Clock size={16} />}
            met={watchMet}
            highlight={watchMet && !shortsMet}
            manualNote="Cek manual di YouTube Studio → Analytics → Eligibility"
          />

          <ProgressBar
            label="Shorts Views"
            current={stats.shortsViews}
            target={targets.shortsViews}
            progress={shortsProgress}
            icon={<Zap size={16} />}
            met={shortsMet}
            highlight={shortsMet && !watchMet}
            formatValue={(v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}K` : v}
            manualNote="Cek manual di YouTube Studio → Analytics → Eligibility"
          />

          {eitherMet && (
            <div className="yt-achieved-badge">
              <CheckCircle size={16} />
              Syarat watch time terpenuhi!
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ProgressBar({ label, current, target, progress, icon, met, highlight, formatValue, manualNote }) {
  const displayValue = formatValue ? formatValue(current) : current.toLocaleString();
  const displayTarget = formatValue ? formatValue(target) : target.toLocaleString();

  return (
    <div className={`yt-progress-card ${highlight ? 'highlight' : ''} ${met ? 'met' : ''}`}>
      <div className="yt-progress-header">
        <span className="yt-progress-label">
          {icon}
          {label}
        </span>
        {met && (
          <span className="yt-met-badge">
            <CheckCircle size={12} />
            Tercapai
          </span>
        )}
      </div>
      
      <div className="yt-progress-numbers">
        <span className="yt-progress-current">{displayValue}</span>
        <span className="yt-progress-divider">/</span>
        <span className="yt-progress-target">{displayTarget}</span>
      </div>

      <div className="yt-progress-bar-wrap">
        <div 
          className="yt-progress-bar"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      <div className="yt-progress-percent">{progress.toFixed(1)}%</div>
      
      {manualNote && !met && (
        <div className="yt-progress-manual-note">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 16v-4"/>
            <path d="M12 8h.01"/>
          </svg>
          {manualNote}
        </div>
      )}
    </div>
  );
}

function Users({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}
