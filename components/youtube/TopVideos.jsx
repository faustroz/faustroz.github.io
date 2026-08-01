'use client';
import { useState } from 'react';
import { Plus, Trash2, Edit3, Video, Check, X, ExternalLink } from 'lucide-react';

export default function TopVideos({ videos, onSave, onDelete }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ title: '', views: 0 });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    onSave({
      id: editingId || undefined,
      title: form.title.trim(),
      views: parseInt(form.views) || 0,
    });
    
    setForm({ title: '', views: 0 });
    setShowAdd(false);
    setEditingId(null);
  };

  const startEdit = (video) => {
    setEditingId(video.id);
    setForm({ title: video.title, views: video.views });
    setShowAdd(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ title: '', views: 0 });
    setShowAdd(false);
  };

  const sortedVideos = [...videos].sort((a, b) => b.views - a.views);

  return (
    <section className="yt-section">
      <div className="yt-section-header">
        <h2 className="yt-section-title">
          <Video size={18} />
          Video Top Performer
        </h2>
        {!showAdd && (
          <button onClick={() => setShowAdd(true)} className="yt-add-btn">
            <Plus size={16} />
            Tambah Manual
          </button>
        )}
      </div>

      <p className="yt-section-hint">
        Video akan otomatis terisi saat sync dari YouTube API, atau tambah manual di atas
      </p>

      {showAdd && (
        <form onSubmit={handleSubmit} className="yt-video-form">
          <input
            type="text"
            placeholder="Judul video"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            required
          />
          <input
            type="number"
            placeholder="Views"
            value={form.views}
            onChange={e => setForm({ ...form, views: e.target.value })}
            min="0"
          />
          <button type="submit" className="yt-video-form-save">
            <Check size={16} />
          </button>
          <button type="button" onClick={cancelEdit} className="yt-video-form-cancel">
            <X size={16} />
          </button>
        </form>
      )}

      {sortedVideos.length === 0 ? (
        <div className="yt-empty">
          Belum ada video yang dicatat
          <br />
          <small>Klik &quot;Sync&quot; di header untuk fetch otomatis dari YouTube</small>
        </div>
      ) : (
        <div className="yt-videos-list">
          {sortedVideos.map((video, index) => (
            <div key={video.id} className="yt-video-item">
              <div className="yt-video-rank">#{index + 1}</div>
              {video.thumbnail && (
                <img 
                  src={video.thumbnail} 
                  alt={video.title}
                  className="yt-video-thumbnail"
                />
              )}
              <div className="yt-video-info">
                <span className="yt-video-title">{video.title}</span>
                <span className="yt-video-views">
                  {video.views.toLocaleString()} views
                </span>
                {video.video_id && (
                  <a 
                    href={`https://youtube.com/watch?v=${video.video_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="yt-video-link"
                  >
                    <ExternalLink size={12} />
                    Buka video
                  </a>
                )}
              </div>
              <div className="yt-video-actions">
                <button onClick={() => startEdit(video)} className="yt-video-action edit">
                  <Edit3 size={14} />
                </button>
                <button onClick={() => onDelete(video.id)} className="yt-video-action delete">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
