// Canvas renderer for the simulated ultrasound sector. Educational drawing only —
// the output is a stylized teaching diagram, not real sonographic data.

import { SECTOR_SPREAD, POCUS_VIEWS } from "@/lib/hub/pocus-views.mjs";
import { cardiacPulse } from "@/lib/hub/pocus-heart-model.mjs";

const MONO = '10px "IBM Plex Mono", ui-monospace, monospace';

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeGeometry(width, height) {
  const apex = { x: width / 2, y: height * 0.97 };
  const radius = Math.min(width * 0.5, height * 0.92);
  const spread = (SECTOR_SPREAD / 2) * (Math.PI / 180);
  const toXY = (r, tDeg) => {
    const t = (tDeg * Math.PI) / 180;
    return { x: apex.x + r * radius * Math.sin(t), y: apex.y - r * radius * Math.cos(t) };
  };
  return { apex, radius, spread, toXY };
}

function sectorPath(ctx, geometry) {
  const { apex, radius, spread } = geometry;
  ctx.beginPath();
  ctx.moveTo(apex.x, apex.y);
  ctx.arc(apex.x, apex.y, radius, -Math.PI / 2 - spread, -Math.PI / 2 + spread);
  ctx.closePath();
}

function scaled(shape, axis, pulse) {
  if (axis === "ventricle") return 1 - 0.16 * pulse;
  if (axis === "atrium") return 1 + 0.08 * pulse;
  return 1;
}

function drawPool(ctx, geometry, structure, pulse, selected) {
  const { rx, ry, rot } = structure.shape;
  const factor = scaled(structure, structure.beat, pulse);
  const center = geometry.toXY(structure.shape.r, structure.shape.t);
  ctx.beginPath();
  ctx.ellipse(center.x, center.y, rx * geometry.radius * factor, ry * geometry.radius * factor, (rot * Math.PI) / 180, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(4, 5, 7, 0.92)";
  ctx.fill();
  ctx.strokeStyle = selected ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.34)";
  ctx.lineWidth = selected ? 1.8 : 1.1;
  ctx.stroke();
}

function drawTissue(ctx, geometry, structure, selected) {
  const { rx, ry, rot } = structure.shape;
  const center = geometry.toXY(structure.shape.r, structure.shape.t);
  ctx.beginPath();
  ctx.ellipse(center.x, center.y, rx * geometry.radius, ry * geometry.radius, (rot * Math.PI) / 180, 0, Math.PI * 2);
  ctx.fillStyle = selected ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.13)";
  ctx.fill();
}

function drawLine(ctx, geometry, structure, selected) {
  const { r1, t1, r2, t2, width } = structure.shape;
  const a = geometry.toXY(r1, t1);
  const b = geometry.toXY(r2, t2);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.strokeStyle = selected ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.62)";
  ctx.lineWidth = width;
  ctx.stroke();
}

function drawValve(ctx, geometry, structure, phase, selected) {
  const { r, t, len, spread, mode } = structure.shape;
  const hinge = geometry.toXY(r, t);
  const openAmount = mode === "systole" ? cardiacPulse(phase) : 1 - cardiacPulse(phase);
  const angle = (t * Math.PI) / 180;
  const opening = spread * openAmount;
  for (const side of [-1, 1]) {
    const leafAngle = angle + side * opening * 0.55;
    ctx.beginPath();
    ctx.moveTo(hinge.x, hinge.y);
    ctx.lineTo(hinge.x + Math.sin(leafAngle) * len * geometry.radius, hinge.y - Math.cos(leafAngle) * len * geometry.radius);
    ctx.strokeStyle = selected ? "rgba(255,255,255,0.98)" : "rgba(255,255,255,0.85)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawVessel(ctx, geometry, structure, selected) {
  const { r, t, len, gap, rot } = structure.shape;
  const center = geometry.toXY(r, t);
  const angle = ((t + rot) * Math.PI) / 180;
  const dx = Math.sin(angle);
  const dy = -Math.cos(angle);
  const px = Math.cos(angle) * gap * geometry.radius;
  const py = Math.sin(angle) * gap * geometry.radius;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(center.x - dx * len * geometry.radius * 0.5 + side * px, center.y - dy * len * geometry.radius * 0.5 + side * py);
    ctx.lineTo(center.x + dx * len * geometry.radius * 0.5 + side * px, center.y + dy * len * geometry.radius * 0.5 + side * py);
    ctx.strokeStyle = selected ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.6)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawArc(ctx, geometry, structure, selected) {
  const { r, t, spread, width } = structure.shape;
  const centerAngle = (t * Math.PI) / 180;
  const half = (spread / 2) * (Math.PI / 180);
  ctx.beginPath();
  ctx.arc(geometry.apex.x, geometry.apex.y, r * geometry.radius, -Math.PI / 2 + centerAngle - half, -Math.PI / 2 + centerAngle + half);
  ctx.strokeStyle = selected ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.7)";
  ctx.lineWidth = width;
  ctx.stroke();
}

function drawMarker(ctx, geometry, structure, selected) {
  const { r, t, spread } = structure.shape;
  for (const offset of [-spread / 2, spread / 2]) {
    const p = geometry.toXY(r, t + offset);
    ctx.beginPath();
    ctx.arc(p.x, p.y, selected ? 4 : 3, 0, Math.PI * 2);
    ctx.fillStyle = selected ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.75)";
    ctx.fill();
  }
}

function drawSpeckle(ctx, geometry, seed, count = 150) {
  const random = mulberry32(seed);
  for (let i = 0; i < count; i += 1) {
    const r = 0.12 + random() * 0.86;
    const t = -SECTOR_SPREAD / 2 + random() * SECTOR_SPREAD;
    const p = geometry.toXY(r, t);
    ctx.fillStyle = `rgba(255,255,255,${0.03 + random() * 0.07})`;
    ctx.fillRect(p.x, p.y, 1.6, 1.6);
  }
}

function drawNoise(ctx, width, height, seed) {
  const random = mulberry32(seed);
  for (let i = 0; i < 420; i += 1) {
    ctx.fillStyle = `rgba(255,255,255,${random() * 0.12})`;
    ctx.fillRect(random() * width, random() * height, 2, 2);
  }
}

function drawLabels(ctx, geometry, view, selectedId) {
  ctx.font = MONO;
  for (const structure of view.structures) {
    const p = geometry.toXY(structure.anchor.r, structure.anchor.t);
    const selected = structure.id === selectedId;
    ctx.fillStyle = selected ? "rgba(255,255,255,0.98)" : "rgba(255,255,255,0.66)";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.4, 0, Math.PI * 2);
    ctx.fill();
    const onLeft = p.x < geometry.apex.x;
    ctx.textAlign = onLeft ? "right" : "left";
    ctx.fillText(structure.label, p.x + (onLeft ? -8 : 8), p.y + 3);
  }
  ctx.textAlign = "left";
}

export function drawSectorFrame(ctx, { width, height, view, phase, labels, selectedId, frame }) {
  ctx.fillStyle = "#050505";
  ctx.fillRect(0, 0, width, height);
  const geometry = makeGeometry(width, height);
  if (!view) {
    drawNoise(ctx, width, height, 1000 + Math.floor(frame / 9));
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = MONO;
    ctx.textAlign = "center";
    ctx.fillText("NO ACOUSTIC WINDOW", width / 2, height / 2 - 8);
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fillText("MOVE THE PROBE ONTO A MARKED WINDOW", width / 2, height / 2 + 12);
    ctx.textAlign = "left";
    return;
  }
  const pulse = cardiacPulse(phase);
  ctx.save();
  sectorPath(ctx, geometry);
  ctx.clip();
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "rgba(255,255,255,0.05)");
  gradient.addColorStop(1, "rgba(255,255,255,0.015)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  drawSpeckle(ctx, geometry, 7000 + Math.floor(frame / 9));
  for (const structure of view.structures) {
    const selected = structure.id === selectedId;
    if (structure.kind === "pool") drawPool(ctx, geometry, structure, pulse, selected);
    else if (structure.kind === "tissue") drawTissue(ctx, geometry, structure, selected);
    else if (structure.kind === "line") drawLine(ctx, geometry, structure, selected);
    else if (structure.kind === "valve") drawValve(ctx, geometry, structure, phase, selected);
    else if (structure.kind === "vessel") drawVessel(ctx, geometry, structure, selected);
    else if (structure.kind === "arc") drawArc(ctx, geometry, structure, selected);
    else if (structure.kind === "marker") drawMarker(ctx, geometry, structure, selected);
  }
  ctx.restore();
  ctx.strokeStyle = "rgba(255,255,255,0.28)";
  ctx.lineWidth = 1;
  sectorPath(ctx, geometry);
  ctx.stroke();
  ctx.setLineDash([2, 5]);
  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  for (const fraction of [0.33, 0.66, 0.98]) {
    ctx.beginPath();
    ctx.arc(geometry.apex.x, geometry.apex.y, fraction * geometry.radius, -Math.PI / 2 - geometry.spread, -Math.PI / 2 + geometry.spread);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.font = MONO;
  const scale = 18;
  for (const fraction of [0.33, 0.66, 0.98]) {
    const p = geometry.toXY(fraction, -SECTOR_SPREAD / 2 + 4);
    ctx.fillText(`${Math.round(fraction * scale)} cm`, p.x + 4, p.y);
  }
  if (labels) drawLabels(ctx, geometry, view, selectedId);
}

export function viewHasStructure(viewId, structureId) {
  const view = POCUS_VIEWS.find((entry) => entry.id === viewId);
  return Boolean(view && structureId && view.structures.some((structure) => structure.id === structureId));
}
