import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

const presetFilePath = path.join(
  process.cwd(),
  "src",
  "waterpro",
  "debug",
  "heroLevaPresets.json",
);

const presetValueKeysByScope = {
  heroBottle: new Set([
    "showBottle",
    "bottleX",
    "bottleY",
    "bottleZ",
    "bottleScale",
    "bottleOpacity",
  ]),
  skyBackground: new Set([
    "enabled",
    "skyTexturePath",
    "positionX",
    "positionY",
    "positionZ",
    "scaleX",
    "scaleY",
    "scaleZ",
    "rotationX",
    "rotationY",
    "rotationZ",
    "curvature",
    "horizonOffset",
    "opacity",
    "brightness",
    "tint",
  ]),
  heroLighting: new Set([
    "sunEnabled",
    "sunColor",
    "sunIntensity",
    "sunPositionX",
    "sunPositionY",
    "sunPositionZ",
    "fillEnabled",
    "fillColor",
    "fillIntensity",
    "fillPositionX",
    "fillPositionY",
    "fillPositionZ",
    "ambientEnabled",
    "ambientColor",
    "ambientIntensity",
    "horizonGlowIntensity",
    "warmTintStrength",
  ]),
} satisfies Record<string, Set<string>>;

type PresetFile = {
  presets: Record<string, Record<string, Record<string, unknown>>>;
};

function cleanPresetName(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/[^\w -]/g, "").slice(0, 64);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sanitizeValue(value: unknown): unknown {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  return undefined;
}

function sanitizeScopedPresetValues(value: unknown) {
  if (!isPlainObject(value)) {
    return {};
  }

  return Object.entries(presetValueKeysByScope).reduce<
    Record<string, Record<string, unknown>>
  >((presetValues, [scope, allowedKeys]) => {
    const scopedValues = value[scope];

    if (!isPlainObject(scopedValues)) {
      return presetValues;
    }

    presetValues[scope] = Object.fromEntries(
      Object.entries(scopedValues)
        .filter(([key]) => allowedKeys.has(key))
        .map(([key, presetValue]) => [
          key,
          sanitizeValue(presetValue),
        ] as const)
        .filter(([, presetValue]) => presetValue !== undefined),
    );

    return presetValues;
  }, {});
}

async function readPresetFile(): Promise<PresetFile> {
  try {
    const text = await fs.readFile(presetFilePath, "utf8");
    const data = JSON.parse(text);

    if (isPlainObject(data) && isPlainObject(data.presets)) {
      return {
        presets: data.presets as PresetFile["presets"],
      };
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  return { presets: {} };
}

async function writePresetFile(data: PresetFile) {
  await fs.mkdir(path.dirname(presetFilePath), { recursive: true });
  await fs.writeFile(
    presetFilePath,
    `${JSON.stringify(data, null, 2)}\n`,
    "utf8",
  );
}

export async function GET() {
  const data = await readPresetFile();

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();
  const name = cleanPresetName(body?.name);

  if (!name) {
    return NextResponse.json(
      { error: "Preset name is required." },
      { status: 400 },
    );
  }

  const existing = await readPresetFile();
  const nextData = {
    presets: {
      ...existing.presets,
      [name]: sanitizeScopedPresetValues(body?.values),
    },
  };

  await writePresetFile(nextData);

  return NextResponse.json({
    name,
    presets: nextData.presets,
  });
}
