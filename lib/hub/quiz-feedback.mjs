/**
 * Answer feedback for the practice labs: a short synthesised tone plus the
 * flag the UI uses to run its matching animation. Tones are generated with
 * the Web Audio API so no audio files ship for this, and every failure path
 * is swallowed — feedback is decoration and must never block answering.
 */

export const QUIZ_SOUND_SETTINGS_KEY = "4allx:lab-quiz-sound:v1";
export const DEFAULT_QUIZ_SOUND_SETTINGS = Object.freeze({ enabled: true, volume: 35 });

const SOUND_NOTES = Object.freeze({
  correct: [
    { frequency: 660, endFrequency: 660, duration: 0.09, waveform: "sine" },
    { frequency: 988, endFrequency: 988, duration: 0.17, waveform: "sine", delay: 0.075 },
  ],
  incorrect: [
    { frequency: 233, endFrequency: 196, duration: 0.11, waveform: "triangle" },
    { frequency: 175, endFrequency: 147, duration: 0.17, waveform: "triangle", delay: 0.085 },
  ],
  next: [{ frequency: 420, endFrequency: 520, duration: 0.07, waveform: "sine" }],
});

export const QUIZ_SOUND_EVENTS = Object.freeze(Object.keys(SOUND_NOTES));

let sharedContext = null;
let activeSounds = [];

export function readQuizSoundSettings(storage) {
  try {
    const parsed = JSON.parse(storage?.getItem(QUIZ_SOUND_SETTINGS_KEY) || "null");
    return {
      enabled: typeof parsed?.enabled === "boolean" ? parsed.enabled : DEFAULT_QUIZ_SOUND_SETTINGS.enabled,
      volume: Number.isFinite(parsed?.volume) ? Math.min(100, Math.max(0, Math.round(parsed.volume))) : DEFAULT_QUIZ_SOUND_SETTINGS.volume,
    };
  } catch {
    return { ...DEFAULT_QUIZ_SOUND_SETTINGS };
  }
}

export function writeQuizSoundSettings(storage, settings) {
  if (typeof storage?.setItem !== "function") return false;
  const safeSettings = {
    enabled: Boolean(settings?.enabled),
    volume: Number.isFinite(settings?.volume) ? Math.min(100, Math.max(0, Math.round(settings.volume))) : DEFAULT_QUIZ_SOUND_SETTINGS.volume,
  };
  try {
    storage.setItem(QUIZ_SOUND_SETTINGS_KEY, JSON.stringify(safeSettings));
    return true;
  } catch {
    return false;
  }
}

function getContext(targetWindow) {
  if (sharedContext) return sharedContext;
  const AudioContextConstructor = targetWindow?.AudioContext || targetWindow?.webkitAudioContext;
  if (!AudioContextConstructor) return null;
  try {
    sharedContext = new AudioContextConstructor();
    return sharedContext;
  } catch {
    return null;
  }
}

/** Browsers only allow audio after a gesture; call this from the first click. */
export function unlockQuizAudio(targetWindow = globalThis.window) {
  const settings = readQuizSoundSettings(targetWindow?.localStorage);
  if (!settings.enabled || settings.volume <= 0) return;
  const context = getContext(targetWindow);
  if (context?.state === "suspended") void context.resume().catch(() => {});
}

export function playQuizSound(event, targetWindow = globalThis.window) {
  const notes = SOUND_NOTES[event];
  const settings = readQuizSoundSettings(targetWindow?.localStorage);
  if (!notes || !settings.enabled || settings.volume <= 0) return false;
  const context = getContext(targetWindow);
  if (!context) return false;
  if (context.state === "suspended") void context.resume().catch(() => {});

  const now = context.currentTime;
  for (const sound of activeSounds) {
    try {
      sound.gain.gain.cancelScheduledValues(now);
      sound.gain.gain.setTargetAtTime(0, now, 0.006);
      sound.oscillator.stop(now + 0.025);
    } catch { /* A sound may already have finished. */ }
  }
  activeSounds = [];

  const volume = (settings.volume / 100) * 0.12;
  for (const note of notes) {
    try {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = now + (note.delay || 0);
      const end = start + note.duration;
      oscillator.type = note.waveform;
      oscillator.frequency.setValueAtTime(note.frequency, start);
      oscillator.frequency.linearRampToValueAtTime(note.endFrequency, end);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(volume / Math.max(1, notes.length ** 0.5), start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(end + 0.01);
      const sound = { oscillator, gain };
      activeSounds.push(sound);
      oscillator.onended = () => { activeSounds = activeSounds.filter((active) => active !== sound); };
    } catch { /* Audio is optional and must never block answering. */ }
  }
  return true;
}

/** Plays the tone for an answer and returns the class the UI animates with. */
export function signalAnswer(isCorrect, targetWindow = globalThis.window) {
  playQuizSound(isCorrect ? "correct" : "incorrect", targetWindow);
  return isCorrect ? "is-correct-pulse" : "is-wrong-shake";
}
