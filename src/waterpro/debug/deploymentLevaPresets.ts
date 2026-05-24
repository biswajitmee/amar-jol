import heroLevaPresetFile from "./heroLevaPresets.json";
import waterLevaPresetFile from "./waterLevaPresets.json";

const DEFAULT_WATER_PRESET_NAME = "hero-water-custom";
const DEFAULT_HERO_LEVA_PRESET_NAME = "hero-leva-custom";

type PresetFile<T> = {
  presets?: Record<string, T>;
};

export function isProductionDeployment() {
  return process.env.NODE_ENV === "production";
}

function getPreset<T>(
  file: PresetFile<T>,
  name: string | undefined,
  fallbackName: string,
) {
  return file.presets?.[name || fallbackName] ?? file.presets?.[fallbackName];
}

export function getDeploymentWaterPresetValues<T>() {
  return getPreset(
    waterLevaPresetFile as unknown as PresetFile<T>,
    process.env.NEXT_PUBLIC_WATER_HERO_WATER_PRESET,
    DEFAULT_WATER_PRESET_NAME,
  );
}

export function getDeploymentHeroLevaPresetValues() {
  return getPreset<Record<string, Record<string, unknown>>>(
    heroLevaPresetFile as unknown as PresetFile<
      Record<string, Record<string, unknown>>
    >,
    process.env.NEXT_PUBLIC_WATER_HERO_LEVA_PRESET,
    DEFAULT_HERO_LEVA_PRESET_NAME,
  );
}

export function getDeploymentHeroLevaValue<T>(
  scope: string,
  key: string,
  fallback: T,
) {
  if (!isProductionDeployment()) {
    return fallback;
  }

  const value = getDeploymentHeroLevaPresetValues()?.[scope]?.[key];

  return value === undefined ? fallback : (value as T);
}
