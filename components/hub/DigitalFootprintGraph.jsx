"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { ArrowUpRight, LocateFixed, Network, ZoomIn, ZoomOut } from "lucide-react";
import SaveFindingButton from "@/components/hub/SaveFindingButton";
import { buildFootprintGraph, pivotHref } from "@/lib/hub/osint.mjs";

const confidence = (value) => ["confirmed", "possible", "uncertain"].includes(value) ? value : "uncertain";
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function layoutGraph(model) {
  const levels = new Map([[model.root.id, 0]]);
  for (let pass = 0; pass < 4; pass += 1) for (const edge of model.edges) if (levels.has(edge.from) && !levels.has(edge.to)) levels.set(edge.to, levels.get(edge.from) + 1);
  const grouped = [0, 1, 2, 3].map((level) => model.nodes.filter((node) => Math.min(levels.get(node.id) ?? 3, 3) === level));
  const width = 920; const height = Math.max(460, ...grouped.map((rows) => rows.length * 86 + 90));
  const xPositions = [92, 330, 570, 810];
  const nodes = model.nodes.map((node) => {
    const level = Math.min(levels.get(node.id) ?? 3, 3); const rows = grouped[level]; const index = rows.findIndex((item) => item.id === node.id);
    const gap = height / (rows.length + 1);
    return { ...node, x: xPositions[level], y: gap * (index + 1), level };
  });
  return { width, height, nodes, byId: new Map(nodes.map((node) => [node.id, node])) };
}

export default function DigitalFootprintGraph({ findings = [], title = "Investigation" }) {
  const model = useMemo(() => buildFootprintGraph(findings, title), [findings, title]);
  const layout = useMemo(() => layoutGraph(model), [model]);
  const [selectedId, setSelectedId] = useState("");
  const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 });
  const drag = useRef(null);
  const selected = layout.byId.get(selectedId) || null;
  const incoming = selected ? model.edges.find((edge) => edge.to === selected.id) : null;
  const pivot = selected?.finding ? pivotHref(selected.finding) : "";

  const zoom = (amount) => setViewport((current) => ({ ...current, scale: clamp(current.scale + amount, .55, 2.5) }));
  const fit = () => setViewport({ x: 0, y: 0, scale: 1 });
  const pointerDown = (event) => { if (event.button !== 0) return; event.currentTarget.setPointerCapture(event.pointerId); drag.current = { x: event.clientX, y: event.clientY, viewport, moved: false }; };
  const pointerMove = (event) => { if (!drag.current) return; const dx = event.clientX - drag.current.x; const dy = event.clientY - drag.current.y; if (Math.abs(dx) + Math.abs(dy) > 3) drag.current.moved = true; setViewport({ ...drag.current.viewport, x: drag.current.viewport.x + dx, y: drag.current.viewport.y + dy }); };
  const pointerUp = () => { drag.current = null; };

  return <section className="hub-osint-panel" aria-labelledby="digital-footprint-heading">
    <header className="hub-osint-section-head"><div><span>RELATIONSHIP VIEW / EVIDENCE-AWARE</span><h2 id="digital-footprint-heading">Digital Footprint</h2><p>Edges show provider checks, returned results, or explicit Case grouping. Username similarity alone never establishes identity ownership.</p></div><Network aria-hidden="true" /></header>
    <div className="hub-osint-graph-meta"><div className="hub-osint-legend"><span className="is-confirmed">Confirmed fact</span><span className="is-possible">Possible match</span><span className="is-uncertain">Uncertain</span></div>{model.mergedCount > 0 && <small>{model.mergedCount} duplicate {model.mergedCount === 1 ? "finding" : "findings"} merged</small>}</div>
    {!findings.length ? <div className="hub-data-state">NO FINDINGS TO MAP — RUN A LOOKUP OR OPEN A CASE</div> : <><div className="hub-osint-graph-toolbar" aria-label="Graph controls"><button type="button" onClick={() => zoom(.2)} aria-label="Zoom in"><ZoomIn /></button><button type="button" onClick={() => zoom(-.2)} aria-label="Zoom out"><ZoomOut /></button><button type="button" onClick={fit} aria-label="Fit graph to screen"><LocateFixed /></button><span>{Math.round(viewport.scale * 100)}%</span></div><div className="hub-osint-graph-wrap"><svg className="hub-osint-graph" viewBox={`0 0 ${layout.width} ${layout.height}`} role="img" aria-label={`Relationship graph centered on ${model.root.label}`} onWheel={(event) => { event.preventDefault(); zoom(event.deltaY < 0 ? .1 : -.1); }} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}><g transform={`translate(${viewport.x} ${viewport.y}) scale(${viewport.scale})`}>{model.edges.map((edge) => { const from = layout.byId.get(edge.from); const to = layout.byId.get(edge.to); if (!from || !to) return null; return <g key={edge.id}><line className={`is-${confidence(to.confidence)}`} x1={from.x + 38} y1={from.y} x2={to.x - 38} y2={to.y}><title>{edge.reason}</title></line></g>; })}{layout.nodes.map((node) => <g key={node.id} className={`hub-osint-node is-${confidence(node.confidence)}${selectedId === node.id ? " is-selected" : ""}`} role="button" tabIndex="0" transform={`translate(${node.x} ${node.y})`} onPointerDown={(event) => event.stopPropagation()} onClick={() => setSelectedId(node.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedId(node.id); } }}><rect x="-62" y="-29" width="124" height="58" rx="6" /><text y="-7">{String(node.kind || "finding").toUpperCase().slice(0, 14)}</text><text y="11" className="hub-osint-node-label">{String(node.label || node.value || "finding").slice(0, 20)}</text>{node.duplicateCount > 1 && <text y="23">MERGED ×{node.duplicateCount}</text>}</g>)}</g></svg></div></>}
    {selected && <article className="hub-osint-node-detail"><div><span>{confidence(selected.confidence).toUpperCase()} / {selected.kind.toUpperCase()}</span><strong>{selected.label}</strong><p>{selected.value}</p>{incoming && <p className="hub-osint-relation"><b>RELATIONSHIP</b>{incoming.reason}</p>}</div><div className="hub-osint-node-actions">{pivot && (pivot.startsWith("/") ? <Link href={pivot}>PIVOT TO TOOL <ArrowUpRight /></Link> : <a href={pivot} target="_blank" rel="noreferrer">OPEN SOURCE <ArrowUpRight /></a>)}{selected.finding && selected.id !== "root" && <SaveFindingButton finding={selected.finding} />}</div></article>}
  </section>;
}
