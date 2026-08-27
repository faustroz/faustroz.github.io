'use client';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import Header from '@/components/youtube/Header';
import ProgressSection from '@/components/youtube/ProgressSection';
import ChartsSection from '@/components/youtube/ChartsSection';
import DataForm from '@/components/youtube/DataForm';
import TopVideos from '@/components/youtube/TopVideos';
import DataManagement from '@/components/youtube/DataManagement';
import Insights from '@/components/youtube/Insights';
import SyncSettings from '@/components/youtube/SyncSettings';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const STORAGE_KEYS = {
  apiKey: 'yt_tracker_api_key',
  channelId: 'yt_tracker_channel_id',
  autoSync: 'yt_tracker_auto_sync',
  lastSync: 'yt_tracker_last_sync',
};

export default function YouTubeTrackerPage() {
  const [channelName, setChannelName] = useState('My Channel');
  const [dailyData, setDailyData] = useState([]);
  const [topVideos, setTopVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);

  const [apiKey, setApiKey] = useState('');
  const [channelId, setChannelId] = useState('');
  const [autoSync, setAutoSync] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  const loadLocalSettings = useCallback(() => {
    if (typeof window === 'undefined') return;
    setApiKey(localStorage.getItem(STORAGE_KEYS.apiKey) || '');
    setChannelId(localStorage.getItem(STORAGE_KEYS.channelId) || '');
    setAutoSync(localStorage.getItem(STORAGE_KEYS.autoSync) === 'true');
    const savedLastSync = localStorage.getItem(STORAGE_KEYS.lastSync);
    if (savedLastSync) {
      setLastSync(new Date(savedLastSync));
    }
  }, []);

  const saveLocalSettings = useCallback((key, value) => {
    localStorage.setItem(key, value);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    
    const { data: channelData } = await supabase
      .from('youtube_tracker_settings')
      .select('channel_name')
      .single();
    
    if (channelData?.channel_name) {
      setChannelName(channelData.channel_name);
    }

    const { data: daily } = await supabase
      .from('youtube_daily_stats')
      .select('*')
      .order('date', { ascending: true });
    
    if (daily) setDailyData(daily);

    const { data: videos } = await supabase
      .from('youtube_top_videos')
      .select('*')
      .order('views', { ascending: false });
    
    if (videos) setTopVideos(videos);

    setLoading(false);
  }, []);

  useEffect(() => {
    loadLocalSettings();
    loadData();
  }, [loadLocalSettings, loadData]);

  const syncFromYouTube = useCallback(async () => {
    if (!apiKey || !channelId) {
      setSyncError('API Key dan Channel ID harus diisi terlebih dahulu');
      return;
    }

    setSyncing(true);
    setSyncError(null);

    try {
      const channelRes = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${apiKey}`
      );

      if (!channelRes.ok) {
        const errData = await channelRes.json().catch(() => ({}));
        if (channelRes.status === 400 || channelRes.status === 403) {
          throw new Error('API key tidak valid atau kuota habis');
        }
        throw new Error(errData.error?.message || 'Gagal mengambil data channel');
      }

      const channelData = await channelRes.json();
      
      if (!channelData.items || channelData.items.length === 0) {
        throw new Error('Channel ID tidak ditemukan');
      }

      const channelStats = channelData.items[0].statistics;
      const channelSnippet = channelData.items[0].snippet;

      const totalSubscribers = parseInt(channelStats.subscriberCount) || 0;
      const totalViews = parseInt(channelStats.viewCount) || 0;
      const fetchedChannelName = channelSnippet.title;

      const searchRes = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=id&channelId=${channelId}&order=viewCount&maxResults=10&type=video&key=${apiKey}`
      );

      if (!searchRes.ok) {
        throw new Error('Gagal mengambil daftar video');
      }

      const searchData = await searchRes.json();
      const videoIds = searchData.items?.map(item => item.id.videoId).join(',') || '';

      let fetchedVideos = [];
      if (videoIds) {
        const videosRes = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}&key=${apiKey}`
        );

        if (videosRes.ok) {
          const videosData = await videosRes.json();
          fetchedVideos = videosData.items?.map(item => ({
            video_id: item.id,
            title: item.snippet.title,
            views: parseInt(item.statistics.viewCount) || 0,
            thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
          })) || [];
        }
      }

      await supabase
        .from('youtube_tracker_settings')
        .upsert({ id: 1, channel_name: fetchedChannelName });

      const today = new Date().toISOString().split('T')[0];
      const latestEntry = dailyData[dailyData.length - 1];
      const newSubscribers = latestEntry 
        ? Math.max(0, totalSubscribers - (latestEntry.total_subscribers || 0))
        : 0;

      await supabase
        .from('youtube_daily_stats')
        .upsert({
          date: today,
          views: 0,
          new_subscribers: newSubscribers,
          total_subscribers: totalSubscribers,
          shorts_views: latestEntry?.shorts_views || 0,
          watch_hours: latestEntry?.watch_hours || 0,
        }, { onConflict: 'date' });

      await supabase.from('youtube_top_videos').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      for (const video of fetchedVideos) {
        await supabase
          .from('youtube_top_videos')
          .upsert({
            video_id: video.video_id,
            title: video.title,
            views: video.views,
            thumbnail: video.thumbnail,
          });
      }

      const now = new Date();
      localStorage.setItem(STORAGE_KEYS.lastSync, now.toISOString());
      setLastSync(now);

      await loadData();

    } catch (err) {
      console.error('Sync error:', err);
      setSyncError(err.message || 'Terjadi kesalahan saat sync');
    } finally {
      setSyncing(false);
    }
  }, [apiKey, channelId, dailyData, loadData]);

  useEffect(() => {
    if (autoSync && apiKey && channelId && !syncing) {
      const shouldSync = !lastSync || (Date.now() - lastSync.getTime() > 5 * 60 * 1000);
      if (shouldSync) {
        syncFromYouTube();
      }
    }
  }, [autoSync, apiKey, channelId, lastSync, syncing, syncFromYouTube]);

  const saveChannelName = async (name) => {
    setChannelName(name);
    await supabase
      .from('youtube_tracker_settings')
      .upsert({ id: 1, channel_name: name });
  };

  const saveDailyEntry = async (entry) => {
    if (editingEntry) {
      await supabase
        .from('youtube_daily_stats')
        .update(entry)
        .eq('id', editingEntry.id);
    } else {
      await supabase
        .from('youtube_daily_stats')
        .upsert(entry, { onConflict: 'date' });
    }
    await loadData();
    setShowForm(false);
    setEditingEntry(null);
  };

  const deleteDailyEntry = async (id) => {
    await supabase.from('youtube_daily_stats').delete().eq('id', id);
    await loadData();
  };

  const saveTopVideo = async (video) => {
    await supabase.from('youtube_top_videos').upsert(video);
    await loadData();
  };

  const deleteTopVideo = async (id) => {
    await supabase.from('youtube_top_videos').delete().eq('id', id);
    await loadData();
  };

  const exportData = () => {
    const data = { channelName, dailyData, topVideos };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `youtube-tracker-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importData = async (file) => {
    const text = await file.text();
    const data = JSON.parse(text);
    
    if (data.channelName) {
      await saveChannelName(data.channelName);
    }
    
    if (data.dailyData?.length) {
      for (const entry of data.dailyData) {
        await supabase.from('youtube_daily_stats').upsert(entry, { onConflict: 'date' });
      }
    }
    
    if (data.topVideos?.length) {
      for (const video of data.topVideos) {
        await supabase.from('youtube_top_videos').upsert(video);
      }
    }
    
    await loadData();
  };

  const resetAllData = async () => {
    await supabase.from('youtube_daily_stats').delete().neq('id', 0);
    await supabase.from('youtube_top_videos').delete().neq('id', 0);
    await loadData();
  };

  if (loading) {
    return (
      <div className="yt-loading">
        <div className="yt-spinner"></div>
        <p>Memuat data...</p>
      </div>
    );
  }

  return (
    <div className="yt-app">
      <Header 
        channelName={channelName} 
        onSaveName={saveChannelName}
        dailyData={dailyData}
        lastSync={lastSync}
        syncing={syncing}
        onOpenSettings={() => setShowSettings(true)}
        onSync={syncFromYouTube}
        apiKey={apiKey}
        channelId={channelId}
      />
      
      <main className="yt-main">
        {syncError && (
          <div className="yt-sync-error">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {syncError}
            <button onClick={() => setSyncError(null)}>×</button>
          </div>
        )}

        <ProgressSection dailyData={dailyData} />
        <Insights dailyData={dailyData} />
        <ChartsSection dailyData={dailyData} />
        
        <DataForm 
          show={showForm}
          editingEntry={editingEntry}
          onSave={saveDailyEntry}
          onClose={() => { setShowForm(false); setEditingEntry(null); }}
        />
        
        <TopVideos 
          videos={topVideos}
          onSave={saveTopVideo}
          onDelete={deleteTopVideo}
        />
        
        <DataManagement 
          onExport={exportData}
          onImport={importData}
          onReset={resetAllData}
          dailyData={dailyData}
          onAddEntry={() => setShowForm(true)}
          onEditEntry={(entry) => { setEditingEntry(entry); setShowForm(true); }}
          onDeleteEntry={deleteDailyEntry}
        />
      </main>

      <SyncSettings
        show={showSettings}
        onClose={() => setShowSettings(false)}
        apiKey={apiKey}
        channelId={channelId}
        autoSync={autoSync}
        lastSync={lastSync}
        onSaveApiKey={(key) => {
          setApiKey(key);
          saveLocalSettings(STORAGE_KEYS.apiKey, key);
        }}
        onSaveChannelId={(id) => {
          setChannelId(id);
          saveLocalSettings(STORAGE_KEYS.channelId, id);
        }}
        onSaveAutoSync={(val) => {
          setAutoSync(val);
          saveLocalSettings(STORAGE_KEYS.autoSync, val.toString());
        }}
        onSync={syncFromYouTube}
        syncing={syncing}
      />
    </div>
  );
}
