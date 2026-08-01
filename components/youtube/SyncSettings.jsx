'use client';
import { useState } from 'react';
import { X, Key, Hash, RefreshCw, HelpCircle, Check, ExternalLink } from 'lucide-react';

export default function SyncSettings({
  show,
  onClose,
  apiKey,
  channelId,
  autoSync,
  lastSync,
  onSaveApiKey,
  onSaveChannelId,
  onSaveAutoSync,
  onSync,
  syncing,
}) {
  const [tempApiKey, setTempApiKey] = useState(apiKey);
  const [tempChannelId, setTempChannelId] = useState(channelId);
  const [showApiKey, setShowApiKey] = useState(false);

  if (!show) return null;

  const handleSaveApiKey = () => {
    onSaveApiKey(tempApiKey);
  };

  const handleSaveChannelId = () => {
    onSaveChannelId(tempChannelId);
  };

  return (
    <div className="yt-modal-overlay" onClick={onClose}>
      <div className="yt-modal yt-settings-modal" onClick={e => e.stopPropagation()}>
        <div className="yt-modal-header">
          <h2>Pengaturan Sync</h2>
          <button onClick={onClose} className="yt-modal-close">
            <X size={20} />
          </button>
        </div>

        <div className="yt-settings-content">
          <div className="yt-settings-section">
            <h3>
              <Key size={14} />
              YouTube API Key
            </h3>
            <div className="yt-settings-input-group">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={tempApiKey}
                onChange={e => setTempApiKey(e.target.value)}
                placeholder="Masukkan API Key"
              />
              <button 
                onClick={() => setShowApiKey(!showApiKey)}
                className="yt-settings-toggle-visibility"
              >
                {showApiKey ? 'Sembunyikan' : 'Tampilkan'}
              </button>
              {tempApiKey !== apiKey && (
                <button onClick={handleSaveApiKey} className="yt-settings-save-btn">
                  <Check size={14} />
                </button>
              )}
            </div>
            <div className="yt-settings-help">
              <HelpCircle size={12} />
              <div>
                <p>Cara mendapatkan API Key:</p>
                <ol>
                  <li>Buka <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer">Google Cloud Console <ExternalLink size={10} /></a></li>
                  <li>Buat project baru atau pilih project yang ada</li>
                  <li>Enable &quot;YouTube Data API v3&quot; di Library</li>
                  <li>Buat Credential → API Key</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="yt-settings-section">
            <h3>
              <Hash size={14} />
              Channel ID
            </h3>
            <div className="yt-settings-input-group">
              <input
                type="text"
                value={tempChannelId}
                onChange={e => setTempChannelId(e.target.value)}
                placeholder="Contoh: UCxxxxxxxxxxxxxxxxxxxxxx"
              />
              {tempChannelId !== channelId && (
                <button onClick={handleSaveChannelId} className="yt-settings-save-btn">
                  <Check size={14} />
                </button>
              )}
            </div>
            <div className="yt-settings-help">
              <HelpCircle size={12} />
              <div>
                <p>Cara mendapatkan Channel ID:</p>
                <ol>
                  <li>Buka YouTube Studio</li>
                  <li>Settings → Channel → Advanced settings</li>
                  <li>Atau lihat di URL channel Anda (youtube.com/channel/<strong>UCxxx...</strong>)</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="yt-settings-section">
            <h3>Auto-Sync</h3>
            <label className="yt-settings-checkbox">
              <input
                type="checkbox"
                checked={autoSync}
                onChange={e => onSaveAutoSync(e.target.checked)}
              />
              <span className="yt-checkbox-custom"></span>
              <span>Sync otomatis tiap kali buka aplikasi</span>
            </label>
            <p className="yt-settings-note">
              Data akan di-fetch otomatis dari YouTube saat halaman dimuat (minimal 5 menit sekali)
            </p>
          </div>

          {lastSync && (
            <div className="yt-settings-last-sync">
              <RefreshCw size={14} />
              Terakhir sync: {lastSync.toLocaleString('id-ID', {
                dateStyle: 'medium',
                timeStyle: 'short'
              })}
            </div>
          )}

          <div className="yt-settings-manual">
            {(!apiKey || !channelId) && (
              <p className="yt-settings-warning">
                Isi dan simpan API Key serta Channel ID terlebih dahulu
              </p>
            )}
            <button
              onClick={onSync}
              disabled={syncing}
              className={`yt-settings-sync-btn ${syncing ? 'syncing' : ''} ${(!apiKey || !channelId) ? 'disabled' : ''}`}
            >
              <RefreshCw size={16} />
              {syncing ? 'Menyinkronkan...' : 'Sync Sekarang'}
            </button>
          </div>

          <div className="yt-settings-quota">
            <p>
              <strong>Kuota API:</strong> YouTube Data API v3 memiliki kuota gratis 10.000 unit/hari.
              Setiap sync menggunakan ~102 unit (1 channels + 100 search + 1 videos).
              Aman untuk digunakan berkali-kali sehari.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
