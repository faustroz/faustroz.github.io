'use client';
import { useState } from 'react';
import { X, Calendar, Save, Info } from 'lucide-react';

export default function DataForm({ show, editingEntry, onSave, onClose }) {
  const today = new Date().toISOString().split('T')[0];
  
  const [form, setForm] = useState(() => editingEntry || {
    date: today,
    views: 0,
    new_subscribers: 0,
    total_subscribers: 0,
    shorts_views: 0,
    watch_hours: 0,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      views: parseInt(form.views) || 0,
      new_subscribers: parseInt(form.new_subscribers) || 0,
      total_subscribers: parseInt(form.total_subscribers) || 0,
      shorts_views: parseInt(form.shorts_views) || 0,
      watch_hours: parseFloat(form.watch_hours) || 0,
    });
  };

  if (!show) return null;

  return (
    <div className="yt-modal-overlay" onClick={onClose}>
      <div className="yt-modal" onClick={e => e.stopPropagation()}>
        <div className="yt-modal-header">
          <h2>{editingEntry ? 'Edit Data' : 'Input Data Harian'}</h2>
          <button onClick={onClose} className="yt-modal-close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="yt-form">
          <div className="yt-form-group">
            <label>
              <Calendar size={14} />
              Tanggal
            </label>
            <input
              type="date"
              value={form.date}
              onChange={e => setForm({ ...form, date: e.target.value })}
              required
            />
          </div>

          <div className="yt-form-row">
            <div className="yt-form-group">
              <label>Views Hari Ini</label>
              <input
                type="number"
                value={form.views}
                onChange={e => setForm({ ...form, views: e.target.value })}
                placeholder="0"
                min="0"
              />
              <span className="yt-form-hint">Diisi manual atau via sync</span>
            </div>

            <div className="yt-form-group">
              <label>Subscriber Baru</label>
              <input
                type="number"
                value={form.new_subscribers}
                onChange={e => setForm({ ...form, new_subscribers: e.target.value })}
                placeholder="0"
                min="0"
              />
              <span className="yt-form-hint">Otomatis dihitung saat sync</span>
            </div>
          </div>

          <div className="yt-form-group">
            <label>Total Subscriber Saat Ini</label>
            <input
              type="number"
              value={form.total_subscribers}
              onChange={e => setForm({ ...form, total_subscribers: e.target.value })}
              placeholder="0"
              min="0"
            />
            <span className="yt-form-hint">Otomatis terisi saat sync dari YouTube</span>
          </div>

          <div className="yt-form-row">
            <div className="yt-form-group">
              <label>
                Shorts Views (90 hari)
                <span className="yt-form-label-manual">Manual</span>
              </label>
              <input
                type="number"
                value={form.shorts_views}
                onChange={e => setForm({ ...form, shorts_views: e.target.value })}
                placeholder="0"
                min="0"
              />
              <div className="yt-form-manual-note">
                <Info size={12} />
                Cek di YouTube Studio → Analytics → Eligibility
              </div>
            </div>

            <div className="yt-form-group">
              <label>
                Watch Hours (365 hari)
                <span className="yt-form-label-manual">Manual</span>
              </label>
              <input
                type="number"
                step="0.1"
                value={form.watch_hours}
                onChange={e => setForm({ ...form, watch_hours: e.target.value })}
                placeholder="0"
                min="0"
              />
              <div className="yt-form-manual-note">
                <Info size={12} />
                Cek di YouTube Studio → Analytics → Eligibility
              </div>
            </div>
          </div>

          <button type="submit" className="yt-form-submit">
            <Save size={16} />
            Simpan Data
          </button>
        </form>
      </div>
    </div>
  );
}
