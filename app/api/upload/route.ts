import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const BUCKET_NAME = "invoicecoid";

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

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folder = formData.get("folder") as string || "general";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Security check: Only allow safe image formats, PDFs, and video formats, and restrict size
    const allowedMimeTypes = [
      "image/jpeg", 
      "image/png", 
      "image/webp", 
      "image/gif", 
      "application/pdf",
      "video/mp4",
      "video/webm",
      "video/ogg",
      "video/quicktime"
    ];
    if (!allowedMimeTypes.includes(file.type)) {
      return NextResponse.json({ error: "Format file tidak didukung. Hanya Gambar (JPEG/PNG/WebP/GIF), PDF, dan Video (MP4/WebM/QuickTime) yang diperbolehkan." }, { status: 400 });
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Ukuran file terlalu besar. Maksimal 10MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Generate clean unique filename
    const fileExtension = file.name.split(".").pop() || "jpg";
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const filename = `${folder}/${uniqueId}.${fileExtension}`;

    // Upload to Cloudflare R2
    const s3 = getS3Client();
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: filename,
        Body: buffer,
        ContentType: file.type,
      })
    );

    // Return the clean local API URL to fetch the file
    const fileUrl = `/api/files/${encodeURIComponent(filename)}`;

    return NextResponse.json({ url: fileUrl, filename });
  } catch (error: any) {
    console.error("Error uploading file to R2:", error);
    return NextResponse.json({ error: error.message || "Failed to upload file" }, { status: 500 });
  }
}
