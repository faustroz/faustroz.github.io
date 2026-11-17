"use client";

import { useCallback, useEffect, useRef } from "react";
import { computeSheetLayout, drawEcgSheet } from "@/lib/hub/ecg-paper.mjs";

/** The 12-lead printout: draggable to pan through the recording. */
export default function EcgCanvas({ gen, settings, panSec, cursorSec, onPanDrag, onLayout }) {
  const canvasRef = useRef(null);
  const dragRef = useRef(null);
  const stateRef = useRef({ gen, settings, panSec, cursorSec, onPanDrag });
  stateRef.current = { gen, settings, panSec, cursorSec, onPanDrag };

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const { width, height } = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    const layout = computeSheetLayout({ width, height, paperSpeed: settings.paperSpeed, gain: settings.gain, zoom: settings.zoom });
    if (onLayout) onLayout(layout);
    drawEcgSheet(context, { gen, layout, panSec, cursorSec });
  }, [gen, settings, panSec, cursorSec, onLayout]);

  useEffect(() => { render(); }, [render]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window.ResizeObserver !== "function") return undefined;
    const observer = new ResizeObserver(() => render());
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [render]);

  const onPointerDown = useCallback((event) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX, pan: stateRef.current.panSec };
  }, []);

  const onPointerMove = useCallback((event) => {
    if (!dragRef.current) return;
    const canvas = event.currentTarget;
    const layout = computeSheetLayout({ width: canvas.clientWidth, height: canvas.clientHeight, paperSpeed: stateRef.current.settings.paperSpeed, gain: stateRef.current.settings.gain, zoom: stateRef.current.settings.zoom });
    const dx = event.clientX - dragRef.current.x;
    stateRef.current.onPanDrag(dragRef.current.pan - dx / layout.pxPerSec);
  }, []);

  const stopDrag = useCallback(() => { dragRef.current = null; }, []);

  return <canvas ref={canvasRef} className="hub-ecg-canvas" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={stopDrag} onPointerCancel={stopDrag} role="img" aria-label="Synthetic 12-lead ECG printout" />;
}
