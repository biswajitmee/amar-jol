import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

const theaterStateFilePath = path.join(process.cwd(), "theaterstate.json");

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isTheatreState(value: unknown): value is Record<string, unknown> {
  return (
    isPlainObject(value) &&
    value.definitionVersion === "0.4.0" &&
    isPlainObject(value.sheetsById)
  );
}

export async function GET() {
  const text = await fs.readFile(theaterStateFilePath, "utf8");

  return NextResponse.json(JSON.parse(text));
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Theatre disk export is only enabled in development." },
      { status: 403 },
    );
  }

  const body = await request.json();
  const state = body?.state;

  if (!isTheatreState(state)) {
    return NextResponse.json(
      { error: "A valid Theatre state payload is required." },
      { status: 400 },
    );
  }

  await fs.writeFile(
    theaterStateFilePath,
    `${JSON.stringify(state, null, 2)}\n`,
    "utf8",
  );

  return NextResponse.json({
    ok: true,
    file: "theaterstate.json",
  });
}
