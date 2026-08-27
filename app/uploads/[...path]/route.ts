import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    if (!params.path || params.path.length === 0) {
      return new NextResponse("File path missing", { status: 400 });
    }

    const relativePath = params.path.map(p => decodeURIComponent(p)).join("/");
    
    // Keamanan: Cegah directory traversal attack
    if (relativePath.includes("..")) {
      return new NextResponse("Invalid file path", { status: 400 });
    }

    // Path fisik file di server VPS
    const filePath = path.join(process.cwd(), "public", "uploads", relativePath);

    try {
      const fileBuffer = await fs.readFile(filePath);
      const ext = path.extname(filePath).toLowerCase();
      
      let contentType = "application/octet-stream";
      if (ext === ".png") contentType = "image/png";
      else if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
      else if (ext === ".webp") contentType = "image/webp";
      else if (ext === ".gif") contentType = "image/gif";
      else if (ext === ".svg") contentType = "image/svg+xml";
      else if (ext === ".pdf") contentType = "application/pdf";
      else if (ext === ".mp4") contentType = "video/mp4";

      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    } catch {
      return new NextResponse("File not found on server", { status: 404 });
    }
  } catch (err: any) {
    console.error("Error serving uploaded file:", err);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
