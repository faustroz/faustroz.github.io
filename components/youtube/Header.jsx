'use client';
import { useState } from 'react';
import { Edit3, Check, X, Users, Eye, Settings, RefreshCw, Clock } from 'lucide-react';

export default function Header({ 
  channelName, 
  onSaveName, 
  dailyData, 
  lastSync,
  syncing,
  onOpenSettings,
  onSync,
  apiKey,
  channelId
}) {
  const [editing, setEditing] = useState(false);
  const [tempName, setTempName] = useState(channelName);

  const latestData = dailyData.length > 0 ? dailyData[dailyData.length - 1] : null;
  const totalViews = dailyData.reduce((sum, d) => sum + (d.views || 0), 0);
  const totalSubs = latestData?.total_subscribers || 0;

  const handleSave = () => {
    onSaveName(tempName);
    setEditing(false);
  };

  const canSync = apiKey && channelId;

  return (
    <header className="yt-header">
      <div className="yt-header-inner">
        <div className="yt-header-left">
          {editing ? (
            <div className="yt-header-edit">
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                className="yt-header-input"
                autoFocus
              />
              <button onClick={handleSave} className="yt-header-btn save">
                <Check size={16} />
              </button>
              <button onClick={() => setEditing(false)} className="yt-header-btn cancel">
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="yt-header-name">
              <h1>{channelName}</h1>
              <button onClick={() => { setTempName(channelName); setEditing(true); }} className="yt-header-edit-btn">
                <Edit3 size={14} />
              </button>
            </div>
          )}
        </div>

        <div className="yt-header-actions">
          <div className="yt-header-stats">
            <div className="yt-stat-pill">
              <Users size={14} />
              <span className="yt-stat-value">{totalSubs.toLocaleString()}</span>
              <span className="yt-stat-label">Subscriber</span>
            </div>
            <div className="yt-stat-pill">
              <Eye size={14} />
              <span className="yt-stat-value">{totalViews.toLocaleString()}</span>
              <span className="yt-stat-label">Total Views</span>
            </div>
          </div>

          <div className="yt-header-sync">
            {lastSync && (
              <span className="yt-last-sync">
                <Clock size={12} />
                {lastSync.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            
            {canSync && (
              <button 
                onClick={onSync} 
                className={`yt-sync-btn ${syncing ? 'syncing' : ''}`}
                disabled={syncing}
              >
                <RefreshCw size={14} />
                {syncing ? 'Syncing...' : 'Sync'}
              </button>
            )}
            
            <button onClick={onOpenSettings} className="yt-settings-btn">
              <Settings size={16} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
