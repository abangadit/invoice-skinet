import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "general";

    if (!file) {
      return NextResponse.json({ error: "File tidak ditemukan." }, { status: 400 });
    }

    // Filter format file yang diperbolehkan
    const allowedMimeTypes = [
      "image/jpeg", 
      "image/png", 
      "image/webp", 
      "image/gif", 
      "image/svg+xml",
      "application/pdf"
    ];
    if (!allowedMimeTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Format file tidak didukung. Harap unggah gambar (PNG, JPG, WebP, GIF) atau PDF." },
        { status: 400 }
      );
    }

    const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB limit
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Ukuran file terlalu besar. Maksimal 15MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Generate nama file unik
    const fileExtension = file.name.split(".").pop() || "png";
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const filename = `${uniqueId}.${fileExtension}`;

    // Simpan ke direktori lokal VPS: public/uploads/{folder}/
    const uploadDir = path.join(process.cwd(), "public", "uploads", folder);
    await fs.mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, filename);
    await fs.writeFile(filePath, buffer);

    // URL publik yang dapat diakses langsung oleh browser
    const fileUrl = `/uploads/${folder}/${filename}`;

    return NextResponse.json({ url: fileUrl, filename });
  } catch (error: any) {
    console.error("Local file upload error:", error);
    return NextResponse.json({ error: error.message || "Gagal mengunggah file ke server lokal." }, { status: 500 });
  }
}
