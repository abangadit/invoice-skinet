import { compressImage } from "./image";

/**
 * Validates, compresses, and uploads an image file to Cloudflare R2
 * via the local upload API route.
 * 
 * @param file The file to upload
 * @param folder The bucket folder prefix (e.g. 'logos', 'proofs')
 * @returns The clean URL of the uploaded file
 */
export async function uploadImageToR2(file: File, folder: string = "general"): Promise<string> {
  // 1. Security validation: enforce image file
  if (!file.type.startsWith("image/")) {
    throw new Error("Hanya file gambar yang diperbolehkan.");
  }

  // 2. Client-side compression and resizing (max 800px width/height, 0.6 JPEG quality)
  const compressedBlob = await compressImage(file, 800, 0.6);

  // 3. Construct FormData
  const formData = new FormData();
  // We keep the original filename but change extension to jpg since canvas.toBlob formats as image/jpeg
  const originalNameBase = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
  const compressedFile = new File([compressedBlob], `${originalNameBase}.jpg`, {
    type: "image/jpeg",
  });

  formData.append("file", compressedFile);
  formData.append("folder", folder);

  // 4. Send request to Next.js API upload route
  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Gagal mengunggah gambar ke server.");
  }

  const data = await response.json();
  return data.url; // e.g. /api/files/folder/12345678.jpg
}

/**
 * Uploads a generic file (PDF, Image, Video) to Cloudflare R2 without compression.
 * 
 * @param file The file to upload
 * @param folder The bucket folder prefix (e.g. 'projects', 'milestones')
 * @returns The clean URL of the uploaded file
 */
export async function uploadFileToR2(file: File, folder: string = "general"): Promise<string> {
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Ukuran file terlalu besar. Maksimal 10MB.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Gagal mengunggah file ke server.");
  }

  const data = await response.json();
  return data.url;
}
