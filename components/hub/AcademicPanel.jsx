"use client";
import { useState } from "react";
import CrudPanel from "@/components/hub/CrudPanel";
import { ACADEMIC_CHANNELS } from "@/lib/hub/module-config.mjs";
const points = { A: 4, "A-": 3.7, "B+": 3.3, B: 3, "B-": 2.7, "C+": 2.3, C: 2, D: 1, E: 0 };
export default function AcademicPanel() {
 const [records, setRecords] = useState([]); const credits = records.reduce((sum, row) => sum + Number(row.credits || 0), 0); const ipk = credits ? records.reduce((sum, row) => sum + Number(row.credits || 0) * (points[row.grade] ?? 0), 0) / credits : 0;
 const bySemester = [...new Set(records.map((row) => row.semester))].map((semester) => { const rows = records.filter((row) => row.semester === semester); const total = rows.reduce((sum, row) => sum + Number(row.credits || 0), 0); return { semester, ip: total ? rows.reduce((sum, row) => sum + Number(row.credits || 0) * (points[row.grade] ?? 0), 0) / total : 0 }; });
 return <><section className="hub-academic-summary"><article><span>IPK / CUMULATIVE</span><strong>{ipk.toFixed(2)}</strong></article><article><span>SKS / CREDITS</span><strong>{credits}</strong></article><article><span>SEMESTERS</span><strong>{bySemester.length}</strong></article>{bySemester.map((item) => <article key={item.semester}><span>IP {item.semester}</span><strong>{item.ip.toFixed(2)}</strong></article>)}</section><CrudPanel {...ACADEMIC_CHANNELS[0]} onRecordsChange={setRecords} /></>;
}
