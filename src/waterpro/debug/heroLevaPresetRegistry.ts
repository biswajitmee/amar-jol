type PresetValues = Record<string, unknown>;

type PresetScopeEntry = {
  getValues: () => PresetValues;
  applyValues: (values: PresetValues) => void;
};

const registryGlobal = globalThis as typeof globalThis & {
  __heroLevaPresetScopes?: Map<string, PresetScopeEntry>;
};

const presetScopes =
  registryGlobal.__heroLevaPresetScopes ?? new Map<string, PresetScopeEntry>();

registryGlobal.__heroLevaPresetScopes = presetScopes;

export function pickPresetValues(
  values: PresetValues,
  keys: readonly string[],
) {
  return keys.reduce<PresetValues>((pickedValues, key) => {
    if (values[key] !== undefined) {
      pickedValues[key] = values[key];
    }

    return pickedValues;
  }, {});
}

export function registerHeroLevaPresetScope(
  scope: string,
  entry: PresetScopeEntry,
) {
  presetScopes.set(scope, entry);

  return () => {
    if (presetScopes.get(scope) === entry) {
      presetScopes.delete(scope);
    }
  };
}

export function readHeroLevaPresetValues() {
  return Object.fromEntries(
    Array.from(presetScopes.entries()).map(([scope, entry]) => [
      scope,
      entry.getValues(),
    ]),
  );
}

export function applyHeroLevaPresetValues(
  valuesByScope: Record<string, PresetValues>,
) {
  Object.entries(valuesByScope).forEach(([scope, values]) => {
    presetScopes.get(scope)?.applyValues(values);
  });
}
