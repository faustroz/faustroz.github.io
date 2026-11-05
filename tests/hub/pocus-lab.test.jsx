import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PocusLab from "@/components/hub/PocusLab";
import { POCUS_VIEWS, evaluateProbe, getViewById } from "@/lib/hub/pocus-views.mjs";
import { buildHeartModel, cardiacPulse, projectPoint, rotatePoint } from "@/lib/hub/pocus-heart-model.mjs";

describe("POCUS view presets", () => {
  it("defines the four basic cardiac windows with unique ids and structures", () => {
    expect(POCUS_VIEWS.map((view) => view.id)).toEqual(["plax", "psax", "a4c", "subcostal"]);
    for (const view of POCUS_VIEWS) {
      const ids = view.structures.map((structure) => structure.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const structure of view.structures) {
        expect(structure.label.length).toBeGreaterThan(0);
        expect(structure.description.length).toBeGreaterThan(0);
      }
    }
  });

  it("locks the probe onto a window only with position and angle aligned", () => {
    const plax = getViewById("plax");
    const aligned = evaluateProbe({ x: plax.window.x, y: plax.window.y, angle: plax.angle });
    expect(aligned.locked).toBe(true);
    expect(aligned.view.id).toBe("plax");
    const offAngle = evaluateProbe({ x: plax.window.x, y: plax.window.y, angle: plax.angle + 120 });
    expect(offAngle.locked).toBe(false);
    const offPosition = evaluateProbe({ x: plax.window.x + 30, y: plax.window.y, angle: plax.angle });
    expect(offPosition.locked).toBe(false);
  });

  it("always reports the nearest window even when unlocked", () => {
    const evaluation = evaluateProbe({ x: 5, y: 5, angle: 0 });
    expect(POCUS_VIEWS.some((view) => view.id === evaluation.view.id)).toBe(true);
    expect(evaluation.locked).toBe(false);
  });
});

describe("POCUS heart model", () => {
  it("builds labelled wireframe parts with geometry", () => {
    const model = buildHeartModel();
    const ids = model.map((part) => part.id);
    expect(ids).toEqual(expect.arrayContaining(["lv", "rv", "la", "ra", "ao", "pa"]));
    for (const part of model) {
      expect(part.lines.length).toBeGreaterThan(0);
      expect(part.center).toHaveLength(3);
    }
  });

  it("rotates points around yaw and pitch", () => {
    const rotated = rotatePoint([1, 0, 0], Math.PI / 2, 0);
    expect(rotated[0]).toBeCloseTo(0, 5);
    expect(rotated[2]).toBeCloseTo(-1, 5);
    const pitched = rotatePoint([0, 1, 0], 0, Math.PI / 2);
    expect(pitched[1]).toBeCloseTo(0, 5);
    expect(pitched[2]).toBeCloseTo(1, 5);
  });

  it("projects with perspective so nearer points scale larger", () => {
    const near = projectPoint([0.5, 0, -1], { scale: 100, distance: 3.2, cx: 50, cy: 50 });
    const far = projectPoint([0.5, 0, 1], { scale: 100, distance: 3.2, cx: 50, cy: 50 });
    expect(Math.abs(near.x - 50)).toBeGreaterThan(Math.abs(far.x - 50));
  });

  it("keeps the cardiac pulse within a systolic envelope", () => {
    for (let step = 0; step <= 20; step += 1) {
      const pulse = cardiacPulse(step / 20);
      expect(pulse).toBeGreaterThanOrEqual(0);
      expect(pulse).toBeLessThanOrEqual(1);
    }
    expect(cardiacPulse(0.5)).toBe(0);
  });
});

describe("POCUS Lab interface", () => {
  it("renders presets, the simulation disclaimer and switches views", () => {
    render(<PocusLab />);
    expect(screen.getByRole("button", { name: "PLAX" })).toBeInTheDocument();
    expect(screen.getByText(/EDUCATIONAL SIMULATION/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "PSAX" }));
    expect(screen.getByText(/Parasternal short axis/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Left ventricle/i })).toBeInTheDocument();
  });

  it("shows structure education when a structure is selected", () => {
    render(<PocusLab />);
    fireEvent.click(screen.getByRole("button", { name: "A4C" }));
    fireEvent.click(screen.getByRole("button", { name: /Tricuspid valve/i }));
    expect(screen.getByText(/Leaflets between RA and RV/i)).toBeInTheDocument();
  });

  it("toggles anatomical labels", () => {
    render(<PocusLab />);
    const toggle = screen.getByRole("button", { name: "LABELS ON" });
    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: "LABELS OFF" })).toBeInTheDocument();
  });
});
