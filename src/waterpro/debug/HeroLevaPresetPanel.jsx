"use client";

import { button, folder, useControls } from "leva";
import { useCallback, useRef } from "react";
import {
  applyHeroLevaPresetValues,
  readHeroLevaPresetValues,
} from "./heroLevaPresetRegistry";

const HERO_LEVA_PRESET_API = "/api/hero-leva-presets";
const FLOWER_PASTEL_PRESET_NAME = "flower-pastel-custom";
const FLOWER_PETAL_PRESET_SCOPES = ["petalMaterial", "helixPetalFlow"];

function cleanPresetName(value) {
  return String(value ?? "")
    .trim()
    .replace(/[^\w -]/g, "")
    .slice(0, 64);
}

export default function HeroLevaPresetPanel() {
  const valuesRef = useRef({});
  const setRef = useRef(null);

  const setPresetStatus = useCallback((statusKey, message) => {
    setRef.current?.({ [statusKey]: message });
  }, []);

  const savePreset = useCallback(
    async ({ nameKey, loadNameKey, statusKey, scopes }) => {
      const name = cleanPresetName(valuesRef.current[nameKey]);

      if (!name) {
        setPresetStatus(statusKey, "Add a preset name first");
        return;
      }

      try {
        setPresetStatus(statusKey, `Saving ${name}...`);
        const response = await fetch(HERO_LEVA_PRESET_API, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            values: readHeroLevaPresetValues(scopes),
          }),
        });

        if (!response.ok) {
          throw new Error(`Save failed with ${response.status}`);
        }

        setRef.current?.({
          [loadNameKey]: name,
          [statusKey]: `Saved ${name}`,
        });
      } catch (error) {
        setPresetStatus(
          statusKey,
          error instanceof Error ? error.message : "Save failed",
        );
      }
    },
    [setPresetStatus],
  );

  const loadPreset = useCallback(
    async ({ nameKey, saveNameKey, statusKey, scopes }) => {
      const name = cleanPresetName(valuesRef.current[nameKey]);

      if (!name) {
        setPresetStatus(statusKey, "Add a preset name to load");
        return;
      }

      try {
        setPresetStatus(statusKey, `Loading ${name}...`);
        const response = await fetch(HERO_LEVA_PRESET_API);

        if (!response.ok) {
          throw new Error(`Load failed with ${response.status}`);
        }

        const data = await response.json();
        const savedPreset = data?.presets?.[name];

        if (!savedPreset) {
          setPresetStatus(statusKey, `No saved preset named ${name}`);
          return;
        }

        const presetValues = scopes
          ? Object.fromEntries(
              scopes
                .map((scope) => [scope, savedPreset[scope]])
                .filter(([, scopeValues]) => scopeValues),
            )
          : savedPreset;

        if (Object.keys(presetValues).length === 0) {
          setPresetStatus(statusKey, `No flower petal values in ${name}`);
          return;
        }

        applyHeroLevaPresetValues(presetValues);
        setRef.current?.({
          [saveNameKey]: name,
          [statusKey]: `Loaded ${name}`,
        });
      } catch (error) {
        setPresetStatus(
          statusKey,
          error instanceof Error ? error.message : "Load failed",
        );
      }
    },
    [setPresetStatus],
  );

  const saveCurrentPreset = useCallback(() => {
    savePreset({
      nameKey: "savePresetName",
      loadNameKey: "loadPresetName",
      statusKey: "presetFileStatus",
    });
  }, [savePreset]);

  const loadSavedPreset = useCallback(() => {
    loadPreset({
      nameKey: "loadPresetName",
      saveNameKey: "savePresetName",
      statusKey: "presetFileStatus",
    });
  }, [loadPreset]);

  const saveFlowerPetalPreset = useCallback(() => {
    savePreset({
      nameKey: "flowerPetalSavePresetName",
      loadNameKey: "flowerPetalLoadPresetName",
      statusKey: "flowerPetalPresetFileStatus",
      scopes: FLOWER_PETAL_PRESET_SCOPES,
    });
  }, [savePreset]);

  const loadFlowerPetalPreset = useCallback(() => {
    loadPreset({
      nameKey: "flowerPetalLoadPresetName",
      saveNameKey: "flowerPetalSavePresetName",
      statusKey: "flowerPetalPresetFileStatus",
      scopes: FLOWER_PETAL_PRESET_SCOPES,
    });
  }, [loadPreset]);

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
      "Flower Petal Preset File": folder(
        {
          flowerPetalSavePresetName: {
            value: FLOWER_PASTEL_PRESET_NAME,
            label: "Save name",
          },
          flowerPetalLoadPresetName: {
            value: FLOWER_PASTEL_PRESET_NAME,
            label: "Load name",
          },
          saveFlowerPetalPreset: button(saveFlowerPetalPreset),
          loadFlowerPetalPreset: button(loadFlowerPetalPreset),
          flowerPetalPresetFileStatus: {
            value: "Ready",
            label: "Status",
            editable: false,
          },
        },
        { collapsed: false },
      ),
    }),
    { collapsed: true, order: 4 },
    [
      loadFlowerPetalPreset,
      loadSavedPreset,
      saveCurrentPreset,
      saveFlowerPetalPreset,
    ],
  );

  valuesRef.current = values;
  setRef.current = set;

  return null;
}
