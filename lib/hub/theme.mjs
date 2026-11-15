export const HUB_THEME_KEY = "hub-theme";
export const HUB_THEME_CHANGE_EVENT = "hub:theme-change";
export const HUB_THEME_OPTIONS = Object.freeze([
  { value: "system", label: "Ikuti sistem" },
  { value: "light", label: "Terang" },
  { value: "dark", label: "Gelap" },
]);

export function readHubTheme(storage) {
  try {
    const value = storage?.getItem(HUB_THEME_KEY);
    return HUB_THEME_OPTIONS.some((option) => option.value === value) ? value : "system";
  } catch {
    return "system";
  }
}

export function writeHubTheme(storage, value) {
  if (!HUB_THEME_OPTIONS.some((option) => option.value === value)) return false;
  try {
    storage.setItem(HUB_THEME_KEY, value);
    return true;
  } catch {
    return false;
  }
}

// Only "light" switches the hub; anything else keeps the original dark system.
export function resolveHubTheme(preference, systemPrefersLight) {
  if (preference === "light") return "light";
  if (preference === "dark") return "dark";
  return systemPrefersLight ? "light" : "dark";
}
