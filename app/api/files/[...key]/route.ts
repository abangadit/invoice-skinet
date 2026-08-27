import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

export const dynamic = "force-dynamic";

function getS3Client() {
  return new S3Client({
    region: "auto",
    endpoint: "https://975b389dad8338cdb5331ade0328da79.r2.cloudflarestorage.com",
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    },
  });
}

export async function GET(
  request: Request,
  { params }: { params: { key: string[] } }
) {
  try {
    if (!params.key || params.key.length === 0) {
      return new Response("Missing file key", { status: 400 });
    }

    const relativeKey = params.key.map(k => decodeURIComponent(k)).join("/");

    // 1. Cek penyimpanan lokal VPS terlebih dahulu (public/uploads/...)
    const localPath = path.join(process.cwd(), "public", "uploads", relativeKey);
    try {
      const fileBuffer = await fs.readFile(localPath);
      const ext = path.extname(localPath).toLowerCase();
      let contentType = "application/octet-stream";
      if (ext === ".png") contentType = "image/png";
      else if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
      else if (ext === ".webp") contentType = "image/webp";
      else if (ext === ".gif") contentType = "image/gif";
      else if (ext === ".svg") contentType = "image/svg+xml";
      else if (ext === ".pdf") contentType = "application/pdf";

      return new Response(fileBuffer, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    } catch {
      // File lokal tidak ditemukan, lanjut fallback ke R2
    }

    // 2. Fallback ke Cloudflare R2 jika kredensial tersedia
    if (process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY) {
      const s3 = getS3Client();
      const s3Response = await s3.send(
        new GetObjectCommand({
          Bucket: "invoicecoid",
          Key: relativeKey,
        })
      );

      const body = s3Response.Body;
      if (body) {
        const stream = body.transformToWebStream();
        return new Response(stream, {
          headers: {
            "Content-Type": s3Response.ContentType || "application/octet-stream",
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      }
    }

    return new Response("File not found", { status: 404 });
  } catch (error) {
    console.error("Error fetching file:", error);
    return new Response("File not found", { status: 404 });
  }
}
