// Educational POCUS view presets for the cardiac ultrasound simulator.
// All geometry here is illustrative teaching data, not clinical imaging data.

export const SECTOR_SPREAD = 75;

const deg = (value) => (value * Math.PI) / 180;

export const POCUS_VIEWS = Object.freeze([
  {
    id: "plax",
    name: "PLAX",
    fullName: "Parasternal long axis",
    window: { x: 54, y: 36 },
    angle: 40,
    summary: "Long-axis slice through the left ventricle, aortic root and left atrium.",
    detail:
      "Probe at the 3rd-4th intercostal space just left of the sternum, beam aimed toward the right shoulder. The aortic root, mitral valve and both ventricles line up along one axis. This is the classic screening view for left ventricular size, wall motion and pericardial effusion.",
    structures: [
      { id: "rv", label: "RV", name: "Right ventricle", kind: "pool", shape: { r: 0.52, t: -27, rx: 0.13, ry: 0.2, rot: -24 }, anchor: { r: 0.62, t: -30 }, beat: "ventricle", description: "Anterior chamber sitting closest to the probe. RV dilation here is a clue to right-sided strain." },
      { id: "lv", label: "LV", name: "Left ventricle", kind: "pool", shape: { r: 0.5, t: 8, rx: 0.15, ry: 0.34, rot: -8 }, anchor: { r: 0.44, t: 16 }, beat: "ventricle", description: "Main pumping chamber. In PLAX its long axis runs from the apex near the sector edge to the mitral valve at the base." },
      { id: "ivs", label: "IVS", name: "Interventricular septum", kind: "line", shape: { r1: 0.2, t1: -6, r2: 0.86, t2: -13, width: 2.4 }, anchor: { r: 0.55, t: -10 }, description: "Wall between the ventricles; it should thicken, not thin, during systole." },
      { id: "la", label: "LA", name: "Left atrium", kind: "pool", shape: { r: 0.62, t: 26, rx: 0.17, ry: 0.15, rot: 12 }, anchor: { r: 0.74, t: 28 }, beat: "atrium", description: "Receives pulmonary venous return and sits just behind the aortic root in this view." },
      { id: "mv", label: "MV", name: "Mitral valve", kind: "valve", shape: { r: 0.3, t: 17, len: 0.16, spread: 0.9 }, anchor: { r: 0.3, t: 20 }, mode: "diastole", description: "Two leaflets between LA and LV. They open widely in diastole and close in systole." },
      { id: "ao", label: "AO", name: "Aortic root", kind: "vessel", shape: { r: 0.5, t: -24, len: 0.3, gap: 0.09, rot: -28 }, anchor: { r: 0.68, t: -26 }, description: "Two bright parallel walls of the aortic outflow, pointing toward the right shoulder." },
      { id: "av", label: "AV", name: "Aortic valve", kind: "valve", shape: { r: 0.36, t: -22, len: 0.1, spread: 0.8 }, anchor: { r: 0.36, t: -25 }, mode: "systole", description: "Leaflets open in systole to eject blood into the aorta, then snap shut." },
      { id: "per", label: "PER", name: "Pericardium", kind: "arc", shape: { r: 0.88, t: 5, spread: 55, width: 2.2 }, anchor: { r: 0.88, t: 12 }, description: "Bright echo-dense line behind the heart. Fluid collects between it and the myocardium." },
    ],
  },
  {
    id: "psax",
    name: "PSAX",
    fullName: "Parasternal short axis",
    window: { x: 57, y: 43 },
    angle: 130,
    summary: "Short-axis cross-section of the ventricles at the papillary muscle level.",
    detail:
      "From the parasternal window, rotate the probe 90 degrees clockwise from PLAX. The left ventricle becomes a circular donut with the right ventricle wrapping around it. Used to judge LV contractility, wall thickening and RV size.",
    structures: [
      { id: "lv", label: "LV", name: "Left ventricle", kind: "pool", shape: { r: 0.46, t: 2, rx: 0.24, ry: 0.24, rot: 0 }, anchor: { r: 0.46, t: -18 }, beat: "ventricle", description: "Cross-section should look circular. Squeeze thickens the walls inward during systole." },
      { id: "rv", label: "RV", name: "Right ventricle", kind: "pool", shape: { r: 0.52, t: -32, rx: 0.2, ry: 0.14, rot: 10 }, anchor: { r: 0.66, t: -34 }, beat: "ventricle", description: "Crescent-shaped chamber wrapped around the left ventricle in this plane." },
      { id: "ivs", label: "IVS", name: "Interventricular septum", kind: "arc", shape: { r: 0.46, t: -14, spread: 42, width: 2.2 }, anchor: { r: 0.6, t: -16 }, description: "Shared wall curved between both ventricles; flattening suggests RV pressure overload." },
      { id: "pap", label: "PAP", name: "Papillary muscles", kind: "marker", shape: { r: 0.46, t: 2, spread: 26 }, anchor: { r: 0.32, t: 6 }, description: "Two bright bundles inside the LV that anchor the mitral valve chords." },
      { id: "per", label: "PER", name: "Pericardium", kind: "arc", shape: { r: 0.8, t: 4, spread: 70, width: 2.2 }, anchor: { r: 0.86, t: 16 }, description: "Bright outer border circling the ventricles." },
    ],
  },
  {
    id: "a4c",
    name: "A4C",
    fullName: "Apical 4-chamber",
    window: { x: 64, y: 60 },
    angle: 12,
    summary: "All four chambers seen from the cardiac apex.",
    detail:
      "Probe at the point of maximal impulse, beam aimed toward the right shoulder base. The sector shows LV and RV in the near field with LA and RA deeper. The go-to view for chamber comparison, valve function and ejection fraction estimation.",
    structures: [
      { id: "lv", label: "LV", name: "Left ventricle", kind: "pool", shape: { r: 0.34, t: 16, rx: 0.13, ry: 0.26, rot: -6 }, anchor: { r: 0.4, t: 22 }, beat: "ventricle", description: "Cone-shaped chamber on the viewer's right. Its walls should contract symmetrically." },
      { id: "rv", label: "RV", name: "Right ventricle", kind: "pool", shape: { r: 0.34, t: -16, rx: 0.15, ry: 0.24, rot: 6 }, anchor: { r: 0.4, t: -24 }, beat: "ventricle", description: "Chamber on the viewer's left. It is normally smaller than the LV; marked dilation is abnormal." },
      { id: "la", label: "LA", name: "Left atrium", kind: "pool", shape: { r: 0.66, t: 18, rx: 0.15, ry: 0.16, rot: -8 }, anchor: { r: 0.76, t: 22 }, beat: "atrium", description: "Deeper chamber above the LV, separated by the mitral valve." },
      { id: "ra", label: "RA", name: "Right atrium", kind: "pool", shape: { r: 0.66, t: -18, rx: 0.15, ry: 0.16, rot: 8 }, anchor: { r: 0.76, t: -24 }, beat: "atrium", description: "Deeper chamber above the RV, separated by the tricuspid valve." },
      { id: "mv", label: "MV", name: "Mitral valve", kind: "valve", shape: { r: 0.5, t: 17, len: 0.12, spread: 0.9 }, anchor: { r: 0.5, t: 20 }, mode: "diastole", description: "Leaflets between LA and LV, opening toward the apex in diastole." },
      { id: "tv", label: "TV", name: "Tricuspid valve", kind: "valve", shape: { r: 0.5, t: -17, len: 0.11, spread: 0.9 }, anchor: { r: 0.5, t: -21 }, mode: "diastole", description: "Leaflets between RA and RV, slightly more apical than the mitral valve." },
      { id: "ivs", label: "IVS", name: "Interventricular septum", kind: "line", shape: { r1: 0.16, t1: 0, r2: 0.8, t2: 0, width: 2.2 }, anchor: { r: 0.6, t: -4 }, description: "Vertical wall dividing the two ventricles down the middle of the sector." },
      { id: "ias", label: "IAS", name: "Interatrial septum", kind: "line", shape: { r1: 0.5, t1: 1, r2: 0.8, t2: 2, width: 1.8 }, anchor: { r: 0.7, t: 6 }, description: "Thin wall between the atria; a defect here is an atrial septal defect." },
    ],
  },
  {
    id: "subcostal",
    name: "SC",
    fullName: "Subcostal window",
    window: { x: 50, y: 82 },
    angle: -28,
    summary: "Four-chamber view from below the ribcage, through the liver.",
    detail:
      "Probe just below the xiphoid process, angled up toward the left shoulder with the patient supine. The liver sits in the near field. Best view for pericardial effusion and cardiac activity during CPR, and the only window with good images in many trauma patients.",
    structures: [
      { id: "liver", label: "LIVER", name: "Liver (acoustic window)", kind: "tissue", shape: { r: 0.22, t: 0, rx: 0.34, ry: 0.12, rot: 0 }, anchor: { r: 0.2, t: -18 }, description: "Bright speckled liver acts as an acoustic window; ultrasound travels well through it." },
      { id: "rv", label: "RV", name: "Right ventricle", kind: "pool", shape: { r: 0.48, t: -14, rx: 0.14, ry: 0.18, rot: 4 }, anchor: { r: 0.52, t: -22 }, beat: "ventricle", description: "Near-field ventricle in this inverted four-chamber view." },
      { id: "lv", label: "LV", name: "Left ventricle", kind: "pool", shape: { r: 0.48, t: 16, rx: 0.13, ry: 0.18, rot: -4 }, anchor: { r: 0.52, t: 24 }, beat: "ventricle", description: "Far-field ventricle across the septum." },
      { id: "ra", label: "RA", name: "Right atrium", kind: "pool", shape: { r: 0.72, t: -14, rx: 0.14, ry: 0.13, rot: 6 }, anchor: { r: 0.82, t: -20 }, beat: "atrium", description: "Deeper right atrium; hepatic veins drain into it from below." },
      { id: "la", label: "LA", name: "Left atrium", kind: "pool", shape: { r: 0.72, t: 16, rx: 0.14, ry: 0.13, rot: -6 }, anchor: { r: 0.82, t: 22 }, beat: "atrium", description: "Deeper left atrium beyond the mitral valve." },
      { id: "per", label: "PER", name: "Pericardium", kind: "arc", shape: { r: 0.6, t: 2, spread: 58, width: 2.4 }, anchor: { r: 0.66, t: 10 }, description: "Bright line around the heart; effusion shows as a dark rim between it and the myocardium." },
      { id: "hv", label: "HV", name: "Hepatic vein", kind: "line", shape: { r1: 0.1, t1: -14, r2: 0.26, t2: -20, width: 2 }, anchor: { r: 0.16, t: -24 }, description: "Vessel carrying blood from the liver into the inferior vena cava and RA." },
    ],
  },
]);

export function getViewById(id) {
  return POCUS_VIEWS.find((view) => view.id === id) || null;
}

function angleDifference(a, b) {
  return Math.abs((((a - b) % 360) + 540) % 360 - 180);
}

export function evaluateProbe(probe) {
  let best = null;
  for (const view of POCUS_VIEWS) {
    const dx = probe.x - view.window.x;
    const dy = probe.y - view.window.y;
    const distance = Math.hypot(dx, dy);
    const positional = Math.exp(-((distance / 9) ** 2));
    const angular = Math.max(0, Math.cos(deg(angleDifference(probe.angle, view.angle)))) ** 2;
    const quality = positional * angular;
    if (!best || quality > best.quality) best = { view, quality, distance, angleError: angleDifference(probe.angle, view.angle) };
  }
  return { ...best, locked: best.quality >= 0.5 };
}
