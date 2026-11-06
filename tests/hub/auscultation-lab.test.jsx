import { existsSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AuscultationLab from "@/components/hub/AuscultationLab";
import {
  AUSCULTATION_CLIPS,
  AUSCULTATION_TYPES,
  HLS_CMDS_SOURCE,
  buildTrainerRound,
  countByType,
  getAuscultationClips,
  getAuscultationTypes,
  scoreTrainerAnswer,
} from "@/lib/hub/auscultation-library.mjs";

describe("Auscultation library metadata", () => {
  it("defines 100 unique clips split evenly between heart and lung", () => {
    expect(AUSCULTATION_CLIPS).toHaveLength(100);
    const ids = AUSCULTATION_CLIPS.map((clip) => clip.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(getAuscultationClips({ system: "heart" })).toHaveLength(50);
    expect(getAuscultationClips({ system: "lung" })).toHaveLength(50);
  });

  it("ships every referenced audio file in public/", () => {
    for (const clip of AUSCULTATION_CLIPS) {
      expect(clip.src.startsWith("/auscultation/")).toBe(true);
      expect(existsSync(join(process.cwd(), "public", clip.src))).toBe(true);
    }
  });

  it("gives every clip a known type and a location belonging to the same system", () => {
    for (const clip of AUSCULTATION_CLIPS) {
      const type = AUSCULTATION_TYPES.find((entry) => entry.id === clip.typeId);
      expect(type).toBeTruthy();
      expect(type.system).toBe(clip.system);
      expect(clip.teaching.length).toBeGreaterThan(40);
      expect(clip.locationNote.length).toBeGreaterThan(0);
    }
  });

  it("keeps type ids scoped per system so heart and lung 'Normal' never collide", () => {
    const heartNormal = getAuscultationTypes("heart").find((type) => type.code === "N");
    const lungNormal = getAuscultationTypes("lung").find((type) => type.code === "N");
    expect(heartNormal.id).not.toBe(lungNormal.id);
    expect(getAuscultationClips({ typeId: heartNormal.id }).every((clip) => clip.system === "heart")).toBe(true);
  });

  it("counts clips per type and accounts for every clip", () => {
    const total = [...countByType("heart"), ...countByType("lung")].reduce((sum, type) => sum + type.count, 0);
    expect(total).toBe(100);
  });

  it("credits the CC BY 4.0 source", () => {
    expect(HLS_CMDS_SOURCE.license).toBe("CC BY 4.0");
    expect(HLS_CMDS_SOURCE.sourceUrl).toContain("zenodo.org");
    expect(HLS_CMDS_SOURCE.note).toMatch(/not patient recordings/i);
  });
});

describe("Auscultation trainer rounds", () => {
  it("offers the correct answer plus distractors from the same system only", () => {
    const lungClips = getAuscultationClips({ system: "lung" });
    for (let seed = 0; seed < 20; seed += 1) {
      const round = buildTrainerRound(lungClips, { random: () => (seed * 0.047) % 1 });
      expect(round.choices).toHaveLength(4);
      expect(round.choices.some((choice) => choice.id === round.answerId)).toBe(true);
      expect(new Set(round.choices.map((choice) => choice.id)).size).toBe(4);
      for (const choice of round.choices) {
        expect(choice.id.startsWith("lung-")).toBe(true);
      }
    }
  });

  it("caps choices at the number of available types", () => {
    const lungOnlyOneType = getAuscultationClips({ typeId: "lung-pr" });
    const round = buildTrainerRound(lungOnlyOneType, { choiceCount: 99, random: () => 0 });
    expect(round.choices.length).toBe(getAuscultationTypes("lung").length);
  });

  it("returns null for an empty clip list and scores answers", () => {
    expect(buildTrainerRound([])).toBeNull();
    const round = buildTrainerRound(getAuscultationClips({ system: "heart" }), { random: () => 0 });
    expect(scoreTrainerAnswer(round, round.answerId).correct).toBe(true);
    const wrong = round.choices.find((choice) => choice.id !== round.answerId);
    expect(scoreTrainerAnswer(round, wrong.id).correct).toBe(false);
  });
});

describe("Auscultation Lab interface", () => {
  it("renders the library with an audio element per clip and the attribution", () => {
    const { container } = render(<AuscultationLab />);
    expect(container.querySelectorAll("audio").length).toBe(100);
    expect(screen.getByText(/Torabi/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "CC BY 4.0" })).toBeInTheDocument();
  });

  it("filters by system and then by sound type", () => {
    const { container } = render(<AuscultationLab />);
    fireEvent.click(screen.getByRole("button", { name: "LUNG 50" }));
    expect(container.querySelectorAll("audio").length).toBe(50);
    fireEvent.click(screen.getByRole("button", { name: /Wheezing 7/ }));
    expect(container.querySelectorAll("audio").length).toBe(7);
  });

  it("resets the type filter when the system changes", () => {
    const { container } = render(<AuscultationLab />);
    fireEvent.click(screen.getByRole("button", { name: "LUNG 50" }));
    fireEvent.click(screen.getByRole("button", { name: /Wheezing 7/ }));
    fireEvent.click(screen.getByRole("button", { name: "HEART 50" }));
    expect(container.querySelectorAll("audio").length).toBe(50);
    expect(screen.getByRole("button", { name: "ALL TYPES" })).toHaveAttribute("aria-pressed", "true");
  });

  it("runs a trainer round and reveals the answer after a guess", () => {
    render(<AuscultationLab />);
    fireEvent.click(screen.getByRole("button", { name: "TRAINER" }));
    fireEvent.click(screen.getByRole("button", { name: "START TRAINER" }));
    const choices = within(screen.getByRole("group", { name: "Answer choices" })).getAllByRole("button");
    expect(choices).toHaveLength(4);
    fireEvent.click(choices[0]);
    expect(screen.getByRole("button", { name: "NEXT SOUND" })).toBeInTheDocument();
    for (const choice of within(screen.getByRole("group", { name: "Answer choices" })).getAllByRole("button")) {
      expect(choice).toBeDisabled();
    }
    expect(screen.getByText(/SCORE \d\/1/)).toBeInTheDocument();
  });
});
