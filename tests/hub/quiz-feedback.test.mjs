import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_QUIZ_SOUND_SETTINGS,
  QUIZ_SOUND_EVENTS,
  QUIZ_SOUND_SETTINGS_KEY,
  playQuizSound,
  readQuizSoundSettings,
  signalAnswer,
  unlockQuizAudio,
  writeQuizSoundSettings,
} from "@/lib/hub/quiz-feedback.mjs";

function makeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    _map: map,
  };
}

/** Minimal Web Audio stand-in that records what was scheduled. */
function makeAudioWindow({ failConstruct = false, state = "running" } = {}) {
  const started = [];
  class FakeAudioContext {
    constructor() {
      if (failConstruct) throw new Error("no audio");
      this.currentTime = 0;
      this.state = state;
      this.destination = {};
      this.resumed = 0;
    }
    resume() { this.resumed += 1; this.state = "running"; return Promise.resolve(); }
    createOscillator() {
      const node = {
        type: "", frequency: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
        connect: vi.fn(), start: (t) => started.push({ at: t, type: node.type }), stop: vi.fn(),
      };
      return node;
    }
    createGain() {
      return {
        gain: {
          setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(), cancelScheduledValues: vi.fn(), setTargetAtTime: vi.fn(),
        },
        connect: vi.fn(),
      };
    }
  }
  return { AudioContext: FakeAudioContext, localStorage: makeStorage(), _started: started };
}

describe("quiz sound settings", () => {
  it("falls back to the defaults for missing or corrupt storage", () => {
    expect(readQuizSoundSettings(undefined)).toEqual(DEFAULT_QUIZ_SOUND_SETTINGS);
    expect(readQuizSoundSettings(makeStorage())).toEqual(DEFAULT_QUIZ_SOUND_SETTINGS);
    expect(readQuizSoundSettings(makeStorage({ [QUIZ_SOUND_SETTINGS_KEY]: "{oops" }))).toEqual(DEFAULT_QUIZ_SOUND_SETTINGS);
  });

  it("round-trips settings and clamps the volume", () => {
    const storage = makeStorage();
    expect(writeQuizSoundSettings(storage, { enabled: false, volume: 250 })).toBe(true);
    expect(readQuizSoundSettings(storage)).toEqual({ enabled: false, volume: 100 });
    writeQuizSoundSettings(storage, { enabled: true, volume: -5 });
    expect(readQuizSoundSettings(storage)).toEqual({ enabled: true, volume: 0 });
  });

  it("reports failure instead of throwing when storage rejects writes", () => {
    const storage = { setItem: () => { throw new Error("quota"); } };
    expect(writeQuizSoundSettings(storage, { enabled: true, volume: 20 })).toBe(false);
    expect(writeQuizSoundSettings(null, { enabled: true, volume: 20 })).toBe(false);
  });
});

describe("quiz sound playback", () => {
  it("exposes correct, incorrect and next events", () => {
    expect(QUIZ_SOUND_EVENTS).toEqual(["correct", "incorrect", "next"]);
  });

  it("schedules oscillators for a known event", () => {
    const win = makeAudioWindow();
    expect(playQuizSound("correct", win)).toBe(true);
    expect(win._started.length).toBe(2);
  });

  it("stays silent for unknown events, when muted, and at zero volume", () => {
    expect(playQuizSound("nope", makeAudioWindow())).toBe(false);
    const muted = makeAudioWindow();
    writeQuizSoundSettings(muted.localStorage, { enabled: false, volume: 50 });
    expect(playQuizSound("correct", muted)).toBe(false);
    const silent = makeAudioWindow();
    writeQuizSoundSettings(silent.localStorage, { enabled: true, volume: 0 });
    expect(playQuizSound("correct", silent)).toBe(false);
    expect(silent._started.length).toBe(0);
  });

  // The module caches one AudioContext for the page, so these cases need a
  // freshly imported module to prove the no-audio path rather than reusing a
  // context an earlier test already created.
  it("degrades quietly when the browser exposes no AudioContext", async () => {
    vi.resetModules();
    const fresh = await import("@/lib/hub/quiz-feedback.mjs");
    expect(fresh.playQuizSound("correct", { localStorage: makeStorage() })).toBe(false);
    expect(() => fresh.unlockQuizAudio({ localStorage: makeStorage() })).not.toThrow();
  });

  it("degrades quietly when constructing the AudioContext throws", async () => {
    vi.resetModules();
    const fresh = await import("@/lib/hub/quiz-feedback.mjs");
    expect(fresh.playQuizSound("correct", makeAudioWindow({ failConstruct: true }))).toBe(false);
  });

  it("resumes a suspended context so the first answer is audible", () => {
    vi.resetModules();
    const win = makeAudioWindow({ state: "suspended" });
    expect(playQuizSound("correct", win)).toBe(true);
  });
});

describe("signalAnswer", () => {
  let win;
  beforeEach(() => { win = makeAudioWindow(); });
  afterEach(() => vi.restoreAllMocks());

  it("returns the animation class matching the verdict", () => {
    expect(signalAnswer(true, win)).toBe("is-correct-pulse");
    expect(signalAnswer(false, win)).toBe("is-wrong-shake");
  });

  it("still returns a class when audio is unavailable, so the animation runs", () => {
    const silent = { localStorage: makeStorage() };
    expect(signalAnswer(true, silent)).toBe("is-correct-pulse");
    expect(signalAnswer(false, silent)).toBe("is-wrong-shake");
  });
});
