import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

const sketchModelFileBySlug = {
  "flower-candle": "flower-candle.glb",
  flower: "flower.glb",
  "flower-magic": "flower_magic.glb",
  flower_magic: "flower_magic.glb",
  "glowing-flower": "glowing_flower.glb",
  glowing_flower: "glowing_flower.glb",
} as const;

type SketchModelSlug = keyof typeof sketchModelFileBySlug;

type SketchModelRouteContext = {
  params: Promise<{
    model: string;
  }>;
};

export async function GET(
  _request: Request,
  { params }: SketchModelRouteContext,
) {
  const { model } = await params;
  const fileName = sketchModelFileBySlug[model as SketchModelSlug];

  if (!fileName) {
    return NextResponse.json(
      { error: `${model} is not a registered sketch model.` },
      { status: 404 },
    );
  }

  try {
    const modelFile = await fs.readFile(
      path.join(process.cwd(), "model", "sketch", fileName),
    );

    return new Response(new Uint8Array(modelFile), {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Type": "model/gltf-binary",
      },
    });
  } catch {
    return NextResponse.json(
      { error: `${fileName} was not found in the model/sketch folder.` },
      { status: 404 },
    );
  }
}
