import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

const presetFilePath = path.join(
  process.cwd(),
  "src",
  "waterpro",
  "debug",
  "waterLevaPresets.json",
);

const presetValueKeys = new Set([
  "preset",
  "waterPosition",
  "waterScale",
  "waterSize",
  "waveStrength",
  "waveSpeed",
  "waveScale",
  "rippleStrength",
  "rippleDamping",
  "foamStrength",
  "reflectionStrength",
  "fresnelPower",
  "underwaterEnabled",
  "underwaterFogColor",
  "underwaterFogDensity",
  "causticsStrength",
  "showRippleTexture",
  "showFoamTexture",
  "showBuoyancySamplePoints",
]);

type PresetFile = {
  presets: Record<string, Record<string, unknown>>;
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

  if (Array.isArray(value)) {
    return value.map(sanitizeValue).filter((item) => item !== undefined);
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, nestedValue]) => [key, sanitizeValue(nestedValue)] as const)
        .filter(([, nestedValue]) => nestedValue !== undefined),
    );
  }

  return undefined;
}

function sanitizePresetValues(value: unknown) {
  if (!isPlainObject(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => presetValueKeys.has(key))
      .map(([key, presetValue]) => [key, sanitizeValue(presetValue)] as const)
      .filter(([, presetValue]) => presetValue !== undefined),
  );
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
      [name]: sanitizePresetValues(body?.values),
    },
  };

  await writePresetFile(nextData);

  return NextResponse.json({
    name,
    presets: nextData.presets,
  });
}
