"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { POCUS_VIEWS, evaluateProbe } from "@/lib/hub/pocus-views.mjs";
import { buildHeartModel, cardiacPulse, projectPoint, rotatePoint } from "@/lib/hub/pocus-heart-model.mjs";
import { drawSectorFrame } from "@/lib/hub/pocus-sector.mjs";
import { EDUS2_CLIPS, EDUS2_GROUPS, EDUS2_SOURCE, getEdus2ClipsByGroup } from "@/lib/hub/pocus-library.mjs";

const HEART_MODEL = buildHeartModel();
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function useCanvasFrame(draw) {
  const canvasRef = useRef(null);
  const drawRef = useRef(draw);
  drawRef.current = draw;
  useEffect(() => {
    let raf = 0;
    const schedule = (callback) => (typeof window.requestAnimationFrame === "function" ? window.requestAnimationFrame(callback) : setTimeout(() => callback(performance.now()), 16));
    const cancel = (id) => (typeof window.cancelAnimationFrame === "function" ? window.cancelAnimationFrame(id) : clearTimeout(id));
    const frame = (time) => {
      const canvas = canvasRef.current;
      if (canvas) {
        const context = canvas.getContext("2d");
        if (context) {
          const width = canvas.clientWidth;
          const height = canvas.clientHeight;
          const dpr = window.devicePixelRatio || 1;
          if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
            canvas.width = Math.round(width * dpr);
            canvas.height = Math.round(height * dpr);
          }
          context.setTransform(dpr, 0, 0, dpr, 0, 0);
          drawRef.current(context, width, height, time);
        }
      }
      raf = schedule(frame);
    };
    raf = schedule(frame);
    return () => cancel(raf);
  }, []);
  return canvasRef;
}

function HeartCanvas({ labelsOn, selectedId, onSelect, hr }) {
  const orientation = useRef({ yaw: 0.5, pitch: -0.18, zoom: 1 });
  const drag = useRef(null);
  const hrRef = useRef(hr);
  hrRef.current = hr;
  const labelsRef = useRef(labelsOn);
  labelsRef.current = labelsOn;
  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;

  const canvasRef = useCanvasFrame((context, width, height, time) => {
    const phase = ((time / 1000) * (hrRef.current / 60)) % 1;
    const pulse = cardiacPulse(phase);
    const { yaw, pitch, zoom } = orientation.current;
    const scale = Math.min(width, height) * 0.3 * zoom;
    const cx = width / 2;
    const cy = height / 2;
    context.clearRect(0, 0, width, height);
    const projected = HEART_MODEL.map((part) => {
      const center = rotatePoint(part.center, yaw, pitch);
      return { part, center, screen: projectPoint(center, { scale, cx, cy }) };
    }).sort((a, b) => a.center[2] - b.center[2]);
    for (const { part, center, screen } of projected) {
      const factor = part.beat === "ventricle" ? 1 - 0.05 * pulse : part.beat === "atrium" ? 1 + 0.03 * pulse : 1;
      const selected = part.id === selectedRef.current;
      const alpha = 0.16 + 0.42 * clamp((center[2] + 1) / 2, 0, 1);
      context.strokeStyle = selected ? "rgba(255,255,255,0.95)" : `rgba(255,255,255,${alpha.toFixed(3)})`;
      context.lineWidth = selected ? 1.6 : 1;
      for (const line of part.lines) {
        context.beginPath();
        line.forEach((point, index) => {
          const scaled = [
            center[0] + (point[0] - part.center[0]) * factor,
            center[1] + (point[1] - part.center[1]) * factor,
            center[2] + (point[2] - part.center[2]) * factor,
          ];
          const rotated = rotatePoint(scaled, yaw, pitch);
          const projectedPoint = projectPoint(rotated, { scale, cx, cy });
          if (index === 0) context.moveTo(projectedPoint.x, projectedPoint.y);
          else context.lineTo(projectedPoint.x, projectedPoint.y);
        });
        context.stroke();
      }
      if (labelsRef.current) {
        context.fillStyle = selected ? "rgba(255,255,255,0.98)" : "rgba(255,255,255,0.6)";
        context.font = '10px "IBM Plex Mono", ui-monospace, monospace';
        context.beginPath();
        context.arc(screen.x, screen.y, 2.4, 0, Math.PI * 2);
        context.fill();
        context.fillText(part.label, screen.x + 7, screen.y + 3);
      }
    }
  });

  const onPointerDown = useCallback((event) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, moved: 0 };
  }, []);

  const onPointerMove = useCallback((event) => {
    if (!drag.current) return;
    const dx = event.clientX - drag.current.x;
    const dy = event.clientY - drag.current.y;
    drag.current.moved += Math.abs(dx) + Math.abs(dy);
    drag.current.x = event.clientX;
    drag.current.y = event.clientY;
    orientation.current.yaw += dx * 0.008;
    orientation.current.pitch = clamp(orientation.current.pitch + dy * 0.006, -1.2, 1.2);
  }, []);

  const onPointerUp = useCallback((event) => {
    const dragState = drag.current;
    drag.current = null;
    if (!dragState || dragState.moved > 6 || !onSelect) return;
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;
    const { yaw, pitch, zoom } = orientation.current;
    const scale = Math.min(rect.width, rect.height) * 0.3 * zoom;
    let best = null;
    for (const part of HEART_MODEL) {
      const screen = projectPoint(rotatePoint(part.center, yaw, pitch), { scale, cx: rect.width / 2, cy: rect.height / 2 });
      const distance = Math.hypot(screen.x - px, screen.y - py);
      if (!best || distance < best.distance) best = { id: part.id, distance };
    }
    if (best && best.distance < 28) onSelect(best.id);
  }, [onSelect]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const onWheel = (event) => {
      event.preventDefault();
      orientation.current.zoom = clamp(orientation.current.zoom * Math.exp(-event.deltaY * 0.001), 0.6, 2);
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [canvasRef]);

  return <canvas ref={canvasRef} className="hub-pocus-canvas" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={() => { drag.current = null; }} aria-label="Interactive 3D heart model" role="img" />;
}

function SectorCanvas({ view, labelsOn, selectedId, hr }) {
  const hrRef = useRef(hr);
  hrRef.current = hr;
  const viewRef = useRef(view);
  viewRef.current = view;
  const labelsRef = useRef(labelsOn);
  labelsRef.current = labelsOn;
  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;

  const canvasRef = useCanvasFrame((context, width, height, time) => {
    const phase = ((time / 1000) * (hrRef.current / 60)) % 1;
    drawSectorFrame(context, {
      width,
      height,
      view: viewRef.current,
      phase,
      labels: labelsRef.current,
      selectedId: selectedRef.current,
      frame: Math.floor(time / 100),
    });
  });

  return <canvas ref={canvasRef} className="hub-pocus-canvas" aria-label={view ? `Simulated ultrasound sector, ${view.fullName}` : "Simulated ultrasound sector, no acoustic window"} role="img" />;
}

function ChestMap({ probe, onProbeChange, activeViewId }) {
  const svgRef = useRef(null);
  const dragging = useRef(false);

  const toMap = useCallback((event) => {
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: clamp(((event.clientX - rect.left) / rect.width) * 100, 10, 90),
      y: clamp(((event.clientY - rect.top) / rect.height) * 120, 10, 112),
    };
  }, []);

  const onPointerDown = useCallback((event) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragging.current = true;
    onProbeChange({ ...probe, ...toMap(event) });
  }, [onProbeChange, probe, toMap]);

  const onPointerMove = useCallback((event) => {
    if (!dragging.current) return;
    onProbeChange({ ...probe, ...toMap(event) });
  }, [onProbeChange, probe, toMap]);

  const stopDrag = useCallback(() => { dragging.current = false; }, []);

  return (
    <svg ref={svgRef} className="hub-pocus-chest" viewBox="0 0 100 120" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={stopDrag} onPointerCancel={stopDrag} role="application" aria-label="Chest map, drag the probe between acoustic windows">
      <rect x="14" y="6" width="72" height="106" rx="14" fill="none" stroke="rgba(255,255,255,0.14)" />
      <path d="M30 14 Q50 20 70 14" fill="none" stroke="rgba(255,255,255,0.12)" />
      <line x1="50" y1="18" x2="50" y2="64" stroke="rgba(255,255,255,0.2)" strokeWidth="1.4" />
      {[26, 34, 42, 50, 58].map((y) => (
        <g key={y} stroke="rgba(255,255,255,0.1)" fill="none">
          <path d={`M50 ${y} C40 ${y + 6} 30 ${y + 9} 22 ${y + 17}`} />
          <path d={`M50 ${y} C60 ${y + 6} 70 ${y + 9} 78 ${y + 17}`} />
        </g>
      ))}
      <line x1="50" y1="68" x2="50" y2="106" stroke="rgba(255,255,255,0.08)" strokeDasharray="2 3" />
      <ellipse cx="54" cy="48" rx="15" ry="19" fill="none" stroke="rgba(255,255,255,0.14)" strokeDasharray="3 3" />
      {POCUS_VIEWS.map((view) => {
        const active = view.id === activeViewId;
        return (
          <g key={view.id} className="hub-pocus-window" onPointerDown={(event) => { event.stopPropagation(); onProbeChange({ x: view.window.x, y: view.window.y, angle: view.angle }); }}>
            <circle cx={view.window.x} cy={view.window.y} r="6.5" fill="none" stroke={active ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.22)"} strokeDasharray="2 2.4" />
            <text x={view.window.x} y={view.window.y + 11} textAnchor="middle" fontSize="3.4" fill={active ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.4)"} fontFamily="'IBM Plex Mono', monospace">{view.name}</text>
          </g>
        );
      })}
      <g transform={`translate(${probe.x} ${probe.y}) rotate(${probe.angle})`} className="hub-pocus-probe">
        <rect x="-1.4" y="1" width="2.8" height="7" rx="1" fill="rgba(255,255,255,0.4)" />
        <path d="M0 0 L-5.4 -10.4 A11.8 11.8 0 0 1 5.4 -10.4 Z" fill="rgba(229,231,235,0.16)" stroke="rgba(255,255,255,0.8)" strokeWidth="0.9" />
      </g>
    </svg>
  );
}

const FINDING_LABELS = { positive: "POS", negative: "NEG", normal: "NORMAL", unspecified: "STUDY" };

function RealClipCard({ clip }) {
  return (
    <article className="hub-pocus-clip">
      <div className="hub-pocus-clip-head">
        <span className="hub-pocus-clip-badge">REAL RECORDING</span>
        <span className={"hub-pocus-clip-finding is-" + clip.finding}>{FINDING_LABELS[clip.finding]}</span>
      </div>
      <video className="hub-pocus-clip-video" controls preload="metadata" poster={clip.poster} src={clip.src} aria-label={`Real ultrasound recording, ${clip.title}`} />
      <h3 className="hub-pocus-clip-title">{clip.title}</h3>
      <p className="hub-pocus-clip-detail">{clip.detail}</p>
      <p className="hub-pocus-clip-file">{clip.file}</p>
    </article>
  );
}

export default function PocusLab() {
  const [probe, setProbe] = useState({ x: POCUS_VIEWS[0].window.x, y: POCUS_VIEWS[0].window.y, angle: POCUS_VIEWS[0].angle });
  const [labelsOn, setLabelsOn] = useState(true);
  const [selectedId, setSelectedId] = useState("");
  const [heartRate, setHeartRate] = useState(72);
  const [libraryGroup, setLibraryGroup] = useState("all");
  const [resetKey, setResetKey] = useState(0);

  const evaluation = useMemo(() => evaluateProbe(probe), [probe]);
  const activeView = evaluation.locked ? evaluation.view : null;

  useEffect(() => {
    if (activeView && selectedId && !activeView.structures.some((structure) => structure.id === selectedId)) setSelectedId("");
  }, [activeView, selectedId]);

  const selectPreset = useCallback((view) => {
    setProbe({ x: view.window.x, y: view.window.y, angle: view.angle });
    setSelectedId("");
  }, []);

  const resetOrientation = useCallback(() => setResetKey((value) => value + 1), []);

  const qualityPercent = Math.round(evaluation.quality * 100);
  const libraryClips = useMemo(() => getEdus2ClipsByGroup(libraryGroup), [libraryGroup]);

  return (
    <div className="hub-pocus-lab">
      <div className="hub-pocus-toolbar">
        <div className="hub-pocus-presets" role="group" aria-label="Preset examination views">
          {POCUS_VIEWS.map((view) => (
            <button key={view.id} type="button" className="hub-pocus-preset" aria-pressed={activeView?.id === view.id} onClick={() => selectPreset(view)}>{view.name}</button>
          ))}
        </div>
        <div className="hub-pocus-toolbar-controls">
          <button type="button" className="hub-pocus-preset" aria-pressed={labelsOn} onClick={() => setLabelsOn((value) => !value)}>{labelsOn ? "LABELS ON" : "LABELS OFF"}</button>
          <label className="hub-pocus-hr">
            <span>HR {heartRate}</span>
            <input type="range" min="40" max="140" step="2" value={heartRate} onChange={(event) => setHeartRate(Number(event.target.value))} aria-label="Simulated heart rate in beats per minute" />
          </label>
        </div>
      </div>
      <div className="hub-pocus-grid">
        <section className="hub-pocus-card" aria-label="3D heart model">
          <span className="hub-pocus-label">3D HEART MODEL</span>
          <div className="hub-pocus-canvas-wrap hub-pocus-canvas-wrap--model">
            <HeartCanvas key={resetKey} labelsOn={labelsOn} selectedId={selectedId} onSelect={setSelectedId} hr={heartRate} />
          </div>
          <p className="hub-pocus-hint">Drag to rotate · scroll to zoom · tap a chamber to inspect</p>
          <button type="button" className="hub-pocus-preset hub-pocus-reset" onClick={resetOrientation}>RESET VIEW</button>
        </section>
        <section className="hub-pocus-card" aria-label="Simulated ultrasound sector">
          <div className="hub-pocus-sector-head">
            <span className="hub-pocus-label">ULTRASOUND SECTOR</span>
            <span className="hub-pocus-quality" role="status">{activeView ? `LOCK ${qualityPercent}% · ${activeView.name}` : `NO WINDOW · NEAREST ${evaluation.view.name} ${qualityPercent}%`}</span>
          </div>
          <div className="hub-pocus-canvas-wrap hub-pocus-canvas-wrap--sector">
            <SectorCanvas view={activeView} labelsOn={labelsOn} selectedId={selectedId} hr={heartRate} />
          </div>
          <p className="hub-pocus-sim-note">EDUCATIONAL SIMULATION — NOT CLINICAL ULTRASOUND DATA</p>
          <ChestMap probe={probe} onProbeChange={setProbe} activeViewId={activeView?.id || ""} />
          <label className="hub-pocus-angle">
            <span>PROBE ANGLE {probe.angle}°</span>
            <input type="range" min="-180" max="180" step="1" value={probe.angle} onChange={(event) => setProbe((current) => ({ ...current, angle: Number(event.target.value) }))} aria-label="Probe angle in degrees" />
          </label>
        </section>
        <section className="hub-pocus-card hub-pocus-card--info" aria-label="View guide">
          <span className="hub-pocus-label">{activeView ? activeView.fullName.toUpperCase() : "NO ACOUSTIC WINDOW"}</span>
          {activeView ? (
            <>
              <h2 className="hub-pocus-view-name">{activeView.name}</h2>
              <p className="hub-pocus-summary">{activeView.summary}</p>
              <p className="hub-pocus-detail">{activeView.detail}</p>
              <div className="hub-pocus-structures" role="group" aria-label="Cardiac structures in this view">
                {activeView.structures.map((structure) => (
                  <button key={structure.id} type="button" className={"hub-pocus-structure" + (selectedId === structure.id ? " is-selected" : "")} aria-pressed={selectedId === structure.id} onClick={() => setSelectedId((current) => (current === structure.id ? "" : structure.id))}>
                    <span>{structure.label}</span>
                    <strong>{structure.name}</strong>
                  </button>
                ))}
              </div>
              {selectedId && activeView.structures.filter((structure) => structure.id === selectedId).map((structure) => (
                <p key={structure.id} className="hub-pocus-structure-detail" role="note"><strong>{structure.name}.</strong> {structure.description}</p>
              ))}
            </>
          ) : (
            <p className="hub-pocus-summary">Drag the probe on the chest map onto a marked window and align its angle to acquire a view. The sector shows noise until the probe sits inside an acoustic window.</p>
          )}
        </section>
      </div>
      <section className="hub-pocus-library" aria-label="Real ultrasound recording library">
        <div className="hub-pocus-library-head">
          <div className="hub-pocus-library-title">
            <span className="hub-pocus-label">REAL ULTRASOUND LIBRARY</span>
            <p className="hub-pocus-library-note">Real patient recordings from the Edus2 collection — unlike the schematic sector above, these are actual ultrasound video, not simulation.</p>
          </div>
          <div className="hub-pocus-library-filters" role="group" aria-label="Filter recordings by region">
            <button type="button" className="hub-pocus-preset" aria-pressed={libraryGroup === "all"} onClick={() => setLibraryGroup("all")}>ALL {EDUS2_CLIPS.length}</button>
            {EDUS2_GROUPS.map((group) => {
              const count = getEdus2ClipsByGroup(group.id).length;
              return (
                <button key={group.id} type="button" className="hub-pocus-preset" aria-pressed={libraryGroup === group.id} title={group.blurb} onClick={() => setLibraryGroup(group.id)}>{group.label} {count}</button>
              );
            })}
          </div>
        </div>
        <div className="hub-pocus-library-grid">
          {libraryClips.map((clip) => <RealClipCard key={clip.id} clip={clip} />)}
        </div>
        <footer className="hub-pocus-library-source">
          <p><strong>{EDUS2_SOURCE.title}</strong> by {EDUS2_SOURCE.authors}, licensed <a href={EDUS2_SOURCE.licenseUrl} target="_blank" rel="noreferrer noopener">{EDUS2_SOURCE.license}</a> — non-commercial educational use, share-alike applies. Source: <a href={EDUS2_SOURCE.sourceUrl} target="_blank" rel="noreferrer noopener">theSimTech</a> · <a href={EDUS2_SOURCE.torrentUrl} target="_blank" rel="noreferrer noopener">Academic Torrents</a>. Findings reflect the source filenames only; no clinical annotations are provided.</p>
        </footer>
      </section>
    </div>
  );
}
