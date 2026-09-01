"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, Network } from "lucide-react";
import SaveFindingButton from "@/components/hub/SaveFindingButton";
import { pivotHref } from "@/lib/hub/osint.mjs";

const confidence = (value) => ["confirmed", "possible", "uncertain"].includes(value) ? value : "uncertain";

export default function DigitalFootprintGraph({ findings = [], title = "Current session" }) {
  const nodes = useMemo(() => {
    const seen = new Set();
    return findings.filter((item) => {
      const key = `${item.finding_type}:${item.value || item.label}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key); return true;
    }).slice(0, 30);
  }, [findings]);
  const [selected, setSelected] = useState(null);
  const width = 720; const height = 420; const cx = width / 2; const cy = height / 2;
  const plotted = nodes.map((node, index) => {
    const ring = index < 12 ? 128 : 186;
    const ringIndex = index < 12 ? index : index - 12;
    const ringCount = index < 12 ? Math.min(12, nodes.length) : Math.max(1, nodes.length - 12);
    const angle = (ringIndex / ringCount) * Math.PI * 2 - Math.PI / 2;
    return { ...node, x: cx + Math.cos(angle) * ring, y: cy + Math.sin(angle) * ring };
  });
  const pivot = selected ? pivotHref(selected) : "";

  return <section className="hub-osint-panel" aria-labelledby="digital-footprint-heading">
    <header className="hub-osint-section-head"><div><span>RELATIONSHIP VIEW / EVIDENCE-AWARE</span><h2 id="digital-footprint-heading">Digital Footprint</h2><p>Connections mean findings were grouped in this session or case. They do not prove that identifiers belong to the same person.</p></div><Network aria-hidden="true" /></header>
    <div className="hub-osint-legend"><span className="is-confirmed">Confirmed fact</span><span className="is-possible">Possible match</span><span className="is-uncertain">Uncertain</span></div>
    {!nodes.length ? <div className="hub-data-state">NO FINDINGS TO MAP — RUN A LOOKUP OR OPEN A CASE</div> : <div className="hub-osint-graph-wrap"><svg className="hub-osint-graph" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Relationship graph for ${title}`}><g className="hub-osint-root"><circle cx={cx} cy={cy} r="42" /><text x={cx} y={cy - 3}>{title.slice(0, 18)}</text><text x={cx} y={cy + 14}>{nodes.length} FINDINGS</text></g>{plotted.map((node, index) => <g key={`${node.id || node.value}-${index}`}><line className={`is-${confidence(node.confidence)}`} x1={cx} y1={cy} x2={node.x} y2={node.y} /><g className={`hub-osint-node is-${confidence(node.confidence)}`} role="button" tabIndex="0" onClick={() => setSelected(node)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setSelected(node); }}><circle cx={node.x} cy={node.y} r="27" /><text x={node.x} y={node.y - 2}>{String(node.finding_type || "other").slice(0, 10)}</text><text x={node.x} y={node.y + 12}>{String(node.label || node.value || "finding").slice(0, 14)}</text></g></g>)}</svg></div>}
    {selected && <article className="hub-osint-node-detail"><div><span>{confidence(selected.confidence).toUpperCase()} / {selected.source || "MANUAL"}</span><strong>{selected.label}</strong><p>{selected.value}</p></div><div className="hub-osint-node-actions">{pivot && (pivot.startsWith("/") ? <Link href={pivot}>PIVOT TO TOOL <ArrowUpRight /></Link> : <a href={pivot} target="_blank" rel="noreferrer">OPEN SOURCE <ArrowUpRight /></a>)}<SaveFindingButton finding={selected} /></div></article>}
  </section>;
}
