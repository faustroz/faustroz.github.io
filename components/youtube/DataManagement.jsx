'use client';
import { useState, useRef } from 'react';
import { Download, Upload, Trash2, Plus, Edit3, Calendar, AlertTriangle } from 'lucide-react';

export default function DataManagement({ 
  onExport, 
  onImport, 
  onReset, 
  dailyData,
  onAddEntry,
  onEditEntry,
  onDeleteEntry 
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const fileInputRef = useRef(null);

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onImport(file);
      e.target.value = '';
    }
  };

  const confirmReset = () => {
    onReset();
    setShowConfirm(false);
  };

  const sortedData = [...dailyData].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <section className="yt-section">
      <h2 className="yt-section-title">
        <Calendar size={18} />
        Data & Riwayat
      </h2>

      <div className="yt-data-actions">
        <button onClick={onAddEntry} className="yt-data-btn primary">
          <Plus size={16} />
          Input Data Baru
        </button>
        
        <button onClick={() => setShowHistory(!showHistory)} className="yt-data-btn">
          <Calendar size={16} />
          {showHistory ? 'Sembunyikan' : 'Lihat'} Riwayat ({dailyData.length})
        </button>
      </div>

      {showHistory && sortedData.length > 0 && (
        <div className="yt-history-list">
          {sortedData.map((entry) => (
            <div key={entry.id} className="yt-history-item">
              <div className="yt-history-date">
                {new Date(entry.date).toLocaleDateString('id-ID', { 
                  day: 'numeric', 
                  month: 'short', 
                  year: 'numeric' 
                })}
              </div>
              <div className="yt-history-stats">
                <span>{entry.views?.toLocaleString() || 0} views</span>
                <span>+{entry.new_subscribers || 0} subs</span>
                <span>{entry.total_subscribers?.toLocaleString() || 0} total</span>
              </div>
              <div className="yt-history-actions">
                <button onClick={() => onEditEntry(entry)} className="yt-history-action edit">
                  <Edit3 size={14} />
                </button>
                <button onClick={() => onDeleteEntry(entry.id)} className="yt-history-action delete">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="yt-data-management">
        <button onClick={onExport} className="yt-data-btn">
          <Download size={16} />
          Export Data
        </button>

        <button onClick={() => fileInputRef.current?.click()} className="yt-data-btn">
          <Upload size={16} />
          Import Data
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          style={{ display: 'none' }}
        />

        <button onClick={() => setShowConfirm(true)} className="yt-data-btn danger">
          <Trash2 size={16} />
          Reset Semua
        </button>
      </div>

      {showConfirm && (
        <div className="yt-confirm-overlay">
          <div className="yt-confirm-dialog">
            <div className="yt-confirm-icon">
              <AlertTriangle size={32} />
            </div>
            <h3>Reset Semua Data?</h3>
            <p>Tindakan ini akan menghapus semua data harian dan video top performer. Data tidak dapat dikembalikan.</p>
            <div className="yt-confirm-actions">
              <button onClick={() => setShowConfirm(false)} className="yt-confirm-btn cancel">
                Batal
              </button>
              <button onClick={confirmReset} className="yt-confirm-btn confirm">
                Ya, Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
