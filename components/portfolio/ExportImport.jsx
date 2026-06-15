'use client';
import { useRef, useState } from 'react';
import { Download, Upload, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
import { exportData, importData, clearAllData } from '@/lib/portfolio/storage';

export default function ExportImport({ onDataChange }) {
  const fileRef = useRef(null);
  const [status, setStatus] = useState(null); // { type: 'success'|'error', msg }
  const [confirmClear, setConfirmClear] = useState(false);

  const showStatus = (type, msg) => {
    setStatus({ type, msg });
    setTimeout(() => setStatus(null), 4000);
  };

  const handleExport = () => {
    try {
      exportData();
      showStatus('success', 'Data berhasil diekspor!');
    } catch (e) {
      showStatus('error', `Gagal ekspor: ${e.message}`);
    }
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        importData(ev.target.result);
        showStatus('success', `Berhasil import ${file.name}!`);
        onDataChange();
      } catch (err) {
        showStatus('error', `Gagal import: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleClear = () => {
    clearAllData();
    setConfirmClear(false);
    showStatus('success', 'Semua data telah dihapus');
    onDataChange();
  };

  return (
    <div className="pt-export-page">
      <div className="pt-section-header">
        <h2 className="pt-section-title">Backup & Restore</h2>
      </div>

      {status && (
        <div className={`pt-alert ${status.type}`}>
          {status.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          {status.msg}
        </div>
      )}

      <div className="pt-export-grid">
        {/* Export */}
        <div className="pt-export-card">
          <div className="pt-export-icon export">
            <Download size={28} />
          </div>
          <h3>Export Data</h3>
          <p>
            Download semua data portofolio sebagai file JSON. Gunakan untuk backup
            atau pindahkan ke device / browser lain.
          </p>
          <button className="pt-btn-primary" onClick={handleExport}>
            <Download size={15} />
            Export JSON
          </button>
        </div>

        {/* Import */}
        <div className="pt-export-card">
          <div className="pt-export-icon import">
            <Upload size={28} />
          </div>
          <h3>Import Data</h3>
          <p>
            Restore data dari file backup JSON. Data yang ada akan <strong>ditimpa sepenuhnya</strong>.
            Pastikan kamu sudah backup terlebih dahulu.
          </p>
          <button className="pt-btn-primary" onClick={() => fileRef.current?.click()}>
            <Upload size={15} />
            Pilih File JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            style={{ display: 'none' }}
          />
        </div>

        {/* Clear */}
        <div className="pt-export-card danger">
          <div className="pt-export-icon danger">
            <Trash2 size={28} />
          </div>
          <h3>Hapus Semua Data</h3>
          <p>
            Hapus <strong>seluruh data portofolio</strong> dari browser ini. Aksi ini
            tidak dapat dibatalkan. Pastikan sudah export terlebih dahulu.
          </p>
          {confirmClear ? (
            <div className="pt-confirm-row">
              <button className="pt-btn-danger" onClick={handleClear}>
                Ya, Hapus Semua
              </button>
              <button className="pt-btn-ghost" onClick={() => setConfirmClear(false)}>
                Batal
              </button>
            </div>
          ) : (
            <button
              className="pt-btn-ghost danger"
              onClick={() => setConfirmClear(true)}
            >
              <Trash2 size={15} />
              Hapus Semua Data
            </button>
          )}
        </div>
      </div>

      {/* Info box */}
      <div className="pt-info-box">
        <AlertTriangle size={16} />
        <div>
          <strong>Tentang Penyimpanan Data</strong>
          <p>
            Semua data portofolio tersimpan di <code>localStorage</code> browser ini saja.
            Data tidak pernah dikirim ke server manapun. Jika kamu ganti browser, device,
            atau menghapus data browser, data portofolio akan hilang. Gunakan fitur
            Export/Import untuk backup rutin.
          </p>
        </div>
      </div>
    </div>
  );
}
