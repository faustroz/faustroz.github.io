export const IMAGE_OCCLUSION_SOUND_SETTINGS_KEY = "4allx:academic-image-occlusion-sound:v1";
export const DEFAULT_IMAGE_OCCLUSION_SOUND_SETTINGS = Object.freeze({ enabled: true, volume: 35 });

const SOUND_NOTES = Object.freeze({
  reveal: [{ frequency: 570, endFrequency: 820, duration: 0.12, waveform: "sine" }],
  next: [{ frequency: 330, endFrequency: 210, duration: 0.11, waveform: "triangle" }],
  previous: [{ frequency: 290, endFrequency: 190, duration: 0.11, waveform: "triangle" }],
  again: [{ frequency: 205, endFrequency: 170, duration: 0.12, waveform: "sine" }],
  hard: [{ frequency: 330, endFrequency: 300, duration: 0.09, waveform: "triangle" }],
  good: [{ frequency: 540, endFrequency: 610, duration: 0.1, waveform: "sine" }],
  easy: [{ frequency: 660, endFrequency: 880, duration: 0.16, waveform: "sine" }],
  complete: [
    { frequency: 523, endFrequency: 523, duration: 0.32, waveform: "sine" },
    { frequency: 659, endFrequency: 659, duration: 0.32, waveform: "sine", delay: 0.035 },
    { frequency: 784, endFrequency: 784, duration: 0.38, waveform: "sine", delay: 0.07 },
  ],
  save: [{ frequency: 740, endFrequency: 880, duration: 0.1, waveform: "sine" }],
  error: [{ frequency: 250, endFrequency: 190, duration: 0.13, waveform: "triangle" }],
});
export const IMAGE_OCCLUSION_SOUND_EVENTS = Object.freeze(Object.keys(SOUND_NOTES));

let sharedContext = null;
let activeSounds = [];

export function readImageOcclusionSoundSettings(storage) {
  try {
    const parsed = JSON.parse(storage?.getItem(IMAGE_OCCLUSION_SOUND_SETTINGS_KEY) || "null");
    return {
      enabled: typeof parsed?.enabled === "boolean" ? parsed.enabled : DEFAULT_IMAGE_OCCLUSION_SOUND_SETTINGS.enabled,
      volume: Number.isFinite(parsed?.volume) ? Math.min(100, Math.max(0, Math.round(parsed.volume))) : DEFAULT_IMAGE_OCCLUSION_SOUND_SETTINGS.volume,
    };
  } catch {
    return { ...DEFAULT_IMAGE_OCCLUSION_SOUND_SETTINGS };
  }
}

export function writeImageOcclusionSoundSettings(storage, settings) {
  if (typeof storage?.setItem !== "function") return false;
  const safeSettings = {
    enabled: Boolean(settings?.enabled),
    volume: Number.isFinite(settings?.volume) ? Math.min(100, Math.max(0, Math.round(settings.volume))) : DEFAULT_IMAGE_OCCLUSION_SOUND_SETTINGS.volume,
  };
  try {
    storage.setItem(IMAGE_OCCLUSION_SOUND_SETTINGS_KEY, JSON.stringify(safeSettings));
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

export function unlockImageOcclusionAudio(targetWindow = globalThis.window) {
  const settings = readImageOcclusionSoundSettings(targetWindow?.localStorage);
  if (!settings.enabled || settings.volume <= 0) return;
  const context = getContext(targetWindow);
  if (context?.state === "suspended") void context.resume().catch(() => {});
}

export function playImageOcclusionSound(event, targetWindow = globalThis.window) {
  const notes = SOUND_NOTES[event];
  const settings = readImageOcclusionSoundSettings(targetWindow?.localStorage);
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
    } catch { /* Audio is optional and must never block the study workflow. */ }
  }
  return true;
}
