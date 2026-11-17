"use client";

import { useEffect, useRef } from "react";
import { drawLeadStrip } from "@/lib/hub/ecg-paper.mjs";

/** One lead on ECG paper at a fixed pixel scale, so boxes stay countable at any screen width. */
export default function EcgLeadCanvas({ gen, lead = "II", widthMm, heightMm, pxPerMm, startSec = 0, cursorSec = null, label = "", baselineFrac, ariaLabel }) {
  const canvasRef = useRef(null);
  const width = widthMm * pxPerMm;
  const height = heightMm * pxPerMm;

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!context) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawLeadStrip(context, { gen, lead, width, height, pxPerMm, startSec, cursorSec, label, baselineFrac });
  }, [gen, lead, width, height, pxPerMm, startSec, cursorSec, label, baselineFrac]);

  return <canvas ref={canvasRef} className="hub-ecg-rate-canvas" style={{ width, height }} role="img" aria-label={ariaLabel || `Lead ${lead} on ECG paper`} />;
}
