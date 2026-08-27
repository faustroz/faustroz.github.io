import { describe, expect, it } from "vitest";
import { CONTACTS, HUB_PROFILE, PROJECTS, SKILLS } from "@/lib/hub/content.mjs";

describe("Personal Hub content registry", () => {
  it("preserves all five existing projects and their card contract", () => {
    expect(PROJECTS.map(({ name }) => name)).toEqual([
      "Clipra",
      "Confluo",
      "Invopajak",
      "Portlio",
      "Yomu",
    ]);

    for (const project of PROJECTS) {
      expect(project).toEqual(
        expect.objectContaining({
          name: expect.any(String),
          tag: expect.any(String),
          description: expect.any(String),
          href: expect.any(String),
          image: expect.stringMatching(/^\/portfolio\//),
          imageClass: expect.any(String),
        })
      );
    }
  });

  it("preserves the four existing skill areas", () => {
    expect(SKILLS.map(({ title }) => title)).toEqual([
      "Medical Science",
      "Game Development",
      "Web Development",
      "UI/UX & Design",
    ]);
  });

  it("keeps profile focus and public contact destinations centralized", () => {
    expect(HUB_PROFILE.currentFocus.length).toBeGreaterThan(10);
    expect(CONTACTS).toMatchObject({
      github: "https://github.com/faustroz",
      instagram: "https://instagram.com/ferdydiatmikaa",
      email: "mailto:ferdydiatmika171@gmail.com",
    });
  });
});
