import { SHEET_ROWS, RHYTHM_STRIP_LEAD, sampleAt } from "./ecg-rhythms.mjs";

export const PX_PER_MM = 5;
const PAPER_BG = "#ffffff";
const GRID_FINE = "rgba(214, 74, 74, 0.22)";
const GRID_BOLD = "rgba(206, 56, 56, 0.4)";
const TRACE = "#141414";
const LABEL = "#3a3a3a";

export function computeSheetLayout({ width, height, paperSpeed, gain, zoom }) {
  const pxPerMm = PX_PER_MM * zoom;
  const pxPerSec = pxPerMm * paperSpeed;
  const mmPerMv = gain;
  const margin = 10;
  const cols = 4;
  const rows = SHEET_ROWS.length;
  const labelH = 14;
  const stripH = Math.max(120, Math.round(height * 0.24));
  const cellW = Math.floor((width - margin * 2) / cols);
  const gridH = height - margin * 2 - stripH - 8;
  const cellH = Math.floor((gridH - labelH * rows) / rows);
  return {
    width, height, pxPerMm, pxPerSec, mmPerMv, margin, cols, rows, labelH, stripH, cellW, cellH,
    cellSeconds: cellW / pxPerSec,
    mvToPx: (mv) => mv * pxPerMm * mmPerMv,
    totalSeconds: cols * (cellW / pxPerSec),
  };
}

function drawGrid(ctx, x, y, w, h, pxPerMm) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = PAPER_BG;
  ctx.fillRect(x, y, w, h);
  ctx.lineWidth = 1;
  ctx.strokeStyle = GRID_FINE;
  ctx.beginPath();
  for (let mx = 1; mx * pxPerMm < w; mx += 1) {
    const px = x + Math.round(mx * pxPerMm) + 0.5;
    ctx.moveTo(px, y);
    ctx.lineTo(px, y + h);
  }
  for (let my = 1; my * pxPerMm < h; my += 1) {
    const py = y + Math.round(my * pxPerMm) + 0.5;
    ctx.moveTo(x, py);
    ctx.lineTo(x + w, py);
  }
  ctx.stroke();
  ctx.strokeStyle = GRID_BOLD;
  ctx.beginPath();
  for (let mx = 5; mx * pxPerMm < w; mx += 5) {
    const px = x + Math.round(mx * pxPerMm) + 0.5;
    ctx.moveTo(px, y);
    ctx.lineTo(px, y + h);
  }
  for (let my = 5; my * pxPerMm < h; my += 5) {
    const py = y + Math.round(my * pxPerMm) + 0.5;
    ctx.moveTo(x, py);
    ctx.lineTo(x + w, py);
  }
  ctx.stroke();
  ctx.restore();
}

function drawTrace(ctx, gen, lead, x, y, w, h, layout, startSec) {
  const baseline = y + h * 0.62;
  const calOffset = 6 * layout.pxPerMm;
  const calTop = baseline - layout.mvToPx(1);
  const calWidth = 5 * layout.pxPerMm;
  ctx.strokeStyle = TRACE;
  ctx.lineWidth = 1.3;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(x + 2, baseline);
  ctx.lineTo(x + calOffset, baseline);
  ctx.lineTo(x + calOffset, calTop);
  ctx.lineTo(x + calOffset + calWidth, calTop);
  ctx.lineTo(x + calOffset + calWidth, baseline);
  ctx.moveTo(x + calOffset + calWidth, baseline);
  const traceStart = x + calOffset + calWidth + 2 * layout.pxPerMm;
  const traceWidth = x + w - traceStart - 2;
  if (traceWidth > 4) {
    const seconds = traceWidth / layout.pxPerSec;
    for (let px = 0; px <= traceWidth; px += 1) {
      const t = startSec + px / layout.pxPerSec;
      const v = sampleAt(gen, lead, t);
      const py = baseline - layout.mvToPx(v);
      if (px === 0) ctx.moveTo(traceStart + px, py);
      else ctx.lineTo(traceStart + px, py);
    }
  }
  ctx.stroke();
  ctx.fillStyle = LABEL;
  ctx.font = '11px "IBM Plex Mono", ui-monospace, monospace';
  ctx.fillText(lead, x + 6, y + 12);
}

function drawCursor(ctx, layout, cursorSec, startSec0) {
  if (cursorSec === null) return;
  ctx.save();
  ctx.strokeStyle = "rgba(20,20,20,0.55)";
  ctx.setLineDash([4, 4]);
  ctx.lineWidth = 1;
  for (let row = 0; row < layout.rows; row += 1) {
    for (let col = 0; col < layout.cols; col += 1) {
      const cellStart = startSec0 + col * layout.cellSeconds;
      if (cursorSec < cellStart || cursorSec > cellStart + layout.cellSeconds) continue;
      const px = layout.margin + col * layout.cellW + (cursorSec - cellStart) * layout.pxPerSec;
      const y = layout.margin + row * (layout.cellH + layout.labelH);
      ctx.beginPath();
      ctx.moveTo(px, y);
      ctx.lineTo(px, y + layout.cellH);
      ctx.stroke();
    }
  }
  const stripStart = startSec0;
  if (cursorSec >= stripStart && cursorSec <= stripStart + layout.totalSeconds) {
    const px = layout.margin + (cursorSec - stripStart) * layout.pxPerSec;
    const y = layout.height - layout.margin - layout.stripH;
    ctx.beginPath();
    ctx.moveTo(px, y);
    ctx.lineTo(px, y + layout.stripH);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawEcgSheet(ctx, { gen, layout, panSec, cursorSec }) {
  if (!ctx) return;
  const { width, height, margin, pxPerMm } = layout;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#0c0c0c";
  ctx.fillRect(0, 0, width, height);
  for (let row = 0; row < layout.rows; row += 1) {
    for (let col = 0; col < layout.cols; col += 1) {
      const x = margin + col * layout.cellW;
      const y = margin + row * (layout.cellH + layout.labelH);
      drawGrid(ctx, x, y, layout.cellW, layout.cellH, pxPerMm);
      drawTrace(ctx, gen, SHEET_ROWS[row][col], x, y, layout.cellW, layout.cellH, layout, panSec + col * layout.cellSeconds);
    }
  }
  const stripY = height - margin - layout.stripH;
  drawGrid(ctx, margin, stripY, width - margin * 2, layout.stripH, pxPerMm);
  drawTrace(ctx, gen, RHYTHM_STRIP_LEAD, margin, stripY, width - margin * 2, layout.stripH, layout, panSec);
  ctx.fillStyle = LABEL;
  ctx.font = '10px "IBM Plex Mono", ui-monospace, monospace';
  ctx.fillText(`25/50 mm/s paper · ${layout.mmPerMv} mm/mV gain · SYNTHETIC EDUCATIONAL ECG`, margin, height - 4);
  drawCursor(ctx, layout, cursorSec, panSec);
}
