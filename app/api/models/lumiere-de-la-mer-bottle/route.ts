import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

const modelPath = path.join(
  process.cwd(),
  "model",
  "lumiere_de_la_mer_bottle.glb",
);

export async function GET() {
  try {
    const model = await fs.readFile(modelPath);

    return new Response(new Uint8Array(model), {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Type": "model/gltf-binary",
      },
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "lumiere_de_la_mer_bottle.glb was not found in the model folder.",
      },
      { status: 404 },
    );
  }
}
