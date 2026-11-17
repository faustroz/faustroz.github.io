"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Play, Trash2 } from "lucide-react";
import { requireSupabase } from "@/lib/supabase/client";
import { buildExamPlan, createExamScheduleRepository, EXAM_STATUS, formatCountdown, normalizeBlock } from "@/lib/hub/exam-schedule.mjs";
import { writePracticeFilters } from "@/lib/hub/academic-practice.mjs";

const emptyForm = { block: "", exam_type: "", exam_date: "", notes: "" };
const dateLabel = (value) => new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`));

export default function ExamSchedulePanel() {
  const router = useRouter();
  const repository = useMemo(() => { try { return createExamScheduleRepository(requireSupabase()); } catch { return null; } }, []);
  const [exams, setExams] = useState([]);
  const [inputs, setInputs] = useState({ questions: [], attempts: [] });
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const blockInput = useRef(null);

  const load = useCallback(async () => {
    if (!repository) { setLoading(false); setError("Supabase belum terhubung."); return; }
    setLoading(true);
    setError("");
    try {
      const [rows, planInputs] = await Promise.all([repository.list(), repository.loadPlanInputs()]);
      setExams(rows);
      setInputs(planInputs);
    } catch (loadError) {
      setError(loadError?.message || "Jadwal ujian gagal dimuat. Jalankan migrasi 047 di Supabase bila belum.");
    } finally {
      setLoading(false);
    }
  }, [repository]);

  useEffect(() => { load(); }, [load]);

  const plans = useMemo(() => buildExamPlan({ exams, questions: inputs.questions, attempts: inputs.attempts }), [exams, inputs]);
  const blocks = useMemo(() => [...new Set(inputs.questions.map((question) => String(question.block || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "id", { numeric: true })), [inputs.questions]);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const created = await repository.create(form);
      setExams((current) => [...current, created]);
      setForm(emptyForm);
    } catch (saveError) {
      setError(saveError?.message || "Jadwal gagal disimpan.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (plan) => {
    if (!window.confirm(`Hapus jadwal ${plan.exam.block} (${dateLabel(plan.exam.exam_date)})?`)) return;
    setError("");
    try {
      await repository.remove(plan.exam.id);
      setExams((current) => current.filter((exam) => exam.id !== plan.exam.id));
    } catch (removeError) {
      setError(removeError?.message || "Jadwal gagal dihapus.");
    }
  };

  const practice = (plan) => {
    const block = blocks.find((name) => normalizeBlock(name) === normalizeBlock(plan.exam.block)) || plan.exam.block;
    writePracticeFilters(window.sessionStorage, { examType: "", block, subject: "", topic: "", questionType: "" });
    router.push("/academic/question-bank?tab=practice");
  };

  return (
    <section className="hub-exam-schedule" aria-labelledby="exam-schedule-title">
      <header>
        <div><span>JADWAL UJIAN</span><h2 id="exam-schedule-title">Hitung mundur per blok.</h2><p>Isi tanggal ujian. Target harian dihitung dari soal blok yang belum kamu kuasai.</p></div>
        <CalendarClock aria-hidden="true" />
      </header>

      <form className="hub-exam-form" onSubmit={submit}>
        <label><span>Blok</span><input ref={blockInput} list="hub-exam-blocks" value={form.block} onChange={(event) => setForm({ ...form, block: event.target.value })} placeholder="mis. Blok 12" required maxLength={120} /></label>
        <datalist id="hub-exam-blocks">{blocks.map((name) => <option key={name} value={name} />)}</datalist>
        <label><span>Jenis ujian <small>opsional</small></span><input value={form.exam_type} onChange={(event) => setForm({ ...form, exam_type: event.target.value })} placeholder="mis. UKMPPD, OSPE" maxLength={60} /></label>
        <label><span>Tanggal</span><input type="date" value={form.exam_date} onChange={(event) => setForm({ ...form, exam_date: event.target.value })} required /></label>
        <button type="submit" className="hub-exam-submit" disabled={saving || !repository}>{saving ? "Menyimpan…" : "Tambah jadwal"}</button>
      </form>

      {error && <p className="hub-data-error" role="alert">{error}</p>}
      {loading ? <p className="hub-data-state">MEMUAT JADWAL…</p> : plans.length === 0 ? (
        <div className="hub-empty-state">
          <p>Belum ada jadwal ujian.</p>
          <button type="button" className="hub-empty-cta" onClick={() => blockInput.current?.focus()}>Tambah jadwal pertama</button>
        </div>
      ) : (
        <ol className="hub-exam-list">
          {plans.map((plan) => {
            const past = plan.status === EXAM_STATUS.PAST;
            const percent = plan.total ? Math.round((plan.mastered / plan.total) * 100) : 0;
            return (
              <li key={plan.exam.id} className={`hub-exam-item is-${plan.status}`}>
                <div className="hub-exam-count"><strong>{formatCountdown(plan)}</strong><small>{dateLabel(plan.exam.exam_date)}</small></div>
                <div className="hub-exam-body">
                  <h3>{plan.exam.block}{plan.exam.exam_type ? <small> · {plan.exam.exam_type}</small> : null}</h3>
                  {plan.total === 0 ? <p>Belum ada soal untuk blok ini di bank soal.</p> : (
                    <>
                      <div className="hub-exam-meter" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label={`Penguasaan ${plan.exam.block}`}><span style={{ width: `${percent}%` }} /></div>
                      <p>{plan.mastered} / {plan.total} soal dikuasai · {plan.remaining} tersisa</p>
                      {!past && <p className="hub-exam-target">{plan.remaining === 0 ? "Semua soal sudah dikuasai." : <>Target <b>{plan.perDay} soal/hari</b> · hari ini {plan.answeredToday} dijawab</>}</p>}
                    </>
                  )}
                </div>
                <div className="hub-exam-actions">
                  {!past && plan.total > 0 && <button type="button" className="hub-share-button" onClick={() => practice(plan)}><Play size={14} aria-hidden="true" /> Latihan blok</button>}
                  <button type="button" className="hub-share-button" onClick={() => remove(plan)} aria-label={`Hapus jadwal ${plan.exam.block}`}><Trash2 size={14} aria-hidden="true" /></button>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
