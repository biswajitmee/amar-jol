"use client";

import { button, folder, useControls } from "leva";
import { useCallback, useRef } from "react";
import {
  applyHeroLevaPresetValues,
  readHeroLevaPresetValues,
} from "./heroLevaPresetRegistry";

const HERO_LEVA_PRESET_API = "/api/hero-leva-presets";

function cleanPresetName(value) {
  return String(value ?? "")
    .trim()
    .replace(/[^\w -]/g, "")
    .slice(0, 64);
}

export default function HeroLevaPresetPanel() {
  const valuesRef = useRef({});
  const setRef = useRef(null);

  const setPresetStatus = useCallback((message) => {
    setRef.current?.({ presetFileStatus: message });
  }, []);

  const saveCurrentPreset = useCallback(async () => {
    const name = cleanPresetName(valuesRef.current.savePresetName);

    if (!name) {
      setPresetStatus("Add a preset name first");
      return;
    }

    try {
      setPresetStatus(`Saving ${name}...`);
      const response = await fetch(HERO_LEVA_PRESET_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          values: readHeroLevaPresetValues(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Save failed with ${response.status}`);
      }

      setRef.current?.({
        loadPresetName: name,
        presetFileStatus: `Saved ${name}`,
      });
    } catch (error) {
      setPresetStatus(error instanceof Error ? error.message : "Save failed");
    }
  }, [setPresetStatus]);

  const loadSavedPreset = useCallback(async () => {
    const name = cleanPresetName(valuesRef.current.loadPresetName);

    if (!name) {
      setPresetStatus("Add a preset name to load");
      return;
    }

    try {
      setPresetStatus(`Loading ${name}...`);
      const response = await fetch(HERO_LEVA_PRESET_API);

      if (!response.ok) {
        throw new Error(`Load failed with ${response.status}`);
      }

      const data = await response.json();
      const savedPreset = data?.presets?.[name];

      if (!savedPreset) {
        setPresetStatus(`No saved preset named ${name}`);
        return;
      }

      applyHeroLevaPresetValues(savedPreset);
      setRef.current?.({
        savePresetName: name,
        presetFileStatus: `Loaded ${name}`,
      });
    } catch (error) {
      setPresetStatus(error instanceof Error ? error.message : "Load failed");
    }
  }, [setPresetStatus]);

  const [values, set] = useControls(
    "Other Leva Presets",
    () => ({
      "Preset File": folder(
        {
          savePresetName: {
            value: "hero-leva-custom",
            label: "Save name",
          },
          loadPresetName: {
            value: "hero-leva-custom",
            label: "Load name",
          },
          saveCurrentPreset: button(saveCurrentPreset),
          loadSavedPreset: button(loadSavedPreset),
          presetFileStatus: {
            value: "Ready",
            label: "Status",
            editable: false,
          },
        },
        { collapsed: false },
      ),
    }),
    { collapsed: true, order: 4 },
    [loadSavedPreset, saveCurrentPreset],
  );

  valuesRef.current = values;
  setRef.current = set;

  return null;
}
