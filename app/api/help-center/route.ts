import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

const MANIFEST_PATH = path.join(process.cwd(), "public", "uploads", "help-center", "manifest.json");

async function readManifest(): Promise<Record<string, string>> {
  try {
    const data = await fs.readFile(MANIFEST_PATH, "utf-8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function writeManifest(data: Record<string, string>) {
  const dir = path.dirname(MANIFEST_PATH);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(MANIFEST_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export async function GET() {
  try {
    const screenshots = await readManifest();
    return NextResponse.json({ screenshots });
  } catch (error: any) {
    console.error("Error reading help center manifest:", error);
    return NextResponse.json({ screenshots: {} });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const current = await readManifest();

    if (body.action === "delete" && body.key) {
      delete current[body.key];
      await writeManifest(current);
      return NextResponse.json({ success: true, screenshots: current });
    }

    if (body.key && body.url) {
      current[body.key] = body.url;
      await writeManifest(current);
      return NextResponse.json({ success: true, screenshots: current });
    }

    if (body.screenshots && typeof body.screenshots === "object") {
      const merged = { ...current, ...body.screenshots };
      await writeManifest(merged);
      return NextResponse.json({ success: true, screenshots: merged });
    }

    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  } catch (error: any) {
    console.error("Error updating help center manifest:", error);
    return NextResponse.json({ error: error.message || "Failed to update manifest" }, { status: 500 });
  }
}
