// Dependency-free wireframe heart model for the POCUS Lab.
// Pure geometry helpers so the projection math stays unit-testable.

const TAU = Math.PI * 2;

function ellipsoidLines(center, radii, { rings = 6, segments = 14, meridians = 6, rotZ = 0 } = {}) {
  const [cx, cy, cz] = center;
  const [rx, ry, rz] = radii;
  const cosR = Math.cos(rotZ);
  const sinR = Math.sin(rotZ);
  const point = (u, v) => {
    const x = rx * Math.sin(u) * Math.cos(v);
    const rawY = ry * Math.cos(u);
    const z = rz * Math.sin(u) * Math.sin(v);
    return rotZ ? [cx + x * cosR - rawY * sinR, cy + x * sinR + rawY * cosR, cz + z] : [cx + x, cy + rawY, cz + z];
  };
  const lines = [];
  for (let i = 1; i < rings; i += 1) {
    const u = (i / rings) * Math.PI;
    const ring = [];
    for (let j = 0; j <= segments; j += 1) ring.push(point(u, (j / segments) * TAU));
    lines.push(ring);
  }
  for (let j = 0; j < meridians; j += 1) {
    const v = (j / meridians) * TAU;
    const meridian = [];
    for (let k = 0; k <= 12; k += 1) meridian.push(point((k / 12) * Math.PI, v));
    lines.push(meridian);
  }
  return lines;
}

function tubeLines(path, radiusStart, radiusEnd, { rings = 6, segments = 10 } = {}) {
  const lines = [];
  const count = path.length;
  for (let i = 0; i < rings; i += 1) {
    const t = i / (rings - 1);
    const index = Math.min(count - 1, Math.floor(t * (count - 1)));
    const frac = t * (count - 1) - index;
    const next = Math.min(count - 1, index + 1);
    const a = path[index];
    const b = path[next];
    const cx = a[0] + (b[0] - a[0]) * frac;
    const cy = a[1] + (b[1] - a[1]) * frac;
    const cz = a[2] + (b[2] - a[2]) * frac;
    const radius = radiusStart + (radiusEnd - radiusStart) * t;
    const ring = [];
    for (let j = 0; j <= segments; j += 1) {
      const v = (j / segments) * TAU;
      ring.push([cx + radius * Math.cos(v), cy, cz + radius * Math.sin(v)]);
    }
    lines.push(ring);
  }
  for (const v of [0, TAU / 4, TAU / 2]) {
    const longitudinal = [];
    for (let i = 0; i < rings; i += 1) {
      const t = i / (rings - 1);
      const index = Math.min(count - 1, Math.floor(t * (count - 1)));
      const frac = t * (count - 1) - index;
      const next = Math.min(count - 1, index + 1);
      const a = path[index];
      const b = path[next];
      const cx = a[0] + (b[0] - a[0]) * frac;
      const cy = a[1] + (b[1] - a[1]) * frac;
      const cz = a[2] + (b[2] - a[2]) * frac;
      const radius = radiusStart + (radiusEnd - radiusStart) * t;
      longitudinal.push([cx + radius * Math.cos(v), cy, cz + radius * Math.sin(v)]);
    }
    lines.push(longitudinal);
  }
  return lines;
}

export function buildHeartModel() {
  return [
    { id: "lv", label: "LV", center: [-0.26, -0.16, 0.02], beat: "ventricle", lines: ellipsoidLines([-0.26, -0.16, 0.02], [0.3, 0.42, 0.28], { rotZ: -0.32 }) },
    { id: "rv", label: "RV", center: [0.18, -0.1, 0.1], beat: "ventricle", lines: ellipsoidLines([0.18, -0.1, 0.1], [0.34, 0.36, 0.26], { rotZ: 0.18 }) },
    { id: "la", label: "LA", center: [-0.22, 0.36, -0.16], beat: "atrium", lines: ellipsoidLines([-0.22, 0.36, -0.16], [0.24, 0.2, 0.22]) },
    { id: "ra", label: "RA", center: [0.26, 0.34, -0.02], beat: "atrium", lines: ellipsoidLines([0.26, 0.34, -0.02], [0.25, 0.22, 0.24]) },
    { id: "ao", label: "AO", center: [0.08, 0.62, -0.1], lines: tubeLines([[0.02, 0.42, -0.06], [0.08, 0.6, -0.1], [0.16, 0.8, -0.14], [0.2, 0.92, -0.08]], 0.14, 0.11) },
    { id: "pa", label: "PA", center: [0.1, 0.6, 0.12], lines: tubeLines([[0.2, 0.4, 0.1], [0.12, 0.58, 0.14], [-0.02, 0.76, 0.16]], 0.12, 0.1) },
    { id: "svc", label: "SVC", center: [0.34, 0.56, -0.08], lines: tubeLines([[0.36, 0.44, -0.06], [0.32, 0.66, -0.08], [0.3, 0.8, -0.08]], 0.09, 0.08) },
  ];
}

export function rotatePoint([x, y, z], yaw, pitch) {
  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);
  const x1 = x * cosY + z * sinY;
  const z1 = -x * sinY + z * cosY;
  const cosP = Math.cos(pitch);
  const sinP = Math.sin(pitch);
  const y2 = y * cosP - z1 * sinP;
  const z2 = y * sinP + z1 * cosP;
  return [x1, y2, z2];
}

export function projectPoint(point, { scale = 1, distance = 3.2, cx = 0, cy = 0 } = {}) {
  const [x, y, z] = point;
  const perspective = distance / (distance + z);
  return { x: cx + x * scale * perspective, y: cy - y * scale * perspective, depth: z };
}

export function cardiacPulse(phase) {
  const systole = 0.32;
  if (phase >= systole) return 0;
  return Math.sin((phase / systole) * Math.PI);
}
