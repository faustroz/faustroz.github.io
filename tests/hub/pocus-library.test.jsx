import { existsSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";import PocusLab from "@/components/hub/PocusLab";
import { EDUS2_CLIPS, EDUS2_GROUPS, EDUS2_SOURCE, getEdus2ClipsByGroup } from "@/lib/hub/pocus-library.mjs";

describe("Edus2 library metadata", () => {
  it("defines unique clips with valid groups and source paths", () => {
    expect(EDUS2_CLIPS).toHaveLength(25);
    const files = EDUS2_CLIPS.map((clip) => clip.file);
    expect(new Set(files).size).toBe(files.length);
    const groupIds = EDUS2_GROUPS.map((group) => group.id);
    for (const clip of EDUS2_CLIPS) {
      expect(groupIds).toContain(clip.group);
      expect(clip.src).toBe(`/pocus/edus2/${clip.file}`);
      expect(clip.poster).toBe(`/pocus/edus2/posters/${clip.file.replace(/\.mp4$/, "")}.jpg`);
      expect(["positive", "negative", "normal", "unspecified"]).toContain(clip.finding);
      expect(clip.title.length).toBeGreaterThan(0);
      expect(clip.detail.length).toBeGreaterThan(0);
    }
  });

  it("references video files and posters that exist in public/pocus/edus2", () => {
    for (const clip of EDUS2_CLIPS) {
      expect(existsSync(join(process.cwd(), "public", "pocus", "edus2", clip.file))).toBe(true);
      expect(existsSync(join(process.cwd(), "public", "pocus", "edus2", "posters", clip.file.replace(/\.mp4$/, "") + ".jpg"))).toBe(true);
    }
  });

  it("covers every declared group with at least one clip", () => {
    for (const group of EDUS2_GROUPS) {
      expect(getEdus2ClipsByGroup(group.id).length).toBeGreaterThan(0);
    }
  });

  it("carries attribution and license for the source collection", () => {
    expect(EDUS2_SOURCE.authors).toContain("Kulyk");
    expect(EDUS2_SOURCE.license).toMatch(/CC BY-NC-SA/);
    expect(EDUS2_SOURCE.sourceUrl).toContain("thesimtech.org");
  });
});

describe("Real ultrasound library interface", () => {
  it("renders the library with real-recording badges and attribution", () => {
    const { container } = render(<PocusLab />);
    expect(screen.getByRole("region", { name: "Real ultrasound recording library" })).toBeInTheDocument();
    expect(screen.getAllByText("REAL RECORDING").length).toBe(25);
    expect(screen.getByText(/Paul Kulyk and Paul Olszynski/)).toBeInTheDocument();
    expect(container.querySelectorAll("video").length).toBe(25);
  });

  it("filters clips by region", () => {
    render(<PocusLab />);
    const region = screen.getByRole("region", { name: "Real ultrasound recording library" });
    expect(within(region).getAllByRole("article").length).toBe(25);
    fireEvent.click(within(region).getByRole("button", { name: /Aorta 2/ }));
    expect(within(region).getAllByRole("article").length).toBe(2);
    fireEvent.click(within(region).getByRole("button", { name: /ALL 25/ }));
    expect(within(region).getAllByRole("article").length).toBe(25);
  });
});
